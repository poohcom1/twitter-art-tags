import { GM_addStyle } from './utils';
import { renderTweetDropdown } from './pages/tweetDropdown';
import { renderTagsGallery } from './pages/tagsGallery';
import { CUSTOM_PAGE_PATH } from './constants';
import { clearAllTags } from './storage';
import styles from './assets/styles.css';

// Commands
GM.registerMenuCommand(
    'View tags',
    () => (window.location.href = window.location.origin + CUSTOM_PAGE_PATH)
);
GM.registerMenuCommand('Clear all tags', clearAllTags);

// HTML
GM_addStyle(styles);

// Main
renderTweetDropdown();

if (window.location.href.includes(CUSTOM_PAGE_PATH)) {
    renderTagsGallery();
}
