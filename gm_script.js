// ==UserScript==
// @name     Twitter Art Collection
// @version  1
// @version  0.1
// @author   poohcom1
// @match    https://x.com/*
// @grant    GM.setValue
// @grant    GM.getValue
// @grant    GM.deleteValue
// @grant    GM.listValues
// @grant    GM.registerMenuCommand
// @require  https://gist.githubusercontent.com/arantius/eec890c9ce4ff2f7abee896c0bba664d/raw/14bb06f60ba6dc12c0bc72fe4c69443f67ff26de/gm-addstyle.js
// @require  https://unpkg.com/vanilla-context-menu@1.4.1/dist/vanilla-context-menu.js
// ==/UserScript==

// Commands
GM.registerMenuCommand('View tags', () => (window.location = window.location.origin + CUSTOM_PAGE_PATH));
GM.registerMenuCommand('Clear all tags', async () => await GM.deleteValue(KEY_TAGS));

// Assets
const TAG_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true" class="r-4qtqp9 r-yyyyoo r-dnmrzs r-bnwqim r-lrvibr r-m6rgpd r-1xvli5t r-1hdv0qi"><g><path d="M4 4.5C4 3.12 5.119 2 6.5 2h11C18.881 2 20 3.12 20 4.5v18.44l-8-5.71-8 5.71V4.5zM6.5 4c-.276 0-.5.22-.5.5v14.56l6-4.29 6 4.29V4.5c0-.28-.224-.5-.5-.5h-11z"></path></g></svg>`;

// Constants
const KEY_TAGS = 'tags';
const KEY_TWEETS = 'tweets';
const KEY_SELECTED_TAG = 'selectedTag';

const CUSTOM_PAGE_PATH = '/home/tags';
const CUSTOM_PAGE_TITLE = 'Tags / X';

const CLASS_IMAGE = 'tag-image';

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
    padding-top: 40px;
    font-family: TwitterChirp;
}

.image-container {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
}

.image-container img {
    max-width: 200px;
    object-fit: cover;
}
`);

//#region Debug
Promise.all([GM.getValue(KEY_TWEETS), GM.getValue(KEY_TAGS)]).then(([tweets, tags]) => {
    console.log('Twitter Art Collection - Tweets');
    console.table(tweets);
    console.log('Twitter Art Collection - Tags');
    console.table(tags);
});
//#endregion

//#region Render
const parser = new DOMParser();

/**
 * @param {Tag} tag
 * @param {boolean} active
 */
const renderTag = (tag, active) =>
    parser.parseFromString(
        `<button id="${tag}" class="tag ${!active && 'tag__inactive'}">${active ? '✔ ' : ''}${formatTagName(
            tag
        )}</button>`,
        'text/html'
    ).body.firstChild;

//#endregion

// Main
async function twitterMain() {
    //#region Global """states"""

    /** @type {string} */
    let currentTweetId = null;
    /** @type {(() => void) | null} */
    let onNewTag = null;

    //#endregion

    //#region Global functions

    /**
     * @param {string} tagName
     */
    async function addTag(tagName) {
        if (currentTweetId === null) {
            console.error('No tweet selected');
            return;
        }
        tagName = sanitizeTagName(tagName);
        if (tagName === '') {
            console.error('Invalid tag name');
            return;
        }

        /** @type {Tags} */
        const tags = await GM.getValue(KEY_TAGS, {});

        /** @type {Tag} */
        let tag = {
            tweets: [],
        };

        if (tagName in tags) {
            tag = tags[tagName];
        } else {
            tags[tagName] = tag;
        }

        tag.lastUpdated = Date.now();

        if (!tag.tweets.includes(currentTweetId)) {
            tag.tweets.push(currentTweetId);
        }

        await GM.setValue(KEY_TAGS, tags);

        /** @type {Tweets} */
        const tweets = await GM.getValue(KEY_TWEETS, {});

        const images = Array.from(document.querySelectorAll('a'))
            .filter((a) => a.href.includes(currentTweetId))
            .flatMap((a) => Array.from(a.querySelectorAll('img')))
            .map((img) => img.src);
        console.log(images);

        if (images.length === 0) {
            return;
        }

        tweets[currentTweetId] = {
            images,
        };

        await GM.setValue(KEY_TWEETS, tweets);
    }

    async function removeTag(tagName) {
        if (currentTweetId === null) {
            console.error('No tweet selected');
            return;
        }
        tagName = sanitizeTagName(tagName);
        if (tagName === '') {
            console.error('Invalid tag name');
            return;
        }

        /** @type {Tags} */
        const tags = await GM.getValue(KEY_TAGS, {});

        if (!(tagName in tags)) {
            return;
        }

        tags[tagName].tweets = tags[tagName].tweets.filter((tweetId) => tweetId !== currentTweetId);

        if (tags[tagName].tweets.length === 0) {
            delete tags[tagName];
        }

        await GM.setValue(KEY_TAGS, tags);
    }

    /** @returns {Promise<Tags>} */
    async function getTags() {
        return GM.getValue(KEY_TAGS, {});
    }

    /** @returns {Promise<string[]>} */
    async function listTags() {
        if (currentTweetId === null) {
            console.error('No tweet selected');
            return;
        }

        const tags = await GM.getValue(KEY_TAGS, {});
        const tagArray = Object.keys(tags);
        tagArray.sort((a, b) => {
            if (tags[a].tweets.includes(currentTweetId) && !tags[b].tweets.includes(currentTweetId)) {
                return -1;
            } else if (!tags[a].tweets.includes(currentTweetId) && tags[b].tweets.includes(currentTweetId)) {
                return 1;
            }
            return tags[b].lastUpdated - tags[a].lastUpdated;
        });
        return tagArray;
    }
    //#endregion

    //#region Create the tag modal
    const tagModal = document.createElement('div');
    tagModal.innerHTML = `<input id="tagInput" type="text" placeholder="Add a tag..." /><hr style="width: 100%" /><div id="tagsContainer"/>`;
    tagModal.classList.add('tag-dropdown');
    document.body.appendChild(tagModal);

    tagModal.querySelector('#tagInput').addEventListener('keydown', async (event) => {
        const allowedChars = /^[a-zA-Z0-9 ]+$/;

        if (allowedChars.test(event.key) || event.key === 'Enter') {
            if (event.key === 'Enter') {
                await addTag(event.target.value);
                event.target.value = '';
                onNewTag?.();
            }
        } else {
            event.preventDefault();
        }
    });

    const tagsContainer = tagModal.querySelector('#tagsContainer');
    function clearTagsContainer() {
        tagsContainer.innerHTML = '';
    }

    //#endregion

    //#region Tags Menu
    await waitForElement('#layers');

    const dropdownObserver = new MutationObserver((mutationsList, observer) => {
        mutationsList.forEach(async (mutation) => {
            if (mutation.addedNodes.length > 0) {
                waitForElement('div[role="menu"]', mutation.addedNodes[0]).then((menu) => {
                    const menuStyles = window.getComputedStyle(menu);
                    tagModal.style.border = menuStyles.border;
                    tagModal.style.borderRadius = menuStyles.borderRadius;
                    tagModal.style.backgroundColor = menuStyles.backgroundColor;
                    tagModal.style.color = menuStyles.color;
                    tagModal.style.boxShadow = menuStyles.boxShadow;
                });

                const dropdown = await waitForElement('div[data-testid="Dropdown"]', mutation.addedNodes[0]);
                if (!dropdown) {
                    return;
                }
                // Find id
                let id = '';

                const anchors = dropdown.querySelectorAll('a');
                for (const anchor of anchors) {
                    if (anchor.href.includes('/status/')) {
                        id = anchor.href.split('/')[5];
                        break;
                    }
                }

                if (!id) {
                    return;
                }

                currentTweetId = id;
                const tagId = id + '_tagButton';

                if (document.getElementById(tagId)) {
                    return;
                }

                // Create tag button
                const tagButton = dropdown.childNodes[0].cloneNode(true);

                tagButton.querySelector('span').innerText = 'Tag';
                tagButton.querySelector('svg').outerHTML = TAG_SVG;
                tagButton.id = tagId;
                tagButton.addEventListener('click', async () => {
                    const rect = tagButton.getBoundingClientRect();

                    tagModal.style.top = `${rect.top + window.scrollY}px`;
                    tagModal.style.left = `${rect.right + 10}px`;
                    tagModal.style.display = 'block';

                    async function renderTagList() {
                        const tags = await getTags();
                        const tagList = await listTags();

                        clearTagsContainer();
                        const tagElements = tagList.map((tag) =>
                            renderTag(tag, tags[tag].tweets.includes(currentTweetId))
                        );
                        tagsContainer.append(...tagElements);

                        for (const tag of tagModal.querySelectorAll('.tag')) {
                            tag.addEventListener('click', async () => {
                                const tagName = tag.id;
                                if (tagName in tags && tags[tagName].tweets.includes(currentTweetId)) {
                                    await removeTag(tagName);
                                } else {
                                    await addTag(tagName);
                                }

                                renderTagList();
                            });
                        }
                    }
                    renderTagList();
                    onNewTag = renderTagList;
                });

                const viewTagsButton = tagButton.cloneNode(true);
                viewTagsButton.querySelector('span').innerText = 'View Tags';
                viewTagsButton.querySelector('svg').outerHTML = TAG_SVG;
                viewTagsButton.addEventListener('click', async () => {
                    window.location.href = window.location.origin + CUSTOM_PAGE_PATH;
                });

                dropdown.prepend(viewTagsButton);
                dropdown.prepend(tagButton);
            } else if (mutation.removedNodes.length > 0) {
                tagModal.style.display = 'none';
                clearTagsContainer();
                onNewTag = null;
            }
        });
    });

    dropdownObserver.observe(document.getElementById('layers'), {
        childList: true,
    });
    //#endregion
}

async function customPageMain() {
    const main = (await waitForElement('div[data-testid="error-detail"]')).parentElement;
    main.style.maxWidth = '100%';
    main.innerHTML = `
    <div class="root">
    <h2>Tags</h2>
    <select id="tagSelect"></select>
    <button id="tagDelete">Delete Tag</button>
    <hr />
    <div class="image-container"></div>
</div>
    `;
    // Render title
    document.title = CUSTOM_PAGE_TITLE;

    const titleObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                if (document.title !== CUSTOM_PAGE_TITLE) {
                    document.title = CUSTOM_PAGE_TITLE;
                }
            }
        });
    });
    titleObserver.observe(document.querySelector('title'), { childList: true });

    // Render images
    async function renderImages() {
        const imageContainer = document.querySelector('.image-container');
        const tagName = document.querySelector('#tagSelect').value;
        /** @type {Tags} */
        const tagData = (await GM.getValue(KEY_TAGS, {}))[tagName] || { tweets: [] };
        /** @type {Tweets} */
        const tweets = await GM.getValue(KEY_TWEETS, {});

        const imageLinks = [...tagData.tweets]
            .reverse()
            .filter((tweetId) => tweetId in tweets)
            .flatMap((tweetId) =>
                tweets[tweetId].images.map((image) => ({
                    tweetId,
                    image,
                }))
            );

        imageContainer.innerHTML = imageLinks
            .map(
                (link) =>
                    `<a class="${CLASS_IMAGE}" href="/poohcom1/status/${link.tweetId}" target="_blank"><img src="${link.image}" /></a>`
            )
            .join('');

        imageLinks.forEach((link) => {
            new VanillaContextMenu({
                scope: document.querySelector(`a[href="/poohcom1/status/${link.tweetId}"]`),
                menuItems: [
                    {
                        label: 'Remove from tag',
                        callback: async (ev) => {
                            if (!confirm(`Remove this tweet from "${tagName}"?`)) return;

                            const tags = await GM.getValue(KEY_TAGS, {});
                            tags[tagName].tweets = tags[tagName].tweets.filter((tweetId) => tweetId !== link.tweetId);
                            await GM.setValue(KEY_TAGS, tags);
                            renderImages();
                        },
                    },
                ],
                transitionDuration: 0,
            });
        });
    }

    // Tag select
    const tagSelect = document.querySelector('#tagSelect');

    async function renderTagSelect() {
        const tags = await GM.getValue(KEY_TAGS, {});
        const selectedTag = await GM.getValue(KEY_SELECTED_TAG, '');
        const tagList = Object.keys(tags);
        tagList.sort((a, b) => a.localeCompare(b));
        tagSelect.innerHTML = tagList.map((tag) => `<option value="${tag}">${formatTagName(tag)}</option>`).join('');
        tagSelect.value = selectedTag || tagList[0] || '';
        tagSelect.addEventListener('change', (event) => {
            renderImages();
            GM.setValue(KEY_SELECTED_TAG, event.target.value);
        });
        renderImages();
    }
    renderTagSelect();

    // Tag delete
    const tagDelete = document.querySelector('#tagDelete');
    tagDelete.addEventListener('click', async () => {
        const tagName = tagSelect.value;
        if (tagName === '') {
            return;
        }
        if (!confirm(`Are you sure you want to delete the tag "${formatTagName(tagName)}"?`)) {
            return;
        }
        const tags = await GM.getValue(KEY_TAGS, {});
        delete tags[tagName];
        await GM.setValue(KEY_TAGS, tags);
        await renderTagSelect();
    });
}

(function () {
    ('use strict');

    twitterMain();

    if (window.location.href.includes(CUSTOM_PAGE_PATH)) {
        customPageMain();
    }
})();

// Utils

/** @param {string} tagName */
function sanitizeTagName(tagName) {
    return tagName.trim().toLowerCase();
}

/** @param {string} tagName */
function formatTagName(tagName) {
    return tagName
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

/**
 * @param {string} selector
 * @param {ParentNode} root
 * @returns {Promise<HTMLElement>}
 */
async function waitForElement(selector, root = document) {
    return new Promise((resolve) => {
        const element = root.querySelector(selector);
        if (element) {
            resolve(element);
        }
        const interval = setInterval(() => {
            const element = root.querySelector(selector);
            if (element) {
                clearInterval(interval);
                resolve(element);
            }
        }, 100);
    });
}
