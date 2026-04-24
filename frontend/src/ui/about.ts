import { open as openUrl } from '@tauri-apps/plugin-shell';

export interface AboutInfo {
    app_name: string;
    version: string;
    description: string;
    copyright: string;
    mit_license_html: string;
    third_party_notices_html: string;
}

type AboutSection = 'license' | 'third-party';

let lastFocusedElement: HTMLElement | null = null;
let currentAboutInfo: AboutInfo | null = null;

/**
 * Initializes the About dialog interactions.
 */
export function initializeAbout() {
    const overlay = document.getElementById('about-overlay')!;
    const dialog = document.getElementById('about-dialog')!;
    const closeButton = document.getElementById('about-close')!;
    const licenseTab = document.getElementById('about-tab-license') as HTMLButtonElement;
    const thirdPartyTab = document.getElementById('about-tab-third-party') as HTMLButtonElement;
    const content = document.getElementById('about-text')!;

    closeButton.addEventListener('click', hideAbout);

    overlay.addEventListener('click', (event) => {
        if (event.target === overlay) {
            hideAbout();
        }
    });

    dialog.addEventListener('click', (event) => {
        event.stopPropagation();
    });

    content.addEventListener('click', async (event) => {
        const target = event.target as HTMLElement;
        const link = target.closest('a');

        if (!link) {
            return;
        }

        const href = link.getAttribute('href');

        if (!href || href.startsWith('#')) {
            return;
        }

        event.preventDefault();

        try {
            await openUrl(href);
        } catch (error) {
            console.error('Failed to open About dialog link:', error);
        }
    });

    licenseTab.addEventListener('click', () => {
        if (currentAboutInfo) {
            renderAboutSection('license', currentAboutInfo);
        }
    });

    thirdPartyTab.addEventListener('click', () => {
        if (currentAboutInfo) {
            renderAboutSection('third-party', currentAboutInfo);
        }
    });

    document.addEventListener('keydown', (event) => {
        if (!overlay.hidden && event.key === 'Escape') {
            event.preventDefault();
            hideAbout();
        }
    });
}

/**
 * Opens the About dialog with the provided content.
 */
export function showAbout(info: AboutInfo) {
    const overlay = document.getElementById('about-overlay')!;
    const title = document.getElementById('about-title')!;
    const version = document.getElementById('about-version')!;
    const description = document.getElementById('about-description')!;
    const copyright = document.getElementById('about-copyright')!;
    const closeButton = document.getElementById('about-close') as HTMLButtonElement;

    lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    title.textContent = info.app_name;
    version.textContent = `Version ${info.version}`;
    description.textContent = info.description;
    copyright.textContent = info.copyright;

    currentAboutInfo = info;
    overlay.hidden = false;
    document.body.classList.add('about-open');

    renderAboutSection('license', info);
    closeButton.focus();
}

/**
 * Closes the About dialog.
 */
export function hideAbout() {
    const overlay = document.getElementById('about-overlay')!;

    if (overlay.hidden) {
        return;
    }

    overlay.hidden = true;
    document.body.classList.remove('about-open');
    currentAboutInfo = null;

    if (lastFocusedElement) {
        lastFocusedElement.focus();
        lastFocusedElement = null;
    }
}

function renderAboutSection(section: AboutSection, info: AboutInfo) {
    const content = document.getElementById('about-text')!;
    const licenseTab = document.getElementById('about-tab-license') as HTMLButtonElement;
    const thirdPartyTab = document.getElementById('about-tab-third-party') as HTMLButtonElement;

    const isLicense = section === 'license';
    licenseTab.classList.toggle('active', isLicense);
    licenseTab.setAttribute('aria-selected', String(isLicense));
    thirdPartyTab.classList.toggle('active', !isLicense);
    thirdPartyTab.setAttribute('aria-selected', String(!isLicense));

    content.innerHTML = isLicense ? info.mit_license_html : info.third_party_notices_html;
    content.scrollTop = 0;
}
