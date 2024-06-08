import './assets/global.scss';
import { renderTweetDropdown } from './pages/tweetDropdown';
import { renderTagsGallery } from './pages/tagsGallery';
import { CUSTOM_PAGE_PATH } from './constants';
import { clearAllTags } from './storage';
import { renderNavButton } from './pages/navButton';
import TagModal from './components/TagModal';

// Commands
GM.registerMenuCommand(
    'Twitter Art Tags - View tags',
    () => (window.location.href = window.location.origin + CUSTOM_PAGE_PATH)
);
GM.registerMenuCommand('Twitter Art Tags - Clear all tags', clearAllTags);

// Main
const dropdownTagModal = new TagModal();
const galleryTagModal = new TagModal();
galleryTagModal.addClass('tag-modal-menu');

renderNavButton();
renderTweetDropdown(dropdownTagModal);

if (window.location.href.includes(CUSTOM_PAGE_PATH)) {
    renderTagsGallery(galleryTagModal);
}
window.addEventListener('popstate', () => {
    if (window.location.href.includes(CUSTOM_PAGE_PATH)) {
        renderTagsGallery(galleryTagModal);
    }
});
