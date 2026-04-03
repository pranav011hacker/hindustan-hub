import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User as UserIcon, KeyRound, Shield, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useLanguage } from '@/contexts/LanguageContext';
import { t } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';

type AuthStep = 'form' | 'otp';

const Auth: React.FC = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<AuthStep>('form');
  const [otp, setOtp] = useState('');

  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [navigate, user]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate('/');
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        setStep('otp');
        toast({ title: language === 'hi' ? 'OTP भेजा गया है, अपना ईमेल जाँचें' : 'OTP sent! Check your email for verification code' });
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'signup',
      });
      if (error) throw error;
      toast({ title: language === 'hi' ? 'सत्यापन सफल!' : 'Verified successfully!' });
      navigate('/');
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });

      if (result.error) {
        throw result.error;
      }

      if (result.redirected) {
        return;
      }

      navigate('/');
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
      toast({ title: language === 'hi' ? 'OTP दोबारा भेजा गया' : 'OTP resent. Check your inbox.' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: Zap, text: language === 'hi' ? 'AI वॉइस न्यूज़ सर्च' : 'AI Voice News Search' },
    { icon: Shield, text: language === 'hi' ? 'सुरक्षित और विज्ञापन-मुक्त' : 'Secure & Ad-free' },
  ];

  return (
    <div className="auth-bg flex min-h-[85vh] items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="glass-card shadow-2xl border-0 overflow-hidden">
          {/* Decorative top bar */}
          <div className="h-1.5 bg-gradient-to-r from-primary via-accent to-saffron" />

          <CardHeader className="text-center pb-2 pt-6">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="mx-auto mb-4 flex h-18 w-18 items-center justify-center rounded-2xl hero-gradient relative shadow-lg"
              style={{ width: 72, height: 72 }}
            >
              <span className="relative z-10 text-3xl font-black text-primary-foreground tracking-tight">H</span>
            </motion.div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              {t('appName', language)}
            </CardTitle>
            <CardDescription className="text-sm mt-1">
              {step === 'otp'
                ? (language === 'hi' ? 'OTP से अपना ईमेल सत्यापित करें' : 'Verify your email with OTP')
                : (isLogin
                  ? (language === 'hi' ? 'अपने खाते में लॉगिन करें' : 'Welcome back! Sign in to continue')
                  : (language === 'hi' ? 'नया खाता बनाएं' : 'Create your account to get started'))}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pb-6">
            {step === 'otp' ? (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-5"
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-accent/20 to-primary/20">
                    <KeyRound className="h-7 w-7 text-accent" />
                  </div>
                  <p className="text-sm text-center text-muted-foreground">
                    {language === 'hi'
                      ? `${email} पर भेजा गया 6 अंकों का कोड दर्ज करें`
                      : `Enter the 6-digit code sent to ${email}`}
                  </p>
                  <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <Button className="w-full h-11 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 shadow-md" onClick={handleVerifyOtp} disabled={loading || otp.length < 6}>
                  {loading ? t('loading', language) : (language === 'hi' ? 'सत्यापित करें' : 'Verify & Continue')}
                </Button>
                <div className="flex items-center justify-between">
                  <button onClick={() => setStep('form')} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    ← {language === 'hi' ? 'वापस जाएँ' : 'Back'}
                  </button>
                  <button onClick={handleResendOtp} className="text-sm text-primary hover:underline font-medium" disabled={loading}>
                    {language === 'hi' ? 'OTP दोबारा भेजें' : 'Resend OTP'}
                  </button>
                </div>
              </motion.div>
            ) : (
              <>
                <Button
                  variant="outline"
                  className="w-full gap-3 h-12 rounded-xl border-2 hover:bg-muted/50 transition-all font-medium"
                  onClick={handleGoogleAuth}
                  disabled={loading}
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  {t('continueWithGoogle', language)}
                </Button>

                <div className="relative my-1">
                  <Separator />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted-foreground font-medium">
                    {t('orContinueWith', language)}
                  </span>
                </div>

                <form onSubmit={handleEmailAuth} className="space-y-3">
                  {!isLogin && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('name', language)}</Label>
                      <div className="relative">
                        <UserIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input placeholder={t('name', language)} value={name} onChange={e => setName(e.target.value)} className="pl-9 h-11 rounded-xl border-2 focus:border-primary transition-colors" required />
                      </div>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('email', language)}</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input type="email" placeholder={t('email', language)} value={email} onChange={e => setEmail(e.target.value)} className="pl-9 h-11 rounded-xl border-2 focus:border-primary transition-colors" required />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('password', language)}</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="pl-9 h-11 rounded-xl border-2 focus:border-primary transition-colors" required />
                    </div>
                  </div>
                  <Button type="submit" className="w-full h-11 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 shadow-md font-semibold" disabled={loading}>
                    {loading ? t('loading', language) : isLogin ? t('login', language) : t('signUp', language)}
                  </Button>
                </form>

                <p className="text-center text-sm text-muted-foreground">
                  {isLogin ? t('noAccount', language) : t('haveAccount', language)}{' '}
                  <button onClick={() => setIsLogin(!isLogin)} className="text-primary font-semibold hover:underline underline-offset-2">
                    {isLogin ? t('signUp', language) : t('login', language)}
                  </button>
                </p>

                {/* Trust badges */}
                <div className="flex items-center justify-center gap-4 pt-2">
                  {features.map((f, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <f.icon className="h-3.5 w-3.5 text-accent" />
                      <span>{f.text}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Auth;
