import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import IssueCard from '@/components/community/IssueCard';
import PetitionCard from '@/components/community/PetitionCard';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { t } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

const Community: React.FC = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('issues');
  const [petitionFilter, setPetitionFilter] = useState('all');
  const [showCreateIssue, setShowCreateIssue] = useState(false);
  const [showCreatePetition, setShowCreatePetition] = useState(false);
  const [issueTitle, setIssueTitle] = useState('');
  const [issueDesc, setIssueDesc] = useState('');
  const [issueCategory, setIssueCategory] = useState('general');
  const [petitionTitle, setPetitionTitle] = useState('');
  const [petitionDesc, setPetitionDesc] = useState('');
  const [petitionGoal, setPetitionGoal] = useState('100');

  const { data: issues = [], isLoading: issuesLoading } = useQuery({
    queryKey: ['community-issues'],
    queryFn: async () => {
      const { data } = await supabase.from('community_issues').select('*').order('created_at', { ascending: false });
      return data || [];
    },
  });

  const { data: issueVotes = {} } = useQuery({
    queryKey: ['issue-votes', user?.id],
    queryFn: async () => {
      if (!user) return {};
      const { data } = await supabase.from('issue_votes').select('issue_id, vote_type').eq('user_id', user.id);
      const map: Record<string, string> = {};
      data?.forEach(v => { map[v.issue_id] = v.vote_type; });
      return map;
    },
    enabled: !!user,
  });

  const { data: petitions = [], isLoading: petitionsLoading } = useQuery({
    queryKey: ['petitions', petitionFilter],
    queryFn: async () => {
      let query = supabase.from('petitions').select('*').order('created_at', { ascending: false });
      if (petitionFilter === 'active') query = query.eq('status', 'active');
      if (petitionFilter === 'completed') query = query.eq('status', 'completed');
      if (petitionFilter === 'mine' && user) query = query.eq('user_id', user.id);
      const { data } = await query;
      return data || [];
    },
  });

  const { data: petitionSigs = [] } = useQuery({
    queryKey: ['petition-signatures', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from('petition_signatures').select('petition_id').eq('user_id', user.id);
      return data?.map(s => s.petition_id) || [];
    },
    enabled: !!user,
  });

  const handleCreateIssue = async () => {
    if (!user) { toast({ title: 'Please sign in' }); return; }
    if (!issueTitle.trim() || !issueDesc.trim()) return;

    await supabase.from('community_issues').insert({
      user_id: user.id,
      title: issueTitle,
      description: issueDesc,
      category: issueCategory,
    });

    setIssueTitle(''); setIssueDesc(''); setShowCreateIssue(false);
    queryClient.invalidateQueries({ queryKey: ['community-issues'] });
    toast({ title: 'Issue created!' });
  };

  const handleCreatePetition = async () => {
    if (!user) { toast({ title: 'Please sign in' }); return; }
    if (!petitionTitle.trim() || !petitionDesc.trim()) return;

    await supabase.from('petitions').insert({
      user_id: user.id,
      title: petitionTitle,
      description: petitionDesc,
      target_goal: parseInt(petitionGoal) || 100,
    });

    setPetitionTitle(''); setPetitionDesc(''); setShowCreatePetition(false);
    queryClient.invalidateQueries({ queryKey: ['petitions'] });
    toast({ title: 'Petition created!' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('community', language)}</h1>
          <p className="text-sm text-muted-foreground">
            {language === 'en' ? 'Voice your opinion on national issues' : 'राष्ट्रीय मुद्दों पर अपनी राय दें'}
          </p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="issues">{t('issues', language)}</TabsTrigger>
          <TabsTrigger value="petitions">{t('petitions', language)}</TabsTrigger>
        </TabsList>

        <TabsContent value="issues" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={showCreateIssue} onOpenChange={setShowCreateIssue}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1">
                  <Plus className="h-4 w-4" /> {t('createIssue', language)}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('createIssue', language)}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>{t('title', language)}</Label>
                    <Input value={issueTitle} onChange={e => setIssueTitle(e.target.value)} />
                  </div>
                  <div>
                    <Label>{t('description', language)}</Label>
                    <Textarea value={issueDesc} onChange={e => setIssueDesc(e.target.value)} />
                  </div>
                  <div>
                    <Label>{t('category', language)}</Label>
                    <Select value={issueCategory} onValueChange={setIssueCategory}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">{t('general', language)}</SelectItem>
                        <SelectItem value="politics">{t('politics', language)}</SelectItem>
                        <SelectItem value="sports">{t('sports', language)}</SelectItem>
                        <SelectItem value="technology">{t('technology', language)}</SelectItem>
                        <SelectItem value="business">{t('business', language)}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowCreateIssue(false)}>{t('cancel', language)}</Button>
                    <Button onClick={handleCreateIssue}>{t('submit', language)}</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {issuesLoading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}</div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {issues.map(issue => (
                <IssueCard key={issue.id} issue={issue} userVote={issueVotes[issue.id]} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="petitions" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {['all', 'active', 'completed', 'mine'].map(f => (
                <Button
                  key={f}
                  variant={petitionFilter === f ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setPetitionFilter(f)}
                >
                  {f === 'all' ? t('allCategories', language) :
                   f === 'active' ? t('active', language) :
                   f === 'completed' ? t('completed', language) :
                   t('myPetitions', language)}
                </Button>
              ))}
            </div>
            <Dialog open={showCreatePetition} onOpenChange={setShowCreatePetition}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1">
                  <Plus className="h-4 w-4" /> {t('createPetition', language)}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('createPetition', language)}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>{t('title', language)}</Label>
                    <Input value={petitionTitle} onChange={e => setPetitionTitle(e.target.value)} />
                  </div>
                  <div>
                    <Label>{t('description', language)}</Label>
                    <Textarea value={petitionDesc} onChange={e => setPetitionDesc(e.target.value)} />
                  </div>
                  <div>
                    <Label>{t('targetGoal', language)}</Label>
                    <Input type="number" value={petitionGoal} onChange={e => setPetitionGoal(e.target.value)} />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowCreatePetition(false)}>{t('cancel', language)}</Button>
                    <Button onClick={handleCreatePetition}>{t('submit', language)}</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {petitionsLoading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}</div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {petitions.map(petition => (
                <PetitionCard key={petition.id} petition={petition} isSigned={petitionSigs.includes(petition.id)} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Community;
