#!/usr/bin/env node

require('ts-node/register/transpile-only');

const path = require('node:path');
const { createRequire } = require('node:module');
const axios = require('axios');
const {
  parseDnsOverrides,
  installDnsOverrides,
} = require('./lib/node/smoke-network.cjs');

global.WebSocket = global.WebSocket || require('ws');

const repoRoot = path.resolve(__dirname, '..');
const composedEntry = path.join(
  repoRoot,
  'sdkwork-im-sdk/sdkwork-im-sdk-typescript/composed/src/index.ts',
);
const adapterEntry = path.join(
  repoRoot,
  'sdkwork-im-sdk/sdkwork-im-sdk-typescript/adapter-wukongim/src/index.ts',
);
const runtimeEntry = path.join(
  repoRoot,
  'sdkwork-im-sdk/sdkwork-im-sdk-typescript/adapter-wukongim/src/runtime.ts',
);
const adapterPackageJson = path.join(
  repoRoot,
  'sdkwork-im-sdk/sdkwork-im-sdk-typescript/adapter-wukongim/package.json',
);

const { OpenChatImSdk } = require(composedEntry);
const { OpenChatWukongimAdapter } = require(adapterEntry);
const { createRuntimeFromModuleExport } = require(runtimeEntry);

const requireFromAdapter = createRequire(adapterPackageJson);
const wukongimModule = requireFromAdapter('wukongimjssdk');

const config = {
  baseUrl: process.env.OPENCHAT_BASE_URL || 'http://127.0.0.1:7200',
  localWsUrl: process.env.OPENCHAT_LOCAL_WS_URL || 'ws://127.0.0.1:15200',
  aliceUsername: process.env.OPENCHAT_SMOKE_ALICE_USERNAME || 'alice',
  bobUsername: process.env.OPENCHAT_SMOKE_BOB_USERNAME || 'bob',
  password: process.env.OPENCHAT_SMOKE_PASSWORD || 'OpenChat@123',
  timeoutMs: parseNumber(process.env.OPENCHAT_SMOKE_TIMEOUT_MS, 15000),
  connectDelayMs: parseNumber(process.env.OPENCHAT_SMOKE_CONNECT_DELAY_MS, 1500),
  verbose: parseBoolean(process.env.OPENCHAT_SMOKE_VERBOSE, true),
  dnsOverrides: parseDnsOverrides(process.env.OPENCHAT_DNS_OVERRIDES),
};

function parseNumber(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseBoolean(value, fallback) {
  if (value === undefined) {
    return fallback;
  }
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }
  return fallback;
}

function log(step, details) {
  if (!config.verbose) {
    return;
  }
  const timestamp = new Date().toISOString();
  if (details === undefined) {
    console.error(`[sdk-smoke][${timestamp}] ${step}`);
    return;
  }
  const payload =
    typeof details === 'string'
      ? details
      : JSON.stringify(details, null, 2);
  console.error(`[sdk-smoke][${timestamp}] ${step}\n${payload}`);
}

function stripSdkPrefix(pathname) {
  if (!pathname) {
    return '/';
  }
  const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`;
  if (normalized === '/im/v3') {
    return '/';
  }
  if (normalized.startsWith('/im/v3/')) {
    return normalized.slice('/im/v3'.length);
  }
  return normalized;
}

function createBackendClient(baseUrl) {
  const state = {
    authToken: '',
    accessToken: '',
  };

  async function request(pathname, options = {}) {
    const method = String(options.method || 'GET').toUpperCase();
    const requestPath = stripSdkPrefix(pathname);
    const url = new URL(requestPath, ensureTrailingSlash(baseUrl)).toString();
    const headers = {
      'Content-Type': 'application/json',
      ...(state.authToken
        ? { Authorization: `Bearer ${state.authToken}` }
        : {}),
      ...(state.accessToken
        ? { 'Access-Token': state.accessToken }
        : {}),
    };

    log('http.request', {
      method,
      pathname,
      requestPath,
      url,
      hasAuthToken: !!state.authToken,
      hasAccessToken: !!state.accessToken,
    });

    const response = await axios({
      url,
      method,
      params: options.params,
      data: options.body,
      headers,
      validateStatus: () => true,
    });

    if (response.status >= 400) {
      throw new Error(
        `${method} ${pathname} -> ${response.status} ${JSON.stringify(response.data)}`,
      );
    }

    return response.data;
  }

  return {
    setAuthToken(token) {
      state.authToken = token;
    },
    setAccessToken(token) {
      state.accessToken = token;
    },
    http: {
      get(pathname, params) {
        return request(pathname, { method: 'GET', params });
      },
      post(pathname, body, params) {
        return request(pathname, { method: 'POST', body, params });
      },
      put(pathname, body, params) {
        return request(pathname, { method: 'PUT', body, params });
      },
      delete(pathname, params) {
        return request(pathname, { method: 'DELETE', params });
      },
      request(pathname, options) {
        return request(pathname, options || {});
      },
    },
  };
}

function ensureTrailingSlash(value) {
  return value.endsWith('/') ? value : `${value}/`;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createBobRealtimeSdk() {
  const adapter = new OpenChatWukongimAdapter({
    runtime: createRuntimeFromModuleExport(wukongimModule),
  });
  attachRuntimeDiagnostics(wukongimModule);
  return new OpenChatImSdk({
    backendClient: createBackendClient(config.baseUrl),
    realtimeAdapter: adapter,
  });
}

function attachRuntimeDiagnostics(moduleExport) {
  const shared = moduleExport?.WKSDK?.shared?.();
  if (!shared || !config.verbose) {
    return;
  }

  if (!shared.chatManager.__sdkSmokePatchedAddMessageListener) {
    const originalAddMessageListener =
      shared.chatManager.addMessageListener?.bind(shared.chatManager);
    if (originalAddMessageListener) {
      shared.chatManager.addMessageListener = (listener) => {
        log('runtime.addMessageListener');
        return originalAddMessageListener(listener);
      };
      shared.chatManager.__sdkSmokePatchedAddMessageListener = true;
    }
  }

  if (!shared.chatManager.__sdkSmokePatchedNotifyMessageListeners) {
    const originalNotifyMessageListeners =
      shared.chatManager.notifyMessageListeners?.bind(shared.chatManager);
    if (originalNotifyMessageListeners) {
      shared.chatManager.notifyMessageListeners = (payload) => {
        log('runtime.notifyMessageListeners', summarizeMessagePayload(payload));
        return originalNotifyMessageListeners(payload);
      };
      shared.chatManager.__sdkSmokePatchedNotifyMessageListeners = true;
    }
  }

  if (!shared.eventManager.__sdkSmokePatchedNotifyEventListeners) {
    const originalNotifyEventListeners =
      shared.eventManager.notifyEventListeners?.bind(shared.eventManager);
    if (originalNotifyEventListeners) {
      shared.eventManager.notifyEventListeners = (payload) => {
        log('runtime.notifyEventListeners', summarizeMessagePayload(payload));
        return originalNotifyEventListeners(payload);
      };
      shared.eventManager.__sdkSmokePatchedNotifyEventListeners = true;
    }
  }
}

function summarizeMessagePayload(payload) {
  const jsonPayload = tryDecodeJsonPayload(payload?.payload);
  return {
    messageId: payload?.messageId || payload?.messageID,
    fromUid: payload?.fromUid || payload?.fromUID,
    channelId:
      payload?.channel?.channelId ||
      payload?.channel?.channelID ||
      payload?.channelId ||
      payload?.channelID,
    channelType:
      payload?.channel?.channelType || payload?.channelType,
    content: payload?.content?.contentObj || payload?.content,
    decodedPayload: jsonPayload,
  };
}

function tryDecodeJsonPayload(value) {
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
    const text = Buffer.from(value).toString('utf8');
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  return undefined;
}

async function main() {
  const aliceSdk = new OpenChatImSdk({
    backendClient: createBackendClient(config.baseUrl),
  });
  const bobLoginSdk = new OpenChatImSdk({
    backendClient: createBackendClient(config.baseUrl),
  });
  const bobRealtimeSdk = createBobRealtimeSdk();

  log('config', {
    baseUrl: config.baseUrl,
    localWsUrl: config.localWsUrl,
    aliceUsername: config.aliceUsername,
    bobUsername: config.bobUsername,
    timeoutMs: config.timeoutMs,
    connectDelayMs: config.connectDelayMs,
    dnsOverrides: config.dnsOverrides,
  });

  const restoreDnsLookup = installDnsOverrides(config.dnsOverrides);

  try {
    const aliceSession = await aliceSdk.session.login({
      username: config.aliceUsername,
      password: config.password,
    });
    const bobSession = await bobLoginSdk.session.login({
      username: config.bobUsername,
      password: config.password,
    });

    log('alice.session', {
      userId: aliceSession.user?.id,
      realtime: aliceSession.realtime,
    });
    log('bob.session', {
      userId: bobSession.user?.id,
      realtime: bobSession.realtime,
    });

    const messageText = `sdk smoke ${Date.now()}`;
    const seenFrames = [];

    const messagePromise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timed out waiting for Bob to receive "${messageText}"`));
      }, config.timeoutMs);

      bobRealtimeSdk.realtime.onRaw((frame) => {
        log('adapter.onRaw', frame);
      });
      bobRealtimeSdk.realtime.onMessage((frame) => {
        seenFrames.push(frame);
        log('adapter.onMessage', frame);
        const text = frame?.message?.text?.text;
        if (text === messageText) {
          clearTimeout(timer);
          resolve(frame);
        }
      });
      bobRealtimeSdk.realtime.onEvent((frame) => {
        log('adapter.onEvent', frame);
      });
      bobRealtimeSdk.realtime.onConnectionStateChange((state) => {
        log('adapter.connectionState', state);
      });
    });

    await bobRealtimeSdk.realtime.connect({
      ...bobSession.realtime,
      wsUrl: config.localWsUrl,
      deviceId: 'sdk-smoke-bob',
      deviceFlag: 1,
    });

    await wait(config.connectDelayMs);

    const sendResult = await aliceSdk.messages.sendText({
      toUserId: String(bobSession.user?.id),
      text: messageText,
      idempotencyKey: `sdk-smoke-${Date.now()}`,
    });

    log('send.result', sendResult);

    const receivedFrame = await messagePromise;
    await bobRealtimeSdk.realtime.disconnect();

    const result = {
      success: true,
      baseUrl: config.baseUrl,
      localWsUrl: config.localWsUrl,
      dnsOverrides: config.dnsOverrides,
      aliceUserId: String(aliceSession.user?.id),
      bobUserId: String(bobSession.user?.id),
      messageText,
      sendResult,
      receivedFrame,
      observedFrameCount: seenFrames.length,
    };

    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } finally {
    restoreDnsLookup();
  }
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exitCode = 1;
});
