import VanillaContextMenu from 'vanilla-context-menu';
import { sanitizeTagName, formatTagName, waitForElement, GM_addStyle } from './utils';
import { addTag } from './storage';
import { renderTweetDropdown } from './pages/tweetDropdown';
import { renderTagsGallery } from './pages/tagsGallery';
import { CUSTOM_PAGE_PATH } from './constants';

// Commands
GM.registerMenuCommand(
    'View tags',
    () => (window.location.href = window.location.origin + CUSTOM_PAGE_PATH)
);
GM.registerMenuCommand('Clear all tags', async () => {
    if (!confirm('Are you sure you want to delete all tags?')) {
        return;
    }
    await GM.deleteValue(KEY_TAGS);
});

// Constants
const KEY_TAGS = 'tags';
const KEY_TWEETS = 'tweets';

// HTML
GM_addStyle(`
/* Drop down */
#tagInput {
    width: 100%;
    height: 20px;
    font-family: TwitterChirp;
}

.tag-dropdown {
    padding: 10px;
    display: none;
    position: absolute;
    padding: 10px 20px;
    color: inherit;
    white-space: nowrap;
    z-index: 1000; /* Ensure it is above other content */
    font-family: TwitterChirp;
    font-weight: 700;
    max-width: 300px;
}

.tag {
    height: 30px;
    font-family: TwitterChirp;
    font-weight: 700;
    max-width: 300px;
}

.tag__inactive {
}

#tagsContainer {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

/* Drop down */
.root {
    padding: 40px 0;
    font-family: TwitterChirp;
}

.images-container {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
}

.image-container {
    max-width: 200px;
    overflow: hidden;
}

.image-container img {
    object-fit: cover;
    width: 200px;
    height: 200px;
}

.image-skeleton {
    width: 200px;
    height: 200px;
    background-color: #6666;
    opacity: 0;
}

#tagSelect {
    width: 200px;
}
`);

Promise.all([GM.getValue(KEY_TWEETS), GM.getValue(KEY_TAGS)]).then(([tweets, tags]) => {
    console.log('Twitter Art Collection - Tweets');
    console.table(tweets);
    console.log('Twitter Art Collection - Tags');
    console.table(tags);
});

// Main
renderTweetDropdown();

if (window.location.href.includes(CUSTOM_PAGE_PATH)) {
    renderTagsGallery();
}
