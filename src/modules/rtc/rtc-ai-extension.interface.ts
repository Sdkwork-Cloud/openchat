import { RTCRoom, RTCToken } from './rtc.interface';

export interface RtcRoomEventContext {
  room: RTCRoom;
  operatorId?: string;
}

export interface RtcParticipantEventContext {
  room: RTCRoom;
  userId: string;
  operatorId?: string;
}

export interface RtcTokenEventContext {
  room: RTCRoom;
  token: RTCToken;
  provider: string;
}

/**
 * Optional hook extension for future AI orchestration.
 * A provider can subscribe to RTC lifecycle events and bind AI pipelines
 * (ASR/TTS/real-time agent/summary) without coupling service core logic.
 */
export interface RtcAiExtension {
  onRoomCreated?(context: RtcRoomEventContext): Promise<void> | void;
  onRoomEnded?(context: RtcRoomEventContext): Promise<void> | void;
  onParticipantJoined?(context: RtcParticipantEventContext): Promise<void> | void;
  onParticipantLeft?(context: RtcParticipantEventContext): Promise<void> | void;
  onTokenIssued?(context: RtcTokenEventContext): Promise<void> | void;
}

