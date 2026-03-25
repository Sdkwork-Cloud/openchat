import { describe, expect, it } from 'vitest';
import { getPaginationMeta } from './AdminPrimitives';

describe('getPaginationMeta', () => {
  it('returns the first-page range and disables previous navigation', () => {
    expect(getPaginationMeta(1, 20, 45)).toEqual({
      page: 1,
      limit: 20,
      total: 45,
      totalPages: 3,
      start: 1,
      end: 20,
      hasPrevious: false,
      hasNext: true,
    });
  });

  it('returns the last-page range and disables next navigation', () => {
    expect(getPaginationMeta(3, 20, 45)).toEqual({
      page: 3,
      limit: 20,
      total: 45,
      totalPages: 3,
      start: 41,
      end: 45,
      hasPrevious: true,
      hasNext: false,
    });
  });

  it('returns an empty range when the collection has no records', () => {
    expect(getPaginationMeta(1, 20, 0)).toEqual({
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
      start: 0,
      end: 0,
      hasPrevious: false,
      hasNext: false,
    });
  });
});
