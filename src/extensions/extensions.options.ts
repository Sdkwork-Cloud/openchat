import { Provider } from '@nestjs/common';

export const EXTENSIONS_OPTIONS = 'EXTENSIONS_OPTIONS';

export interface ExtensionsModuleOptions {
  useDefaultUserCenter?: boolean;
  useRemoteUserCenter?: boolean;
  primaryUserCenterId?: string;
  enableHealthCheck?: boolean;
  enableAutoRecovery?: boolean;
  extensions?: Provider[];
}
