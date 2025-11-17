let searchMatches: HTMLElement[] = [];
let currentMatchIndex = -1;

/**
 * Initializes the search functionality.
 */
export function initializeSearch() {
    const searchInput = document.getElementById('search-input') as HTMLInputElement;
    const btnSearchPrev = document.getElementById('btn-search-prev')!;
    const btnSearchNext = document.getElementById('btn-search-next')!;
    const btnSearchClose = document.getElementById('btn-search-close')!;
    const searchResults = document.getElementById('search-results')!;
    const searchBar = document.getElementById('search-bar')!;
    
    // Search on input
    searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim();
        if (query.length > 0) {
            performSearch(query);
            updateSearchResults(searchResults);
        } else {
            clearSearch();
            searchResults.textContent = '';
        }
    });
    
    // Search on Enter key
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            if (e.shiftKey) {
                navigateToPrevMatch();
            } else {
                navigateToNextMatch();
            }
        } else if (e.key === 'Escape') {
            searchBar.style.display = 'none';
            clearSearch();
        }
    });
    
    // Navigation buttons
    btnSearchPrev.addEventListener('click', navigateToPrevMatch);
    btnSearchNext.addEventListener('click', navigateToNextMatch);
    
    // Close button
    btnSearchClose.addEventListener('click', () => {
        searchBar.style.display = 'none';
        clearSearch();
        searchInput.value = '';
    });
}

/**
 * Performs a search in the markdown content.
 */
function performSearch(query: string) {
    clearSearch();
    
    const markdownContainer = document.getElementById('markdown-container')!;
    const content = markdownContainer.textContent || '';
    
    if (!content || !query) return;
    
    // Create a case-insensitive regex
    const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    
    // Walk through text nodes and highlight matches
    const walker = document.createTreeWalker(
        markdownContainer,
        NodeFilter.SHOW_TEXT,
        null
    );
    
    const nodesToReplace: { node: Node; parent: Node }[] = [];
    
    while (walker.nextNode()) {
        const node = walker.currentNode;
        const text = node.textContent || '';
        
        if (regex.test(text) && node.parentElement?.tagName !== 'SCRIPT' && node.parentElement?.tagName !== 'STYLE') {
            nodesToReplace.push({ node, parent: node.parentNode! });
        }
    }
    
    // Replace text nodes with highlighted spans
    nodesToReplace.forEach(({ node, parent }) => {
        const text = node.textContent || '';
        const fragment = document.createDocumentFragment();
        let lastIndex = 0;
        
        const localRegex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        let match;
        
        while ((match = localRegex.exec(text)) !== null) {
            // Add text before match
            if (match.index > lastIndex) {
                fragment.appendChild(document.createTextNode(text.substring(lastIndex, match.index)));
            }
            
            // Add highlighted match
            const span = document.createElement('span');
            span.className = 'search-highlight';
            span.textContent = match[0];
            fragment.appendChild(span);
            searchMatches.push(span);
            
            lastIndex = match.index + match[0].length;
        }
        
        // Add remaining text
        if (lastIndex < text.length) {
            fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
        }
        
        parent.replaceChild(fragment, node);
    });
    
    // Highlight first match
    if (searchMatches.length > 0) {
        currentMatchIndex = 0;
        highlightCurrentMatch();
    }
}

/**
 * Clears all search highlights.
 */
function clearSearch() {
    const markdownContainer = document.getElementById('markdown-container')!;
    const highlights = markdownContainer.querySelectorAll('.search-highlight');
    
    highlights.forEach(highlight => {
        const parent = highlight.parentNode;
        if (parent) {
            parent.replaceChild(document.createTextNode(highlight.textContent || ''), highlight);
            parent.normalize(); // Merge adjacent text nodes
        }
    });
    
    searchMatches = [];
    currentMatchIndex = -1;
}

/**
 * Navigates to the next search match.
 */
function navigateToNextMatch() {
    if (searchMatches.length === 0) return;
    
    currentMatchIndex = (currentMatchIndex + 1) % searchMatches.length;
    highlightCurrentMatch();
    updateSearchResults(document.getElementById('search-results')!);
}

/**
 * Navigates to the previous search match.
 */
function navigateToPrevMatch() {
    if (searchMatches.length === 0) return;
    
    currentMatchIndex = (currentMatchIndex - 1 + searchMatches.length) % searchMatches.length;
    highlightCurrentMatch();
    updateSearchResults(document.getElementById('search-results')!);
}

/**
 * Highlights the current match and scrolls to it.
 */
function highlightCurrentMatch() {
    searchMatches.forEach((match, index) => {
        if (index === currentMatchIndex) {
            match.classList.add('current');
            match.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            match.classList.remove('current');
        }
    });
}

/**
 * Updates the search results display.
 */
function updateSearchResults(element: HTMLElement) {
    if (searchMatches.length > 0) {
        element.textContent = `${currentMatchIndex + 1} of ${searchMatches.length}`;
    } else {
        element.textContent = 'No matches';
    }
}