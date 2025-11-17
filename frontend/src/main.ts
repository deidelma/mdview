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

let currentDocument: MarkdownDocument | null = null;
let currentZoom = 1.0;

// DOM Elements
const markdownContainer = document.getElementById('markdown-container')!;
const tocNav = document.getElementById('toc-nav')!;
const tocEmpty = document.getElementById('toc-empty')!;
const btnOpen = document.getElementById('btn-open')!;
const btnReload = document.getElementById('btn-reload')!;
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
}

/**
 * Sets up link click handling to open external links in system browser.
 */
function setupLinkHandling() {
    const links = markdownContainer.querySelectorAll('a');
    console.log(`Setting up link handling for ${links.length} links`);
    
    links.forEach(link => {
        const href = link.getAttribute('href');
        console.log(`Processing link with href: ${href}`);
        
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
            console.log(`Configured external link: ${href} -> ${fullUrl}`);
        }
    });
    
    console.log('External links processed, setting up click handler...');
    
    // Use event delegation for handling clicks
    markdownContainer.addEventListener('click', async (e) => {
        console.log('CLICK DETECTED:', e.target);
        const target = e.target as HTMLElement;
        const link = target.closest('a');
        
        if (!link) {
            console.log('Not a link');
            return;
        }
        
        console.log('Link element found:', link);
        
        // Handle external links
        const externalUrl = link.getAttribute('data-external-url');
        console.log('External URL attr:', externalUrl);
        
        if (externalUrl) {
            e.preventDefault();
            e.stopPropagation();
            console.log(`Opening external URL: ${externalUrl}`);
            
            try {
                await openUrl(externalUrl);
                console.log(`Successfully opened: ${externalUrl}`);
            } catch (err: any) {
                console.error('Failed to open URL:', err);
                alert(`Failed to open link: ${err}`);
            }
            return;
        }
        
        // Handle internal anchor links
        const href = link.getAttribute('href');
        if (href && href.startsWith('#')) {
            e.preventDefault();
            const targetId = href.substring(1);
            const targetElement = markdownContainer.querySelector(`[id="${targetId}"]`);
            
            if (targetElement) {
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
    
    console.log('Link handler attached');
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
        alert('mdview v0.1.0\\n\\nA lightweight Markdown viewer\\n\\n© 2025 David Eidelman\\nLicensed under MIT');
    });
    
    console.log('Event listeners registered');
    
    // Set up toolbar button handlers
    btnOpen.addEventListener('click', openFile);
    btnReload.addEventListener('click', reloadDocument);
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