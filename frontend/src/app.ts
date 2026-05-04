import { initializeAbout, showAbout, type AboutInfo } from './ui/about';
import { initializeLayout, type LayoutController } from './ui/layout';
import { initializePreferences, type PreferencesController } from './ui/preferences';
import { initializeSearch, type SearchController } from './ui/search';
import { initializeToc, type TocController } from './ui/toc';
import { applyTheme, createDefaultPreferences, sanitizePreferences, type AppPreferences, type ThemeMode, type ThemePalette } from './theme';
import { getBaseName, resolveLocalMarkdownPath } from './utils/path';
import type { MarkdownEditorController, MarkdownEditorOptions } from './ui/editor';

export interface TocItem {
  level: number;
  text: string;
  id: string;
  line_number?: number;
}

export interface MarkdownDocument {
  path: string;
  raw_content: string;
  html_content: string;
  toc: TocItem[];
  is_saved_to_disk: boolean;
}

export interface NavigationState {
  can_go_back: boolean;
  can_go_forward: boolean;
}

interface WindowEventPayload<T> {
  payload: T;
}

export interface AppWindowLike {
  listen<T>(event: string, handler: (event: WindowEventPayload<T>) => void): Promise<() => void>;
  setTitle(title: string): Promise<void>;
}

export interface AppDependencies {
  document: Document;
  window: Window;
  currentWindow: AppWindowLike;
  invoke<T>(command: string, args?: Record<string, unknown>): Promise<T>;
  initialPreferences?: AppPreferences;
  openFileDialog(options?: { defaultPath?: string }): Promise<string | null>;
  saveFileDialog(options: { defaultPath?: string }): Promise<string | null>;
  openExternalUrl(url: string): Promise<void>;
  createEditor?: (parent: HTMLElement, options: MarkdownEditorOptions) => MarkdownEditorController;
}

type MarkdownEditorFactory = (parent: HTMLElement, options: MarkdownEditorOptions) => MarkdownEditorController;

const PREVIEW_PARSE_DEBOUNCE_MS = 200;

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function queryRequiredElement<T extends HTMLElement>(doc: Document, id: string): T {
  const element = doc.getElementById(id);
  if (!element) {
    throw new Error(`Expected element #${id} to exist`);
  }

  return element as T;
}

export async function initializeApp(deps: AppDependencies) {
  const doc = deps.document;
  const win = deps.window;

  let currentDocument: MarkdownDocument | null = null;
  let savedDocument: MarkdownDocument | null = null;
  let preferences = sanitizePreferences(deps.initialPreferences ?? createDefaultPreferences());
  let currentZoom = preferences.zoom_factor;
  let draftContent = '';
  let isDirty = false;
  let parseSequence = 0;
  let parseTimer: number | undefined;
  let aboutInfoPromise: Promise<AboutInfo> | null = null;
  let editor: MarkdownEditorController | null = null;
  let editorFactoryPromise: Promise<MarkdownEditorFactory> | null = null;
  let isEditorLoading = false;
  const systemThemeQuery = win.matchMedia?.('(prefers-color-scheme: dark)') ?? null;

  const markdownContainer = queryRequiredElement<HTMLDivElement>(doc, 'markdown-container');
  const tocNav = queryRequiredElement<HTMLElement>(doc, 'toc-nav');
  const tocEmpty = queryRequiredElement<HTMLElement>(doc, 'toc-empty');
  const btnOpen = queryRequiredElement<HTMLButtonElement>(doc, 'btn-open');
  const btnSave = queryRequiredElement<HTMLButtonElement>(doc, 'btn-save');
  const btnSaveAs = queryRequiredElement<HTMLButtonElement>(doc, 'btn-save-as');
  const btnReload = queryRequiredElement<HTMLButtonElement>(doc, 'btn-reload');
  const btnPrevFile = queryRequiredElement<HTMLButtonElement>(doc, 'btn-prev-file');
  const btnNextFile = queryRequiredElement<HTMLButtonElement>(doc, 'btn-next-file');
  const btnToggleEdit = queryRequiredElement<HTMLButtonElement>(doc, 'btn-toggle-edit');
  const btnSearch = queryRequiredElement<HTMLButtonElement>(doc, 'btn-search');
  const btnZoomIn = queryRequiredElement<HTMLButtonElement>(doc, 'btn-zoom-in');
  const btnZoomOut = queryRequiredElement<HTMLButtonElement>(doc, 'btn-zoom-out');
  const btnZoomReset = queryRequiredElement<HTMLButtonElement>(doc, 'btn-zoom-reset');
  const zoomLevel = queryRequiredElement<HTMLElement>(doc, 'zoom-level');
  const editorContainer = queryRequiredElement<HTMLDivElement>(doc, 'editor-container');

  initializeAbout();
  const preferencesController: PreferencesController = initializePreferences({
    document: doc,
    onThemeModeChange: (mode) => {
      void updateThemeMode(mode);
    },
    onThemePaletteChange: (palette) => {
      void updateThemePalette(palette);
    },
  });

  const layout: LayoutController = initializeLayout(doc);
  const search: SearchController = initializeSearch({ document: doc, getContainer: () => markdownContainer });
  const toc: TocController = initializeToc({ document: doc, getContainer: () => markdownContainer });
  const editorOptions: MarkdownEditorOptions = {
    initialValue: '',
    onChange: (value) => {
      draftContent = value;
      updateDirtyState();
      schedulePreviewParse();
    },
  };

  if (deps.createEditor) {
    editor = deps.createEditor(editorContainer, editorOptions);
  }

  async function loadEditorFactory() {
    if (deps.createEditor) {
      return deps.createEditor;
    }

    if (!editorFactoryPromise) {
      editorFactoryPromise = import('./ui/editor').then((module) => module.createMarkdownEditor);
    }

    return editorFactoryPromise;
  }

  async function ensureEditorLoaded() {
    if (editor) {
      return editor;
    }

    isEditorLoading = true;
    updateActionState();
    const createEditor = await loadEditorFactory();
    editor = createEditor(editorContainer, {
      ...editorOptions,
      initialValue: draftContent,
    });
    isEditorLoading = false;
    updateActionState();
    return editor;
  }

  function getCurrentPath() {
    return savedDocument?.path ?? currentDocument?.path ?? null;
  }

  function hasLoadedDocument() {
    return savedDocument !== null;
  }

  function clearScheduledParse() {
    if (parseTimer !== undefined) {
      win.clearTimeout(parseTimer);
      parseTimer = undefined;
    }
  }

  function updateWindowTitle() {
    const title = !currentDocument
      ? 'mdview'
      : `mdview - ${getBaseName(currentDocument.path)}${isDirty ? '*' : ''}`;

    doc.title = title;
    void deps.currentWindow.setTitle(title);
    void deps.invoke('set_window_title', { title });

    if (!currentDocument) {
      return;
    }
  }

  function updateActionState() {
    const loaded = hasLoadedDocument();
    btnReload.disabled = !loaded || !savedDocument?.is_saved_to_disk;
    btnSave.disabled = !loaded || !isDirty;
    btnSaveAs.disabled = !loaded;
    btnToggleEdit.disabled = !loaded || isEditorLoading;
    btnSearch.disabled = !loaded;
    btnZoomIn.disabled = !loaded;
    btnZoomOut.disabled = !loaded;
    btnZoomReset.disabled = !loaded;
    btnToggleEdit.setAttribute('aria-pressed', String(layout.getViewMode() === 'split'));
    btnToggleEdit.textContent = isEditorLoading ? 'Loading…' : layout.getViewMode() === 'split' ? 'Preview' : 'Edit';
  }

  function updateDirtyState() {
    const nextDirty = !savedDocument?.is_saved_to_disk || draftContent !== (savedDocument?.raw_content ?? '');
    isDirty = nextDirty;
    updateWindowTitle();
    updateActionState();
  }

  function getDialogDefaultPath() {
    return getCurrentPath() ?? preferences.working_directory ?? undefined;
  }

  function applyCurrentTheme() {
    preferences = applyTheme(doc, preferences, systemThemeQuery?.matches ?? false);
    preferencesController.update(preferences);
  }

  async function persistThemePreferences(nextPreferences: AppPreferences) {
    const normalized = sanitizePreferences(nextPreferences);
    const updates: Promise<unknown>[] = [];

    if (normalized.theme_mode !== preferences.theme_mode) {
      updates.push(deps.invoke<ThemeMode>('set_theme_mode', { mode: normalized.theme_mode }));
    }

    if (normalized.theme_palette !== preferences.theme_palette) {
      updates.push(deps.invoke<ThemePalette>('set_theme_palette', { palette: normalized.theme_palette }));
    }

    try {
      await Promise.all(updates);
      preferences = normalized;
      applyCurrentTheme();
    } catch (error) {
      win.alert(`Failed to update preferences: ${error}`);
      preferencesController.update(preferences);
    }
  }

  async function updateThemeMode(mode: ThemeMode) {
    await persistThemePreferences({
      ...preferences,
      theme_mode: mode,
    });
  }

  async function updateThemePalette(palette: ThemePalette) {
    await persistThemePreferences({
      ...preferences,
      theme_palette: palette,
    });
  }

  function applyZoom() {
    if (!currentDocument) {
      markdownContainer.style.transform = '';
      markdownContainer.style.width = '';
      zoomLevel.textContent = '100%';
      return;
    }

    const contentArea = queryRequiredElement<HTMLElement>(doc, 'preview-pane');
    const containerWidth = contentArea.offsetWidth > 0 ? contentArea.offsetWidth / currentZoom : 0;
    markdownContainer.style.transform = `scale(${currentZoom})`;
    markdownContainer.style.width = containerWidth > 0 ? `${containerWidth}px` : '';
    zoomLevel.textContent = `${Math.round(currentZoom * 100)}%`;
  }

  function decorateRenderedLinks() {
    markdownContainer.querySelectorAll('a').forEach((link) => {
      const href = link.getAttribute('href');
      link.removeAttribute('data-external-url');
      link.removeAttribute('data-local-file');
      link.classList.remove('external-link', 'local-link');

      if (!href) {
        return;
      }

      if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('www.')) {
        const fullUrl = href.startsWith('www.') ? `https://${href}` : href;
        link.setAttribute('data-external-url', fullUrl);
        link.removeAttribute('href');
        link.classList.add('external-link');
        return;
      }

      if (!href.startsWith('#') && (href.endsWith('.md') || href.includes('.md#'))) {
        link.setAttribute('data-local-file', href);
        link.removeAttribute('href');
        link.classList.add('local-link');
      }
    });
  }

  function renderToc(documentToRender: MarkdownDocument) {
    if (documentToRender.toc.length === 0) {
      tocNav.innerHTML = '';
      tocNav.style.display = 'none';
      tocEmpty.style.display = 'block';
      return;
    }

    tocNav.innerHTML = documentToRender.toc
      .map((item) => `<a href="#${item.id}" class="toc-item level-${item.level}" data-id="${item.id}">${escapeHtml(item.text)}</a>`)
      .join('');
    tocNav.style.display = 'flex';
    tocEmpty.style.display = 'none';
  }

  function renderDocument(documentToRender: MarkdownDocument) {
    currentDocument = documentToRender;
    markdownContainer.innerHTML = documentToRender.html_content;
    markdownContainer.classList.add('markdown-content');
    renderToc(documentToRender);
    decorateRenderedLinks();
    applyZoom();
    toc.refreshActiveItem();
    search.refresh();
    updateWindowTitle();
  }

  async function updateNavigationState() {
    try {
      const state = await deps.invoke<NavigationState>('get_navigation_state');
      btnPrevFile.disabled = !state.can_go_back;
      btnNextFile.disabled = !state.can_go_forward;
    } catch {
      btnPrevFile.disabled = true;
      btnNextFile.disabled = true;
    }
  }

  function loadSavedDocument(documentToLoad: MarkdownDocument) {
    clearScheduledParse();
    parseSequence += 1;
    savedDocument = documentToLoad;
    draftContent = documentToLoad.raw_content;
    editor?.setValue(documentToLoad.raw_content);
    isDirty = !documentToLoad.is_saved_to_disk;
    renderDocument(documentToLoad);
    updateActionState();
    void updateNavigationState();

    if (!documentToLoad.is_saved_to_disk) {
      void toggleEditMode(true);
    }
  }

  async function parseDraftPreview(requestPath: string, requestSource: string, requestId: number) {
    const parsed = await deps.invoke<MarkdownDocument>('parse_markdown', {
      path: requestPath,
      source: requestSource,
    });

    if (requestId !== parseSequence) {
      return;
    }

    renderDocument(parsed);
    updateActionState();
  }

  function schedulePreviewParse() {
    const path = getCurrentPath();
    if (!path || !hasLoadedDocument()) {
      return;
    }

    clearScheduledParse();
    parseSequence += 1;
    const requestId = parseSequence;
    const requestSource = draftContent;
    parseTimer = win.setTimeout(() => {
      void parseDraftPreview(path, requestSource, requestId).catch((error) => {
        console.error('Failed to parse markdown preview:', error);
      });
    }, PREVIEW_PARSE_DEBOUNCE_MS);
  }

  async function confirmDiscardChanges(action: string) {
    if (!isDirty) {
      return true;
    }

    return win.confirm(`Discard unsaved changes and ${action}?`);
  }

  async function openDocument(path: string) {
    const documentToLoad = await deps.invoke<MarkdownDocument>('open_document', { path });
    loadSavedDocument(documentToLoad);
  }

  async function openFile() {
    if (!(await confirmDiscardChanges('open another file'))) {
      return;
    }

    try {
      const selectedPath = await deps.openFileDialog({ defaultPath: getDialogDefaultPath() });
      if (!selectedPath) {
        return;
      }

      await openDocument(selectedPath);
    } catch (error) {
      win.alert(`Failed to open file: ${error}`);
    }
  }

  async function saveCurrentDocument() {
    const path = getCurrentPath();
    if (!path) {
      await saveCurrentDocumentAs();
      return;
    }

    try {
      const saved = await deps.invoke<MarkdownDocument>('save_document', { path, source: draftContent });
      loadSavedDocument(saved);
    } catch (error) {
      win.alert(`Failed to save file: ${error}`);
    }
  }

  async function saveCurrentDocumentAs() {
    if (!hasLoadedDocument()) {
      return;
    }

    try {
      const selectedPath = await deps.saveFileDialog({ defaultPath: getDialogDefaultPath() });
      if (!selectedPath) {
        return;
      }

      const saved = await deps.invoke<MarkdownDocument>('save_document', {
        path: selectedPath,
        source: draftContent,
      });
      loadSavedDocument(saved);
    } catch (error) {
      win.alert(`Failed to save file: ${error}`);
    }
  }

  async function reloadDocument() {
    if (!hasLoadedDocument()) {
      return;
    }

    if (!(await confirmDiscardChanges('reload the current file'))) {
      return;
    }

    try {
      const reloaded = await deps.invoke<MarkdownDocument>('reload_document');
      loadSavedDocument(reloaded);
    } catch (error) {
      win.alert(`Failed to reload document: ${error}`);
    }
  }

  async function navigateToHistory(direction: 'navigate_previous' | 'navigate_next', emptyMessage: string) {
    if (!(await confirmDiscardChanges('replace the current document'))) {
      return;
    }

    try {
      const documentToLoad = await deps.invoke<MarkdownDocument>(direction);
      loadSavedDocument(documentToLoad);
    } catch (error) {
      if (typeof error === 'object' && error && 'message' in error && String((error as { message: unknown }).message).includes(emptyMessage)) {
        return;
      }

      win.alert(`Failed to navigate: ${error}`);
    }
  }

  function copySelection() {
    const selection = win.getSelection?.();
    const text = selection?.toString() ?? '';
    if (!text) {
      return;
    }

    if (win.navigator.clipboard && win.isSecureContext) {
      void win.navigator.clipboard.writeText(text).then(showCopyFeedback).catch(() => {
        doc.execCommand('copy');
        showCopyFeedback();
      });
      return;
    }

    doc.execCommand('copy');
    showCopyFeedback();
  }

  function showCopyFeedback() {
    const feedback = doc.createElement('div');
    feedback.className = 'copy-feedback';
    feedback.textContent = 'Copied!';
    doc.body.appendChild(feedback);
    win.setTimeout(() => feedback.remove(), 1000);
  }

  async function setZoom(factor: number) {
    if (!hasLoadedDocument()) {
      return;
    }

    const clamped = Math.max(0.5, Math.min(3.0, factor));
    currentZoom = await deps.invoke<number>('set_zoom_factor', { factor: clamped });
    preferences = {
      ...preferences,
      zoom_factor: currentZoom,
    };
    applyZoom();
  }

  async function openAboutDialog() {
    if (!aboutInfoPromise) {
      aboutInfoPromise = deps.invoke<AboutInfo>('get_about_info').catch((error) => {
        aboutInfoPromise = null;
        throw error;
      });
    }

    try {
      showAbout(await aboutInfoPromise);
    } catch (error) {
      win.alert(`Failed to open About dialog: ${error}`);
    }
  }

  async function toggleEditMode(force?: boolean) {
    const nextMode = force ?? layout.getViewMode() !== 'split';
    if (nextMode) {
      const loadedEditor = await ensureEditorLoaded();
      loadedEditor.setValue(draftContent);
    }

    layout.setViewMode(nextMode ? 'split' : 'preview');
    updateActionState();
    applyZoom();
    if (nextMode) {
      editor?.focus();
    }
  }

  markdownContainer.addEventListener('click', (event) => {
    const link = (event.target as HTMLElement).closest('a');
    if (!link) {
      return;
    }

    const externalUrl = link.getAttribute('data-external-url');
    if (externalUrl) {
      event.preventDefault();
      void deps.openExternalUrl(externalUrl).catch((error) => {
        win.alert(`Failed to open link: ${error}`);
      });
      return;
    }

    const localFile = link.getAttribute('data-local-file');
    if (localFile && currentDocument) {
      event.preventDefault();
      void (async () => {
        if (!(await confirmDiscardChanges('open a linked document'))) {
          return;
        }

        const resolved = resolveLocalMarkdownPath(currentDocument.path, localFile);
        await openDocument(resolved.absolutePath);
        if (resolved.anchor) {
          win.setTimeout(() => {
            markdownContainer.querySelector(`[id="${resolved.anchor}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 50);
        }
      })().catch((error) => {
        win.alert(`Failed to open file: ${error}`);
      });
      return;
    }

    const href = link.getAttribute('href');
    if (!href?.startsWith('#')) {
      return;
    }

    event.preventDefault();
    const targetId = href.slice(1);
    const targetElement = markdownContainer.querySelector(`[id="${targetId}"]`);
    targetElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  btnOpen.addEventListener('click', () => void openFile());
  btnSave.addEventListener('click', () => void saveCurrentDocument());
  btnSaveAs.addEventListener('click', () => void saveCurrentDocumentAs());
  btnReload.addEventListener('click', () => void reloadDocument());
  btnPrevFile.addEventListener('click', () => void navigateToHistory('navigate_previous', 'No previous file'));
  btnNextFile.addEventListener('click', () => void navigateToHistory('navigate_next', 'No next file'));
  btnToggleEdit.addEventListener('click', () => void toggleEditMode());
  btnSearch.addEventListener('click', () => search.show());
  btnZoomIn.addEventListener('click', () => void setZoom(currentZoom + 0.1));
  btnZoomOut.addEventListener('click', () => void setZoom(currentZoom - 0.1));
  btnZoomReset.addEventListener('click', () => void setZoom(1.0));

  doc.addEventListener('keydown', (event) => {
    const isCommand = event.metaKey || event.ctrlKey;
    if (!isCommand) {
      return;
    }

    const key = event.key.toLowerCase();
    if (key === 'o') {
      event.preventDefault();
      void openFile();
      return;
    }

    if (key === 's' && event.shiftKey) {
      event.preventDefault();
      void saveCurrentDocumentAs();
      return;
    }

    if (key === 's') {
      event.preventDefault();
      void saveCurrentDocument();
      return;
    }

    if (key === 'r') {
      event.preventDefault();
      void reloadDocument();
      return;
    }

    if (key === 'f') {
      event.preventDefault();
      search.show();
      return;
    }

    if (key === 'e') {
      event.preventDefault();
      void toggleEditMode();
      return;
    }

    if (key === '=' || key === '+') {
      event.preventDefault();
      void setZoom(currentZoom + 0.1);
      return;
    }

    if (key === '-') {
      event.preventDefault();
      void setZoom(currentZoom - 0.1);
      return;
    }

    if (key === '0') {
      event.preventDefault();
      void setZoom(1.0);
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      void navigateToHistory('navigate_previous', 'No previous file');
      return;
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      void navigateToHistory('navigate_next', 'No next file');
    }
  });

  await deps.currentWindow.listen<MarkdownDocument>('document-loaded', (event) => {
    loadSavedDocument(event.payload);
  });
  await deps.currentWindow.listen<string>('document-load-error', (event) => {
    win.alert(`Failed to load document: ${event.payload}`);
  });
  await deps.currentWindow.listen('menu-open', () => {
    void openFile();
  });
  await deps.currentWindow.listen('menu-save', () => {
    void saveCurrentDocument();
  });
  await deps.currentWindow.listen('menu-save-as', () => {
    void saveCurrentDocumentAs();
  });
  await deps.currentWindow.listen('menu-copy', () => {
    copySelection();
  });
  await deps.currentWindow.listen('menu-search', () => {
    search.show();
  });
  await deps.currentWindow.listen('menu-toggle-edit', () => {
    void toggleEditMode();
  });
  await deps.currentWindow.listen('menu-zoom-in', () => {
    void setZoom(currentZoom + 0.1);
  });
  await deps.currentWindow.listen('menu-zoom-out', () => {
    void setZoom(currentZoom - 0.1);
  });
  await deps.currentWindow.listen('menu-zoom-reset', () => {
    void setZoom(1.0);
  });
  await deps.currentWindow.listen('menu-about', () => {
    void openAboutDialog();
  });
  await deps.currentWindow.listen('menu-preferences', () => {
    preferencesController.show(preferences);
  });
  await deps.currentWindow.listen('menu-prev-file', () => {
    void navigateToHistory('navigate_previous', 'No previous file');
  });
  await deps.currentWindow.listen('menu-next-file', () => {
    void navigateToHistory('navigate_next', 'No next file');
  });

  try {
    preferences = sanitizePreferences(deps.initialPreferences ?? await deps.invoke<AppPreferences>('get_preferences'));
    currentZoom = preferences.zoom_factor;
  } catch {
    currentZoom = await deps.invoke<number>('get_zoom_factor').catch(() => 1.0);
    preferences = {
      ...preferences,
      zoom_factor: currentZoom,
    };
  }
  applyCurrentTheme();
  applyZoom();

  const handleSystemThemeChange = () => {
    if (preferences.theme_mode === 'auto') {
      applyCurrentTheme();
    }
  };

  systemThemeQuery?.addEventListener?.('change', handleSystemThemeChange);

  try {
    const documentToLoad = await deps.invoke<MarkdownDocument | null>('get_current_document');
    if (documentToLoad) {
      loadSavedDocument(documentToLoad);
    }
  } catch (error) {
    console.error('Failed to check for initial document:', error);
  }

  updateActionState();
  await updateNavigationState();

  return {
    destroy() {
      clearScheduledParse();
      systemThemeQuery?.removeEventListener?.('change', handleSystemThemeChange);
      editor?.destroy();
    },
  };
}