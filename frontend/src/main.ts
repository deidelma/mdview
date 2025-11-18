import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { open } from '@tauri-apps/plugin-dialog';
import { open as openUrl } from '@tauri-apps/plugin-shell';
import { initializeLayout } from './ui/layout';
import { initializeToc } from './ui/toc';
import { initializeSearch } from './ui/search';
import './styles/app.css';

// Immediate console log to verify JavaScript is running
console.log('=== MDVIEW MAIN.TS LOADED ===');
console.log('Window object:', typeof window);
console.log('Tauri available:', typeof (window as any).__TAURI_INTERNALS__);

interface MarkdownDocument {
    path: string;
    raw_content: string;
    html_content: string;
    toc: TocItem[];
}

interface TocItem {
    level: number;
    text: string;
    id: string;
    line_number?: number;
}

interface NavigationState {
    can_go_back: boolean;
    can_go_forward: boolean;
}

let currentDocument: MarkdownDocument | null = null;
let currentZoom = 1.0;

// DOM Elements
const markdownContainer = document.getElementById('markdown-container')!;
const tocNav = document.getElementById('toc-nav')!;
const tocEmpty = document.getElementById('toc-empty')!;
const btnOpen = document.getElementById('btn-open')!;
const btnReload = document.getElementById('btn-reload')!;
const btnPrevFile = document.getElementById('btn-prev-file')!;
const btnNextFile = document.getElementById('btn-next-file')!;
const btnSearch = document.getElementById('btn-search')!;
const btnZoomIn = document.getElementById('btn-zoom-in')!;
const btnZoomOut = document.getElementById('btn-zoom-out')!;
const btnZoomReset = document.getElementById('btn-zoom-reset')!;
const zoomLevel = document.getElementById('zoom-level')!;

/**
 * Renders a loaded document.
 */
function renderDocument(doc: MarkdownDocument) {
    currentDocument = doc;
    
    // Render HTML content
    markdownContainer.innerHTML = doc.html_content;
    markdownContainer.classList.add('markdown-content');
    
    // Apply current zoom level
    if (currentZoom !== 1.0) {
        const contentArea = document.getElementById('content-area')!;
        const containerWidth = contentArea.offsetWidth / currentZoom;
        markdownContainer.style.transform = `scale(${currentZoom})`;
        markdownContainer.style.width = `${containerWidth}px`;
    }
    
    // Render TOC
    if (doc.toc.length > 0) {
        tocNav.innerHTML = doc.toc.map(item => `
            <a href="#${item.id}" class="toc-item level-${item.level}" data-id="${item.id}">
                ${item.text}
            </a>
        `).join('');
        tocNav.style.display = 'flex';
        tocEmpty.style.display = 'none';
    } else {
        tocNav.style.display = 'none';
        tocEmpty.style.display = 'block';
    }
    
    // Enable reload button
    (btnReload as HTMLButtonElement).disabled = false;
    
    // Update window title
    document.title = `mdview - ${doc.path}`;
    
    // Setup link interception for external links
    setupLinkHandling();
    
    // Update navigation button states
    updateNavigationState();
}

/**
 * Updates the enabled/disabled state of navigation buttons.
 */
async function updateNavigationState() {
    try {
        const state = await invoke<NavigationState>('get_navigation_state');
        (btnPrevFile as HTMLButtonElement).disabled = !state.can_go_back;
        (btnNextFile as HTMLButtonElement).disabled = !state.can_go_forward;
    } catch (error) {
        console.error('Failed to get navigation state:', error);
        (btnPrevFile as HTMLButtonElement).disabled = true;
        (btnNextFile as HTMLButtonElement).disabled = true;
    }
}

/**
 * Sets up link click handling to open external links in system browser and local files in app.
 */
function setupLinkHandling() {
    const links = markdownContainer.querySelectorAll('a');
    
    links.forEach(link => {
        const href = link.getAttribute('href');
        
        if (!href) return;
        
        // Check if it's an external link (http://, https://, or www.)
        if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('www.')) {
            // For external links, move href to data attribute and remove href
            // This prevents Tauri from intercepting the click
            const fullUrl = href.startsWith('www.') ? `https://${href}` : href;
            link.setAttribute('data-external-url', fullUrl);
            link.removeAttribute('href');
            link.style.cursor = 'pointer';
            link.classList.add('external-link');
        }
        // Check if it's a local file link (relative path to .md file)
        else if (!href.startsWith('#') && (href.endsWith('.md') || href.includes('.md#'))) {
            link.setAttribute('data-local-file', href);
            link.removeAttribute('href');
            link.style.cursor = 'pointer';
            link.classList.add('local-link');
        }
    });
    
    // Use event delegation for handling clicks
    markdownContainer.addEventListener('click', async (e) => {
        const target = e.target as HTMLElement;
        const link = target.closest('a');
        
        if (!link) return;
        
        // Handle external links
        const externalUrl = link.getAttribute('data-external-url');
        
        if (externalUrl) {
            e.preventDefault();
            e.stopPropagation();
            
            try {
                await openUrl(externalUrl);
            } catch (err: any) {
                console.error('Failed to open URL:', err);
                alert(`Failed to open link: ${err}`);
            }
            return;
        }
        
        // Handle local file links
        const localFile = link.getAttribute('data-local-file');
        
        if (localFile) {
            e.preventDefault();
            e.stopPropagation();
            
            try {
                await openLocalFile(localFile);
            } catch (err: any) {
                console.error('Failed to open local file:', err);
                alert(`Failed to open file: ${err}`);
            }
            return;
        }
        
        // Handle internal anchor links
        const href = link.getAttribute('href');
        
        if (href && href.startsWith('#')) {
            e.preventDefault();
            const targetId = href.substring(1);
            let targetElement = markdownContainer.querySelector(`[id="${targetId}"]`);
            
            if (targetElement) {
                // If target is an anchor element, check parent or next sibling for heading
                if (targetElement.tagName === 'A' && targetElement.classList.contains('anchor')) {
                    // Check if parent is a heading
                    const parent = targetElement.parentElement;
                    if (parent && /^H[1-6]$/.test(parent.tagName)) {
                        targetElement = parent;
                    } else {
                        // Otherwise check next sibling
                        const nextElement = targetElement.nextElementSibling;
                        if (nextElement && /^H[1-6]$/.test(nextElement.tagName)) {
                            targetElement = nextElement;
                        }
                    }
                }
                
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                
                // Update TOC active state
                tocNav.querySelectorAll('.toc-item').forEach(item => {
                    item.classList.remove('active');
                });
                const tocItem = tocNav.querySelector(`[data-id="${targetId}"]`);
                if (tocItem) {
                    tocItem.classList.add('active');
                }
            }
        }
    });
}

/**
 * Opens a local file referenced by a relative path in a markdown link.
 * Resolves the path relative to the current document.
 */
async function openLocalFile(relativePath: string) {
    if (!currentDocument) {
        throw new Error('No document is currently loaded');
    }
    
    // Extract the file path and anchor (if any)
    const [filePath, anchor] = relativePath.split('#');
    
    // Get the directory of the current document
    const currentPath = currentDocument.path;
    const lastSlash = Math.max(currentPath.lastIndexOf('/'), currentPath.lastIndexOf('\\'));
    const currentDir = lastSlash >= 0 ? currentPath.substring(0, lastSlash + 1) : '';
    
    // Resolve the relative path
    let absolutePath: string;
    
    // Handle different path formats
    if (filePath.startsWith('/')) {
        // Already absolute
        absolutePath = filePath;
    } else if (filePath.startsWith('./') || filePath.startsWith('../')) {
        // Explicit relative path - resolve step by step
        const parts = currentDir.split(/[\/\\]/).filter(p => p);
        const relParts = filePath.split(/[\/\\]/).filter(p => p);
        
        for (const part of relParts) {
            if (part === '..') {
                parts.pop();
            } else if (part !== '.') {
                parts.push(part);
            }
        }
        
        absolutePath = '/' + parts.join('/');
    } else {
        // Simple filename or path - relative to current directory
        // Ensure currentDir ends with slash
        const dir = currentDir.endsWith('/') || currentDir.endsWith('\\') ? currentDir : currentDir + '/';
        absolutePath = dir + filePath;
    }
    
    // Load the document
    const doc = await invoke<MarkdownDocument>('open_document', { path: absolutePath });
    renderDocument(doc);
    
    // If there's an anchor, scroll to it after a brief delay
    if (anchor) {
        setTimeout(() => {
            const targetElement = markdownContainer.querySelector(`[id="${anchor}"]`);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 100);
    }
}

/**
 * Opens a file dialog and loads the selected Markdown file.
 */
async function openFile() {
    try {
        const selected = await open({
            multiple: false,
            filters: [{
                name: 'Markdown',
                extensions: ['md', 'markdown', 'mdown', 'mkd', 'mdx']
            }]
        });
        
        console.log('File dialog returned:', selected, 'Type:', typeof selected);
        
        if (selected) {
            // The dialog returns a string path directly
            const path = typeof selected === 'string' ? selected : (selected as any).path || String(selected);
            console.log('Opening file:', path);
            const doc = await invoke<MarkdownDocument>('open_document', { path });
            console.log('Document loaded:', doc.path);
            renderDocument(doc);
        }
    } catch (error) {
        console.error('Failed to open file:', error);
        alert(`Failed to open file: ${error}`);
    }
}

/**
 * Reloads the current document.
 */
async function reloadDocument() {
    if (!currentDocument) return;
    
    try {
        const doc = await invoke<MarkdownDocument>('reload_document');
        renderDocument(doc);
    } catch (error) {
        console.error('Failed to reload document:', error);
        alert(`Failed to reload document: ${error}`);
    }
}

/**
 * Navigates to the previous file in history.
 */
async function navigatePrevious() {
    try {
        const doc = await invoke<MarkdownDocument>('navigate_previous');
        renderDocument(doc);
    } catch (error) {
        console.error('Failed to navigate to previous file:', error);
        // Don't alert for "no previous file" errors
        if (error && typeof error === 'object' && 'message' in error) {
            const msg = (error as any).message;
            if (!msg.includes('No previous file')) {
                alert(`Failed to navigate: ${msg}`);
            }
        }
    }
}

/**
 * Navigates to the next file in history.
 */
async function navigateNext() {
    try {
        const doc = await invoke<MarkdownDocument>('navigate_next');
        renderDocument(doc);
    } catch (error) {
        console.error('Failed to navigate to next file:', error);
        // Don't alert for "no next file" errors
        if (error && typeof error === 'object' && 'message' in error) {
            const msg = (error as any).message;
            if (!msg.includes('No next file')) {
                alert(`Failed to navigate: ${msg}`);
            }
        }
    }
}

/**
 * Copies selected text to clipboard.
 */
function copySelection() {
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
        try {
            // Try modern Clipboard API first
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(selection.toString()).then(() => {
                    showCopyFeedback();
                }).catch(() => {
                    // Fallback to execCommand
                    document.execCommand('copy');
                    showCopyFeedback();
                });
            } else {
                // Use legacy execCommand
                document.execCommand('copy');
                showCopyFeedback();
            }
        } catch (error) {
            console.error('Failed to copy:', error);
        }
    }
}

/**
 * Shows visual feedback when text is copied.
 */
function showCopyFeedback() {
    const feedback = document.createElement('div');
    feedback.textContent = 'Copied!';
    feedback.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 14px;
        z-index: 10000;
        pointer-events: none;
        animation: fadeOut 1s ease-out forwards;
    `;
    
    // Add fade out animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeOut {
            0% { opacity: 1; }
            70% { opacity: 1; }
            100% { opacity: 0; }
        }
    `;
    document.head.appendChild(style);
    document.body.appendChild(feedback);
    
    setTimeout(() => {
        document.body.removeChild(feedback);
        document.head.removeChild(style);
    }, 1000);
}

/**
 * Sets the zoom level.
 */
async function setZoom(factor: number) {
    try {
        // Clamp factor to valid range
        factor = Math.max(0.5, Math.min(3.0, factor));
        
        const newZoom = await invoke<number>('set_zoom_factor', { factor });
        currentZoom = newZoom;
        
        // Apply zoom transform
        const contentArea = document.getElementById('content-area')!;
        const container = markdownContainer;
        
        // Get scroll position before zoom
        const scrollTop = container.scrollTop;
        const scrollRatio = container.scrollHeight > 0 ? scrollTop / container.scrollHeight : 0;
        
        // Apply transform
        container.style.transform = `scale(${newZoom})`;
        
        // Adjust container width to account for scale
        // This ensures proper scrolling behavior
        const containerWidth = contentArea.offsetWidth / newZoom;
        container.style.width = `${containerWidth}px`;
        
        // Try to maintain scroll position ratio
        setTimeout(() => {
            if (container.scrollHeight > 0) {
                container.scrollTop = container.scrollHeight * scrollRatio;
            }
        }, 50);
        
        // Update zoom display
        zoomLevel.textContent = `${Math.round(newZoom * 100)}%`;
    } catch (error) {
        console.error('Failed to set zoom:', error);
    }
}

/**
 * Initializes the application.
 */
async function initialize() {
    console.log('Initializing mdview...');
    console.log('DOM loaded:', document.readyState);
    console.log('App element:', document.getElementById('app'));
    console.log('Toolbar element:', document.getElementById('toolbar'));
    
    // Initialize UI components
    initializeLayout();
    initializeToc();
    initializeSearch();
    
    // Set up event listeners FIRST, before any other setup
    // Listen for document loaded from CLI
    await listen<MarkdownDocument>('document-loaded', (event) => {
        console.log('Document loaded from CLI:', event.payload.path);
        renderDocument(event.payload);
    });
    
    // Listen for document load errors
    await listen<string>('document-load-error', (event) => {
        console.error('Document load error:', event.payload);
        alert(`Failed to load document: ${event.payload}`);
    });
    
    // Listen for menu events
    await listen('menu-open', () => {
        console.log('Menu: Open');
        openFile();
    });
    
    await listen('menu-copy', () => {
        console.log('Menu: Copy');
        copySelection();
    });
    
    await listen('menu-search', () => {
        console.log('Menu: Search');
        const searchBar = document.getElementById('search-bar')!;
        searchBar.style.display = 'flex';
        (document.getElementById('search-input') as HTMLInputElement).focus();
    });
    
    await listen('menu-zoom-in', () => {
        console.log('Menu: Zoom In');
        setZoom(Math.min(currentZoom + 0.1, 3.0));
    });
    
    await listen('menu-zoom-out', () => {
        console.log('Menu: Zoom Out');
        setZoom(Math.max(currentZoom - 0.1, 0.5));
    });
    
    await listen('menu-zoom-reset', () => {
        console.log('Menu: Reset Zoom');
        setZoom(1.0);
    });
    
    await listen('menu-about', () => {
        console.log('Menu: About');
        alert('mdview v0.1.1\\n\\nA lightweight Markdown viewer\\n\\n© 2025 David Eidelman\\nLicensed under MIT');
    });
    
    await listen('menu-prev-file', () => {
        console.log('Menu: Previous File');
        navigatePrevious();
    });
    
    await listen('menu-next-file', () => {
        console.log('Menu: Next File');
        navigateNext();
    });
    
    console.log('Event listeners registered');
    
    // Set up toolbar button handlers
    btnOpen.addEventListener('click', openFile);
    btnReload.addEventListener('click', reloadDocument);
    btnPrevFile.addEventListener('click', navigatePrevious);
    btnNextFile.addEventListener('click', navigateNext);
    btnSearch.addEventListener('click', () => {
        const searchBar = document.getElementById('search-bar')!;
        searchBar.style.display = searchBar.style.display === 'none' ? 'flex' : 'none';
        if (searchBar.style.display === 'flex') {
            (document.getElementById('search-input') as HTMLInputElement).focus();
        }
    });
    
    // Zoom controls
    btnZoomIn.addEventListener('click', () => setZoom(Math.min(currentZoom + 0.1, 3.0)));
    btnZoomOut.addEventListener('click', () => setZoom(Math.max(currentZoom - 0.1, 0.5)));
    btnZoomReset.addEventListener('click', () => setZoom(1.0));
    
    // Global keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd+F for search
        if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
            e.preventDefault();
            const searchBar = document.getElementById('search-bar')!;
            searchBar.style.display = 'flex';
            (document.getElementById('search-input') as HTMLInputElement).focus();
        }
        
        // Ctrl/Cmd+O for open
        if ((e.metaKey || e.ctrlKey) && e.key === 'o') {
            e.preventDefault();
            openFile();
        }
        
        // Ctrl/Cmd+R for reload
        if ((e.metaKey || e.ctrlKey) && e.key === 'r' && currentDocument) {
            e.preventDefault();
            reloadDocument();
        }
        
        // Ctrl/Cmd+Plus for zoom in
        if ((e.metaKey || e.ctrlKey) && (e.key === '=' || e.key === '+')) {
            e.preventDefault();
            setZoom(Math.min(currentZoom + 0.1, 3.0));
        }
        
        // Ctrl/Cmd+Minus for zoom out
        if ((e.metaKey || e.ctrlKey) && e.key === '-') {
            e.preventDefault();
            setZoom(Math.max(currentZoom - 0.1, 0.5));
        }
        
        // Ctrl/Cmd+0 for reset zoom
        if ((e.metaKey || e.ctrlKey) && e.key === '0') {
            e.preventDefault();
            setZoom(1.0);
        }
        
        // Ctrl/Cmd+Left for previous file
        if ((e.metaKey || e.ctrlKey) && e.key === 'ArrowLeft') {
            e.preventDefault();
            navigatePrevious();
        }
        
        // Ctrl/Cmd+Right for next file
        if ((e.metaKey || e.ctrlKey) && e.key === 'ArrowRight') {
            e.preventDefault();
            navigateNext();
        }
    });
    
    // Get initial zoom level
    try {
        currentZoom = await invoke<number>('get_zoom_factor');
        zoomLevel.textContent = `${Math.round(currentZoom * 100)}%`;
    } catch (error) {
        console.error('Failed to get initial zoom:', error);
    }
    
    // Check if a document was already loaded (from CLI argument)
    try {
        const doc = await invoke<MarkdownDocument | null>('get_current_document');
        if (doc) {
            console.log('Found pre-loaded document:', doc.path);
            renderDocument(doc);
        } else {
            console.log('No document pre-loaded');
        }
    } catch (error) {
        console.error('Failed to check for initial document:', error);
    }
    
    console.log('mdview initialized, waiting for events...');
}

// Start the application
initialize().catch(console.error);