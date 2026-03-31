import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Heart, Bookmark, Share2, ExternalLink, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import CommentSection from '@/components/news/CommentSection';
import NewsCard from '@/components/news/NewsCard';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { t, formatTimeAgo } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

const ArticleDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { language } = useLanguage();
  const queryClient = useQueryClient();

  const { data: article, isLoading } = useQuery({
    queryKey: ['article', id],
    queryFn: async () => {
      const { data } = await supabase.from('articles').select('*').eq('id', id!).single();
      return data;
    },
    enabled: !!id,
  });

  const { data: isLiked = false } = useQuery({
    queryKey: ['article-like', id, user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase.from('likes').select('id').eq('user_id', user.id).eq('article_id', id!).maybeSingle();
      return !!data;
    },
    enabled: !!user && !!id,
  });

  const { data: isBookmarked = false } = useQuery({
    queryKey: ['article-bookmark', id, user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase.from('bookmarks').select('id').eq('user_id', user.id).eq('article_id', id!).maybeSingle();
      return !!data;
    },
    enabled: !!user && !!id,
  });

  const { data: relatedArticles = [] } = useQuery({
    queryKey: ['related-articles', article?.category],
    queryFn: async () => {
      const { data } = await supabase
        .from('articles')
        .select('*')
        .eq('category', article!.category)
        .neq('id', id!)
        .order('published_at', { ascending: false })
        .limit(3);
      return data || [];
    },
    enabled: !!article,
  });

  const handleLike = async () => {
    if (!user) { toast({ title: 'Please sign in' }); return; }
    if (isLiked) {
      await supabase.from('likes').delete().eq('user_id', user.id).eq('article_id', id!);
    } else {
      await supabase.from('likes').insert({ user_id: user.id, article_id: id! });
    }
    queryClient.invalidateQueries({ queryKey: ['article-like', id] });
    queryClient.invalidateQueries({ queryKey: ['article', id] });
  };

  const handleBookmark = async () => {
    if (!user) { toast({ title: 'Please sign in' }); return; }
    if (isBookmarked) {
      await supabase.from('bookmarks').delete().eq('user_id', user.id).eq('article_id', id!);
    } else {
      await supabase.from('bookmarks').insert({ user_id: user.id, article_id: id! });
    }
    queryClient.invalidateQueries({ queryKey: ['article-bookmark', id] });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="aspect-video w-full rounded-xl" />
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full" />
      </div>
    );
  }

  if (!article) {
    return <div className="py-20 text-center text-muted-foreground">Article not found</div>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link to="/">
        <Button variant="ghost" size="sm" className="gap-1">
          <ArrowLeft className="h-4 w-4" /> {t('home', language)}
        </Button>
      </Link>

      {article.image_url && (
        <img
          src={article.image_url}
          alt={article.title}
          className="w-full rounded-xl object-cover"
          style={{ maxHeight: '400px' }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      )}

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{t(article.category as any, language)}</Badge>
          <span className="text-sm text-muted-foreground">{article.source}</span>
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="h-3 w-3" />
            {article.published_at ? formatTimeAgo(article.published_at, language) : ''}
          </span>
        </div>

        <h1 className="text-2xl font-bold leading-tight">{article.title}</h1>

        {article.description && (
          <p className="text-lg text-muted-foreground">{article.description}</p>
        )}

        {article.content && (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <p>{article.content}</p>
          </div>
        )}

        <div className="flex items-center gap-2 pt-2">
          <Button variant={isLiked ? 'default' : 'outline'} size="sm" className="gap-1" onClick={handleLike}>
            <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
            {article.like_count} {t('like', language)}
          </Button>
          <Button variant={isBookmarked ? 'default' : 'outline'} size="sm" className="gap-1" onClick={handleBookmark}>
            <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
            {t('bookmark', language)}
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" disabled className="gap-1 opacity-50">
                <Share2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('shareNotAvailable', language)}</TooltipContent>
          </Tooltip>
          <a href={article.source_url} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="gap-1">
              <ExternalLink className="h-4 w-4" />
              {t('readOriginal', language)}
            </Button>
          </a>
        </div>
      </div>

      <Separator />

      <CommentSection articleId={article.id} />

      {relatedArticles.length > 0 && (
        <>
          <Separator />
          <div>
            <h2 className="mb-4 text-lg font-semibold">{t('relatedNews', language)}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {relatedArticles.map(a => (
                <NewsCard key={a.id} article={a} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ArticleDetail;
