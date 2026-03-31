import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RSS_FEEDS = [
  { url: 'https://feeds.feedburner.com/ndtvnews-top-stories', source: 'NDTV', category: 'general' },
  { url: 'https://timesofindia.indiatimes.com/rssfeedstopstories.cms', source: 'Times of India', category: 'general' },
  { url: 'https://www.thehindu.com/news/national/feeder/default.rss', source: 'The Hindu', category: 'politics' },
  { url: 'https://feeds.feedburner.com/ndtvprofit-latest', source: 'NDTV', category: 'business' },
  { url: 'https://timesofindia.indiatimes.com/rssfeeds/4719148.cms', source: 'Times of India', category: 'world' },
  { url: 'https://timesofindia.indiatimes.com/rssfeeds/-2128936835.cms', source: 'Times of India', category: 'technology' },
  { url: 'https://timesofindia.indiatimes.com/rssfeeds/4719161.cms', source: 'Times of India', category: 'sports' },
  { url: 'https://timesofindia.indiatimes.com/rssfeeds/1081479906.cms', source: 'Times of India', category: 'entertainment' },
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
  return html.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').trim();
}

function parseRssItems(xml: string): Array<{ title: string; description: string; link: string; pubDate: string; imageUrl: string | null }> {
  const items: Array<{ title: string; description: string; link: string; pubDate: string; imageUrl: string | null }> = [];
  const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];

  for (const item of itemMatches.slice(0, 15)) {
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let totalInserted = 0;
    let totalErrors = 0;

    for (const feed of RSS_FEEDS) {
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
          const { error } = await supabase.from('articles').upsert(
            {
              title: item.title.substring(0, 500),
              description: item.description.substring(0, 1000),
              source: feed.source,
              source_url: item.link,
              image_url: item.imageUrl,
              category: feed.category,
              published_at: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
            },
            { onConflict: 'source_url' }
          );

          if (!error) totalInserted++;
        }
      } catch (feedError) {
        console.error(`Error processing feed ${feed.source}:`, feedError);
        totalErrors++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, inserted: totalInserted, errors: totalErrors }),
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
