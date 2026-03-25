export interface UpdateRtcChannelDto {
  provider?: 'volcengine' | 'tencent' | 'alibaba' | 'livekit';
  appId?: string;
  appKey?: string;
  appSecret?: string;
  region?: string;
  endpoint?: string;
  isActive?: boolean;
  extraConfig?: Record<string, unknown>;
}
