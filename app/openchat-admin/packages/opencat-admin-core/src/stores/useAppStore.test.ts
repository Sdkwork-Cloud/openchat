import { describe, expect, it } from 'vitest';
import { useAppStore } from './useAppStore';

describe('useAppStore', () => {
  it('clamps the sidebar width to the supported range', () => {
    const originalWidth = useAppStore.getState().sidebarWidth;

    useAppStore.getState().setSidebarWidth(120);
    expect(useAppStore.getState().sidebarWidth).toBe(220);

    useAppStore.getState().setSidebarWidth(520);
    expect(useAppStore.getState().sidebarWidth).toBe(360);

    useAppStore.getState().setSidebarWidth(originalWidth);
  });

  it('normalizes language selection through the supported language contract', () => {
    const originalPreference = useAppStore.getState().languagePreference;

    useAppStore.getState().setLanguage('en-US');
    expect(useAppStore.getState().languagePreference).toBe('en-US');
    expect(useAppStore.getState().language).toBe('en-US');

    useAppStore.getState().setLanguage(originalPreference);
  });
});
