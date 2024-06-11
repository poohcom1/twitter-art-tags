import { renderTweetDropdown } from './pages/tweetDropdown';
import { renderTagsGallery } from './pages/tagsGallery';
import { CUSTOM_PAGE_PATH } from './constants';
import { renderNavButton } from './pages/navButton';
import TagModal from './components/tagModal/TagModal';

// Commands
GM.registerMenuCommand(
    'Twitter Art Tags - View tags',
    () => (window.location.href = window.location.origin + CUSTOM_PAGE_PATH)
);

// Main
const dropdownTagModal = new TagModal();

renderNavButton();
renderTweetDropdown(dropdownTagModal);

if (window.location.href.includes(CUSTOM_PAGE_PATH)) {
    renderTagsGallery();
}
window.addEventListener('popstate', () => {
    if (window.location.href.includes(CUSTOM_PAGE_PATH)) {
        renderTagsGallery();
    }
});
