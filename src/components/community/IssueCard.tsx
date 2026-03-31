import React from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { t, formatTimeAgo } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

interface IssueCardProps {
  issue: Tables<'community_issues'>;
  userVote?: string | null;
}

const IssueCard: React.FC<IssueCardProps> = ({ issue, userVote }) => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const queryClient = useQueryClient();

  const totalVotes = issue.support_count + issue.protest_count;
  const supportPercent = totalVotes > 0 ? (issue.support_count / totalVotes) * 100 : 50;

  const handleVote = async (voteType: 'support' | 'protest') => {
    if (!user) { toast({ title: 'Please sign in to vote' }); return; }

    if (userVote === voteType) {
      await supabase.from('issue_votes').delete().eq('user_id', user.id).eq('issue_id', issue.id);
    } else if (userVote) {
      await supabase.from('issue_votes')
        .update({ vote_type: voteType })
        .eq('user_id', user.id)
        .eq('issue_id', issue.id);
    } else {
      await supabase.from('issue_votes').insert({
        user_id: user.id,
        issue_id: issue.id,
        vote_type: voteType,
      });
    }
    queryClient.invalidateQueries({ queryKey: ['community-issues'] });
    queryClient.invalidateQueries({ queryKey: ['issue-votes'] });
  };

  return (
    <Card className="animate-fade-in">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{issue.title}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{issue.description}</p>
          </div>
          <Badge variant={issue.status === 'active' ? 'default' : 'secondary'}>
            {issue.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-success font-medium">{t('support', language)}: {issue.support_count}</span>
            <span className="text-protest font-medium">{t('protest', language)}: {issue.protest_count}</span>
          </div>
          <div className="relative h-3 rounded-full bg-muted overflow-hidden">
            <div
              className="absolute left-0 top-0 h-full rounded-l-full bg-success transition-all"
              style={{ width: `${supportPercent}%` }}
            />
            <div
              className="absolute right-0 top-0 h-full rounded-r-full bg-protest transition-all"
              style={{ width: `${100 - supportPercent}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={userVote === 'support' ? 'default' : 'outline'}
            size="sm"
            className={`flex-1 gap-1 ${userVote === 'support' ? 'bg-success hover:bg-success/90' : ''}`}
            onClick={() => handleVote('support')}
          >
            <ThumbsUp className="h-4 w-4" />
            {t('support', language)}
          </Button>
          <Button
            variant={userVote === 'protest' ? 'default' : 'outline'}
            size="sm"
            className={`flex-1 gap-1 ${userVote === 'protest' ? 'bg-protest hover:bg-protest/90' : ''}`}
            onClick={() => handleVote('protest')}
          >
            <ThumbsDown className="h-4 w-4" />
            {t('protest', language)}
          </Button>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{totalVotes} {t('votes', language)}</span>
          <span>{formatTimeAgo(issue.created_at, language)}</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default IssueCard;
