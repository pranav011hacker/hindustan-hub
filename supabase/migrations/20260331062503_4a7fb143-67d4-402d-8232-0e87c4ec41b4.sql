
-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  preferred_language TEXT NOT NULL DEFAULT 'en',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- User roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- Articles (cached from RSS)
CREATE TABLE public.articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  source TEXT NOT NULL,
  source_url TEXT NOT NULL UNIQUE,
  image_url TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  like_count INT NOT NULL DEFAULT 0,
  comment_count INT NOT NULL DEFAULT 0
);
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Articles readable by everyone" ON public.articles FOR SELECT USING (true);
CREATE POLICY "Service role can insert articles" ON public.articles FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can update articles" ON public.articles FOR UPDATE USING (true);
CREATE INDEX idx_articles_category ON public.articles(category);
CREATE INDEX idx_articles_published_at ON public.articles(published_at DESC);

-- Likes
CREATE TABLE public.likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, article_id)
);
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Likes readable by everyone" ON public.likes FOR SELECT USING (true);
CREATE POLICY "Users can insert own likes" ON public.likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own likes" ON public.likes FOR DELETE USING (auth.uid() = user_id);

-- Update article like_count via trigger
CREATE OR REPLACE FUNCTION public.update_article_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.articles SET like_count = like_count + 1 WHERE id = NEW.article_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.articles SET like_count = like_count - 1 WHERE id = OLD.article_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_like_change AFTER INSERT OR DELETE ON public.likes
FOR EACH ROW EXECUTE FUNCTION public.update_article_like_count();

-- Comments
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  upvotes INT NOT NULL DEFAULT 0,
  downvotes INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comments readable by everyone" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Users can insert own comments" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own comments" ON public.comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON public.comments FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Update article comment_count via trigger
CREATE OR REPLACE FUNCTION public.update_article_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.articles SET comment_count = comment_count + 1 WHERE id = NEW.article_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.articles SET comment_count = comment_count - 1 WHERE id = OLD.article_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_comment_change AFTER INSERT OR DELETE ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.update_article_comment_count();

-- Bookmarks
CREATE TABLE public.bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, article_id)
);
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own bookmarks" ON public.bookmarks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own bookmarks" ON public.bookmarks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own bookmarks" ON public.bookmarks FOR DELETE USING (auth.uid() = user_id);

-- Community Issues (Support/Protest)
CREATE TABLE public.community_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  support_count INT NOT NULL DEFAULT 0,
  protest_count INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.community_issues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Issues readable by everyone" ON public.community_issues FOR SELECT USING (true);
CREATE POLICY "Users can create issues" ON public.community_issues FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own issues" ON public.community_issues FOR UPDATE USING (auth.uid() = user_id);
CREATE TRIGGER update_issues_updated_at BEFORE UPDATE ON public.community_issues FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Issue Votes
CREATE TABLE public.issue_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  issue_id UUID NOT NULL REFERENCES public.community_issues(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('support', 'protest')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, issue_id)
);
ALTER TABLE public.issue_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Votes readable by everyone" ON public.issue_votes FOR SELECT USING (true);
CREATE POLICY "Users can insert own votes" ON public.issue_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own votes" ON public.issue_votes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own votes" ON public.issue_votes FOR DELETE USING (auth.uid() = user_id);

-- Update issue vote counts via trigger
CREATE OR REPLACE FUNCTION public.update_issue_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.vote_type = 'support' THEN
      UPDATE public.community_issues SET support_count = support_count + 1 WHERE id = NEW.issue_id;
    ELSE
      UPDATE public.community_issues SET protest_count = protest_count + 1 WHERE id = NEW.issue_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.vote_type = 'support' THEN
      UPDATE public.community_issues SET support_count = support_count - 1 WHERE id = OLD.issue_id;
    ELSE
      UPDATE public.community_issues SET protest_count = protest_count - 1 WHERE id = OLD.issue_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.vote_type = 'support' THEN
      UPDATE public.community_issues SET support_count = support_count - 1 WHERE id = OLD.issue_id;
    ELSE
      UPDATE public.community_issues SET protest_count = protest_count - 1 WHERE id = OLD.issue_id;
    END IF;
    IF NEW.vote_type = 'support' THEN
      UPDATE public.community_issues SET support_count = support_count + 1 WHERE id = NEW.issue_id;
    ELSE
      UPDATE public.community_issues SET protest_count = protest_count + 1 WHERE id = NEW.issue_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_issue_vote_change AFTER INSERT OR UPDATE OR DELETE ON public.issue_votes
FOR EACH ROW EXECUTE FUNCTION public.update_issue_vote_counts();

-- Petitions
CREATE TABLE public.petitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  target_goal INT NOT NULL DEFAULT 100,
  signature_count INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.petitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Petitions readable by everyone" ON public.petitions FOR SELECT USING (true);
CREATE POLICY "Users can create petitions" ON public.petitions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own petitions" ON public.petitions FOR UPDATE USING (auth.uid() = user_id);
CREATE TRIGGER update_petitions_updated_at BEFORE UPDATE ON public.petitions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Petition Signatures
CREATE TABLE public.petition_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  petition_id UUID NOT NULL REFERENCES public.petitions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, petition_id)
);
ALTER TABLE public.petition_signatures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signatures readable by everyone" ON public.petition_signatures FOR SELECT USING (true);
CREATE POLICY "Users can sign petitions" ON public.petition_signatures FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove own signatures" ON public.petition_signatures FOR DELETE USING (auth.uid() = user_id);

-- Update petition signature_count via trigger
CREATE OR REPLACE FUNCTION public.update_petition_signature_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.petitions SET signature_count = signature_count + 1 WHERE id = NEW.petition_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.petitions SET signature_count = signature_count - 1 WHERE id = OLD.petition_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_signature_change AFTER INSERT OR DELETE ON public.petition_signatures
FOR EACH ROW EXECUTE FUNCTION public.update_petition_signature_count();
