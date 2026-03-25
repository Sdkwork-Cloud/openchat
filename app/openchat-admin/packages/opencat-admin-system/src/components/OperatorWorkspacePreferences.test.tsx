// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { OperatorWorkspacePreferences } from './OperatorWorkspacePreferences';
import { useAppStore } from '@openchat/opencat-admin-core';

describe('OperatorWorkspacePreferences', () => {
  beforeEach(() => {
    useAppStore.setState({
      themeMode: 'system',
      themeColor: 'green-tech',
      language: 'zh-CN',
      languagePreference: 'system',
    });
  });

  it('updates the theme mode and theme color through the app store', () => {
    render(<OperatorWorkspacePreferences />);

    fireEvent.click(screen.getByRole('button', { name: /dark/i }));
    fireEvent.click(screen.getByRole('button', { name: /^rose$/i }));

    expect(useAppStore.getState().themeMode).toBe('dark');
    expect(useAppStore.getState().themeColor).toBe('rose');
  });

  it('updates the workspace language preference through the app store', () => {
    render(<OperatorWorkspacePreferences />);

    fireEvent.change(screen.getByLabelText('Workspace language'), {
      target: { value: 'en-US' },
    });

    expect(useAppStore.getState().languagePreference).toBe('en-US');
    expect(useAppStore.getState().language).toBe('en-US');
  });
});
