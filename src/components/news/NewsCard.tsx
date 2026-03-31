import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, Bookmark, Share2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { t, formatTimeAgo } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

interface NewsCardProps {
  article: Tables<'articles'>;
  isLiked?: boolean;
  isBookmarked?: boolean;
}

const NewsCard: React.FC<NewsCardProps> = ({ article, isLiked = false, isBookmarked = false }) => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { toast({ title: 'Please sign in to like articles' }); return; }

    if (isLiked) {
      await supabase.from('likes').delete().eq('user_id', user.id).eq('article_id', article.id);
    } else {
      await supabase.from('likes').insert({ user_id: user.id, article_id: article.id });
    }
    queryClient.invalidateQueries({ queryKey: ['articles'] });
    queryClient.invalidateQueries({ queryKey: ['likes'] });
  };

  const handleBookmark = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { toast({ title: 'Please sign in to bookmark articles' }); return; }

    if (isBookmarked) {
      await supabase.from('bookmarks').delete().eq('user_id', user.id).eq('article_id', article.id);
    } else {
      await supabase.from('bookmarks').insert({ user_id: user.id, article_id: article.id });
    }
    queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
  };

  const categoryColors: Record<string, string> = {
    politics: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    sports: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    technology: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    business: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    entertainment: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
    world: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
    general: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  };

  return (
    <Link to={`/article/${article.id}`}>
      <Card className="group overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5 animate-fade-in">
        {article.image_url && (
          <div className="aspect-video overflow-hidden">
            <img
              src={article.image_url}
              alt={article.title}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
        )}
        <CardContent className="p-4">
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="secondary" className={categoryColors[article.category] || categoryColors.general}>
              {t(article.category as any, language)}
            </Badge>
            <span className="text-xs text-muted-foreground">{article.source}</span>
            <span className="text-xs text-muted-foreground">
              {article.published_at ? formatTimeAgo(article.published_at, language) : ''}
            </span>
          </div>

          <h3 className="mb-2 line-clamp-2 text-base font-semibold leading-tight text-foreground group-hover:text-primary transition-colors">
            {article.title}
          </h3>

          {article.description && (
            <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">{article.description}</p>
          )}

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="h-8 gap-1 px-2" onClick={handleLike}>
              <Heart className={`h-4 w-4 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
              <span className="text-xs">{article.like_count}</span>
            </Button>
            <Button variant="ghost" size="sm" className="h-8 gap-1 px-2">
              <MessageCircle className="h-4 w-4" />
              <span className="text-xs">{article.comment_count}</span>
            </Button>
            <Button variant="ghost" size="sm" className="h-8 gap-1 px-2" onClick={handleBookmark}>
              <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-saffron text-saffron' : ''}`} />
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 px-2 opacity-50 cursor-not-allowed" disabled>
                  <Share2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('shareNotAvailable', language)}</TooltipContent>
            </Tooltip>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default NewsCard;
