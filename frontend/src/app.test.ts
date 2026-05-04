import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initializeApp, type AppDependencies, type AppWindowLike, type MarkdownDocument } from './app';
import type { MarkdownEditorController, MarkdownEditorOptions } from './ui/editor';
import type { AppPreferences } from './theme';

const defaultPreferences: AppPreferences = {
  theme_mode: 'light',
  theme_palette: 'default',
  zoom_factor: 1,
  working_directory: null,
};

function installMatchMedia(matches = false) {
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const mediaQuery = {
    matches,
    media: '(prefers-color-scheme: dark)',
    onchange: null,
    addEventListener: (_event: string, listener: (event: MediaQueryListEvent) => void) => {
      listeners.add(listener);
    },
    removeEventListener: (_event: string, listener: (event: MediaQueryListEvent) => void) => {
      listeners.delete(listener);
    },
    addListener: (listener: (event: MediaQueryListEvent) => void) => {
      listeners.add(listener);
    },
    removeListener: (listener: (event: MediaQueryListEvent) => void) => {
      listeners.delete(listener);
    },
    dispatch(nextMatches: boolean) {
      mediaQuery.matches = nextMatches;
      const event = { matches: nextMatches, media: mediaQuery.media } as MediaQueryListEvent;
      for (const listener of listeners) {
        listener(event);
      }
    },
  } as MediaQueryList & { dispatch(nextMatches: boolean): void };

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn(() => mediaQuery),
  });

  return mediaQuery;
}

function createTestMarkup() {
  document.body.innerHTML = `
    <div id="app">
      <div id="toolbar">
        <button id="btn-open"></button>
        <button id="btn-save"></button>
        <button id="btn-save-as"></button>
        <button id="btn-reload"></button>
        <button id="btn-prev-file"></button>
        <button id="btn-next-file"></button>
        <button id="btn-toggle-edit"></button>
        <button id="btn-search"></button>
        <button id="btn-zoom-out"></button>
        <span id="zoom-level"></span>
        <button id="btn-zoom-in"></button>
        <button id="btn-zoom-reset"></button>
      </div>
      <div id="main-layout">
        <div id="sidebar"><div id="sidebar-header"><button id="btn-toggle-sidebar"></button></div><div id="toc-container"><div id="toc-empty"></div><nav id="toc-nav"></nav></div></div>
        <div id="resizer"></div>
        <div id="content-area">
          <div id="search-bar" hidden>
            <input id="search-input" />
            <button id="btn-search-prev"></button>
            <button id="btn-search-next"></button>
            <span id="search-results"></span>
            <button id="btn-search-close"></button>
          </div>
          <div id="editor-workspace">
            <div id="editor-pane"><div id="editor-container"></div></div>
            <div id="editor-resizer"></div>
            <div id="preview-pane"><div id="markdown-container"></div></div>
          </div>
        </div>
      </div>
      <div id="about-overlay" hidden><div id="about-dialog"><button id="about-close"></button><div id="about-version"></div><div id="about-description"></div><div id="about-copyright"></div><button id="about-tab-license"></button><button id="about-tab-third-party"></button><div id="about-text"></div></div></div>
      <div id="preferences-overlay" hidden><div id="preferences-dialog"><button id="preferences-close"></button><div id="preferences-palette-hint"></div><label><input id="preferences-mode-light" type="radio" name="theme-mode" value="light" /></label><label><input id="preferences-mode-dark" type="radio" name="theme-mode" value="dark" /></label><label><input id="preferences-mode-auto" type="radio" name="theme-mode" value="auto" /></label><label><input id="preferences-palette-default" type="radio" name="theme-palette" value="default" /></label><label><input id="preferences-palette-intellij-light" type="radio" name="theme-palette" value="intellij-light" /></label><label><input id="preferences-palette-intellij-dark" type="radio" name="theme-palette" value="intellij-dark" /></label></div></div>
    </div>
  `;
}

function createDocument(path: string, source = '# Title'): MarkdownDocument {
  return {
    path,
    raw_content: source,
    html_content: `<h1 id="title">Title</h1><p>${source}</p>`,
    toc: [{ level: 1, text: 'Title', id: 'title' }],
    is_saved_to_disk: true,
  };
}

class FakeWindow implements AppWindowLike {
  private listeners = new Map<string, Array<(event: { payload: unknown }) => void>>();
  title = 'mdview';

  async listen<T>(event: string, handler: (event: { payload: T }) => void) {
    const handlers = this.listeners.get(event) ?? [];
    handlers.push(handler as (event: { payload: unknown }) => void);
    this.listeners.set(event, handlers);
    return () => {};
  }

  async setTitle(title: string) {
    this.title = title;
  }

  emit<T>(event: string, payload: T) {
    for (const handler of this.listeners.get(event) ?? []) {
      handler({ payload });
    }
  }
}

describe('initializeApp', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    createTestMarkup();
    installMatchMedia(false);
    Object.defineProperty(window, 'confirm', { value: vi.fn(() => true), configurable: true });
    Object.defineProperty(window, 'alert', { value: vi.fn(), configurable: true });
  });

  it('parses edited markdown and enables save when the draft changes', async () => {
    const fakeWindow = new FakeWindow();
    const initialDocument = createDocument('/docs/guide.md', '# Title');
    const parsedDocument = createDocument('/docs/guide.md', '# Updated');
    const editorState = { value: initialDocument.raw_content, options: null as MarkdownEditorOptions | null };

    const invoke = vi.fn(async (command: string, args?: Record<string, unknown>) => {
      if (command === 'get_zoom_factor') return 1;
      if (command === 'get_current_document') return initialDocument;
      if (command === 'get_navigation_state') return { can_go_back: false, can_go_forward: false };
      if (command === 'set_window_title') return undefined;
      if (command === 'parse_markdown') return { ...parsedDocument, raw_content: String(args?.source ?? '') };
      throw new Error(`Unexpected command ${command}`);
    });

    const dependencies: AppDependencies = {
      document,
      window,
      currentWindow: fakeWindow,
      initialPreferences: defaultPreferences,
      invoke,
      openFileDialog: vi.fn(async () => null),
      saveFileDialog: vi.fn(async () => null),
      openExternalUrl: vi.fn(async () => undefined),
      createEditor: (_parent, options) => {
        editorState.options = options;
        return {
          setValue(value: string) {
            editorState.value = value;
          },
          getValue() {
            return editorState.value;
          },
          focus() {},
          setEditable() {},
          destroy() {},
        } as MarkdownEditorController;
      },
    };

    await initializeApp(dependencies);
    editorState.options?.onChange?.('# Updated');
    await vi.advanceTimersByTimeAsync(200);

    expect(invoke).toHaveBeenCalledWith('parse_markdown', { path: '/docs/guide.md', source: '# Updated' });
    expect(invoke).toHaveBeenCalledWith('set_window_title', { title: 'mdview - guide.md*' });
    expect((document.getElementById('btn-save') as HTMLButtonElement).disabled).toBe(false);
    expect(document.title).toBe('mdview - guide.md*');
    expect(fakeWindow.title).toBe('mdview - guide.md*');
  });

  it('saves the edited document and clears dirty state', async () => {
    const fakeWindow = new FakeWindow();
    const initialDocument = createDocument('/docs/guide.md', '# Title');
    const savedDocument = createDocument('/docs/guide.md', '# Saved');
    const editorState = { value: initialDocument.raw_content, options: null as MarkdownEditorOptions | null };

    const invoke = vi.fn(async (command: string, args?: Record<string, unknown>) => {
      if (command === 'get_zoom_factor') return 1;
      if (command === 'get_current_document') return initialDocument;
      if (command === 'get_navigation_state') return { can_go_back: false, can_go_forward: false };
      if (command === 'set_window_title') return undefined;
      if (command === 'parse_markdown') return { ...savedDocument, raw_content: String(args?.source ?? '') };
      if (command === 'save_document') return { ...savedDocument, raw_content: String(args?.source ?? '') };
      throw new Error(`Unexpected command ${command}`);
    });

    await initializeApp({
      document,
      window,
      currentWindow: fakeWindow,
      initialPreferences: defaultPreferences,
      invoke,
      openFileDialog: vi.fn(async () => null),
      saveFileDialog: vi.fn(async () => null),
      openExternalUrl: vi.fn(async () => undefined),
      createEditor: (_parent, options) => {
        editorState.options = options;
        return {
          setValue(value: string) {
            editorState.value = value;
          },
          getValue() {
            return editorState.value;
          },
          focus() {},
          setEditable() {},
          destroy() {},
        } as MarkdownEditorController;
      },
    });

    editorState.options?.onChange?.('# Saved');
    await vi.advanceTimersByTimeAsync(200);
    (document.getElementById('btn-save') as HTMLButtonElement).click();
    await Promise.resolve();

    expect(invoke).toHaveBeenCalledWith('save_document', { path: '/docs/guide.md', source: '# Saved' });
    expect((document.getElementById('btn-save') as HTMLButtonElement).disabled).toBe(true);
    expect(document.title.endsWith('*')).toBe(false);
    expect(fakeWindow.title).toBe('mdview - guide.md');
  });

  it('blocks opening another file when the dirty-state confirmation is rejected', async () => {
    const fakeWindow = new FakeWindow();
    const initialDocument = createDocument('/docs/guide.md', '# Title');
    const openFileDialog = vi.fn(async () => '/docs/other.md');
    const editorState = { options: null as MarkdownEditorOptions | null };
    (window.confirm as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false);

    const invoke = vi.fn(async (command: string) => {
      if (command === 'get_zoom_factor') return 1;
      if (command === 'get_current_document') return initialDocument;
      if (command === 'get_navigation_state') return { can_go_back: false, can_go_forward: false };
      if (command === 'set_window_title') return undefined;
      if (command === 'parse_markdown') return initialDocument;
      throw new Error(`Unexpected command ${command}`);
    });

    await initializeApp({
      document,
      window,
      currentWindow: fakeWindow,
      initialPreferences: defaultPreferences,
      invoke,
      openFileDialog,
      saveFileDialog: vi.fn(async () => null),
      openExternalUrl: vi.fn(async () => undefined),
      createEditor: (_parent, options) => {
        editorState.options = options;
        return {
          setValue() {},
          getValue() { return '# Title'; },
          focus() {},
          setEditable() {},
          destroy() {},
        } as MarkdownEditorController;
      },
    });

    editorState.options?.onChange?.('# Changed');
    (document.getElementById('btn-open') as HTMLButtonElement).click();
    await Promise.resolve();

    expect(openFileDialog).not.toHaveBeenCalled();
  });

  it('opens an unsaved startup draft in edit mode and keeps save enabled', async () => {
    const fakeWindow = new FakeWindow();
    const initialDocument = { ...createDocument('/docs/draft.md', ''), is_saved_to_disk: false };
    const focus = vi.fn();

    const invoke = vi.fn(async (command: string) => {
      if (command === 'get_zoom_factor') return 1;
      if (command === 'get_current_document') return initialDocument;
      if (command === 'get_navigation_state') return { can_go_back: false, can_go_forward: false };
      if (command === 'set_window_title') return undefined;
      throw new Error(`Unexpected command ${command}`);
    });

    await initializeApp({
      document,
      window,
      currentWindow: fakeWindow,
      initialPreferences: defaultPreferences,
      invoke,
      openFileDialog: vi.fn(async () => null),
      saveFileDialog: vi.fn(async () => null),
      openExternalUrl: vi.fn(async () => undefined),
      createEditor: () => ({
        setValue() {},
        getValue() { return ''; },
        focus,
        setEditable() {},
        destroy() {},
      } as MarkdownEditorController),
    });

    expect((document.getElementById('btn-save') as HTMLButtonElement).disabled).toBe(false);
    expect((document.getElementById('btn-reload') as HTMLButtonElement).disabled).toBe(true);
    expect(document.title.endsWith('*')).toBe(true);
    expect((document.getElementById('btn-toggle-edit') as HTMLButtonElement).textContent).toBe('Preview');
    expect(focus).toHaveBeenCalled();
  });

  it('saves an unsaved startup draft to the CLI-provided path', async () => {
    const fakeWindow = new FakeWindow();
    const initialDocument = { ...createDocument('/docs/draft.md', ''), is_saved_to_disk: false };
    const savedDocument = createDocument('/docs/draft.md', '');

    const invoke = vi.fn(async (command: string, args?: Record<string, unknown>) => {
      if (command === 'get_zoom_factor') return 1;
      if (command === 'get_current_document') return initialDocument;
      if (command === 'get_navigation_state') return { can_go_back: false, can_go_forward: false };
      if (command === 'set_window_title') return undefined;
      if (command === 'save_document') return { ...savedDocument, raw_content: String(args?.source ?? '') };
      throw new Error(`Unexpected command ${command}`);
    });

    await initializeApp({
      document,
      window,
      currentWindow: fakeWindow,
      initialPreferences: defaultPreferences,
      invoke,
      openFileDialog: vi.fn(async () => null),
      saveFileDialog: vi.fn(async () => null),
      openExternalUrl: vi.fn(async () => undefined),
      createEditor: () => ({
        setValue() {},
        getValue() { return ''; },
        focus() {},
        setEditable() {},
        destroy() {},
      } as MarkdownEditorController),
    });

    (document.getElementById('btn-save') as HTMLButtonElement).click();
    await Promise.resolve();

    expect(invoke).toHaveBeenCalledWith('save_document', { path: '/docs/draft.md', source: '' });
  });

  it('applies automatic dark theme from OS preference at startup', async () => {
    installMatchMedia(true);
    const fakeWindow = new FakeWindow();

    const invoke = vi.fn(async (command: string) => {
      if (command === 'get_current_document') return null;
      if (command === 'get_navigation_state') return { can_go_back: false, can_go_forward: false };
      if (command === 'set_window_title') return undefined;
      throw new Error(`Unexpected command ${command}`);
    });

    await initializeApp({
      document,
      window,
      currentWindow: fakeWindow,
      initialPreferences: { ...defaultPreferences, theme_mode: 'auto' },
      invoke,
      openFileDialog: vi.fn(async () => null),
      saveFileDialog: vi.fn(async () => null),
      openExternalUrl: vi.fn(async () => undefined),
    });

    expect(document.documentElement.dataset.themeAppearance).toBe('dark');
    expect(document.documentElement.dataset.themePalette).toBe('default');
  });

  it('opens preferences from the menu event and persists theme changes', async () => {
    const fakeWindow = new FakeWindow();
    const invoke = vi.fn(async (command: string, args?: Record<string, unknown>) => {
      if (command === 'get_current_document') return null;
      if (command === 'get_navigation_state') return { can_go_back: false, can_go_forward: false };
      if (command === 'set_window_title') return undefined;
      if (command === 'set_theme_mode') return args?.mode;
      throw new Error(`Unexpected command ${command}`);
    });

    await initializeApp({
      document,
      window,
      currentWindow: fakeWindow,
      initialPreferences: defaultPreferences,
      invoke,
      openFileDialog: vi.fn(async () => null),
      saveFileDialog: vi.fn(async () => null),
      openExternalUrl: vi.fn(async () => undefined),
    });

    fakeWindow.emit('menu-preferences', undefined);
    expect((document.getElementById('preferences-overlay') as HTMLDivElement).hidden).toBe(false);

    const darkInput = document.getElementById('preferences-mode-dark') as HTMLInputElement;
    darkInput.checked = true;
    darkInput.dispatchEvent(new Event('change', { bubbles: true }));
    await Promise.resolve();
    await Promise.resolve();

    expect(invoke).toHaveBeenCalledWith('set_theme_mode', { mode: 'dark' });
    expect(document.documentElement.dataset.themeAppearance).toBe('dark');
  });
});