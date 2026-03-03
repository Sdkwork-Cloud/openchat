export type RTCProviderType = 'volcengine' | 'tencent' | 'alibaba' | 'livekit';

export const RTC_DEFAULT_PROVIDER: RTCProviderType = 'volcengine';

export const RTC_AI_EXTENSION = 'RTC_AI_EXTENSION';

export function normalizeRtcProvider(provider: string | undefined | null): RTCProviderType {
  const normalized = (provider || RTC_DEFAULT_PROVIDER).trim().toLowerCase() as RTCProviderType;

  if (
    normalized !== 'volcengine' &&
    normalized !== 'tencent' &&
    normalized !== 'alibaba' &&
    normalized !== 'livekit'
  ) {
    throw new Error(`Unsupported RTC provider: ${provider}`);
  }

  return normalized;
}
