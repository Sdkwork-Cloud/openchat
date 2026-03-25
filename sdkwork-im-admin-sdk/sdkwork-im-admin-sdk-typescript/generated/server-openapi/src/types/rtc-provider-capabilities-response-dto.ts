import type { RtcProviderCapabilityDto } from './rtc-provider-capability-dto';

export interface RtcProviderCapabilitiesResponseDto {
  /** Default provider configured on server */
  defaultProvider: 'volcengine' | 'tencent' | 'alibaba' | 'livekit';
  /** Recommended provider from health routing */
  recommendedPrimary?: 'volcengine' | 'tencent' | 'alibaba' | 'livekit';
  /** Fallback order by provider health score */
  fallbackOrder: string[];
  /** Providers that currently have active channel configs */
  activeProviders: string[];
  providers: RtcProviderCapabilityDto[];
}
