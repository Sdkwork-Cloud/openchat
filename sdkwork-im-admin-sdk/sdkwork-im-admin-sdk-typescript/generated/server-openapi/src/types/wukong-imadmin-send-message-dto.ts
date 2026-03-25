export interface WukongIMAdminSendMessageDto {
  channelId: string;
  channelType: number;
  payload: string;
  clientMsgNo?: string;
}
