import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Flame } from 'lucide-react';
import NewsCard from '@/components/news/NewsCard';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { t } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

const Trending: React.FC = () => {
  const { language } = useLanguage();
  const { user } = useAuth();

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ['trending-articles'],
    queryFn: async () => {
      const { data } = await supabase
        .from('articles')
        .select('*')
        .order('like_count', { ascending: false })
        .limit(10);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-saffron/10">
          <Flame className="h-5 w-5 text-saffron" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{t('trendingNow', language)}</h1>
          <p className="text-sm text-muted-foreground">{t('topStories', language)}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-video w-full rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>
      ) : articles.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">
          <TrendingUp className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <p>{t('noResults', language)}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article, index) => (
            <div key={article.id} className="relative">
              {index < 3 && (
                <div className="absolute -left-2 -top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-saffron text-xs font-bold text-white">
                  {index + 1}
                </div>
              )}
              <NewsCard article={article} isLiked={userLikes.includes(article.id)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Trending;
