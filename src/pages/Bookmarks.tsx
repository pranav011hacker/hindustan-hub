import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bookmark as BookmarkIcon } from 'lucide-react';
import NewsCard from '@/components/news/NewsCard';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { t } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import { Navigate } from 'react-router-dom';

const Bookmarks: React.FC = () => {
  const { user, loading } = useAuth();
  const { language } = useLanguage();

  const { data: bookmarkedArticles = [] } = useQuery({
    queryKey: ['bookmarked-articles', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: bookmarks } = await supabase.from('bookmarks').select('article_id').eq('user_id', user.id);
      if (!bookmarks || bookmarks.length === 0) return [];
      const ids = bookmarks.map(b => b.article_id);
      const { data } = await supabase.from('articles').select('*').in('id', ids);
      return data || [];
    },
    enabled: !!user,
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

  if (!loading && !user) return <Navigate to="/auth" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-saffron/10">
          <BookmarkIcon className="h-5 w-5 text-saffron" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{t('bookmarks', language)}</h1>
          <p className="text-sm text-muted-foreground">{t('savedArticles', language)}</p>
        </div>
      </div>

      {bookmarkedArticles.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">
          <BookmarkIcon className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <p>{t('noResults', language)}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {bookmarkedArticles.map(article => (
            <NewsCard
              key={article.id}
              article={article}
              isLiked={userLikes.includes(article.id)}
              isBookmarked={true}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Bookmarks;
