import { existsSync, readFileSync, rmSync } from 'node:fs';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';

describe('assemble-sdk script', () => {
  const workspaceRoot = path.join(process.cwd(), 'sdkwork-im-sdk');
  const scriptPath = path.join(workspaceRoot, 'bin', 'assemble-sdk.mjs');
  const manifestPath = path.join(workspaceRoot, '.sdkwork-assembly.json');
  const compatibilityPath = path.join(workspaceRoot, 'docs', 'compatibility-matrix.md');

  afterEach(() => {
    rmSync(manifestPath, { force: true });
  });

  test('writes an assembly manifest and refreshes the compatibility matrix', () => {
    const result = spawnSync('node', [scriptPath], {
      encoding: 'utf8',
    });

    expect(result.status).toBe(0);
    expect(existsSync(manifestPath)).toBe(true);

    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
      openapi: { openapiVersion: string; apiVersion: string };
      languages: Array<{
        language: string;
        realtime: string;
        layers: {
          adapter?: { sdk?: string };
          composed?: { present: boolean };
        };
      }>;
    };

    expect(manifest.openapi.openapiVersion).toBe('3.2.0');
    expect(manifest.openapi.apiVersion).toBe('0.1.0');
    expect(manifest.languages.find((entry) => entry.language === 'typescript')).toMatchObject({
      realtime: 'first-class',
      layers: {
        adapter: {
          sdk: 'wukongimjssdk',
        },
        composed: {
          present: true,
        },
      },
    });
    expect(manifest.languages.find((entry) => entry.language === 'flutter')).toMatchObject({
      realtime: 'first-class',
      layers: {
        adapter: {
          sdk: 'wukongimfluttersdk',
        },
        composed: {
          present: true,
        },
      },
    });

    const compatibilityMatrix = readFileSync(compatibilityPath, 'utf8');
    expect(compatibilityMatrix).toContain('| Language | Realtime | Generated Layer |');
    expect(compatibilityMatrix).toContain('| typescript | first-class | `generated/server-openapi` |');
    expect(compatibilityMatrix).toContain('wukongimjssdk');
    expect(compatibilityMatrix).toContain('wukongimfluttersdk');
  });

  test('supports filtering assembly output to a single language workspace', () => {
    const result = spawnSync('node', [scriptPath, '--language', 'typescript'], {
      encoding: 'utf8',
    });

    expect(result.status).toBe(0);
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
      languages: Array<{ language: string }>;
    };

    expect(manifest.languages).toHaveLength(1);
    expect(manifest.languages[0]?.language).toBe('typescript');
  });

  test('hardens the generated flutter workspace into a self-contained analyzable package', () => {
    const assemble = spawnSync('node', [scriptPath, '--language', 'flutter'], {
      encoding: 'utf8',
    });

    expect(assemble.status).toBe(0);

    const flutterGeneratedRoot = path.join(
      workspaceRoot,
      'sdkwork-im-sdk-flutter',
      'generated',
      'server-openapi',
    );
    const flutterPubspec = readFileSync(
      path.join(flutterGeneratedRoot, 'pubspec.yaml'),
      'utf8',
    );
    const backendSdk = readFileSync(
      path.join(flutterGeneratedRoot, 'lib', 'backend_sdk.dart'),
      'utf8',
    );

    expect(flutterPubspec).toContain('http: ^1.6.0');
    expect(flutterPubspec).not.toContain('sdkwork_common_flutter');
    expect(flutterPubspec).toContain('homepage: https://github.com/openchat-team/openchat-server/tree/main/sdkwork-im-sdk/sdkwork-im-sdk-flutter/generated/server-openapi');
    expect(flutterPubspec).toContain('repository: https://github.com/openchat-team/openchat-server');
    expect(backendSdk).toContain("import 'src/api/auth.dart';");
    expect(backendSdk).not.toContain("import '../api/auth.dart';");
    expect(existsSync(path.join(flutterGeneratedRoot, 'lib', 'backend_client.dart'))).toBe(false);
    expect(existsSync(path.join(flutterGeneratedRoot, 'CHANGELOG.md'))).toBe(true);
    expect(existsSync(path.join(flutterGeneratedRoot, 'LICENSE'))).toBe(true);

    const pubGet = spawnSync('dart', ['pub', 'get'], {
      cwd: flutterGeneratedRoot,
      encoding: 'utf8',
      shell: process.platform === 'win32',
    });
    expect(pubGet.status).toBe(0);

    const analyze = spawnSync('dart', ['analyze'], {
      cwd: flutterGeneratedRoot,
      encoding: 'utf8',
      shell: process.platform === 'win32',
    });

    expect(analyze.status).toBe(0);
  });

  test('hardens flutter generated action endpoints to preserve raw responses for composed-layer parity', () => {
    const assemble = spawnSync('node', [scriptPath, '--language', 'flutter'], {
      encoding: 'utf8',
    });

    expect(assemble.status).toBe(0);

    const flutterGeneratedRoot = path.join(
      workspaceRoot,
      'sdkwork-im-sdk-flutter',
      'generated',
      'server-openapi',
      'lib',
      'src',
      'api',
    );

    const messagesApi = readFileSync(path.join(flutterGeneratedRoot, 'messages.dart'), 'utf8');
    const conversationsApi = readFileSync(path.join(flutterGeneratedRoot, 'conversations.dart'), 'utf8');
    const groupsApi = readFileSync(path.join(flutterGeneratedRoot, 'groups.dart'), 'utf8');
    const rtcApi = readFileSync(path.join(flutterGeneratedRoot, 'rtc.dart'), 'utf8');

    expect(messagesApi).toContain('Future<dynamic> messageControllerDelete');
    expect(messagesApi).toContain("return await _client.delete(ApiPaths.backendPath('/messages/\${id}'));");
    expect(messagesApi).toContain('Future<dynamic> messageControllerRecall');
    expect(messagesApi).toContain("return await _client.post(ApiPaths.backendPath('/messages/\${id}/recall'));");

    expect(conversationsApi).toContain('Future<dynamic> conversationControllerPin');
    expect(conversationsApi).toContain("return await _client.put(ApiPaths.backendPath('/conversations/\${id}/pin'), body: body, contentType: 'application/json');");
    expect(conversationsApi).toContain('Future<dynamic> conversationControllerClearUnreadCount');
    expect(conversationsApi).toContain("return await _client.put(ApiPaths.backendPath('/conversations/\${id}/read'));");

    expect(groupsApi).toContain('Future<dynamic> groupControllerAddToBlacklist');
    expect(groupsApi).toContain("return await _client.post(ApiPaths.backendPath('/groups/\${groupId}/blacklist'), body: body, contentType: 'application/json');");
    expect(groupsApi).toContain('Future<dynamic> groupControllerMuteMember');
    expect(groupsApi).toContain("return await _client.put(ApiPaths.backendPath('/groups/\${groupId}/members/\${userId}/mute'), body: body, contentType: 'application/json');");

    expect(rtcApi).toContain('Future<dynamic> appControllerEndRoom');
    expect(rtcApi).toContain("return await _client.put(ApiPaths.backendPath('/rtc/rooms/\${id}/end'));");
    expect(rtcApi).toContain('Future<dynamic> appControllerRemoveParticipant');
    expect(rtcApi).toContain("return await _client.delete(ApiPaths.backendPath('/rtc/rooms/\${id}/participants/\${userId}'));");
  });

  test('hardens the generated typescript workspace to avoid auth header literal narrowing bugs', () => {
    const assemble = spawnSync('node', [scriptPath, '--language', 'typescript'], {
      encoding: 'utf8',
    });

    expect(assemble.status).toBe(0);

    const clientSource = readFileSync(
      path.join(
        workspaceRoot,
        'sdkwork-im-sdk-typescript',
        'generated',
        'server-openapi',
        'src',
        'http',
        'client.ts',
      ),
      'utf8',
    );

    expect(clientSource).toContain('const apiKeyHeader: string = HttpClient.API_KEY_HEADER;');
    expect(clientSource).toContain('const apiKeyUseBearer: boolean = HttpClient.API_KEY_USE_BEARER;');
    expect(clientSource).toContain('headers[apiKeyHeader] = apiKeyUseBearer');
    expect(clientSource).not.toContain("headers[HttpClient.API_KEY_HEADER] = HttpClient.API_KEY_USE_BEARER");
  });

  test('hardens typescript generated action endpoints to preserve raw responses like flutter', () => {
    const assemble = spawnSync('node', [scriptPath, '--language', 'typescript'], {
      encoding: 'utf8',
    });

    expect(assemble.status).toBe(0);

    const typescriptGeneratedRoot = path.join(
      workspaceRoot,
      'sdkwork-im-sdk-typescript',
      'generated',
      'server-openapi',
      'src',
      'api',
    );

    const messagesApi = readFileSync(path.join(typescriptGeneratedRoot, 'messages.ts'), 'utf8');
    const conversationsApi = readFileSync(path.join(typescriptGeneratedRoot, 'conversations.ts'), 'utf8');
    const groupsApi = readFileSync(path.join(typescriptGeneratedRoot, 'groups.ts'), 'utf8');
    const rtcApi = readFileSync(path.join(typescriptGeneratedRoot, 'rtc.ts'), 'utf8');

    expect(messagesApi).toContain('async messageControllerDelete(id: string | number): Promise<unknown>');
    expect(messagesApi).toContain("return this.client.delete<unknown>(backendApiPath(`/messages/${id}`));");
    expect(messagesApi).toContain('async messageControllerRecall(id: string | number): Promise<unknown>');
    expect(messagesApi).toContain("return this.client.post<unknown>(backendApiPath(`/messages/${id}/recall`));");

    expect(conversationsApi).toContain('async conversationControllerPin(id: string | number, body: ConversationControllerPinRequest): Promise<unknown>');
    expect(conversationsApi).toContain("return this.client.put<unknown>(backendApiPath(`/conversations/${id}/pin`), body);");
    expect(conversationsApi).toContain('async conversationControllerClearUnreadCount(id: string | number): Promise<unknown>');
    expect(conversationsApi).toContain("return this.client.put<unknown>(backendApiPath(`/conversations/${id}/read`));");

    expect(groupsApi).toContain('async groupControllerAddToBlacklist(groupId: string | number, body: GroupControllerAddToBlacklistRequest): Promise<unknown>');
    expect(groupsApi).toContain("return this.client.post<unknown>(backendApiPath(`/groups/${groupId}/blacklist`), body);");
    expect(groupsApi).toContain('async groupControllerMuteMember(groupId: string | number, userId: string | number, body: GroupControllerMuteMemberRequest): Promise<unknown>');
    expect(groupsApi).toContain("return this.client.put<unknown>(backendApiPath(`/groups/${groupId}/members/${userId}/mute`), body);");

    expect(rtcApi).toContain('async appControllerEndRoom(id: string | number): Promise<unknown>');
    expect(rtcApi).toContain("return this.client.put<unknown>(backendApiPath(`/rtc/rooms/${id}/end`));");
    expect(rtcApi).toContain('async appControllerRemoveParticipant(id: string | number, userId: string | number): Promise<unknown>');
    expect(rtcApi).toContain("return this.client.delete<unknown>(backendApiPath(`/rtc/rooms/${id}/participants/${userId}`));");
  });
});
