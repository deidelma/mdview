export interface TocController {
    refreshActiveItem(): void;
}

/**
 * Initializes the table of contents navigation.
 */
export function initializeToc(options: {
    document?: Document;
    getContainer: () => HTMLElement;
}): TocController {
    const doc = options.document ?? document;
    const tocNav = doc.getElementById('toc-nav') as HTMLElement;
    const markdownContainer = options.getContainer();

    tocNav.addEventListener('click', (event) => {
        const target = (event.target as HTMLElement).closest('.toc-item') as HTMLElement | null;
        if (!target) {
            return;
        }

        event.preventDefault();
        const id = target.dataset.id;
        if (!id) {
            return;
        }

        const heading = markdownContainer.querySelector(`[id="${id}"]`);
        if (!heading) {
            return;
        }

        heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
        tocNav.querySelectorAll('.toc-item').forEach((item) => item.classList.remove('active'));
        target.classList.add('active');
    });

    let scrollTimeout: number | undefined;
    markdownContainer.addEventListener('scroll', () => {
        if (scrollTimeout) {
            window.clearTimeout(scrollTimeout);
        }

        scrollTimeout = window.setTimeout(() => {
            updateActiveTocItem(markdownContainer, tocNav);
        }, 100);
    });

    return {
        refreshActiveItem() {
            updateActiveTocItem(markdownContainer, tocNav);
        },
    };
}

function updateActiveTocItem(markdownContainer: HTMLElement, tocNav: HTMLElement) {
    const headings = markdownContainer.querySelectorAll('h1, h2, h3, h4, h5, h6');
    if (headings.length === 0) {
        return;
    }

    const scrollTop = markdownContainer.scrollTop;
    let activeHeading: Element | null = null;

    for (const heading of Array.from(headings)) {
        const headingTop = (heading as HTMLElement).offsetTop;
        if (headingTop <= scrollTop + 120) {
            activeHeading = heading;
        } else {
            break;
        }
    }

    if (!activeHeading) {
        return;
    }

    const id = activeHeading.getAttribute('id');
    if (!id) {
        return;
    }

    tocNav.querySelectorAll('.toc-item').forEach((item) => item.classList.remove('active'));
    const activeItem = tocNav.querySelector(`[data-id="${id}"]`);
    activeItem?.classList.add('active');
}