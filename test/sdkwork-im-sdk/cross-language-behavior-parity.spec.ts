import { readFileSync } from 'node:fs';
import * as path from 'node:path';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function expectFlutterBoolAction(
  source: string,
  methodName: string,
  responseCallPattern?: string,
) {
  expect(source).toMatch(
    new RegExp(`Future<bool>\\s+${escapeRegExp(methodName)}\\(`),
  );
  if (responseCallPattern) {
    expect(source).toMatch(
      new RegExp(
        `final\\s+dynamic\\s+response\\s*=\\s*await\\s+${responseCallPattern.replace(
          /\s+/g,
          '\\s+',
        )}`,
      ),
    );
    expect(source).toContain('return context.normalizeActionSuccess(response);');
    return;
  }

  expect(source).toContain(
    `Future<bool> ${methodName}`,
  );
  expect(source).toContain('return context.normalizeActionSuccess(response);');
}

describe('sdkwork-im-sdk TypeScript/Flutter behavior parity', () => {
  const repoRoot = process.cwd();
  const flutterRoot = path.join(
    repoRoot,
    'sdkwork-im-sdk',
    'sdkwork-im-sdk-flutter',
    'composed',
    'lib',
    'src',
  );

  test('flutter action methods normalize success responses like the typescript facade', () => {
    const messages = readFileSync(path.join(flutterRoot, 'messages_module.dart'), 'utf8');
    const friends = readFileSync(path.join(flutterRoot, 'friends_module.dart'), 'utf8');
    const conversations = readFileSync(path.join(flutterRoot, 'conversations_module.dart'), 'utf8');
    const groups = readFileSync(path.join(flutterRoot, 'groups_module.dart'), 'utf8');
    const contacts = readFileSync(path.join(flutterRoot, 'contacts_module.dart'), 'utf8');
    const rtc = readFileSync(path.join(flutterRoot, 'rtc_module.dart'), 'utf8');

    for (const methodName of ['delete', 'recall', 'retryFailed']) {
      expectFlutterBoolAction(messages, methodName);
    }

    for (const methodName of ['accept', 'reject', 'cancel', 'remove', 'block', 'unblock']) {
      expectFlutterBoolAction(friends, methodName);
    }

    for (const methodName of ['delete', 'pin', 'mute', 'clearUnreadCount']) {
      expectFlutterBoolAction(conversations, methodName);
    }

    for (const methodName of [
      'delete',
      'removeMember',
      'updateMemberRole',
      'acceptInvitation',
      'rejectInvitation',
      'cancelInvitation',
      'addToBlacklist',
      'removeFromBlacklist',
      'addToWhitelist',
      'removeFromWhitelist',
      'kickMember',
      'quit',
      'muteMember',
    ]) {
      expectFlutterBoolAction(groups, methodName);
    }

    for (const methodName of ['delete', 'setFavorite', 'setRemark', 'addTag', 'removeTag']) {
      expectFlutterBoolAction(contacts, methodName);
    }

    for (const methodName of ['end']) {
      expectFlutterBoolAction(rtc, methodName);
    }

    for (const methodName of ['add', 'remove']) {
      expectFlutterBoolAction(rtc, methodName);
    }

    expectFlutterBoolAction(rtc, 'delete');
  });
});
