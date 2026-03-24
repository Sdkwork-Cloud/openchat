import { existsSync, readFileSync } from 'node:fs';
import * as path from 'node:path';

import { OpenChatImSdk } from '../../sdkwork-im-sdk/sdkwork-im-sdk-typescript/composed/src';
import type { OpenChatBackendClientLike } from '../../sdkwork-im-sdk/sdkwork-im-sdk-typescript/composed/src';

function createBackendStub(): OpenChatBackendClientLike {
  return {
    messages: {
      messageControllerSend: jest.fn().mockResolvedValue(undefined),
    },
  };
}

describe('sdkwork-im-sdk facade surface', () => {
  const repoRoot = process.cwd();
  const typescriptComposedRoot = path.join(
    repoRoot,
    'sdkwork-im-sdk',
    'sdkwork-im-sdk-typescript',
    'composed',
    'src',
  );
  const flutterComposedRoot = path.join(
    repoRoot,
    'sdkwork-im-sdk',
    'sdkwork-im-sdk-flutter',
    'composed',
    'lib',
  );

  test('typescript facade exposes the stable module surface', () => {
    const sdk = new OpenChatImSdk({
      backendClient: createBackendStub(),
    });

    expect(sdk).toEqual(
      expect.objectContaining({
        session: expect.any(Object),
        realtime: expect.any(Object),
        messages: expect.any(Object),
        events: expect.any(Object),
        friends: expect.any(Object),
        conversations: expect.any(Object),
        groups: expect.any(Object),
        contacts: expect.any(Object),
        rtc: expect.any(Object),
      }),
    );
    expect(sdk.rtc.signaling).toEqual(
      expect.objectContaining({
        sendJoin: expect.any(Function),
        sendLeave: expect.any(Function),
        sendPublish: expect.any(Function),
        sendUnpublish: expect.any(Function),
        sendOffer: expect.any(Function),
        sendAnswer: expect.any(Function),
        sendIceCandidate: expect.any(Function),
        sendCustom: expect.any(Function),
        subscribe: expect.any(Function),
      }),
    );
    expect(sdk.realtime).toEqual(
      expect.objectContaining({
        connect: expect.any(Function),
        disconnect: expect.any(Function),
        isConnected: expect.any(Function),
        getSession: expect.any(Function),
        onMessage: expect.any(Function),
        onEvent: expect.any(Function),
        onRaw: expect.any(Function),
        onConnectionStateChange: expect.any(Function),
      }),
    );
    expect(sdk.events).toEqual(
      expect.objectContaining({
        publish: expect.any(Function),
        publishToUser: expect.any(Function),
        publishToGroup: expect.any(Function),
        publishGameEvent: expect.any(Function),
      }),
    );
  });

  test('typescript rtc custom signaling accepts explicit event name and signal type with full send envelope options', async () => {
    const backend = createBackendStub();
    const sdk = new OpenChatImSdk({
      backendClient: backend,
    });

    const signaling = sdk.rtc.signaling as {
      sendCustom: (...args: unknown[]) => Promise<unknown>;
    };

    await signaling.sendCustom({
      eventName: 'rtc.game-state',
      signalType: 'game-state',
      roomId: 'room-7',
      toUserId: 'user-2',
      sessionId: 'session-9',
      correlationId: 'corr-7',
      payload: {
        turn: 12,
      },
      metadata: {
        namespace: 'rtc',
        topic: 'game',
      },
      uuid: 'uuid-7',
      replyToId: 'message-6',
      forwardFromId: 'message-5',
      clientSeq: 77,
      idempotencyKey: 'idem-7',
      extra: {
        source: 'sdk',
      },
    });

    expect(backend.messages?.messageControllerSend).toHaveBeenCalledWith({
      version: 2,
      conversation: {
        type: 'SINGLE',
        targetId: 'user-2',
      },
      event: {
        type: 'RTC_SIGNAL',
        name: 'rtc.game-state',
        data: {
          roomId: 'room-7',
          toUserId: 'user-2',
          signalType: 'game-state',
          sessionId: 'session-9',
          payload: {
            turn: 12,
          },
        },
        metadata: {
          namespace: 'rtc',
          version: 1,
          correlationId: 'corr-7',
          roomId: 'room-7',
          topic: 'game',
        },
      },
      uuid: 'uuid-7',
      replyToId: 'message-6',
      forwardFromId: 'message-5',
      clientSeq: 77,
      idempotencyKey: 'idem-7',
      extra: {
        source: 'sdk',
      },
    });
  });

  test('flutter facade source exposes the same stable module surface', () => {
    const openChatSdkSource = readFileSync(
      path.join(flutterComposedRoot, 'openchat_sdk.dart'),
      'utf8',
    );

    for (const fragment of [
      'OpenChatSessionModule session',
      'OpenChatRealtimeModule realtime',
      'OpenChatMessagesModule messages',
      'OpenChatEventsModule events',
      'OpenChatFriendsModule friends',
      'OpenChatConversationsModule conversations',
      'OpenChatGroupsModule groups',
      'OpenChatContactsModule contacts',
      'OpenChatRtcModule rtc',
    ]) {
      expect(openChatSdkSource).toContain(fragment);
    }
  });

  test('typescript source keeps complete message, friends, and rtc signaling helpers', () => {
    const messagesModule = readFileSync(
      path.join(typescriptComposedRoot, 'messages-module.ts'),
      'utf8',
    );
    const socialModule = readFileSync(
      path.join(typescriptComposedRoot, 'social-module.ts'),
      'utf8',
    );
    const rtcModule = readFileSync(
      path.join(typescriptComposedRoot, 'rtc-module.ts'),
      'utf8',
    );

    for (const methodName of [
      'sendText',
      'sendImage',
      'sendAudio',
      'sendVideo',
      'sendFile',
      'sendLocation',
      'sendCard',
      'sendCustom',
      'sendSystem',
      'sendMusic',
      'sendDocument',
      'sendCode',
      'sendPpt',
      'sendCharacter',
      'sendModel3d',
    ]) {
      expect(messagesModule).toMatch(
        new RegExp(`${methodName}(\\s*\\(|\\s*:)`),
      );
    }

    for (const methodName of [
      'getState(',
      'setAccessToken(',
      'setAuthToken(',
      'login(',
      'register(',
      'refreshToken(',
      'logout(',
      'bootstrapRealtime(',
      'connectRealtime(',
      'disconnectRealtime(',
    ]) {
      expect(readFileSync(path.join(typescriptComposedRoot, 'session-module.ts'), 'utf8')).toContain(methodName);
    }

    for (const methodName of [
      'publish(',
      'publishToUser(',
      'publishToGroup(',
      'publishGameEvent(',
    ]) {
      expect(readFileSync(path.join(typescriptComposedRoot, 'events-module.ts'), 'utf8')).toContain(methodName);
    }

    for (const methodName of [
      'create(',
      'list(',
      'getSyncState(',
      'getSyncStates(',
      'deleteDeviceSyncState(',
      'getDeviceSyncStateSummaries(',
      'deleteStaleDeviceSyncStates(',
      'getByTarget(',
      'getTotalUnreadCount(',
      'get(',
      'update(',
      'delete(',
      'pin(',
      'mute(',
      'clearUnreadCount(',
      'batchDelete(',
    ]) {
      expect(socialModule).toContain(methodName);
    }

    for (const methodName of [
      'create:',
      'get:',
      'update:',
      'delete:',
      'addMember:',
      'members:',
      'removeMember:',
      'updateMemberRole:',
      'listByUser:',
      'sendInvitation:',
      'acceptInvitation:',
      'rejectInvitation:',
      'cancelInvitation:',
      'addToBlacklist:',
      'getBlacklist:',
      'removeFromBlacklist:',
      'addToWhitelist:',
      'getWhitelist:',
      'removeFromWhitelist:',
      'kickMember:',
      'quit:',
      'updateAnnouncement:',
      'setMuteAll:',
      'muteMember:',
      'transfer:',
    ]) {
      expect(socialModule).toContain(methodName);
    }

    for (const methodName of [
      'create:',
      'list:',
      'get:',
      'update:',
      'delete:',
      'batchDelete:',
      'setFavorite:',
      'setRemark:',
      'addTag:',
      'removeTag:',
      'search:',
      'getStats:',
    ]) {
      expect(socialModule).toContain(methodName);
    }

    for (const methodName of [
      'request(',
      'accept(',
      'reject(',
      'cancel(',
      'remove(',
      'list(',
      'requests(',
      'sentRequests(',
      'checkFriendship(',
      'block(',
      'unblock(',
      'checkBlocked(',
    ]) {
      expect(socialModule).toContain(methodName);
    }

    for (const methodName of [
      'sendJoin',
      'sendLeave',
      'sendPublish',
      'sendUnpublish',
      'sendOffer',
      'sendAnswer',
      'sendIceCandidate',
      'sendCustom',
      'subscribe',
    ]) {
      expect(rtcModule).toContain(`${methodName}:`);
    }

    for (const methodName of [
      'connect(',
      'disconnect(',
      'isConnected(',
      'getSession(',
      'onMessage(',
      'onEvent(',
      'onRaw(',
      'onConnectionStateChange(',
    ]) {
      expect(rtcModule).toContain(methodName);
    }
  });

  test('flutter source keeps complete message, friends, and rtc signaling helpers', () => {
    const messagesModule = readFileSync(
      path.join(flutterComposedRoot, 'src', 'messages_module.dart'),
      'utf8',
    );
    const friendsModule = readFileSync(
      path.join(flutterComposedRoot, 'src', 'friends_module.dart'),
      'utf8',
    );
    const rtcModule = readFileSync(
      path.join(flutterComposedRoot, 'src', 'rtc_module.dart'),
      'utf8',
    );

    for (const methodName of [
      'sendText',
      'sendImage',
      'sendAudio',
      'sendVideo',
      'sendFile',
      'sendLocation',
      'sendCard',
      'sendCustom',
      'sendSystem',
      'sendMusic',
      'sendDocument',
      'sendCode',
      'sendPpt',
      'sendCharacter',
      'sendModel3d',
    ]) {
      expect(messagesModule).toContain(`Future<OpenChatSendResult> ${methodName}`);
    }

    expect(messagesModule).toContain('OpenChatImBuilders.normalizeSendMessage');

    for (const methodName of [
      'request',
      'accept',
      'reject',
      'cancel',
      'remove',
      'block',
      'unblock',
    ]) {
      expect(friendsModule).toContain(`Future<`);
      expect(friendsModule).toContain(`${methodName}(`);
    }

    for (const methodName of [
      'sendJoin',
      'sendLeave',
      'sendPublish',
      'sendUnpublish',
      'sendOffer',
      'sendAnswer',
      'sendIceCandidate',
      'sendCustom',
    ]) {
      expect(rtcModule).toContain(`Future<OpenChatSendResult> ${methodName}`);
    }
  });

  test('flutter source keeps complete session, event, conversation, group, contact, and realtime helpers', () => {
    const sessionModule = readFileSync(
      path.join(flutterComposedRoot, 'src', 'session_module.dart'),
      'utf8',
    );
    const eventsModule = readFileSync(
      path.join(flutterComposedRoot, 'src', 'events_module.dart'),
      'utf8',
    );
    const conversationsModule = readFileSync(
      path.join(flutterComposedRoot, 'src', 'conversations_module.dart'),
      'utf8',
    );
    const groupsModule = readFileSync(
      path.join(flutterComposedRoot, 'src', 'groups_module.dart'),
      'utf8',
    );
    const contactsModule = readFileSync(
      path.join(flutterComposedRoot, 'src', 'contacts_module.dart'),
      'utf8',
    );
    const realtimeModule = readFileSync(
      path.join(flutterComposedRoot, 'src', 'realtime_module.dart'),
      'utf8',
    );

    for (const methodName of [
      'getState',
      'setAccessToken',
      'setAuthToken',
      'login',
      'register',
      'refreshToken',
      'logout',
      'bootstrapRealtime',
      'connectRealtime',
      'disconnectRealtime',
    ]) {
      expect(sessionModule).toContain(methodName);
    }

    for (const methodName of [
      'publish',
      'publishToUser',
      'publishToGroup',
      'publishGameEvent',
    ]) {
      expect(eventsModule).toContain(methodName);
    }

    for (const methodName of [
      'create',
      'list',
      'getSyncState',
      'getSyncStates',
      'deleteDeviceSyncState',
      'getDeviceSyncStateSummaries',
      'deleteStaleDeviceSyncStates',
      'getByTarget',
      'getTotalUnreadCount',
      'get',
      'update',
      'delete',
      'batchDelete',
      'pin',
      'mute',
      'clearUnreadCount',
    ]) {
      expect(conversationsModule).toContain(methodName);
    }

    for (const methodName of [
      'create',
      'get',
      'update',
      'delete',
      'addMember',
      'members',
      'removeMember',
      'updateMemberRole',
      'listByUser',
      'sendInvitation',
      'acceptInvitation',
      'rejectInvitation',
      'cancelInvitation',
      'addToBlacklist',
      'getBlacklist',
      'removeFromBlacklist',
      'addToWhitelist',
      'getWhitelist',
      'removeFromWhitelist',
      'kickMember',
      'quit',
      'updateAnnouncement',
      'setMuteAll',
      'muteMember',
      'transfer',
    ]) {
      expect(groupsModule).toContain(methodName);
    }

    for (const methodName of [
      'create',
      'list',
      'get',
      'update',
      'delete',
      'batchDelete',
      'setFavorite',
      'setRemark',
      'addTag',
      'removeTag',
      'search',
      'getStats',
    ]) {
      expect(contactsModule).toContain(methodName);
    }

    for (const methodName of [
      'connect',
      'disconnect',
      'isConnected',
      'getSession',
      'onMessage',
      'onEvent',
      'onRaw',
      'onConnectionStateChange',
    ]) {
      expect(realtimeModule).toContain(methodName);
    }
  });

  test('flutter source preserves rtc room fallback routing and realtime session synchronization', () => {
    const contextSource = readFileSync(
      path.join(flutterComposedRoot, 'src', 'context.dart'),
      'utf8',
    );
    const realtimeModule = readFileSync(
      path.join(flutterComposedRoot, 'src', 'realtime_module.dart'),
      'utf8',
    );

    expect(contextSource).toContain('toUserId == null || toUserId.isEmpty');
    expect(contextSource).toContain('groupId ?? roomId');
    expect(realtimeModule).toContain(
      'context.authSession = context.authSession.copyWith(realtime: connected);',
    );
  });

  test('flutter handwritten layers and generated layer all exist in the workspace', () => {
    const requiredPaths = [
      'sdkwork-im-sdk/sdkwork-im-sdk-flutter/generated/server-openapi/.sdkwork-generated',
      'sdkwork-im-sdk/sdkwork-im-sdk-flutter/adapter-wukongim/.manual-owned',
      'sdkwork-im-sdk/sdkwork-im-sdk-flutter/composed/.manual-owned',
    ];

    for (const relativePath of requiredPaths) {
      expect(existsSync(path.join(repoRoot, relativePath))).toBe(true);
    }
  });
});
