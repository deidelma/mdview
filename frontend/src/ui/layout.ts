export type ViewMode = 'preview' | 'split';

export interface LayoutController {
    setViewMode(mode: ViewMode): void;
    getViewMode(): ViewMode;
}

/**
 * Initializes the layout manager for sidebar and split-view resizing.
 */
export function initializeLayout(doc: Document = document): LayoutController {
    const sidebar = doc.getElementById('sidebar') as HTMLElement;
    const sidebarResizer = doc.getElementById('resizer') as HTMLElement;
    const btnToggleSidebar = doc.getElementById('btn-toggle-sidebar') as HTMLButtonElement;
    const workspace = doc.getElementById('editor-workspace') as HTMLElement;
    const editorPane = doc.getElementById('editor-pane') as HTMLElement;
    const previewPane = doc.getElementById('preview-pane') as HTMLElement;
    const editorResizer = doc.getElementById('editor-resizer') as HTMLElement;

    let viewMode: ViewMode = 'preview';
    let splitRatio = 0.5;

    btnToggleSidebar.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
    });

    let sidebarResizeActive = false;
    let sidebarStartX = 0;
    let sidebarStartWidth = 0;

    sidebarResizer.addEventListener('mousedown', (event) => {
        sidebarResizeActive = true;
        sidebarStartX = event.clientX;
        sidebarStartWidth = sidebar.offsetWidth;
        doc.body.style.cursor = 'col-resize';
        doc.body.style.userSelect = 'none';
    });

    let editorResizeActive = false;

    editorResizer.addEventListener('mousedown', (event) => {
        if (viewMode !== 'split') {
            return;
        }

        editorResizeActive = true;
        doc.body.style.cursor = 'col-resize';
        doc.body.style.userSelect = 'none';
        event.preventDefault();
    });

    doc.addEventListener('mousemove', (event) => {
        if (sidebarResizeActive) {
            const deltaX = event.clientX - sidebarStartX;
            const nextWidth = Math.max(200, Math.min(600, sidebarStartWidth + deltaX));
            sidebar.style.width = `${nextWidth}px`;
            return;
        }

        if (!editorResizeActive || viewMode !== 'split') {
            return;
        }

        const rect = workspace.getBoundingClientRect();
        const nextRatio = (event.clientX - rect.left) / rect.width;
        splitRatio = Math.min(0.75, Math.max(0.25, nextRatio));
        applyViewMode();
    });

    doc.addEventListener('mouseup', () => {
        if (!sidebarResizeActive && !editorResizeActive) {
            return;
        }

        sidebarResizeActive = false;
        editorResizeActive = false;
        doc.body.style.cursor = '';
        doc.body.style.userSelect = '';
    });

    function applyViewMode() {
        workspace.dataset.viewMode = viewMode;

        if (viewMode === 'split') {
            editorPane.style.flexBasis = `${splitRatio * 100}%`;
            previewPane.style.flexBasis = `${(1 - splitRatio) * 100}%`;
            editorResizer.removeAttribute('aria-hidden');
            return;
        }

        editorPane.style.flexBasis = '';
        previewPane.style.flexBasis = '';
        editorResizer.setAttribute('aria-hidden', 'true');
    }

    applyViewMode();

    return {
        setViewMode(mode) {
            viewMode = mode;
            applyViewMode();
        },
        getViewMode() {
            return viewMode;
        },
    };
}