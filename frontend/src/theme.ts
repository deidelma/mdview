export type ThemeMode = 'light' | 'dark' | 'auto';
export type ThemePalette = 'default' | 'intellij-light' | 'intellij-dark';
export type EffectiveAppearance = 'light' | 'dark';

export interface AppPreferences {
  theme_mode: ThemeMode;
  theme_palette: ThemePalette;
  zoom_factor: number;
  working_directory: string | null;
}

const ALLOWED_PALETTES_BY_MODE: Record<ThemeMode, ThemePalette[]> = {
  light: ['default', 'intellij-light'],
  dark: ['default', 'intellij-dark'],
  auto: ['default'],
};

export function getAllowedPalettes(mode: ThemeMode) {
  return ALLOWED_PALETTES_BY_MODE[mode];
}

export function sanitizePreferences(preferences: AppPreferences): AppPreferences {
  const allowedPalettes = getAllowedPalettes(preferences.theme_mode);
  return {
    ...preferences,
    theme_palette: allowedPalettes.includes(preferences.theme_palette)
      ? preferences.theme_palette
      : 'default',
  };
}

export function resolveEffectiveAppearance(preferences: AppPreferences, prefersDark: boolean): EffectiveAppearance {
  if (preferences.theme_mode === 'auto') {
    return prefersDark ? 'dark' : 'light';
  }

  return preferences.theme_mode;
}

export function applyTheme(documentRef: Document, preferences: AppPreferences, prefersDark: boolean) {
  const normalized = sanitizePreferences(preferences);
  const effectiveAppearance = resolveEffectiveAppearance(normalized, prefersDark);
  const root = documentRef.documentElement;

  root.dataset.themeMode = normalized.theme_mode;
  root.dataset.themePalette = normalized.theme_palette;
  root.dataset.themeAppearance = effectiveAppearance;
  root.style.colorScheme = effectiveAppearance;

  return normalized;
}

export function createDefaultPreferences(): AppPreferences {
  return {
    theme_mode: 'auto',
    theme_palette: 'default',
    zoom_factor: 1,
    working_directory: null,
  };
}