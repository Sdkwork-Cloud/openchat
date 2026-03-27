import * as path from 'node:path';

type EdgeModule = {
  applyEnvUpdates: (content: string, updates: Record<string, string>) => string;
  ensureNginxStreamInclude: (content: string) => string;
  renderNginxSite: (config: Record<string, unknown>) => string;
  renderNginxStream: (config: Record<string, unknown>) => string;
  renderWukongCompose: (config: Record<string, unknown>) => string;
  resolveEdgeConfig: (
    projectRoot: string,
    options?: Record<string, unknown>,
  ) => Record<string, unknown>;
};

const { parseCommand } = require('../../scripts/lib/node/cli.cjs') as {
  parseCommand: (argv: string[]) => Record<string, unknown>;
};

describe('openchat edge cli', () => {
  test('parses edge apply command with explicit domain and install flags', () => {
    expect(
      parseCommand([
        'edge',
        'apply',
        'dev',
        '--domain',
        'im-dev.sdkwork.com',
        '--public-ip',
        '198.18.0.95',
        '--install',
        '--reload',
      ]),
    ).toMatchObject({
      kind: 'edge',
      command: 'apply',
      environment: 'development',
      domain: 'im-dev.sdkwork.com',
      publicIp: '198.18.0.95',
      install: true,
      reload: true,
    });
  });

  test('renders nginx site config for im-dev.sdkwork.com with websocket and manager reverse proxies', () => {
    const {
      renderNginxSite,
      resolveEdgeConfig,
    } = require('../../scripts/lib/node/edge.cjs') as EdgeModule;

    const config = resolveEdgeConfig(path.join(path.sep, 'srv', 'openchat'), {
      environment: 'development',
      domain: 'im-dev.sdkwork.com',
      openchatPort: 7200,
      wukongApiBindPort: 15001,
      wukongTcpBindPort: 15100,
      wukongWsBindPort: 15200,
      wukongManagerBindPort: 15300,
    });
    const site = renderNginxSite(config);

    expect(site).toContain('server_name im-dev.sdkwork.com;');
    expect(site).toContain('proxy_pass http://127.0.0.1:7200;');
    expect(site).toContain('location ^~ /im/ws');
    expect(site).toContain('proxy_pass http://127.0.0.1:15200;');
    expect(site).toContain('location = /web');
    expect(site).toContain('location ^~ /web/');
    expect(site).toContain('location ^~ /api/');
    expect(site).toContain('proxy_pass http://127.0.0.1:15300;');
  });

  test('renders nginx stream config that fronts the public tcp port to the local wukongim tcp bind port', () => {
    const {
      renderNginxStream,
      resolveEdgeConfig,
    } = require('../../scripts/lib/node/edge.cjs') as EdgeModule;

    const config = resolveEdgeConfig(path.join(path.sep, 'srv', 'openchat'), {
      environment: 'development',
      domain: 'im-dev.sdkwork.com',
      publicTcpPort: 5100,
      wukongTcpBindPort: 15100,
    });
    const streamConfig = renderNginxStream(config);

    expect(streamConfig).toContain('listen 5100;');
    expect(streamConfig).toContain('proxy_pass 127.0.0.1:15100;');
    expect(streamConfig).toContain('proxy_timeout 1h;');
  });

  test('renders wukongim compose with localhost-only bind ports and public webhook url', () => {
    const {
      renderWukongCompose,
      resolveEdgeConfig,
    } = require('../../scripts/lib/node/edge.cjs') as EdgeModule;

    const config = resolveEdgeConfig(path.join(path.sep, 'srv', 'openchat'), {
      environment: 'development',
      domain: 'im-dev.sdkwork.com',
      serverIp: '172.23.3.187',
      publicIp: '198.18.0.95',
      wukongApiBindPort: 15001,
      wukongTcpBindPort: 15100,
      wukongWsBindPort: 15200,
      wukongManagerBindPort: 15300,
      wukongDemoBindPort: 15172,
      wukongClusterBindPort: 21110,
    });
    const compose = renderWukongCompose(config);

    expect(compose).toContain('- WK_EXTERNAL_IP=198.18.0.95');
    expect(compose).toContain('- WK_CLUSTER_SERVERADDR=172.23.3.187:21110');
    expect(compose).toContain('- WK_CLUSTER_APIURL=http://172.23.3.187:15001');
    expect(compose).toContain('- WK_INTRANET_TCPADDR=172.23.3.187:15100');
    expect(compose).toContain('- WK_WEBHOOK_ENABLED=true');
    expect(compose).toContain('- WK_WEBHOOK_URL=https://im-dev.sdkwork.com/webhook/wukongim');
    expect(compose).toContain('- "127.0.0.1:15001:5001"');
    expect(compose).toContain('- "127.0.0.1:15100:5100"');
    expect(compose).toContain('- "127.0.0.1:15200:5200"');
    expect(compose).toContain('- "127.0.0.1:15300:5300"');
  });

  test('updates openchat env content with domain-based wukongim endpoints without dropping existing keys', () => {
    const { applyEnvUpdates } = require('../../scripts/lib/node/edge.cjs') as EdgeModule;

    const updated = applyEnvUpdates(
      [
        'NODE_ENV=production',
        'PORT=7200',
        'WUKONGIM_ENABLED=false',
        'WUKONGIM_API_URL=http://localhost:5001',
        '',
      ].join('\n'),
      {
        WUKONGIM_ENABLED: 'true',
        WUKONGIM_API_URL: 'http://127.0.0.1:15001',
        WUKONGIM_TCP_ADDR: 'im-dev.sdkwork.com:5100',
        WUKONGIM_WS_URL: 'wss://im-dev.sdkwork.com/im/ws',
        WUKONGIM_MANAGER_URL: 'https://im-dev.sdkwork.com/web/',
        WUKONGIM_WEBHOOK_ENABLED: 'true',
        USE_EXTERNAL_WK: 'true',
      },
    );

    expect(updated).toContain('NODE_ENV=production');
    expect(updated).toContain('PORT=7200');
    expect(updated).toContain('WUKONGIM_ENABLED=true');
    expect(updated).toContain('WUKONGIM_API_URL=http://127.0.0.1:15001');
    expect(updated).toContain('WUKONGIM_TCP_ADDR=im-dev.sdkwork.com:5100');
    expect(updated).toContain('WUKONGIM_WS_URL=wss://im-dev.sdkwork.com/im/ws');
    expect(updated).toContain('WUKONGIM_MANAGER_URL=https://im-dev.sdkwork.com/web/');
    expect(updated).toContain('WUKONGIM_WEBHOOK_ENABLED=true');
    expect(updated).toContain('USE_EXTERNAL_WK=true');
  });

  test('adds a managed stream include block to nginx.conf only once', () => {
    const { ensureNginxStreamInclude } = require('../../scripts/lib/node/edge.cjs') as EdgeModule;

    const baseConfig = [
      'user www-data;',
      'worker_processes auto;',
      '',
      'events {',
      '    worker_connections 768;',
      '}',
      '',
      'http {',
      '    include /etc/nginx/conf.d/*.conf;',
      '}',
      '',
    ].join('\n');

    const first = ensureNginxStreamInclude(baseConfig);
    const second = ensureNginxStreamInclude(first);

    expect(first).toContain('stream {');
    expect(first).toContain('include /etc/nginx/stream-conf.d/*.conf;');
    expect(second.match(/stream \{/g)).toHaveLength(1);
  });
});
