import { CUSTOM_PAGE_TITLE } from '../constants';
import { waitForElement } from '../utils';
import TagGallery from '../components/tagGallery/TagGallery';
import { cacheInvalidated } from '../services/storage';
import { render } from 'solid-js/web';
import TagGalleryTest from '../components/tagGallery/TagGalleryTest';

export async function renderTagsGallery() {
    if (TagGallery.exists()) {
        return;
    }
    // Render page
    const main = (await waitForElement('div[data-testid="error-detail"]'))!.parentElement!;

    // Render title
    document.title = CUSTOM_PAGE_TITLE;
    const titleObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                if (document.title !== CUSTOM_PAGE_TITLE) {
                    document.title = CUSTOM_PAGE_TITLE;
                    titleObserver.disconnect();
                }

                if (!window.location.href.includes(CUSTOM_PAGE_TITLE)) {
                    titleObserver.disconnect();
                }
            }
        });
    });
    titleObserver.observe(document.querySelector('title')!, { childList: true });

    // First load
    main.innerHTML = '';
    main.style.maxWidth = '100%';
    render(TagGalleryTest, main);
}
