import React from 'react';
import Header from './Header';
import BottomNav from './BottomNav';

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-4 pb-20 md:pb-4">
        {children}
      </main>
      <BottomNav />
    </div>
  );
};

export default AppLayout;
