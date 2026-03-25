export interface RtcProviderCapabilityDto {
  provider: 'volcengine' | 'tencent' | 'alibaba' | 'livekit';
  /** Whether provider has active channel config */
  configured: boolean;
  /** Active channel ID for this provider */
  channelId?: string;
  /** Whether cloud recording is supported by current implementation */
  supportsRecording: boolean;
  /** Supported token strategy names */
  tokenStrategies: string[];
  /** Whether control-plane delegate mode is supported */
  supportsControlPlaneDelegate: boolean;
}
