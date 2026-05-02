import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initializeApp, type AppDependencies, type AppWindowLike, type MarkdownDocument } from './app';
import type { MarkdownEditorController, MarkdownEditorOptions } from './ui/editor';

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
    </div>
  `;
}

function createDocument(path: string, source = '# Title'): MarkdownDocument {
  return {
    path,
    raw_content: source,
    html_content: `<h1 id="title">Title</h1><p>${source}</p>`,
    toc: [{ level: 1, text: 'Title', id: 'title' }],
  };
}

class FakeWindow implements AppWindowLike {
  private listeners = new Map<string, Array<(event: { payload: unknown }) => void>>();

  async listen<T>(event: string, handler: (event: { payload: T }) => void) {
    const handlers = this.listeners.get(event) ?? [];
    handlers.push(handler as (event: { payload: unknown }) => void);
    this.listeners.set(event, handlers);
    return () => {};
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
      if (command === 'parse_markdown') return { ...parsedDocument, raw_content: String(args?.source ?? '') };
      throw new Error(`Unexpected command ${command}`);
    });

    const dependencies: AppDependencies = {
      document,
      window,
      currentWindow: fakeWindow,
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
    expect((document.getElementById('btn-save') as HTMLButtonElement).disabled).toBe(false);
    expect(document.title.endsWith('*')).toBe(true);
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
      if (command === 'parse_markdown') return { ...savedDocument, raw_content: String(args?.source ?? '') };
      if (command === 'save_document') return { ...savedDocument, raw_content: String(args?.source ?? '') };
      throw new Error(`Unexpected command ${command}`);
    });

    await initializeApp({
      document,
      window,
      currentWindow: fakeWindow,
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
      if (command === 'parse_markdown') return initialDocument;
      throw new Error(`Unexpected command ${command}`);
    });

    await initializeApp({
      document,
      window,
      currentWindow: fakeWindow,
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
});