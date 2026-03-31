import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Filter, RefreshCw, Radio, Volume2, VolumeX } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import NewsCard from '@/components/news/NewsCard';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { t } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

const CATEGORIES = ['all', 'politics', 'sports', 'technology', 'business', 'entertainment', 'world', 'general'];
const ALL_SOURCES = 'All Sources';

const Index: React.FC = () => {
  const queryClient = useQueryClient();
  const { language } = useLanguage();
  const { user } = useAuth();
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState(ALL_SOURCES);
  const [showFilters, setShowFilters] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [isSpeakingHeadlines, setIsSpeakingHeadlines] = useState(false);

  const { data: articles = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['articles', category, search, sourceFilter],
    queryFn: async () => {
      const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
      let query = supabase
        .from('articles')
        .select('*')
        .gte('published_at', cutoff)
        .order('published_at', { ascending: false })
        .limit(150);

      if (category !== 'all') query = query.eq('category', category);
      if (search) query = query.ilike('title', `%${search}%`);
      if (sourceFilter !== ALL_SOURCES) query = query.eq('source', sourceFilter);
      const { data } = await query;
      return data || [];
    },
  });

  const syncLatestNews = useCallback(async () => {
    await supabase.functions.invoke('fetch-rss').catch(() => null);
    setLastSyncedAt(new Date());
    await queryClient.invalidateQueries({ queryKey: ['articles'] });
  }, [queryClient]);

  useEffect(() => {
    syncLatestNews();
  }, [syncLatestNews]);

  useEffect(() => {
    if (!autoRefreshEnabled) return;

    const timer = setInterval(() => {
      syncLatestNews();
    }, 60_000);

    return () => clearInterval(timer);
  }, [autoRefreshEnabled, syncLatestNews]);

  const { data: userLikes = [] } = useQuery({
    queryKey: ['likes', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from('likes').select('article_id').eq('user_id', user.id);
      return data?.map(l => l.article_id) || [];
    },
    enabled: !!user,
  });

  const { data: userBookmarks = [] } = useQuery({
    queryKey: ['bookmarks', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from('bookmarks').select('article_id').eq('user_id', user.id);
      return data?.map(b => b.article_id) || [];
    },
    enabled: !!user,
  });

  const sources = useMemo(
    () => [ALL_SOURCES, ...Array.from(new Set(articles.map(article => article.source))).sort()],
    [articles]
  );

  const topSource = useMemo(() => {
    const freq = new Map<string, number>();
    articles.forEach(a => freq.set(a.source, (freq.get(a.source) || 0) + 1));
    return [...freq.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '-';
  }, [articles]);

  const speechText = useMemo(() => {
    const headlines = articles.slice(0, 5).map((a, i) => `${i + 1}. ${a.title}`).join('। ');
    return `पिछले 48 घंटों की प्रमुख खबरें। ${headlines || 'अभी कोई खबर उपलब्ध नहीं है।'}`;
  }, [articles]);

  const playHeadlines = () => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.lang = 'hi-IN';
    utterance.rate = 0.95;
    utterance.onend = () => setIsSpeakingHeadlines(false);
    utterance.onerror = () => setIsSpeakingHeadlines(false);
    setIsSpeakingHeadlines(true);
    window.speechSynthesis.speak(utterance);
  };

  const stopHeadlines = () => {
    window.speechSynthesis.cancel();
    setIsSpeakingHeadlines(false);
  };

  const categoryLabels: Record<string, string> = {
    all: t('allCategories', language),
    politics: t('politics', language),
    sports: t('sports', language),
    technology: t('technology', language),
    business: t('business', language),
    entertainment: t('entertainment', language),
    world: t('world', language),
    general: t('general', language),
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="rounded-xl bg-gradient-to-r from-primary to-primary/80 p-4 text-primary-foreground sm:p-6">
        <h1 className="text-xl font-bold sm:text-2xl">{t('appName', language)}</h1>
        <p className="mt-1 text-sm opacity-80">{t('tagline', language)}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="pulse-card rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Stories (48h)</p>
          <p className="text-xl font-semibold">{articles.length}</p>
        </div>
        <div className="pulse-card rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Active Sources</p>
          <p className="text-xl font-semibold">{Math.max(0, sources.length - 1)}</p>
        </div>
        <div className="pulse-card rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Top Source</p>
          <p className="truncate text-xl font-semibold">{topSource}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3 text-xs text-muted-foreground sm:text-sm">
        <Radio className="h-4 w-4 text-primary" />
        सिर्फ पिछले 48 घंटे की ताज़ा खबरें
        <span>•</span>
        हर 1 मिनट में ऑटो-रिफ्रेश
        {lastSyncedAt ? <><span>•</span><span>अंतिम सिंक: {lastSyncedAt.toLocaleTimeString()}</span></> : null}
        <Button variant="ghost" size="sm" className="ml-auto" onClick={() => syncLatestNews()}>
          <RefreshCw className={`mr-1 h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} /> अभी रिफ्रेश करें
        </Button>
        <Button variant="outline" size="sm" onClick={() => setAutoRefreshEnabled(v => !v)}>
          {autoRefreshEnabled ? 'ऑटो रिफ्रेश रोकें' : 'ऑटो रिफ्रेश चालू करें'}
        </Button>
      </div>

      <div className="pulse-card rounded-lg border p-3">
        <p className="mb-2 text-sm font-medium">Hindi Audio Headlines</p>
        <div className="flex gap-2 sm:items-center">
          <Button size="sm" onClick={playHeadlines} disabled={isSpeakingHeadlines}>
            <Volume2 className="mr-1 h-4 w-4" /> सुनें
          </Button>
          <Button size="sm" variant="outline" onClick={stopHeadlines} disabled={!isSpeakingHeadlines}>
            <VolumeX className="mr-1 h-4 w-4" /> रोकें
          </Button>
        </div>
      </div>

      <div className="flex gap-2 sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('search', language)}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="icon" onClick={() => setShowFilters(!showFilters)}>
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      {showFilters && (
        <div className="flex flex-col gap-2 sm:flex-row animate-fade-in">
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-full sm:w-[220px]">
              <SelectValue placeholder={t('source', language)} />
            </SelectTrigger>
            <SelectContent>
              {sources.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          {(sourceFilter !== ALL_SOURCES || search) && (
            <Button variant="ghost" size="sm" onClick={() => { setSourceFilter(ALL_SOURCES); setSearch(''); refetch(); }}>
              {t('clearFilters', language)}
            </Button>
          )}
        </div>
      )}

      <Tabs value={category} onValueChange={setCategory}>
        <TabsList className="w-full justify-start overflow-x-auto whitespace-nowrap">
          {CATEGORIES.map(cat => (
            <TabsTrigger key={cat} value={cat} className="text-xs">
              {categoryLabels[cat]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-video w-full rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
        </div>
      ) : articles.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">
          <p className="text-lg">{t('noResults', language)}</p>
          <p className="mt-2 text-sm">Try broadening filters or click Refresh now to fetch latest RSS updates.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map(article => (
            <NewsCard
              key={article.id}
              article={article}
              isLiked={userLikes.includes(article.id)}
              isBookmarked={userBookmarks.includes(article.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Index;
