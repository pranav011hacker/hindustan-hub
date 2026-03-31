import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import NewsCard from '@/components/news/NewsCard';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { t } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

const CATEGORIES = ['all', 'politics', 'sports', 'technology', 'business', 'entertainment', 'world', 'general'];
const SOURCES = ['All Sources', 'NDTV', 'Times of India', 'The Hindu', 'India Today', 'Hindustan Times'];

const Index: React.FC = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('All Sources');
  const [showFilters, setShowFilters] = useState(false);

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ['articles', category, search, sourceFilter],
    queryFn: async () => {
      let query = supabase.from('articles').select('*').order('published_at', { ascending: false }).limit(50);
      if (category !== 'all') query = query.eq('category', category);
      if (search) query = query.ilike('title', `%${search}%`);
      if (sourceFilter !== 'All Sources') query = query.eq('source', sourceFilter);
      const { data } = await query;
      return data || [];
    },
  });

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
    <div className="space-y-4">
      {/* Hero branding */}
      <div className="rounded-xl bg-gradient-to-r from-primary to-primary/80 p-6 text-primary-foreground">
        <h1 className="text-2xl font-bold">{t('appName', language)}</h1>
        <p className="mt-1 text-sm opacity-80">{t('tagline', language)}</p>
      </div>

      {/* Search & Filters */}
      <div className="flex gap-2">
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
        <div className="flex gap-2 animate-fade-in">
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t('source', language)} />
            </SelectTrigger>
            <SelectContent>
              {SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          {(sourceFilter !== 'All Sources' || search) && (
            <Button variant="ghost" size="sm" onClick={() => { setSourceFilter('All Sources'); setSearch(''); }}>
              {t('clearFilters', language)}
            </Button>
          )}
        </div>
      )}

      {/* Category Tabs */}
      <Tabs value={category} onValueChange={setCategory}>
        <TabsList className="w-full justify-start overflow-x-auto">
          {CATEGORIES.map(cat => (
            <TabsTrigger key={cat} value={cat} className="text-xs">
              {categoryLabels[cat]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Articles Grid */}
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
          <p className="mt-2 text-sm">News articles will appear here once the RSS feed is fetched.</p>
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
