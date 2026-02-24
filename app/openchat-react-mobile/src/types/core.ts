
import React from 'react';
import { BaseEntity } from '../core/types';

// Re-export specific business logic interfaces
export interface User {
  id: string;
  name: string;
  avatar: string;
}

export interface Agent {
  id: string;
  name: string;
  avatar: string | React.ReactNode; 
  description: string;
  systemInstruction: string;
  initialMessage: string;
  tags?: string[];
}

// Fixed: Import from types file to prevent circular dependency with ChatService
import { Message as ServiceMessage, ChatSession as ServiceSession } from '../modules/chat/types';

export type Message = ServiceMessage;
export type ChatSession = ServiceSession;
