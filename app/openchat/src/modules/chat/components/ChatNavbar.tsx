
import React from 'react';
import { navigate } from '../../../router';
import { Navbar } from '../../../components/Navbar/Navbar';

interface ChatNavbarProps {
  title: string;
  onBack: () => void;
  sessionId: string; // Added sessionId prop
}

const Icons = {
  more: <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="6" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="18" cy="12" r="2"/></svg>,
};

export const ChatNavbar: React.FC<ChatNavbarProps> = ({ title, onBack, sessionId }) => {
  const handleMenuClick = () => {
     // Navigate to the specific details page for this session
     navigate('/chat/details', { id: sessionId });
  };

  const RightElement = (
      <div 
        onClick={handleMenuClick}
        style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', opacity: 0.9, cursor: 'pointer', color: 'var(--text-primary)' }}
      >
        {Icons.more}
      </div>
  );

  return (
    <Navbar 
        title={title} 
        onBack={onBack} 
        rightElement={RightElement}
        backFallback="/"
    />
  );
};
