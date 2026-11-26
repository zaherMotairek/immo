import { Module } from '@nestjs/common';
import { WhatsAppCloudApiStubProvider, type WhatsAppProvider } from './whatsapp.provider';

export const WHATSAPP_PROVIDER = 'WHATSAPP_PROVIDER';
export type { WhatsAppProvider };

@Module({
  providers: [
    {
      provide: WHATSAPP_PROVIDER,
      useFactory: (): WhatsAppProvider => new WhatsAppCloudApiStubProvider(),
    },
  ],
  exports: [WHATSAPP_PROVIDER],
})
export class WhatsAppModule {}
