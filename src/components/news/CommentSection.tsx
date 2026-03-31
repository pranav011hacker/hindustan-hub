import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Send, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { t, formatTimeAgo } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface CommentSectionProps {
  articleId: string;
}

const CommentSection: React.FC<CommentSectionProps> = ({ articleId }) => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);

  const { data: comments = [] } = useQuery({
    queryKey: ['comments', articleId],
    queryFn: async () => {
      const { data } = await supabase
        .from('comments')
        .select('*')
        .eq('article_id', articleId)
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  const { data: profiles = {} } = useQuery({
    queryKey: ['comment-profiles', articleId],
    queryFn: async () => {
      const userIds = [...new Set(comments.map(c => c.user_id))];
      if (userIds.length === 0) return {};
      const { data } = await supabase.from('profiles').select('*').in('user_id', userIds);
      const map: Record<string, any> = {};
      data?.forEach(p => { map[p.user_id] = p; });
      return map;
    },
    enabled: comments.length > 0,
  });

  const handleSubmit = async () => {
    if (!user) { toast({ title: 'Please sign in to comment' }); return; }
    if (!newComment.trim()) return;

    await supabase.from('comments').insert({
      user_id: user.id,
      article_id: articleId,
      content: newComment.trim(),
      parent_id: replyTo,
    });

    setNewComment('');
    setReplyTo(null);
    queryClient.invalidateQueries({ queryKey: ['comments', articleId] });
    queryClient.invalidateQueries({ queryKey: ['articles'] });
  };

  const topLevelComments = comments.filter(c => !c.parent_id);
  const replies = comments.filter(c => c.parent_id);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">{t('comments', language)} ({comments.length})</h3>

      {user && (
        <div className="flex gap-3">
          <Textarea
            placeholder={t('addComment', language)}
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            className="min-h-[60px] flex-1"
          />
          <Button onClick={handleSubmit} size="icon" className="self-end">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {topLevelComments.map(comment => {
          const profile = profiles[comment.user_id];
          const commentReplies = replies.filter(r => r.parent_id === comment.id);

          return (
            <div key={comment.id} className="space-y-2">
              <div className="rounded-lg bg-muted/50 p-3">
                <div className="mb-1 flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={profile?.avatar_url || ''} />
                    <AvatarFallback className="text-xs">
                      {(profile?.display_name || 'U')[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{profile?.display_name || 'User'}</span>
                  <span className="text-xs text-muted-foreground">{formatTimeAgo(comment.created_at, language)}</span>
                </div>
                <p className="text-sm">{comment.content}</p>
                <div className="mt-2 flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="h-6 gap-1 px-1 text-xs">
                    <ThumbsUp className="h-3 w-3" /> {comment.upvotes}
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 gap-1 px-1 text-xs">
                    <ThumbsDown className="h-3 w-3" /> {comment.downvotes}
                  </Button>
                  {user && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-1 text-xs"
                      onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                    >
                      Reply
                    </Button>
                  )}
                </div>
              </div>

              {replyTo === comment.id && (
                <div className="ml-8 flex gap-2">
                  <Textarea
                    placeholder="Reply..."
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    className="min-h-[40px] flex-1 text-sm"
                  />
                  <Button onClick={handleSubmit} size="sm">
                    <Send className="h-3 w-3" />
                  </Button>
                </div>
              )}

              {commentReplies.map(reply => {
                const replyProfile = profiles[reply.user_id];
                return (
                  <div key={reply.id} className="ml-8 rounded-lg bg-muted/30 p-3">
                    <div className="mb-1 flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={replyProfile?.avatar_url || ''} />
                        <AvatarFallback className="text-[10px]">
                          {(replyProfile?.display_name || 'U')[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-medium">{replyProfile?.display_name || 'User'}</span>
                      <span className="text-[10px] text-muted-foreground">{formatTimeAgo(reply.created_at, language)}</span>
                    </div>
                    <p className="text-sm">{reply.content}</p>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CommentSection;
