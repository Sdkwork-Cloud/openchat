
import React from 'react';
import { Tabbar } from '../../components/Tabbar';
import { FloatingBall } from '../../components/FloatingBall/FloatingBall';
import { MiniPlayer } from '../../components/MiniPlayer/MiniPlayer';
import '../../styles/safe-area.css';
import './MobileLayout.css';

interface MobileLayoutProps {
  children: React.ReactNode;
}

export const MobileLayout: React.FC<MobileLayoutProps> = ({ children }) => {
  return (
    <div className="mobile-layout">
      <main className="mobile-layout__content">
        {children}
      </main>
      
      {/* Global Interactive Layers */}
      <MiniPlayer />
      <FloatingBall />
      
      <Tabbar />
    </div>
  );
};
