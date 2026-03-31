import React from 'react';
import { FileSignature } from 'lucide-react';
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

interface PetitionCardProps {
  petition: Tables<'petitions'>;
  isSigned?: boolean;
}

const PetitionCard: React.FC<PetitionCardProps> = ({ petition, isSigned = false }) => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const queryClient = useQueryClient();

  const progress = Math.min((petition.signature_count / petition.target_goal) * 100, 100);

  const handleSign = async () => {
    if (!user) { toast({ title: 'Please sign in to sign petitions' }); return; }

    if (isSigned) {
      await supabase.from('petition_signatures').delete().eq('user_id', user.id).eq('petition_id', petition.id);
    } else {
      await supabase.from('petition_signatures').insert({ user_id: user.id, petition_id: petition.id });
    }
    queryClient.invalidateQueries({ queryKey: ['petitions'] });
    queryClient.invalidateQueries({ queryKey: ['petition-signatures'] });
  };

  return (
    <Card className="animate-fade-in">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base">{petition.title}</CardTitle>
          <Badge variant={petition.status === 'active' ? 'default' : 'secondary'}>
            {petition.status === 'active' ? t('active', language) : t('completed', language)}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{petition.description}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span>{petition.signature_count} {t('signatures', language)}</span>
            <span>{t('goal', language)}: {petition.target_goal}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{formatTimeAgo(petition.created_at, language)}</span>
          <Button
            size="sm"
            variant={isSigned ? 'secondary' : 'default'}
            className="gap-1"
            onClick={handleSign}
          >
            <FileSignature className="h-4 w-4" />
            {isSigned ? t('signed', language) : t('signPetition', language)}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PetitionCard;
