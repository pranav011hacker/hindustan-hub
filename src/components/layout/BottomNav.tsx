import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, TrendingUp, Users, Bookmark, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { t } from '@/lib/i18n';

const BottomNav: React.FC = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const location = useLocation();

  const items = [
    { path: '/', icon: Home, label: t('home', language) },
    { path: '/trending', icon: TrendingUp, label: t('trending', language) },
    { path: '/community', icon: Users, label: t('community', language) },
    { path: user ? '/bookmarks' : '/auth', icon: Bookmark, label: t('bookmarks', language) },
    { path: user ? '/profile' : '/auth', icon: User, label: t('profile', language) },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur-lg md:hidden">
      <div className="flex items-center justify-around py-2">
        {items.map(item => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.label}
              to={item.path}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 text-xs transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <item.icon className={`h-5 w-5 ${isActive ? 'text-saffron' : ''}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
