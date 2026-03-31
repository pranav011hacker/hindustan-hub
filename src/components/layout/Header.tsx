import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, TrendingUp, Users, Bookmark, User, Moon, Sun, Globe } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';

const Header: React.FC = () => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const location = useLocation();

  const navItems = [
    { path: '/', icon: Home, label: t('home', language) },
    { path: '/trending', icon: TrendingUp, label: t('trending', language) },
    { path: '/community', icon: Users, label: t('community', language) },
  ];

  return (
    <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-lg">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <span className="text-lg font-bold text-primary-foreground">H</span>
          </div>
          <div className="hidden sm:block">
            <h1 className="text-lg font-bold text-foreground">{t('appName', language)}</h1>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navItems.map(item => (
            <Link key={item.path} to={item.path}>
              <Button
                variant={location.pathname === item.path ? 'default' : 'ghost'}
                size="sm"
                className="gap-2"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Button>
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
            title={t('language', language)}
          >
            <Globe className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            title={theme === 'light' ? t('darkMode', language) : t('lightMode', language)}
          >
            {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </Button>
          {user ? (
            <div className="flex items-center gap-2">
              <Link to="/bookmarks">
                <Button variant="ghost" size="icon">
                  <Bookmark className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/profile">
                <Button variant="ghost" size="icon">
                  <User className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          ) : (
            <Link to="/auth">
              <Button size="sm" className="bg-saffron text-white hover:bg-saffron/90">
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
