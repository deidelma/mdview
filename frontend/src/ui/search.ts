export interface SearchController {
    show(): void;
    hide(): void;
    focus(): void;
    refresh(): void;
    clear(): void;
    getQuery(): string;
}

export interface SearchHighlightResult {
    matches: HTMLElement[];
    currentMatchIndex: number;
}

function escapeSearchPattern(query: string) {
    return query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function clearSearchHighlights(container: HTMLElement) {
    container.querySelectorAll('.search-highlight').forEach((highlight) => {
        const parent = highlight.parentNode;
        if (!parent) {
            return;
        }

        parent.replaceChild(container.ownerDocument.createTextNode(highlight.textContent || ''), highlight);
        parent.normalize();
    });
}

export function highlightSearchResults(container: HTMLElement, query: string): SearchHighlightResult {
    clearSearchHighlights(container);

    if (!query.trim()) {
        return { matches: [], currentMatchIndex: -1 };
    }

    const pattern = new RegExp(escapeSearchPattern(query), 'gi');
    const matches: HTMLElement[] = [];
    const walker = container.ownerDocument.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    const nodesToReplace: Array<{ node: Node; parent: Node }> = [];

    while (walker.nextNode()) {
        const node = walker.currentNode;
        const text = node.textContent || '';
        const parentElement = node.parentElement;

        if (!parentElement || parentElement.tagName === 'SCRIPT' || parentElement.tagName === 'STYLE') {
            continue;
        }

        if (new RegExp(escapeSearchPattern(query), 'i').test(text) && node.parentNode) {
            nodesToReplace.push({ node, parent: node.parentNode });
        }
    }

    for (const { node, parent } of nodesToReplace) {
        const text = node.textContent || '';
        const fragment = container.ownerDocument.createDocumentFragment();
        let lastIndex = 0;
        let match: RegExpExecArray | null;

        pattern.lastIndex = 0;
        while ((match = pattern.exec(text)) !== null) {
            if (match.index > lastIndex) {
                fragment.appendChild(container.ownerDocument.createTextNode(text.slice(lastIndex, match.index)));
            }

            const span = container.ownerDocument.createElement('span');
            span.className = 'search-highlight';
            span.textContent = match[0];
            fragment.appendChild(span);
            matches.push(span);
            lastIndex = match.index + match[0].length;
        }

        if (lastIndex < text.length) {
            fragment.appendChild(container.ownerDocument.createTextNode(text.slice(lastIndex)));
        }

        parent.replaceChild(fragment, node);
    }

    if (matches.length > 0) {
        matches[0].classList.add('current');
        return { matches, currentMatchIndex: 0 };
    }

    return { matches, currentMatchIndex: -1 };
}

export function initializeSearch(options: {
    document?: Document;
    getContainer: () => HTMLElement;
}): SearchController {
    const doc = options.document ?? document;
    const searchInput = doc.getElementById('search-input') as HTMLInputElement;
    const btnSearchPrev = doc.getElementById('btn-search-prev') as HTMLButtonElement;
    const btnSearchNext = doc.getElementById('btn-search-next') as HTMLButtonElement;
    const btnSearchClose = doc.getElementById('btn-search-close') as HTMLButtonElement;
    const searchResults = doc.getElementById('search-results') as HTMLElement;
    const searchBar = doc.getElementById('search-bar') as HTMLElement;

    let searchMatches: HTMLElement[] = [];
    let currentMatchIndex = -1;

    function updateSearchResults() {
        searchResults.textContent = searchMatches.length > 0 ? `${currentMatchIndex + 1} of ${searchMatches.length}` : 'No matches';
    }

    function highlightCurrentMatch() {
        searchMatches.forEach((match, index) => {
            const isCurrent = index === currentMatchIndex;
            match.classList.toggle('current', isCurrent);
            if (isCurrent) {
                match.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
    }

    function applySearch() {
        const { matches, currentMatchIndex: nextCurrentIndex } = highlightSearchResults(options.getContainer(), searchInput.value.trim());
        searchMatches = matches;
        currentMatchIndex = nextCurrentIndex;
        updateSearchResults();
    }

    function navigateToNextMatch() {
        if (searchMatches.length === 0) {
            return;
        }

        currentMatchIndex = (currentMatchIndex + 1) % searchMatches.length;
        highlightCurrentMatch();
        updateSearchResults();
    }

    function navigateToPrevMatch() {
        if (searchMatches.length === 0) {
            return;
        }

        currentMatchIndex = (currentMatchIndex - 1 + searchMatches.length) % searchMatches.length;
        highlightCurrentMatch();
        updateSearchResults();
    }

    searchInput.addEventListener('input', applySearch);
    searchInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            if (event.shiftKey) {
                navigateToPrevMatch();
            } else {
                navigateToNextMatch();
            }
            return;
        }

        if (event.key === 'Escape') {
            searchBar.hidden = true;
            clearSearchHighlights(options.getContainer());
            searchMatches = [];
            currentMatchIndex = -1;
            searchInput.value = '';
            searchResults.textContent = '';
        }
    });

    btnSearchPrev.addEventListener('click', navigateToPrevMatch);
    btnSearchNext.addEventListener('click', navigateToNextMatch);
    btnSearchClose.addEventListener('click', () => {
        searchBar.hidden = true;
        clearSearchHighlights(options.getContainer());
        searchMatches = [];
        currentMatchIndex = -1;
        searchInput.value = '';
        searchResults.textContent = '';
    });

    return {
        show() {
            searchBar.hidden = false;
            searchInput.focus();
            applySearch();
        },
        hide() {
            searchBar.hidden = true;
        },
        focus() {
            searchInput.focus();
        },
        refresh() {
            if (searchInput.value.trim()) {
                applySearch();
            } else {
                clearSearchHighlights(options.getContainer());
            }
        },
        clear() {
            clearSearchHighlights(options.getContainer());
            searchMatches = [];
            currentMatchIndex = -1;
            searchInput.value = '';
            searchResults.textContent = '';
        },
        getQuery() {
            return searchInput.value;
        },
    };
}