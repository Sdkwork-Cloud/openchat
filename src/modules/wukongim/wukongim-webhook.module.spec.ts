import { MODULE_METADATA } from '@nestjs/common/constants';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { IMProviderModule } from '../im-provider/im-provider.module';
import { Message } from '../message/message.entity';
import { MessageReceipt } from '../message/message-receipt.entity';
import { WukongIMModule } from './wukongim.module';
import { WukongIMWebhookModule } from './wukongim-webhook.module';

describe('WukongIMWebhookModule', () => {
  it('should import repository providers required by the webhook controller', () => {
    const imports =
      Reflect.getMetadata(MODULE_METADATA.IMPORTS, WukongIMWebhookModule) || [];

    expect(imports).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          module: TypeOrmModule,
          providers: expect.arrayContaining([
            expect.objectContaining({
              provide: getRepositoryToken(Message),
            }),
            expect.objectContaining({
              provide: getRepositoryToken(MessageReceipt),
            }),
          ]),
        }),
        WukongIMModule,
        IMProviderModule,
      ]),
    );
  });
});
