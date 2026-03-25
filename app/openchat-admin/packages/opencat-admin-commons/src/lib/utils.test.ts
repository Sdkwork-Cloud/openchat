import { describe, expect, it } from 'vitest';
import { classNames, formatDateTime, formatJson, formatNumber } from './utils';

describe('opencat-admin commons utils', () => {
  it('joins truthy class names and drops empty values', () => {
    expect(classNames('surface', false, null, 'active', undefined, '')).toBe('surface active');
  });

  it('formats timestamps and gracefully handles empty or invalid values', () => {
    expect(formatDateTime(undefined)).toBe('-');
    expect(formatDateTime('invalid-date')).toBe('invalid-date');
    expect(formatDateTime('2026-03-25T10:30:00Z')).toContain('2026');
  });

  it('formats numbers with grouped thousands', () => {
    expect(formatNumber(1200345)).toBe('1,200,345');
  });

  it('formats JSON payloads and preserves plain strings', () => {
    expect(formatJson(undefined)).toBe('-');
    expect(formatJson('plain-text')).toBe('plain-text');
    expect(formatJson({ ok: true })).toContain('"ok": true');
  });
});
