import type { RtcProviderHealthItemDto } from './rtc-provider-health-item-dto';

export interface RtcProviderHealthReportDto {
  generatedAt: string;
  windowMinutes: number;
  operation?: 'createRoom' | 'generateToken' | 'validateToken';
  recommendedPrimary?: string;
  fallbackOrder: string[];
  providers: RtcProviderHealthItemDto[];
}
