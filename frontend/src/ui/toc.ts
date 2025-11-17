/**
 * Initializes the table of contents navigation.
 */
export function initializeToc() {
    const tocNav = document.getElementById('toc-nav')!;
    const markdownContainer = document.getElementById('markdown-container')!;
    
    // Handle TOC item clicks
    tocNav.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('toc-item')) {
            e.preventDefault();
            
            const id = target.getAttribute('data-id');
            if (id) {
                const heading = markdownContainer.querySelector(`[id="${id}"]`);
                if (heading) {
                    heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    
                    // Update active state
                    tocNav.querySelectorAll('.toc-item').forEach(item => {
                        item.classList.remove('active');
                    });
                    target.classList.add('active');
                }
            }
        }
    });
    
    // Track active section during scrolling
    let scrollTimeout: number | undefined;
    markdownContainer.addEventListener('scroll', () => {
        if (scrollTimeout) {
            clearTimeout(scrollTimeout);
        }
        
        scrollTimeout = window.setTimeout(() => {
            updateActiveTocItem();
        }, 100);
    });
}

/**
 * Updates the active TOC item based on scroll position.
 */
function updateActiveTocItem() {
    const markdownContainer = document.getElementById('markdown-container')!;
    const tocNav = document.getElementById('toc-nav')!;
    const headings = markdownContainer.querySelectorAll('h1, h2, h3, h4, h5, h6');
    
    if (headings.length === 0) return;
    
    const scrollTop = markdownContainer.scrollTop;
    const containerTop = markdownContainer.offsetTop;
    
    let activeHeading: Element | null = null;
    
    // Find the heading that's currently visible
    for (const heading of Array.from(headings)) {
        const headingTop = (heading as HTMLElement).offsetTop - containerTop;
        if (headingTop <= scrollTop + 100) {
            activeHeading = heading;
        } else {
            break;
        }
    }
    
    if (activeHeading) {
        const id = activeHeading.getAttribute('id');
        if (id) {
            tocNav.querySelectorAll('.toc-item').forEach(item => {
                item.classList.remove('active');
            });
            
            const activeItem = tocNav.querySelector(`[data-id="${id}"]`);
            if (activeItem) {
                activeItem.classList.add('active');
            }
        }
    }
}