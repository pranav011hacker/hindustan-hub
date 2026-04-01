import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
  const patterns = [
    /<media:content[^>]+url="([^"]+)"/,
    /<media:thumbnail[^>]+url="([^"]+)"/,
    /<enclosure[^>]+url="([^"]+)"/,
    /<img[^>]+src="([^"]+)"/,
    /&lt;img[^&]*src=&quot;([^&]+)&quot;/,
    /&lt;img[^&]*src="([^"]+)"/,
  ];
  for (const p of patterns) {
    const m = item.match(p);
    if (m) return m[1];
  }
  return null;
}

function stripHtml(html: string): string {
  return html
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
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
  const itemMatches = xml.match(/<item[\s>]([\s\S]*?)<\/item>/g) || [];

  for (const item of itemMatches.slice(0, 25)) {
    const titleMatch = item.match(/<title[^>]*>([\s\S]*?)<\/title>/);
    const descMatch = item.match(/<description[^>]*>([\s\S]*?)<\/description>/);
    const linkMatch = item.match(/<link[^>]*>([\s\S]*?)<\/link>/);
    const pubDateMatch = item.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/);
    const dcDateMatch = item.match(/<dc:date[^>]*>([\s\S]*?)<\/dc:date>/);

    const title = stripHtml(titleMatch?.[1] || '');
    const description = stripHtml(descMatch?.[1] || '');
    const link = stripHtml(linkMatch?.[1] || '');
    const pubDate = stripHtml(pubDateMatch?.[1] || dcDateMatch?.[1] || '');
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

    const cutoffIso = new Date(Date.now() - NEWS_WINDOW_HOURS * 60 * 60 * 1000).toISOString();

    let totalInserted = 0;
    let totalErrors = 0;
    let totalSkipped = 0;
    let totalParsed = 0;
    const feedResults: Record<string, string> = {};

    for (const feed of RSS_FEEDS) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(feed.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; HindustanAI/1.0)',
            'Accept': 'application/rss+xml, application/xml, text/xml, */*',
          },
          signal: controller.signal,
        }).catch(e => {
          console.error(`Network error ${feed.source}: ${e.message}`);
          return null;
        });

        clearTimeout(timeout);

        if (!response || !response.ok) {
          const status = response ? response.status : 'network_error';
          console.error(`Failed ${feed.source}: ${status}`);
          feedResults[feed.source] = `failed:${status}`;
          totalErrors++;
          continue;
        }

        const xml = await response.text();
        const items = parseRssItems(xml);
        console.log(`${feed.source}: parsed ${items.length} items`);
        totalParsed += items.length;

        let feedInserted = 0;
        for (const item of items) {
          // Try to parse date; if unparseable, use current time (treat as fresh)
          let publishedAt: string;
          const parsed = new Date(item.pubDate);
          if (item.pubDate && !isNaN(parsed.getTime())) {
            // Check if within window
            const diffMs = Date.now() - parsed.getTime();
            if (diffMs < 0 || diffMs > NEWS_WINDOW_HOURS * 60 * 60 * 1000) {
              totalSkipped++;
              continue;
            }
            publishedAt = parsed.toISOString();
          } else {
            // No valid date - use now so it appears as fresh
            publishedAt = new Date().toISOString();
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
            console.error(`Insert error ${feed.source}: ${error.message}`);
            totalErrors++;
          } else {
            feedInserted++;
            totalInserted++;
          }
        }
        feedResults[feed.source] = `ok:${feedInserted}/${items.length}`;
      } catch (feedError) {
        console.error(`Error ${feed.source}:`, feedError);
        feedResults[feed.source] = 'exception';
        totalErrors++;
      }
    }

    // Clean old articles
    await supabase.from('articles').delete().lt('published_at', cutoffIso);

    console.log(`Done: inserted=${totalInserted}, parsed=${totalParsed}, skipped=${totalSkipped}, errors=${totalErrors}`);
    console.log('Feed results:', JSON.stringify(feedResults));

    return new Response(
      JSON.stringify({ success: true, inserted: totalInserted, parsed: totalParsed, skipped: totalSkipped, errors: totalErrors, feeds: feedResults }),
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
