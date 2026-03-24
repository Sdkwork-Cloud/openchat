import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('API surface barrels', () => {
  it('should not export the legacy mixed RTC controller from the rtc barrel', () => {
    const file = readFileSync(
      join(process.cwd(), 'src/modules/rtc/index.ts'),
      'utf8',
    );

    expect(file).not.toContain("export { RTCController }");
  });

  it('should not export the legacy mixed WuKongIM controller from the wukongim barrel', () => {
    const file = readFileSync(
      join(process.cwd(), 'src/modules/wukongim/index.ts'),
      'utf8',
    );

    expect(file).not.toContain("export { WukongIMController }");
  });

  it('should remove the legacy mixed RTC controller source file', () => {
    expect(
      existsSync(join(process.cwd(), 'src/modules/rtc/rtc.controller.ts')),
    ).toBe(false);
  });

  it('should remove the legacy mixed WuKongIM controller source file', () => {
    expect(
      existsSync(
        join(process.cwd(), 'src/modules/wukongim/wukongim.controller.ts'),
      ),
    ).toBe(false);
  });
});
