import { useAppStore } from '@openchat/opencat-admin-core';
import { SelectableCard, classNames } from '@openchat/opencat-admin-ui';
import type { LanguagePreference, ThemeColor, ThemeMode } from '@openchat/opencat-admin-types';

const THEME_MODES: Array<{ id: ThemeMode; label: string; description: string }> = [
  { id: 'light', label: 'Light', description: 'Bright operator shell' },
  { id: 'dark', label: 'Dark', description: 'Low-glare control room' },
  { id: 'system', label: 'System', description: 'Follow device preference' },
];

const THEME_COLORS: Array<{ id: ThemeColor; label: string; swatchClassName: string }> = [
  { id: 'tech-blue', label: 'Tech Blue', swatchClassName: 'theme-swatch-tech-blue' },
  { id: 'green-tech', label: 'Green Tech', swatchClassName: 'theme-swatch-green-tech' },
  { id: 'zinc', label: 'Zinc', swatchClassName: 'theme-swatch-zinc' },
  { id: 'violet', label: 'Violet', swatchClassName: 'theme-swatch-violet' },
  { id: 'rose', label: 'Rose', swatchClassName: 'theme-swatch-rose' },
  { id: 'lobster', label: 'Lobster', swatchClassName: 'theme-swatch-lobster' },
];

const LANGUAGE_OPTIONS: Array<{ id: LanguagePreference; label: string }> = [
  { id: 'system', label: 'System default' },
  { id: 'zh-CN', label: 'Chinese (Simplified)' },
  { id: 'en-US', label: 'English' },
];

export function OperatorWorkspacePreferences() {
  const themeMode = useAppStore((state) => state.themeMode);
  const setThemeMode = useAppStore((state) => state.setThemeMode);
  const themeColor = useAppStore((state) => state.themeColor);
  const setThemeColor = useAppStore((state) => state.setThemeColor);
  const languagePreference = useAppStore((state) => state.languagePreference);
  const setLanguage = useAppStore((state) => state.setLanguage);

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-sm font-semibold text-admin">Workspace Appearance</p>
        <p className="mt-2 text-sm text-admin-soft">
          Align the operator shell with the preferred mode and accent palette.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {THEME_MODES.map((mode) => (
            <SelectableCard
              key={mode.id}
              active={themeMode === mode.id}
              aria-pressed={themeMode === mode.id}
              onClick={() => setThemeMode(mode.id)}
            >
              <p className="font-medium text-admin">{mode.label}</p>
              <p className="mt-2 text-sm text-admin-soft">{mode.description}</p>
            </SelectableCard>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold text-admin">Accent Palette</p>
        <p className="mt-2 text-sm text-admin-soft">
          Switch the shared token palette used by cards, actions and indicators.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          {THEME_COLORS.map((color) => (
            <button
              key={color.id}
              type="button"
              aria-pressed={themeColor === color.id}
              className={classNames('choice-pill', themeColor === color.id && 'choice-pill-active')}
              onClick={() => setThemeColor(color.id)}
            >
              <span className={classNames('theme-swatch', color.swatchClassName)} />
              <span className="text-sm font-medium">{color.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="workspace-language" className="field-label">
          Workspace language
        </label>
        <p className="mt-2 text-sm text-admin-soft">
          Persist the admin shell language without affecting runtime control-plane data.
        </p>
        <select
          id="workspace-language"
          className="field-select mt-3"
          value={languagePreference}
          onChange={(event) => setLanguage(event.target.value as LanguagePreference)}
        >
          {LANGUAGE_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
