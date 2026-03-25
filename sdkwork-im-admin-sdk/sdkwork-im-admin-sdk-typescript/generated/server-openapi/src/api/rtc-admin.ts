import { backendApiPath } from './paths';
import type { HttpClient } from '../http/client';
import type { QueryParams } from '../types/common';
import type { CreateRtcChannelDto, RtcAdminControllerGetChannelsResponse, RtcAdminControllerGetProviderOperationStatsResponse, RTCChannelEntity, RtcProviderCapabilitiesResponseDto, RtcProviderHealthReportDto, UpdateRtcChannelDto } from '../types';


export class RtcAdminApi {
  private client: HttpClient;
  
  constructor(client: HttpClient) { 
    this.client = client; 
  }

/** Create or upsert RTC channel config */
  async controllerCreateChannel(body: CreateRtcChannelDto): Promise<RTCChannelEntity> {
    return this.client.post<RTCChannelEntity>(backendApiPath(`/rtc/channels`), body);
  }

/** Get all RTC channel configs */
  async controllerGetChannels(): Promise<RtcAdminControllerGetChannelsResponse> {
    return this.client.get<RtcAdminControllerGetChannelsResponse>(backendApiPath(`/rtc/channels`));
  }

/** Get RTC provider operation stats (admin only) */
  async controllerGetProviderOperationStats(params?: QueryParams): Promise<RtcAdminControllerGetProviderOperationStatsResponse> {
    return this.client.get<RtcAdminControllerGetProviderOperationStatsResponse>(backendApiPath(`/rtc/providers/stats`), params);
  }

/** Get RTC provider health report and routing recommendation (admin only) */
  async controllerGetProviderHealthReport(params?: QueryParams): Promise<RtcProviderHealthReportDto> {
    return this.client.get<RtcProviderHealthReportDto>(backendApiPath(`/rtc/providers/health`), params);
  }

/** Get RTC provider capabilities for admin operations */
  async controllerGetProviderCapabilities(): Promise<RtcProviderCapabilitiesResponseDto> {
    return this.client.get<RtcProviderCapabilitiesResponseDto>(backendApiPath(`/rtc/providers/capabilities`));
  }

/** Get RTC channel config */
  async controllerGetChannel(id: string | number): Promise<RTCChannelEntity> {
    return this.client.get<RTCChannelEntity>(backendApiPath(`/rtc/channels/${id}`));
  }

/** Update RTC channel config */
  async controllerUpdateChannel(id: string | number, body: UpdateRtcChannelDto): Promise<unknown> {
    return this.client.put<unknown>(backendApiPath(`/rtc/channels/${id}`), body);
  }

/** Delete RTC channel config (soft delete) */
  async controllerDeleteChannel(id: string | number): Promise<unknown> {
    return this.client.delete<unknown>(backendApiPath(`/rtc/channels/${id}`));
  }
}

export function createRtcAdminApi(client: HttpClient): RtcAdminApi {
  return new RtcAdminApi(client);
}
