import { backendApiPath } from './paths';
import type { HttpClient } from '../http/client';
import type { QueryParams } from '../types/common';
import type { WukongImadminControllerSendBatchMessagesRequest, WukongIMAdminCreateChannelDto, WukongIMAdminDeleteChannelDto, WukongIMAdminSendMessageDto, WukongIMAdminSubscribersDto } from '../types';


export class WukongimAdminApi {
  private client: HttpClient;
  
  constructor(client: HttpClient) { 
    this.client = client; 
  }

/** Send a WuKongIM control-plane message */
  async wukongImadminControllerSendMessage(body: WukongIMAdminSendMessageDto): Promise<unknown> {
    return this.client.post<unknown>(backendApiPath(`/wukongim/message/send`), body);
  }

/** Send WuKongIM control-plane messages in batch */
  async wukongImadminControllerSendBatchMessages(body: WukongImadminControllerSendBatchMessagesRequest): Promise<unknown> {
    return this.client.post<unknown>(backendApiPath(`/wukongim/message/sendbatch`), body);
  }

/** Sync WuKongIM messages from control plane */
  async wukongImadminControllerSyncMessages(params?: QueryParams): Promise<unknown> {
    return this.client.get<unknown>(backendApiPath(`/wukongim/message/sync`), params);
  }

/** Create WuKongIM channel */
  async wukongImadminControllerCreateChannel(body: WukongIMAdminCreateChannelDto): Promise<unknown> {
    return this.client.post<unknown>(backendApiPath(`/wukongim/channel/create`), body);
  }

/** Delete WuKongIM channel */
  async wukongImadminControllerDeleteChannel(body: WukongIMAdminDeleteChannelDto): Promise<unknown> {
    return this.client.post<unknown>(backendApiPath(`/wukongim/channel/delete`), body);
  }

/** Add channel subscribers */
  async wukongImadminControllerAddSubscribers(body: WukongIMAdminSubscribersDto): Promise<unknown> {
    return this.client.post<unknown>(backendApiPath(`/wukongim/channel/subscriber/add`), body);
  }

/** Remove channel subscribers */
  async wukongImadminControllerRemoveSubscribers(body: WukongIMAdminSubscribersDto): Promise<unknown> {
    return this.client.post<unknown>(backendApiPath(`/wukongim/channel/subscriber/remove`), body);
  }

/** Get WuKongIM channel info */
  async wukongImadminControllerGetChannelInfo(params?: QueryParams): Promise<unknown> {
    return this.client.get<unknown>(backendApiPath(`/wukongim/channel/info`), params);
  }

/** Check WuKongIM control-plane health */
  async wukongImadminControllerHealthCheck(): Promise<unknown> {
    return this.client.get<unknown>(backendApiPath(`/wukongim/health`));
  }

/** Get WuKongIM system info */
  async wukongImadminControllerGetSystemInfo(): Promise<unknown> {
    return this.client.get<unknown>(backendApiPath(`/wukongim/system/info`));
  }

/** Get WuKongIM channel subscribers */
  async wukongImadminControllerGetSubscribers(params?: QueryParams): Promise<unknown> {
    return this.client.get<unknown>(backendApiPath(`/wukongim/channel/subscribers`), params);
  }
}

export function createWukongimAdminApi(client: HttpClient): WukongimAdminApi {
  return new WukongimAdminApi(client);
}
