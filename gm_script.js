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
// ==/UserScript==

// Commands
GM.registerMenuCommand('Clear all tags', async () => await GM.deleteValue(KEY_TAGS));

// Assets
const TAG_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true" class="r-4qtqp9 r-yyyyoo r-dnmrzs r-bnwqim r-lrvibr r-m6rgpd r-1xvli5t r-1hdv0qi"><g><path d="M4 4.5C4 3.12 5.119 2 6.5 2h11C18.881 2 20 3.12 20 4.5v18.44l-8-5.71-8 5.71V4.5zM6.5 4c-.276 0-.5.22-.5.5v14.56l6-4.29 6 4.29V4.5c0-.28-.224-.5-.5-.5h-11z"></path></g></svg>`;

// Constants
const KEY_TAGS = 'tags';

// HTML
GM_addStyle(`
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
`);

// Debug
GM.getValue(KEY_TAGS).then((tags) => {
    console.log('Twitter Art Collection - Tags');
    console.table(tags);
});

// Render
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

// Main
(async function () {
    ('use strict');

    // Global """states"""

    /** @type {string} */
    let currentTweetId = null;
    /** @type {(() => void) | null} */
    let onNewTag = null;

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

    // Observer the dropdown appearing
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

                // Clone a menu item
                const tagContainer = dropdown.childNodes[0].cloneNode(true);

                tagContainer.querySelector('span').innerText = 'Tag';
                tagContainer.querySelector('svg').outerHTML = TAG_SVG;
                tagContainer.id = tagId;
                tagContainer.addEventListener('click', async () => {
                    const rect = tagContainer.getBoundingClientRect();

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
                dropdown.prepend(tagContainer);
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
