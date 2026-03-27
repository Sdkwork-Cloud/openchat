type SmokeNetworkModule = {
  parseDnsOverrides: (value?: string) => Record<string, string>;
  installDnsOverrides: (
    overrides: Record<string, string>,
    dnsModule?: {
      lookup: (...args: any[]) => any;
    },
  ) => () => void;
};

describe('sdk smoke network overrides', () => {
  test('parses dns overrides and supports both single-address and all-address lookup callbacks', () => {
    const {
      parseDnsOverrides,
      installDnsOverrides,
    } = require('../../scripts/lib/node/smoke-network.cjs') as SmokeNetworkModule;

    const overrides = parseDnsOverrides(
      'im-dev.sdkwork.com=127.0.0.1,api-dev.sdkwork.com=127.0.0.1',
    );

    expect(overrides).toEqual({
      'im-dev.sdkwork.com': '127.0.0.1',
      'api-dev.sdkwork.com': '127.0.0.1',
    });

    const originalLookup = jest.fn();
    const dnsModule = {
      lookup: originalLookup,
    };

    const restore = installDnsOverrides(overrides, dnsModule);

    const singleResult = new Promise<[string, number]>((resolve, reject) => {
      dnsModule.lookup('im-dev.sdkwork.com', { family: 4 }, (error: Error | null, address?: string, family?: number) => {
        if (error) {
          reject(error);
          return;
        }
        resolve([address as string, family as number]);
      });
    });

    const allResult = new Promise<Array<{ address: string; family: number }>>((resolve, reject) => {
      dnsModule.lookup(
        'im-dev.sdkwork.com',
        { all: true },
        (error: Error | null, addresses?: Array<{ address: string; family: number }>) => {
          if (error) {
            reject(error);
            return;
          }
          resolve(addresses as Array<{ address: string; family: number }>);
        },
      );
    });

    const passthroughResult = new Promise<string>((resolve) => {
      originalLookup.mockImplementationOnce((_hostname: string, _options: unknown, callback: (error: null, address: string, family: number) => void) => {
        callback(null, '203.0.113.10', 4);
      });

      dnsModule.lookup(
        'unrelated.sdkwork.com',
        { family: 4 },
        (_error: null, address?: string) => {
          resolve(address as string);
        },
      );
    });

    return Promise.all([singleResult, allResult, passthroughResult]).then(
      ([single, all, passthrough]) => {
        expect(single).toEqual(['127.0.0.1', 4]);
        expect(all).toEqual([{ address: '127.0.0.1', family: 4 }]);
        expect(passthrough).toBe('203.0.113.10');

        restore();
        expect(dnsModule.lookup).toBe(originalLookup);
      },
    );
  });
});
