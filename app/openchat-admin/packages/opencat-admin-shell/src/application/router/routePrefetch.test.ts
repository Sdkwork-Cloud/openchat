import { describe, expect, it } from 'vitest';
import { resolveSidebarPrefetchTarget } from './routePrefetch';

describe('resolveSidebarPrefetchTarget', () => {
  it('maps nested admin routes back to the owning top-level package target', () => {
    expect(resolveSidebarPrefetchTarget('/users/42')).toBe('/users');
    expect(resolveSidebarPrefetchTarget('/rtc/channels/edge')).toBe('/rtc');
    expect(resolveSidebarPrefetchTarget('/system/configs?pattern=OPENAI')).toBe('/system');
  });

  it('returns null for routes that are not prefetched from the sidebar', () => {
    expect(resolveSidebarPrefetchTarget('/login')).toBeNull();
    expect(resolveSidebarPrefetchTarget('/')).toBeNull();
    expect(resolveSidebarPrefetchTarget('/unknown')).toBeNull();
  });
});
