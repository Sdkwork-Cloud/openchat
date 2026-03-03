import { BaseEntity } from './base.entity';

class DummyEntity extends BaseEntity {}

describe('BaseEntity Snowflake ID', () => {
  it('should generate a decimal string with bigint precision', () => {
    const entity = new DummyEntity();
    expect(entity.id).toMatch(/^\d+$/);
    expect(BigInt(entity.id) > BigInt(Number.MAX_SAFE_INTEGER)).toBe(true);
  });

  it('should generate strictly increasing ids for sequential allocations', () => {
    let previous = BigInt(new DummyEntity().id);
    for (let i = 0; i < 256; i += 1) {
      const current = BigInt(new DummyEntity().id);
      expect(current > previous).toBe(true);
      previous = current;
    }
  });
});

