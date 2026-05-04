import { getAllowedPalettes, sanitizePreferences, type AppPreferences, type ThemeMode, type ThemePalette } from '../theme';

interface PreferencesOptions {
  document: Document;
  onThemeModeChange: (mode: ThemeMode) => void;
  onThemePaletteChange: (palette: ThemePalette) => void;
}

export interface PreferencesController {
  show(preferences: AppPreferences): void;
  hide(): void;
  update(preferences: AppPreferences): void;
}

function queryRequiredElement<T extends HTMLElement>(doc: Document, id: string) {
  const element = doc.getElementById(id);
  if (!element) {
    throw new Error(`Expected element #${id} to exist`);
  }

  return element as T;
}

export function initializePreferences(options: PreferencesOptions): PreferencesController {
  const doc = options.document;
  const overlay = queryRequiredElement<HTMLDivElement>(doc, 'preferences-overlay');
  const dialog = queryRequiredElement<HTMLDivElement>(doc, 'preferences-dialog');
  const closeButton = queryRequiredElement<HTMLButtonElement>(doc, 'preferences-close');
  const paletteHint = queryRequiredElement<HTMLParagraphElement>(doc, 'preferences-palette-hint');
  const modeInputs = Array.from(doc.querySelectorAll<HTMLInputElement>('input[name="theme-mode"]'));
  const paletteInputs = Array.from(doc.querySelectorAll<HTMLInputElement>('input[name="theme-palette"]'));
  let lastFocusedElement: HTMLElement | null = null;
  let currentPreferences: AppPreferences | null = null;

  function update(preferences: AppPreferences) {
    currentPreferences = sanitizePreferences(preferences);
    const allowedPalettes = new Set(getAllowedPalettes(currentPreferences.theme_mode));

    for (const input of modeInputs) {
      input.checked = input.value === currentPreferences.theme_mode;
    }

    for (const input of paletteInputs) {
      const palette = input.value as ThemePalette;
      input.disabled = !allowedPalettes.has(palette);
      input.checked = palette === currentPreferences.theme_palette;
      input.closest('label')?.classList.toggle('disabled', input.disabled);
    }

    paletteHint.textContent = currentPreferences.theme_mode === 'auto'
      ? 'Automatic appearance uses the Default palette so OS light/dark changes stay consistent.'
      : currentPreferences.theme_mode === 'light'
        ? 'Light appearance supports Default and IntelliJ Light.'
        : 'Dark appearance supports Default and IntelliJ Dark.';
  }

  function show(preferences: AppPreferences) {
    lastFocusedElement = doc.activeElement instanceof HTMLElement ? doc.activeElement : null;
    update(preferences);
    overlay.hidden = false;
    doc.body.classList.add('preferences-open');
    closeButton.focus();
  }

  function hide() {
    if (overlay.hidden) {
      return;
    }

    overlay.hidden = true;
    doc.body.classList.remove('preferences-open');

    if (lastFocusedElement) {
      lastFocusedElement.focus();
      lastFocusedElement = null;
    }
  }

  closeButton.addEventListener('click', hide);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      hide();
    }
  });
  dialog.addEventListener('click', (event) => {
    event.stopPropagation();
  });

  for (const input of modeInputs) {
    input.addEventListener('change', () => {
      if (input.checked) {
        options.onThemeModeChange(input.value as ThemeMode);
      }
    });
  }

  for (const input of paletteInputs) {
    input.addEventListener('change', () => {
      if (input.checked) {
        options.onThemePaletteChange(input.value as ThemePalette);
      }
    });
  }

  doc.addEventListener('keydown', (event) => {
    if (!overlay.hidden && event.key === 'Escape') {
      event.preventDefault();
      hide();
    }
  });

  if (currentPreferences) {
    update(currentPreferences);
  }

  return { show, hide, update };
}