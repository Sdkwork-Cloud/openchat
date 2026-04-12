import { randomUUID } from 'crypto';

function createUuid(): string {
  return randomUUID();
}

export const v4 = jest.fn(() => createUuid());
export const v1 = jest.fn(() => createUuid());
export const v3 = jest.fn(() => createUuid());
export const v5 = jest.fn(() => createUuid());
export const validate = jest.fn((value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value),
);
export const version = jest.fn(() => 4);
export const parse = jest.fn();
export const stringify = jest.fn();
