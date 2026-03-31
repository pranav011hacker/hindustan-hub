import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_SOURCE_COUNT = 10;
const NEWS_WINDOW_HOURS = 48;

const RSS_FEEDS = [
  { url: 'https://feeds.feedburner.com/ndtvnews-top-stories', source: 'NDTV', category: 'general' },
  { url: 'https://timesofindia.indiatimes.com/rssfeedstopstories.cms', source: 'Times of India', category: 'general' },
  { url: 'https://www.thehindu.com/news/national/feeder/default.rss', source: 'The Hindu', category: 'politics' },
  { url: 'https://www.indiatoday.in/rss/home', source: 'India Today', category: 'general' },
  { url: 'https://www.hindustantimes.com/feeds/rss/india-news/rssfeed.xml', source: 'Hindustan Times', category: 'general' },
  { url: 'https://www.firstpost.com/commonfeeds/v1/mfp/rss/india.xml', source: 'Firstpost', category: 'general' },
  { url: 'https://www.news18.com/rss/india.xml', source: 'News18', category: 'general' },
  { url: 'https://indianexpress.com/section/india/feed/', source: 'Indian Express', category: 'general' },
  { url: 'https://www.business-standard.com/rss/home_page_top_stories.rss', source: 'Business Standard', category: 'business' },
  { url: 'https://www.moneycontrol.com/rss/business.xml', source: 'Moneycontrol', category: 'business' },
];

function extractImageUrl(item: string): string | null {
  const mediaMatch = item.match(/<media:content[^>]+url="([^"]+)"/);
  if (mediaMatch) return mediaMatch[1];
  const enclosureMatch = item.match(/<enclosure[^>]+url="([^"]+)"/);
  if (enclosureMatch) return enclosureMatch[1];
  const imgMatch = item.match(/<img[^>]+src="([^"]+)"/);
  if (imgMatch) return imgMatch[1];
  const thumbnailMatch = item.match(/<media:thumbnail[^>]+url="([^"]+)"/);
  if (thumbnailMatch) return thumbnailMatch[1];
  return null;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function parseRssItems(xml: string): Array<{ title: string; description: string; link: string; pubDate: string; imageUrl: string | null }> {
  const items: Array<{ title: string; description: string; link: string; pubDate: string; imageUrl: string | null }> = [];
  const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];

  for (const item of itemMatches.slice(0, 20)) {
    const title = stripHtml((item.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '');
    const description = stripHtml((item.match(/<description>([\s\S]*?)<\/description>/) || [])[1] || '');
    const link = ((item.match(/<link>([\s\S]*?)<\/link>/) || [])[1] || '').trim();
    const pubDate = ((item.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1] || '').trim();
    const imageUrl = extractImageUrl(item);

    if (title && link) {
      items.push({ title, description, link, pubDate, imageUrl });
    }
  }
  return items;
}

function isWithinWindow(isoDate: string, windowHours: number): boolean {
  const time = new Date(isoDate).getTime();
  if (Number.isNaN(time)) return false;

  const now = Date.now();
  const diffMs = now - time;
  return diffMs >= 0 && diffMs <= windowHours * 60 * 60 * 1000;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const cutoffIso = new Date(Date.now() - NEWS_WINDOW_HOURS * 60 * 60 * 1000).toISOString();

    let totalInserted = 0;
    let totalErrors = 0;
    let totalSkipped = 0;

    for (const feed of RSS_FEEDS.slice(0, MAX_SOURCE_COUNT)) {
      try {
        const response = await fetch(feed.url, {
          headers: { 'User-Agent': 'HindustanAI/1.0' },
        });

        if (!response.ok) {
          console.error(`Failed to fetch ${feed.source}: ${response.status}`);
          totalErrors++;
          continue;
        }

        const xml = await response.text();
        const items = parseRssItems(xml);

        for (const item of items) {
          const publishedAt = item.pubDate ? new Date(item.pubDate).toISOString() : null;

          if (!publishedAt || !isWithinWindow(publishedAt, NEWS_WINDOW_HOURS)) {
            totalSkipped++;
            continue;
          }

          const { error } = await supabase.from('articles').upsert(
            {
              title: item.title.substring(0, 500),
              description: item.description.substring(0, 1000),
              source: feed.source,
              source_url: item.link,
              image_url: item.imageUrl,
              category: feed.category,
              published_at: publishedAt,
            },
            { onConflict: 'source_url' }
          );

          if (error) {
            totalErrors++;
          } else {
            totalInserted++;
          }
        }
      } catch (feedError) {
        console.error(`Error processing feed ${feed.source}:`, feedError);
        totalErrors++;
      }
    }

    await supabase.from('articles').delete().lt('published_at', cutoffIso);

    return new Response(
      JSON.stringify({ success: true, inserted: totalInserted, skipped: totalSkipped, errors: totalErrors, sourceCount: MAX_SOURCE_COUNT }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('RSS fetch error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
