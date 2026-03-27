const fs = require('node:fs');
const path = require('node:path');
const {
  assertCommandSucceeded,
  commandExists,
  detectExternalIp,
  ensureDirectory,
  logInfo,
  logSuccess,
  logWarn,
  normalizeEnvironmentName,
  probeHttpStatus,
  runCommand,
  sleep,
} = require('./shared.cjs');
const {
  restartRuntime,
} = require('./runtime.cjs');

const STREAM_INCLUDE_LINE = 'include /etc/nginx/stream-conf.d/*.conf;';

function parseNumber(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isInteger(parsed) ? parsed : fallback;
}

function getEdgePreset(environment) {
  switch (normalizeEnvironmentName(environment) || 'development') {
    case 'test':
      return {
        domain: 'im-test.sdkwork.com',
        label: 'test',
      };
    case 'production':
      return {
        domain: 'im.sdkwork.com',
        label: 'production',
      };
    case 'development':
    default:
      return {
        domain: 'im-dev.sdkwork.com',
        label: 'development',
      };
  }
}

function resolveEdgeConfig(projectRoot, options = {}) {
  const environment = normalizeEnvironmentName(
    options.environment || options.env || 'development',
  ) || 'development';
  const preset = getEdgePreset(environment);
  const domain = String(options.domain || preset.domain);
  const serverIp = String(options.serverIp || detectExternalIp());
  const publicIp = String(options.publicIp || serverIp);
  const openchatPort = parseNumber(options.openchatPort, 7200);
  const publicTcpPort = parseNumber(options.publicTcpPort, 5100);
  const runtimeEnvironment = normalizeEnvironmentName(
    options.runtimeEnvironment || options.openchatEnvironment || 'production',
  ) || 'production';
  const sslCertificate = String(
    options.sslCertificate || '/opt/certs/letsencrypt/live/sdkwork.com/fullchain.pem',
  );
  const sslCertificateKey = String(
    options.sslCertificateKey || '/opt/certs/letsencrypt/live/sdkwork.com/privkey.pem',
  );

  const wukongApiBindPort = parseNumber(options.wukongApiBindPort, 15001);
  const wukongTcpBindPort = parseNumber(options.wukongTcpBindPort, 15100);
  const wukongWsBindPort = parseNumber(options.wukongWsBindPort, 15200);
  const wukongManagerBindPort = parseNumber(options.wukongManagerBindPort, 15300);
  const wukongDemoBindPort = parseNumber(options.wukongDemoBindPort, 15172);
  const wukongClusterBindPort = parseNumber(options.wukongClusterBindPort, 21110);
  const prometheusBindPort = parseNumber(options.prometheusBindPort, 19090);

  const generatedRoot = path.join(projectRoot, 'etc');
  const nginxGeneratedRoot = path.join(generatedRoot, 'nginx', environment);
  const wukongGeneratedRoot = path.join(generatedRoot, 'wukongim', environment);
  const openchatGeneratedRoot = path.join(generatedRoot, 'openchat', environment);

  return {
    domain,
    environment,
    generatedPaths: {
      nginxSite: path.join(nginxGeneratedRoot, `${domain}.conf`),
      nginxStream: path.join(nginxGeneratedRoot, `${domain}.stream.conf`),
      nginxPatchedConfig: path.join(nginxGeneratedRoot, 'nginx.conf'),
      openchatEnv: path.join(openchatGeneratedRoot, '.env.edge'),
      prometheusConfig: path.join(wukongGeneratedRoot, 'prometheus.yml'),
      wukongCompose: path.join(wukongGeneratedRoot, 'docker-compose.yml'),
    },
    nginx: {
      bootstrapIncludePath: '/etc/nginx/conf.d/sdkwork-sites-enabled.conf',
      bootstrapIncludeContents: [
        '# Managed by spring-ai-plus nginx plugin.',
        '# Generated for HTTP site include bootstrap.',
        'include /etc/nginx/sites-enabled/sdkwork/*.conf;',
        '',
      ].join('\n'),
      configPath: '/etc/nginx/nginx.conf',
      siteAvailablePath: `/etc/nginx/sites-available/sdkwork/${domain}.conf`,
      siteEnabledPath: `/etc/nginx/sites-enabled/sdkwork/${domain}.conf`,
      streamConfigPath: `/etc/nginx/stream-conf.d/${domain}.stream.conf`,
      streamConfigDirectory: '/etc/nginx/stream-conf.d',
      streamTcpProxyPort: publicTcpPort,
      sslCertificate,
      sslCertificateKey,
    },
    openchat: {
      apiUrl: `http://127.0.0.1:${openchatPort}`,
      environment: runtimeEnvironment,
      envFile: path.join(projectRoot, '.env'),
      healthUrl: `http://127.0.0.1:${openchatPort}/health`,
      port: openchatPort,
      webhookUrl: `https://${domain}/webhook/wukongim`,
      wsUrl: `wss://${domain}/im/ws`,
      managerUrl: `https://${domain}/web/`,
      tcpAddr: `${domain}:${publicTcpPort}`,
    },
    projectRoot,
    publicIp,
    serverIp,
    system: {
      isLinux: process.platform === 'linux',
      wukongRoot: '/opt/software/wukongim',
    },
    wukongim: {
      apiBindPort: wukongApiBindPort,
      apiUrl: `http://127.0.0.1:${wukongApiBindPort}`,
      clusterBindPort: wukongClusterBindPort,
      composePath: '/opt/software/wukongim/docker-compose.yml',
      demoBindPort: wukongDemoBindPort,
      healthUrl: `http://127.0.0.1:${wukongApiBindPort}/health`,
      managerBindPort: wukongManagerBindPort,
      prometheusBindPort,
      prometheusPath: '/opt/software/wukongim/prometheus.yml',
      tcpBindPort: wukongTcpBindPort,
      webhookUrl: `https://${domain}/webhook/wukongim`,
      wsBindPort: wukongWsBindPort,
    },
  };
}

function renderProxyLocation(targetUrl, options = {}) {
  const lines = [
    `location ${options.location} {`,
  ];

  if (options.rewrite) {
    lines.push(`    rewrite ${options.rewrite.from} ${options.rewrite.to} break;`);
  }

  lines.push(`    proxy_pass ${targetUrl};`);
  lines.push('    proxy_http_version 1.1;');
  lines.push('    proxy_set_header Host $host;');
  lines.push('    proxy_set_header X-Real-IP $remote_addr;');
  lines.push('    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;');
  lines.push('    proxy_set_header X-Forwarded-Proto $scheme;');
  lines.push('    proxy_set_header X-Forwarded-Host $host;');
  lines.push('    proxy_set_header X-Forwarded-Port $server_port;');

  if (options.websocket) {
    lines.push('    proxy_set_header Upgrade $http_upgrade;');
    lines.push('    proxy_set_header Connection "upgrade";');
  }

  lines.push(`    proxy_connect_timeout ${options.connectTimeout || '60s'};`);
  lines.push(`    proxy_send_timeout ${options.sendTimeout || '60s'};`);
  lines.push(`    proxy_read_timeout ${options.readTimeout || '60s'};`);
  lines.push('}');

  return lines.join('\n');
}

function renderNginxLocationBlock(config) {
  return [
    renderProxyLocation(config.openchat.apiUrl, {
      location: '^~ /im/ws',
      rewrite: {
        from: '^/im/ws/?(.*)$',
        to: '/$1',
      },
      websocket: true,
      targetUrl: config.wukongim.wsBindPort,
    }).replace(config.openchat.apiUrl, `http://127.0.0.1:${config.wukongim.wsBindPort}`),
    '',
    'location = /web {',
    '    return 307 /web/;',
    '}',
    '',
    renderProxyLocation(`http://127.0.0.1:${config.wukongim.managerBindPort}`, {
      location: '^~ /web/',
    }),
    '',
    renderProxyLocation(`http://127.0.0.1:${config.wukongim.managerBindPort}`, {
      location: '^~ /api/',
    }),
    '',
    renderProxyLocation(config.openchat.apiUrl, {
      location: '/',
      websocket: true,
    }),
  ].join('\n');
}

function renderNginxSite(config) {
  const locationBlock = renderNginxLocationBlock(config);
  const commonHeaders = [
    `# Managed by OpenChat edge deploy`,
    `# Deploy env: ${config.environment}`,
    `# Domain: ${config.domain}`,
    `# Site type: openchat-im`,
    `# Target: ${config.openchat.apiUrl}`,
    '',
  ];

  const server80 = [
    'server {',
    '    listen 80;',
    '    listen [::]:80;',
    `    server_name ${config.domain};`,
    `    access_log /var/log/nginx/${config.domain}.access.log;`,
    `    error_log /var/log/nginx/${config.domain}.error.log;`,
    '    client_max_body_size 100m;',
    locationBlock
      .split('\n')
      .map((line) => (line ? `    ${line}` : ''))
      .join('\n'),
    '}',
  ];

  const server443 = [
    'server {',
    '    listen 443 ssl http2;',
    '    listen [::]:443 ssl http2;',
    `    server_name ${config.domain};`,
    `    access_log /var/log/nginx/${config.domain}.access.log;`,
    `    error_log /var/log/nginx/${config.domain}.error.log;`,
    `    ssl_certificate ${config.nginx.sslCertificate};`,
    `    ssl_certificate_key ${config.nginx.sslCertificateKey};`,
    '    ssl_session_timeout 5m;',
    '    ssl_protocols TLSv1.2 TLSv1.1 TLSv1;',
    '    ssl_ciphers ALL:!ADH:!EXPORT56:RC4+RSA:+HIGH:+MEDIUM:+LOW:+SSLv2:+EXP;',
    '    ssl_prefer_server_ciphers on;',
    '    add_header X-Frame-Options SAMEORIGIN always;',
    '    add_header X-Content-Type-Options nosniff always;',
    '    add_header X-XSS-Protection "1; mode=block" always;',
    '    client_max_body_size 100m;',
    locationBlock
      .split('\n')
      .map((line) => (line ? `    ${line}` : ''))
      .join('\n'),
    '}',
  ];

  return `${commonHeaders.join('\n')}${server80.join('\n')}\n\n${server443.join('\n')}\n`;
}

function renderNginxStream(config) {
  return [
    '# Managed by OpenChat edge deploy',
    `# Deploy env: ${config.environment}`,
    `# Domain: ${config.domain}`,
    `# Target TCP: 127.0.0.1:${config.wukongim.tcpBindPort}`,
    '',
    'server {',
    `    listen ${config.nginx.streamTcpProxyPort};`,
    `    proxy_pass 127.0.0.1:${config.wukongim.tcpBindPort};`,
    '    proxy_connect_timeout 5s;',
    '    proxy_timeout 1h;',
    '}',
    '',
  ].join('\n');
}

function renderPrometheusConfig() {
  return [
    'global:',
    '  scrape_interval: 15s',
    '',
    'scrape_configs:',
    "  - job_name: 'wukongim'",
    '    static_configs:',
    "      - targets: ['wukongim:5300']",
    '',
  ].join('\n');
}

function renderWukongCompose(config) {
  const containerSuffix = config.environment.replace(/[^a-z0-9-]/giu, '-');
  return [
    "version: '3.7'",
    'services:',
    '  wukongim:',
    '    image: registry.cn-shanghai.aliyuncs.com/wukongim/wukongim:v2',
    `    container_name: openchat-wukongim-${containerSuffix}`,
    '    environment:',
    '      - WK_CLUSTER_NODEID=1001',
    `      - WK_CLUSTER_SERVERADDR=${config.serverIp}:${config.wukongim.clusterBindPort}`,
    '      - WK_TRACE_PROMETHEUSAPIURL=http://prometheus:9090',
    '      - WK_MODE=release',
    `      - WK_EXTERNAL_IP=${config.publicIp}`,
    `      - WK_CLUSTER_APIURL=http://${config.serverIp}:${config.wukongim.apiBindPort}`,
    `      - WK_INTRANET_TCPADDR=${config.serverIp}:${config.wukongim.tcpBindPort}`,
    '      - WK_TOKENAUTHON=false',
    '      - WK_WEBHOOK_ENABLED=true',
    `      - WK_WEBHOOK_URL=${config.wukongim.webhookUrl}`,
    '      - WK_WEBHOOK_TIMEOUT=5000',
    '    healthcheck:',
    "      test: ['CMD-SHELL', 'wget -q -Y off -O /dev/null http://localhost:5001/health >/dev/null 2>&1']",
    '      interval: 10s',
    '      timeout: 10s',
    '      retries: 3',
    '    restart: always',
    '    volumes:',
    '      - ./wukongim_data:/root/wukongim',
    '    ports:',
    `      - "127.0.0.1:${config.wukongim.apiBindPort}:5001"`,
    `      - "127.0.0.1:${config.wukongim.tcpBindPort}:5100"`,
    `      - "127.0.0.1:${config.wukongim.wsBindPort}:5200"`,
    `      - "127.0.0.1:${config.wukongim.managerBindPort}:5300"`,
    `      - "127.0.0.1:${config.wukongim.demoBindPort}:5172"`,
    `      - "127.0.0.1:${config.wukongim.clusterBindPort}:11110"`,
    '  prometheus:',
    '    image: registry.cn-shanghai.aliyuncs.com/wukongim/prometheus:v2.53.1',
    '    volumes:',
    '      - "./prometheus.yml:/etc/prometheus/prometheus.yml"',
    '    ports:',
    `      - "127.0.0.1:${config.wukongim.prometheusBindPort}:9090"`,
    '',
  ].join('\n');
}

function applyEnvUpdates(content, updates) {
  const lines = content.split(/\r?\n/u);
  const seen = new Set();
  const rendered = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
      return line;
    }

    const separatorIndex = line.indexOf('=');
    const key = line.slice(0, separatorIndex).trim();
    if (!Object.prototype.hasOwnProperty.call(updates, key)) {
      return line;
    }

    seen.add(key);
    return `${key}=${updates[key]}`;
  });

  const missingKeys = Object.keys(updates).filter((key) => !seen.has(key));
  if (rendered.length > 0 && rendered[rendered.length - 1] !== '') {
    rendered.push('');
  }
  for (const key of missingKeys) {
    rendered.push(`${key}=${updates[key]}`);
  }

  return `${rendered.join('\n').replace(/\n+$/u, '\n')}`;
}

function buildOpenChatEnvUpdates(config) {
  return {
    EXTERNAL_IP: config.publicIp,
    USE_EXTERNAL_WK: 'true',
    WUKONGIM_API_URL: config.wukongim.apiUrl,
    WUKONGIM_ENABLED: 'true',
    WUKONGIM_MANAGER_URL: config.openchat.managerUrl,
    WUKONGIM_TCP_ADDR: config.openchat.tcpAddr,
    WUKONGIM_TOKEN_AUTH: 'false',
    WUKONGIM_WEBHOOK_ENABLED: 'true',
    WUKONGIM_WS_URL: config.openchat.wsUrl,
  };
}

function ensureNginxStreamInclude(content) {
  if (content.includes(STREAM_INCLUDE_LINE)) {
    return content;
  }

  if (content.includes('stream {')) {
    return content.replace(/stream\s*\{/u, `stream {\n    ${STREAM_INCLUDE_LINE}`);
  }

  const suffix = content.endsWith('\n') ? '' : '\n';
  return [
    `${content}${suffix}`.replace(/\n+$/u, '\n'),
    '# OpenChat managed stream include',
    'stream {',
    `    ${STREAM_INCLUDE_LINE}`,
    '}',
    '',
  ].join('\n');
}

function runInteractiveCommand(command, args, options = {}) {
  const result = runCommand(command, args, {
    stdio: 'inherit',
    ...options,
  });

  return assertCommandSucceeded(result, command);
}

function runElevatedCommand(args, options = {}) {
  const isRoot = typeof process.getuid === 'function' && process.getuid() === 0;
  if (isRoot) {
    return runInteractiveCommand(args[0], args.slice(1), options);
  }

  if (!commandExists('sudo')) {
    return runInteractiveCommand(args[0], args.slice(1), options);
  }

  return runInteractiveCommand('sudo', args, options);
}

function installFile(sourcePath, targetPath) {
  ensureDirectory(path.dirname(sourcePath));
  const timestamp = new Date().toISOString().replace(/[:.]/gu, '');
  const backupPath = `${targetPath}.${timestamp}.bak`;

  runElevatedCommand(['mkdir', '-p', path.dirname(targetPath)]);

  const existingCheck = runCommand('test', ['-f', targetPath]);
  if (existingCheck.status === 0) {
    runElevatedCommand(['cp', targetPath, backupPath]);
  }

  runElevatedCommand(['cp', sourcePath, targetPath]);
}

function installSymlink(targetPath, linkPath) {
  runElevatedCommand(['mkdir', '-p', path.dirname(linkPath)]);
  runElevatedCommand(['ln', '-sfn', targetPath, linkPath]);
}

function writeGeneratedArtifacts(projectRoot, config) {
  const siteConfig = renderNginxSite(config);
  const streamConfig = renderNginxStream(config);
  const wukongCompose = renderWukongCompose(config);
  const prometheusConfig = renderPrometheusConfig(config);
  const envInput = fs.existsSync(config.openchat.envFile)
    ? fs.readFileSync(config.openchat.envFile, 'utf8')
    : '';
  const openchatEnv = applyEnvUpdates(envInput, buildOpenChatEnvUpdates(config));
  const nginxConfigSource = fs.existsSync(config.nginx.configPath)
    ? fs.readFileSync(config.nginx.configPath, 'utf8')
    : '';
  const patchedNginxConfig = ensureNginxStreamInclude(nginxConfigSource);

  for (const filePath of Object.values(config.generatedPaths)) {
    ensureDirectory(path.dirname(filePath));
  }

  fs.writeFileSync(config.generatedPaths.nginxSite, siteConfig, 'utf8');
  fs.writeFileSync(config.generatedPaths.nginxStream, streamConfig, 'utf8');
  fs.writeFileSync(config.generatedPaths.wukongCompose, wukongCompose, 'utf8');
  fs.writeFileSync(config.generatedPaths.prometheusConfig, prometheusConfig, 'utf8');
  fs.writeFileSync(config.generatedPaths.openchatEnv, openchatEnv, 'utf8');
  fs.writeFileSync(config.generatedPaths.nginxPatchedConfig, patchedNginxConfig, 'utf8');

  return {
    nginxPatchedConfig: config.generatedPaths.nginxPatchedConfig,
    nginxSite: config.generatedPaths.nginxSite,
    nginxStream: config.generatedPaths.nginxStream,
    openchatEnv: config.generatedPaths.openchatEnv,
    prometheusConfig: config.generatedPaths.prometheusConfig,
    wukongCompose: config.generatedPaths.wukongCompose,
  };
}

function installNginxConfig(config, generated, options = {}) {
  installFile(generated.nginxPatchedConfig, config.nginx.configPath);
  installFile(generated.nginxSite, config.nginx.siteAvailablePath);
  installFile(generated.nginxStream, config.nginx.streamConfigPath);

  const bootstrapSource = path.join(
    config.projectRoot,
    'etc',
    'nginx',
    config.environment,
    'sdkwork-sites-enabled.conf',
  );
  ensureDirectory(path.dirname(bootstrapSource));
  fs.writeFileSync(bootstrapSource, config.nginx.bootstrapIncludeContents, 'utf8');
  installFile(bootstrapSource, config.nginx.bootstrapIncludePath);
  installSymlink(config.nginx.siteAvailablePath, config.nginx.siteEnabledPath);

  if (options.reload !== false) {
    runElevatedCommand(['nginx', '-t']);
    runElevatedCommand(['systemctl', 'reload', 'nginx']);
  }
}

function installWukongConfig(config, generated, options = {}) {
  if (!commandExists('docker', ['compose', 'version'])) {
    throw new Error('docker compose is required to install WuKongIM.');
  }

  runElevatedCommand(['mkdir', '-p', config.system.wukongRoot]);
  runElevatedCommand(['mkdir', '-p', path.join(config.system.wukongRoot, 'wukongim_data')]);
  installFile(generated.prometheusConfig, config.wukongim.prometheusPath);
  installFile(generated.wukongCompose, config.wukongim.composePath);

  if (options.startWukongim !== false) {
    runElevatedCommand(['docker', 'compose', '-f', config.wukongim.composePath, 'up', '-d'], {
      cwd: config.system.wukongRoot,
    });
  }
}

function writeOpenChatEnv(config, generated) {
  const timestamp = new Date().toISOString().replace(/[:.]/gu, '');
  if (fs.existsSync(config.openchat.envFile)) {
    fs.copyFileSync(config.openchat.envFile, `${config.openchat.envFile}.${timestamp}.bak`);
  }
  fs.copyFileSync(generated.openchatEnv, config.openchat.envFile);
}

async function restartOpenChat(config, options = {}) {
  const useSystemd = options.restartOpenChat !== false
    && config.system.isLinux
    && fs.existsSync('/etc/systemd/system/openchat.service')
    && commandExists('systemctl', ['--version']);

  if (useSystemd) {
    runElevatedCommand(['systemctl', 'restart', 'openchat.service']);
    return;
  }

  await restartRuntime(config.projectRoot, {
    environment: config.openchat.environment,
    host: '127.0.0.1',
    port: config.openchat.port,
  });
}

async function verifyEdge(config, options = {}) {
  const openchatStatus = await waitForHttpReady(config.openchat.healthUrl);
  if (openchatStatus !== 200) {
    throw new Error(`OpenChat health check failed for ${config.openchat.healthUrl} (HTTP ${openchatStatus})`);
  }

  if (options.startWukongim !== false) {
    const wukongStatus = await waitForHttpReady(config.wukongim.healthUrl);
    if (wukongStatus !== 200) {
      throw new Error(`WuKongIM health check failed for ${config.wukongim.healthUrl} (HTTP ${wukongStatus})`);
    }
  }

  logSuccess(`OpenChat health check passed: ${config.openchat.healthUrl}`);
  if (options.startWukongim !== false) {
    logSuccess(`WuKongIM health check passed: ${config.wukongim.healthUrl}`);
  }
}

async function runEdge(projectRoot, options = {}) {
  const command = String(options.command || 'generate').toLowerCase();
  const config = resolveEdgeConfig(projectRoot, options);
  const generated = writeGeneratedArtifacts(projectRoot, config);

  logInfo(`Generated edge artifacts for ${config.domain}`);
  logInfo(`Nginx site: ${generated.nginxSite}`);
  logInfo(`Nginx stream: ${generated.nginxStream}`);
  logInfo(`WuKongIM compose: ${generated.wukongCompose}`);
  logInfo(`OpenChat env: ${generated.openchatEnv}`);

  if (command === 'generate' && options.install !== true) {
    logSuccess('Edge configuration generated');
    return 0;
  }

  if (!config.system.isLinux) {
    logWarn('System installation is only supported on Linux. Generated files were written locally.');
    return 0;
  }

  writeOpenChatEnv(config, generated);
  installWukongConfig(config, generated, options);
  installNginxConfig(config, generated, options);
  await restartOpenChat(config, options);
  await verifyEdge(config, options);

  logSuccess(`Edge configuration applied for ${config.domain}`);
  return 0;
}

async function waitForHttpReady(url, attempts = 20, intervalMs = 1000) {
  let lastStatus = 0;
  for (let index = 0; index < attempts; index += 1) {
    // eslint-disable-next-line no-await-in-loop
    lastStatus = await probeHttpStatus(url);
    if (lastStatus === 200) {
      return lastStatus;
    }
    // eslint-disable-next-line no-await-in-loop
    await sleep(intervalMs);
  }

  return lastStatus;
}

module.exports = {
  applyEnvUpdates,
  buildOpenChatEnvUpdates,
  ensureNginxStreamInclude,
  getEdgePreset,
  renderNginxSite,
  renderNginxStream,
  renderPrometheusConfig,
  renderWukongCompose,
  resolveEdgeConfig,
  runEdge,
  writeGeneratedArtifacts,
};
