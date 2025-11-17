import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { open } from '@tauri-apps/plugin-dialog';
import { initializeLayout } from './ui/layout';
import { initializeToc } from './ui/toc';
import { initializeSearch } from './ui/search';
import './styles/app.css';

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
 * Renders a Markdown document in the content area.
 */
function renderDocument(doc: MarkdownDocument) {
    currentDocument = doc;
    
    // Render HTML content
    markdownContainer.innerHTML = doc.html_content;
    markdownContainer.classList.add('markdown-content');
    
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
        
        if (selected) {
            const doc = await invoke<MarkdownDocument>('open_document', { path: selected });
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
 * Sets the zoom level.
 */
async function setZoom(factor: number) {
    try {
        const newZoom = await invoke<number>('set_zoom_factor', { factor });
        currentZoom = newZoom;
        
        // Apply zoom transform
        markdownContainer.style.transform = `scale(${newZoom})`;
        markdownContainer.style.transformOrigin = 'top left';
        
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
        document.execCommand('copy');
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
    
    // Get initial zoom level
    try {
        currentZoom = await invoke<number>('get_zoom_factor');
        zoomLevel.textContent = `${Math.round(currentZoom * 100)}%`;
    } catch (error) {
        console.error('Failed to get initial zoom:', error);
    }
    
    console.log('mdview initialized');
}

// Start the application
initialize().catch(console.error);