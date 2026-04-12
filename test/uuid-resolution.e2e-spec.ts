import { v4 as uuidv4 } from 'uuid';
import { ConversationEntity } from '../src/modules/conversation/conversation.entity';

describe('e2e uuid resolution', () => {
  it('should use the real uuid implementation instead of the unit-test mock', () => {
    const entity = new ConversationEntity();
    const generatedUuid = uuidv4();

    expect(generatedUuid).not.toBe('mock-uuid-1234');
    expect(entity.uuid).not.toBe('mock-uuid-1234');
    expect(generatedUuid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(entity.uuid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });
});
