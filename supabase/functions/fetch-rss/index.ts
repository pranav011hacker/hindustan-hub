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
  { url: 'https://feeds.feedburner.com/ndtvprofit-latest', source: 'NDTV Profit', category: 'business' },
  { url: 'https://timesofindia.indiatimes.com/rssfeeds/4719148.cms', source: 'TOI Sports', category: 'sports' },
  { url: 'https://timesofindia.indiatimes.com/rssfeeds/5880659.cms', source: 'TOI Tech', category: 'technology' },
  { url: 'https://www.thehindu.com/entertainment/feeder/default.rss', source: 'The Hindu Entertainment', category: 'entertainment' },
  { url: 'https://www.indiatoday.in/rss/1206578', source: 'India Today World', category: 'world' },
];

function extractImageUrl(item: string): string | null {
  const patterns = [
    /<media:content[^>]+url="([^"]+)"/,
    /<media:thumbnail[^>]+url="([^"]+)"/,
    /<enclosure[^>]+url="([^"]+)"/,
    /<img[^>]+src="([^"]+)"/,
    /&lt;img[^&]*src=&quot;([^&]+)&quot;/,
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

interface ParsedItem {
  title: string;
  description: string;
  link: string;
  pubDate: string;
  imageUrl: string | null;
  source: string;
  category: string;
}

function parseRssItems(xml: string, source: string, category: string): ParsedItem[] {
  const items: ParsedItem[] = [];
  const itemMatches = xml.match(/<item[\s>]([\s\S]*?)<\/item>/g) || [];

  for (const item of itemMatches.slice(0, 20)) {
    const title = stripHtml((item.match(/<title[^>]*>([\s\S]*?)<\/title>/) || [])[1] || '');
    const description = stripHtml((item.match(/<description[^>]*>([\s\S]*?)<\/description>/) || [])[1] || '');
    const link = stripHtml((item.match(/<link[^>]*>([\s\S]*?)<\/link>/) || [])[1] || '');
    const pubDate = stripHtml(
      (item.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/) || [])[1] ||
      (item.match(/<dc:date[^>]*>([\s\S]*?)<\/dc:date>/) || [])[1] || ''
    );
    const imageUrl = extractImageUrl(item);

    if (title && link) {
      items.push({ title, description, link, pubDate, imageUrl, source, category });
    }
  }
  return items;
}

async function fetchFeed(feed: { url: string; source: string; category: string }): Promise<{ source: string; items: ParsedItem[]; error?: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(feed.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; HindustanAI/1.0)',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return { source: feed.source, items: [], error: `http:${response.status}` };
    }

    const xml = await response.text();
    const items = parseRssItems(xml, feed.source, feed.category);
    return { source: feed.source, items };
  } catch (e) {
    return { source: feed.source, items: [], error: e.message?.substring(0, 50) };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const cutoffMs = NEWS_WINDOW_HOURS * 60 * 60 * 1000;
    const cutoffIso = new Date(Date.now() - cutoffMs).toISOString();

    // Fetch all feeds in parallel
    const results = await Promise.allSettled(RSS_FEEDS.map(fetchFeed));

    let totalInserted = 0;
    let totalSkipped = 0;
    let totalErrors = 0;
    const feedResults: Record<string, string> = {};

    // Collect all items
    const allItems: ParsedItem[] = [];
    for (const r of results) {
      if (r.status === 'fulfilled') {
        const { source, items, error } = r.value;
        if (error) {
          feedResults[source] = `fail:${error}`;
          totalErrors++;
        } else {
          feedResults[source] = `parsed:${items.length}`;
          allItems.push(...items);
        }
      }
    }

    console.log(`Parsed ${allItems.length} total items from ${RSS_FEEDS.length} feeds`);

    // Batch upsert items
    const toUpsert: Array<Record<string, unknown>> = [];
    for (const item of allItems) {
      let publishedAt: string;
      const parsed = new Date(item.pubDate);
      if (item.pubDate && !isNaN(parsed.getTime())) {
        const diffMs = Date.now() - parsed.getTime();
        if (diffMs < 0 || diffMs > cutoffMs) {
          totalSkipped++;
          continue;
        }
        publishedAt = parsed.toISOString();
      } else {
        publishedAt = new Date().toISOString();
      }

      toUpsert.push({
        title: item.title.substring(0, 500),
        description: item.description.substring(0, 1000),
        source: item.source,
        source_url: item.link,
        image_url: item.imageUrl,
        category: item.category,
        published_at: publishedAt,
      });
    }

    // Upsert in batches of 50
    for (let i = 0; i < toUpsert.length; i += 50) {
      const batch = toUpsert.slice(i, i + 50);
      const { error } = await supabase.from('articles').upsert(batch, { onConflict: 'source_url' });
      if (error) {
        console.error(`Batch upsert error: ${error.message}`);
        totalErrors += batch.length;
      } else {
        totalInserted += batch.length;
      }
    }

    // Clean old articles
    await supabase.from('articles').delete().lt('published_at', cutoffIso);

    console.log(`Done: inserted=${totalInserted}, skipped=${totalSkipped}, errors=${totalErrors}`);
    console.log('Feeds:', JSON.stringify(feedResults));

    return new Response(
      JSON.stringify({ success: true, inserted: totalInserted, skipped: totalSkipped, errors: totalErrors, feeds: feedResults }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('RSS error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
