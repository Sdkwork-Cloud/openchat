
import React from 'react';
import { navigate } from '../../../router';
import { Navbar } from '../../../components/Navbar/Navbar';
import { Icon } from '../../../components/Icon/Icon';

interface ChatNavbarProps {
  title: string;
  onBack: () => void;
  sessionId: string;
  variant?: 'default' | 'transparent';
}

export const ChatNavbar: React.FC<ChatNavbarProps> = ({ title, onBack, sessionId, variant = 'default' }) => {
  const handleMenuClick = () => {
     navigate('/chat/details', { id: sessionId });
  };

  const RightElement = (
      <div 
        onClick={handleMenuClick}
        style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', opacity: 0.9, cursor: 'pointer', color: 'inherit' }}
      >
        <Icon name="more" size={24} />
      </div>
  );

  return (
    <Navbar 
        title={title} 
        onBack={onBack} 
        rightElement={RightElement}
        backFallback="/"
        variant={variant}
    />
  );
};
