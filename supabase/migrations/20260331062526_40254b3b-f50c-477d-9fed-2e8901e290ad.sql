
-- Fix overly permissive policies on articles table
-- Edge functions use service_role which bypasses RLS, so we can restrict these
DROP POLICY "Service role can insert articles" ON public.articles;
DROP POLICY "Service role can update articles" ON public.articles;

-- Only admins can insert/update articles via client (edge function uses service role to bypass RLS)
CREATE POLICY "Admins can insert articles" ON public.articles FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update articles" ON public.articles FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
