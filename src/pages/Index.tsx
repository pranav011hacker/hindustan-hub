import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Filter, RefreshCw, Radio, TrendingUp, Newspaper, Globe, Briefcase, Cpu, Gamepad2, Landmark } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import NewsCard from '@/components/news/NewsCard';
import VoiceNewsSearch from '@/components/news/VoiceNewsSearch';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { t } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Navigate } from 'react-router-dom';

const CATEGORIES = ['all', 'politics', 'sports', 'technology', 'business', 'entertainment', 'world', 'general'] as const;
const ALL_SOURCES = 'All Sources';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  all: <Newspaper className="h-4 w-4" />,
  politics: <Landmark className="h-4 w-4" />,
  sports: <Gamepad2 className="h-4 w-4" />,
  technology: <Cpu className="h-4 w-4" />,
  business: <Briefcase className="h-4 w-4" />,
  entertainment: <Gamepad2 className="h-4 w-4" />,
  world: <Globe className="h-4 w-4" />,
  general: <Newspaper className="h-4 w-4" />,
};

const Index: React.FC = () => {
  const queryClient = useQueryClient();
  const { language } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState(ALL_SOURCES);
  const [showFilters, setShowFilters] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  // Require login
  if (!authLoading && !user) {
    return <Navigate to="/auth" replace />;
  }

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
    enabled: !!user,
  });

  const syncLatestNews = useCallback(async () => {
    await supabase.functions.invoke('fetch-rss').catch(() => null);
    setLastSyncedAt(new Date());
    await queryClient.invalidateQueries({ queryKey: ['articles'] });
  }, [queryClient]);

  useEffect(() => {
    if (user) syncLatestNews();
  }, [syncLatestNews, user]);

  useEffect(() => {
    if (!user) return;
    const timer = setInterval(() => syncLatestNews(), 60_000);
    return () => clearInterval(timer);
  }, [syncLatestNews, user]);

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
    () => [ALL_SOURCES, ...Array.from(new Set(articles.map(a => a.source))).sort()],
    [articles]
  );

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

  // Group articles by category for section view
  const sectionArticles = useMemo(() => {
    if (category !== 'all') return null;
    const grouped: Record<string, typeof articles> = {};
    articles.forEach(a => {
      if (!grouped[a.category]) grouped[a.category] = [];
      grouped[a.category].push(a);
    });
    return grouped;
  }, [articles, category]);

  const topStories = useMemo(() => articles.slice(0, 3), [articles]);
  const filteredArticles = category !== 'all' ? articles : [];

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="h-12 w-12 mx-auto rounded-xl bg-gradient-to-br from-primary to-accent animate-pulse" />
          <p className="text-sm text-muted-foreground">{t('loading', language)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="hero-gradient rounded-2xl p-6 sm:p-8 text-primary-foreground relative">
        <div className="relative z-10">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('appName', language)}</h1>
          <p className="mt-1.5 text-sm sm:text-base opacity-85">{t('tagline', language)}</p>
          <div className="flex flex-wrap items-center gap-3 mt-4 text-xs sm:text-sm opacity-80">
            <span className="flex items-center gap-1.5">
              <Radio className="h-3.5 w-3.5" /> Live from {Math.max(0, sources.length - 1)} sources
            </span>
            <span>•</span>
            <span>{articles.length} stories</span>
            {lastSyncedAt && (
              <>
                <span>•</span>
                <span>Synced {lastSyncedAt.toLocaleTimeString()}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* AI Voice Search */}
      <VoiceNewsSearch />

      {/* Sync bar */}
      <div className="flex items-center gap-2 rounded-xl glass-card px-4 py-2.5 text-xs text-muted-foreground">
        <Radio className="h-3.5 w-3.5 text-primary" />
        <span>Auto-refresh every 60s</span>
        <Button variant="ghost" size="sm" className="ml-auto text-xs h-7" onClick={() => syncLatestNews()}>
          <RefreshCw className={`mr-1 h-3.5 w-3.5 ${isRefetching ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('search', language)}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-11 rounded-xl bg-card"
          />
        </div>
        <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl" onClick={() => setShowFilters(!showFilters)}>
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      {showFilters && (
        <div className="flex flex-col gap-2 sm:flex-row animate-fade-in">
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-full sm:w-[220px] rounded-xl">
              <SelectValue placeholder={t('source', language)} />
            </SelectTrigger>
            <SelectContent>
              {sources.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          {(sourceFilter !== ALL_SOURCES || search) && (
            <Button variant="ghost" size="sm" onClick={() => { setSourceFilter(ALL_SOURCES); setSearch(''); }}>
              {t('clearFilters', language)}
            </Button>
          )}
        </div>
      )}

      {/* Category Pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              category === cat
                ? 'category-pill-active'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {CATEGORY_ICONS[cat]}
            {categoryLabels[cat]}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-video w-full rounded-xl" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
        </div>
      ) : articles.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">
          <Newspaper className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">{t('noResults', language)}</p>
          <p className="mt-1 text-sm">Try broadening your filters or refreshing</p>
        </div>
      ) : category !== 'all' ? (
        /* Filtered single category */
        <div>
          <h2 className="section-header text-lg font-bold mb-4">{categoryLabels[category]}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map(article => (
              <NewsCard key={article.id} article={article} isLiked={userLikes.includes(article.id)} isBookmarked={userBookmarks.includes(article.id)} />
            ))}
          </div>
        </div>
      ) : (
        /* All categories - sectioned */
        <div className="space-y-8">
          {/* Top Stories */}
          {topStories.length > 0 && (
            <section>
              <h2 className="section-header text-lg font-bold mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-accent" />
                {t('topStories', language)}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {topStories.map(article => (
                  <NewsCard key={article.id} article={article} isLiked={userLikes.includes(article.id)} isBookmarked={userBookmarks.includes(article.id)} />
                ))}
              </div>
            </section>
          )}

          {/* Category Sections */}
          {sectionArticles && Object.entries(sectionArticles)
            .sort(([, a], [, b]) => b.length - a.length)
            .map(([cat, catArticles]) => (
              <section key={cat}>
                <h2 className="section-header text-lg font-bold mb-4 flex items-center gap-2">
                  {CATEGORY_ICONS[cat]}
                  {categoryLabels[cat] || cat}
                  <span className="text-xs font-normal text-muted-foreground ml-1">({catArticles.length})</span>
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {catArticles.slice(0, 6).map(article => (
                    <NewsCard key={article.id} article={article} isLiked={userLikes.includes(article.id)} isBookmarked={userBookmarks.includes(article.id)} />
                  ))}
                </div>
              </section>
            ))}
        </div>
      )}
    </div>
  );
};

export default Index;
