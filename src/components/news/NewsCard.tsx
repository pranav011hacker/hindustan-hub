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
import { buildHindiSummary } from '@/lib/hindiSummary';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

interface NewsCardProps {
  article: Tables<'articles'>;
  isLiked?: boolean;
  isBookmarked?: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  politics: 'bg-blue-600',
  sports: 'bg-emerald-600',
  technology: 'bg-violet-600',
  business: 'bg-amber-600',
  entertainment: 'bg-pink-600',
  world: 'bg-cyan-600',
  general: 'bg-primary',
};

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

  const hindiSummary = buildHindiSummary(article);
  const categoryColor = CATEGORY_COLORS[article.category] || CATEGORY_COLORS.general;

  return (
    <Link to={`/article/${article.id}`}>
      <Card className="news-card-pro group overflow-hidden bg-card border animate-fade-in h-full">
        {article.image_url && (
          <div className="aspect-[16/10] overflow-hidden relative">
            <img
              src={article.image_url}
              alt={article.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
            <Badge className={`absolute top-3 left-3 ${categoryColor} text-white text-[10px] font-semibold backdrop-blur-sm border-0 shadow-sm`}>
              {t(article.category as any, language)}
            </Badge>
          </div>
        )}
        {!article.image_url && (
          <div className="h-2 bg-gradient-to-r from-primary to-accent" />
        )}
        <CardContent className="p-4">
          <div className="mb-2 flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="font-semibold text-foreground/70">{article.source}</span>
            <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
            <span>{article.published_at ? formatTimeAgo(article.published_at, language) : ''}</span>
          </div>

          <h3 className="mb-2 line-clamp-2 text-sm font-bold leading-snug text-foreground group-hover:text-primary transition-colors">
            {article.title}
          </h3>

          <p className="mb-3 line-clamp-2 text-xs text-muted-foreground leading-relaxed">{hindiSummary}</p>

          <div className="flex items-center gap-0.5 pt-2 border-t border-border/40">
            <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 rounded-md text-xs" onClick={handleLike}>
              <Heart className={`h-3 w-3 transition-colors ${isLiked ? 'fill-destructive text-destructive' : ''}`} />
              <span>{article.like_count}</span>
            </Button>
            <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 rounded-md text-xs">
              <MessageCircle className="h-3 w-3" />
              <span>{article.comment_count}</span>
            </Button>
            <Button variant="ghost" size="sm" className="h-7 px-2 rounded-md" onClick={handleBookmark}>
              <Bookmark className={`h-3 w-3 transition-colors ${isBookmarked ? 'fill-accent text-accent' : ''}`} />
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 px-2 rounded-md opacity-30 cursor-not-allowed" disabled>
                  <Share2 className="h-3 w-3" />
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
