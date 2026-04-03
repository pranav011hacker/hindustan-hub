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
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur-xl md:hidden bottom-nav-shadow">
      <div className="flex items-center justify-around py-1.5 pb-[env(safe-area-inset-bottom)]">
        {items.map(item => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.label}
              to={item.path}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-medium transition-all ${
                isActive ? 'text-primary scale-105' : 'text-muted-foreground'
              }`}
            >
              <div className={`p-1 rounded-lg transition-colors ${isActive ? 'bg-primary/10' : ''}`}>
                <item.icon className={`h-4.5 w-4.5 ${isActive ? 'text-primary' : ''}`} style={{ width: 20, height: 20 }} />
              </div>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
