import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, TrendingUp, Users, Bookmark, User, Moon, Sun, Globe } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const Header: React.FC = () => {
  const { user, profile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const location = useLocation();

  const navItems = [
    { path: '/', icon: Home, label: t('home', language) },
    { path: '/trending', icon: TrendingUp, label: t('trending', language) },
    { path: '/community', icon: Users, label: t('community', language) },
  ];

  return (
    <header className="sticky top-0 z-50 glass-card border-b">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg hero-gradient relative shadow-sm group-hover:shadow-md transition-shadow">
            <span className="relative z-10 text-sm font-black text-primary-foreground">H</span>
          </div>
          <div className="hidden sm:block">
            <h1 className="text-base font-bold text-foreground tracking-tight">{t('appName', language)}</h1>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-0.5">
          {navItems.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path}>
                <Button
                  variant={isActive ? 'default' : 'ghost'}
                  size="sm"
                  className={`gap-1.5 rounded-lg text-xs h-8 ${isActive ? 'bg-gradient-to-r from-primary to-primary/80 shadow-sm' : 'hover:bg-muted'}`}
                >
                  <item.icon className="h-3.5 w-3.5" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-lg h-8 w-8"
            onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
            title={t('language', language)}
          >
            <span className="text-xs font-bold">{language === 'en' ? 'हि' : 'EN'}</span>
          </Button>
          <Button variant="ghost" size="icon" className="rounded-lg h-8 w-8" onClick={toggleTheme}>
            {theme === 'light' ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
          </Button>
          {user ? (
            <div className="flex items-center gap-1">
              <Link to="/bookmarks">
                <Button variant="ghost" size="icon" className="rounded-lg h-8 w-8">
                  <Bookmark className="h-3.5 w-3.5" />
                </Button>
              </Link>
              <Link to="/profile">
                <Avatar className="h-7 w-7 cursor-pointer ring-2 ring-primary/20 hover:ring-primary/50 transition-all">
                  <AvatarImage src={profile?.avatar_url || ''} />
                  <AvatarFallback className="text-[10px] bg-gradient-to-br from-primary to-accent text-primary-foreground font-bold">
                    {(profile?.display_name || user?.email || 'U')[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Link>
            </div>
          ) : (
            <Link to="/auth">
              <Button size="sm" className="rounded-lg h-8 bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 shadow-sm text-xs font-semibold px-4">
                {t('login', language)}
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
