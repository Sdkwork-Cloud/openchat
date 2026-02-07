
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

// Deprecated in favor of src/modules/chat/services/ChatService definitions
// But kept here as aliases to prevent breaking imports in pages that haven't been fully migrated
import { Message as ServiceMessage, ChatSession as ServiceSession } from '../modules/chat/services/ChatService';

export type Message = ServiceMessage;
export type ChatSession = ServiceSession;
