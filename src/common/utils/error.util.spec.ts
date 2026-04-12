import { asRecord, getErrorMessage, toError } from './error.util';

describe('error.util', () => {
  it('extracts messages from Error instances and strings', () => {
    expect(getErrorMessage(new Error('boom'))).toBe('boom');
    expect(getErrorMessage('plain failure')).toBe('plain failure');
  });

  it('extracts messages from plain objects when available', () => {
    expect(getErrorMessage({ message: 'object failure' })).toBe('object failure');
  });

  it('wraps unknown values as Error instances', () => {
    const error = toError({ message: 'wrapped failure' });

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('wrapped failure');
  });

  it('only returns plain object records for non-array objects', () => {
    expect(asRecord({ ok: true })).toEqual({ ok: true });
    expect(asRecord(null)).toBeUndefined();
    expect(asRecord(['array'])).toBeUndefined();
    expect(asRecord('text')).toBeUndefined();
  });
});
