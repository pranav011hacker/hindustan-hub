import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LogOut, Heart, MessageCircle, Bookmark, FileSignature } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { t } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import { Navigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

const Profile: React.FC = () => {
  const { user, profile, loading, signOut, refreshProfile } = useAuth();
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.display_name || '');

  const { data: stats } = useQuery({
    queryKey: ['user-stats', user?.id],
    queryFn: async () => {
      if (!user) return { likes: 0, comments: 0, bookmarks: 0, petitions: 0 };
      const [likes, comments, bookmarks, petitions] = await Promise.all([
        supabase.from('likes').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('comments').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('bookmarks').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('petition_signatures').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      ]);
      return {
        likes: likes.count || 0,
        comments: comments.count || 0,
        bookmarks: bookmarks.count || 0,
        petitions: petitions.count || 0,
      };
    },
    enabled: !!user,
  });

  const handleUpdateProfile = async () => {
    if (!user) return;
    await supabase.from('profiles').update({ display_name: displayName }).eq('user_id', user.id);
    await refreshProfile();
    setEditing(false);
    toast({ title: 'Profile updated!' });
  };

  if (!loading && !user) return <Navigate to="/auth" />;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card>
        <CardContent className="flex items-center gap-4 p-6">
          <Avatar className="h-16 w-16">
            <AvatarImage src={profile?.avatar_url || ''} />
            <AvatarFallback className="text-xl">
              {(profile?.display_name || user?.email || 'U')[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            {editing ? (
              <div className="flex gap-2">
                <Input value={displayName} onChange={e => setDisplayName(e.target.value)} className="max-w-[200px]" />
                <Button size="sm" onClick={handleUpdateProfile}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>{t('cancel', language)}</Button>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold">{profile?.display_name || 'User'}</h2>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                <Button variant="ghost" size="sm" className="mt-1 h-7 px-2 text-xs" onClick={() => { setDisplayName(profile?.display_name || ''); setEditing(true); }}>
                  {t('editProfile', language)}
                </Button>
              </>
            )}
          </div>
          <Button variant="outline" size="sm" className="gap-1" onClick={signOut}>
            <LogOut className="h-4 w-4" />
            {t('logout', language)}
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-4 gap-3">
        {[
          { icon: Heart, label: t('myLikes', language), count: stats?.likes || 0, color: 'text-red-500' },
          { icon: MessageCircle, label: t('myComments', language), count: stats?.comments || 0, color: 'text-blue-500' },
          { icon: Bookmark, label: t('savedArticles', language), count: stats?.bookmarks || 0, color: 'text-saffron' },
          { icon: FileSignature, label: t('petitions', language), count: stats?.petitions || 0, color: 'text-green-500' },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="flex flex-col items-center p-4">
              <stat.icon className={`h-5 w-5 ${stat.color} mb-1`} />
              <span className="text-2xl font-bold">{stat.count}</span>
              <span className="text-[10px] text-muted-foreground text-center">{stat.label}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('yourActivity', language)}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {language === 'en'
              ? 'Your recent activity will appear here as you interact with news and community features.'
              : 'जैसे-जैसे आप समाचार और समुदाय सुविधाओं के साथ बातचीत करेंगे, आपकी हालिया गतिविधि यहाँ दिखाई देगी।'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
