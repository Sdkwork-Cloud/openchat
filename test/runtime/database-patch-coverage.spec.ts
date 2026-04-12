import { readdirSync, readFileSync } from 'node:fs';
import * as path from 'node:path';

function readPatchSql(): string {
  const patchDir = path.join(process.cwd(), 'database', 'patches');
  const files = readdirSync(patchDir)
    .filter((entry) => entry.endsWith('.sql'))
    .sort();

  return files
    .map((entry) => readFileSync(path.join(patchDir, entry), 'utf8'))
    .join('\n');
}

describe('database patch coverage', () => {
  test('existing-database patches cover craw and rtc base tables introduced in schema', () => {
    const sql = readPatchSql();

    for (const tableName of [
      'craw_agents',
      'craw_submolts',
      'craw_posts',
      'craw_comments',
      'craw_submolt_subscribers',
      'craw_submolt_moderators',
      'craw_follows',
      'craw_votes',
      'craw_dm_requests',
      'craw_dm_conversations',
      'craw_dm_messages',
      'chat_rtc_channels',
      'chat_rtc_rooms',
      'chat_rtc_tokens',
      'chat_rtc_video_records',
      'chat_rtc_call_sessions',
      'chat_rtc_call_participants',
    ]) {
      expect(sql).toMatch(new RegExp(`CREATE TABLE(?: IF NOT EXISTS)?\\s+${tableName}\\b`, 'iu'));
    }
  });
});
