import { addTag, getTags, removeTag } from '../storage';
import { SANITIZE_INFO, formatTagName, parseHTML, verifyEvent, waitForElement } from '../utils';
import tagIcon from '../assets/tag.svg';
import tagGalleryIcon from '../assets/tags.svg';
import squareIcon from '../assets/square.svg';
import checkSquareIcon from '../assets/check-square.svg';
import { CUSTOM_PAGE_PATH } from '../constants';

async function listTags(tweetId: string): Promise<string[]> {
    if (tweetId === null) {
        console.error('No tweet selected');
        return [];
    }

    const tags = await getTags();
    const tagArray = Object.keys(tags);
    tagArray.sort((a, b) => a.localeCompare(b));
    return tagArray;
}

function renderTag(tag: string, active: boolean): HTMLButtonElement {
    return parseHTML(
        `<button id="${tag}" class="tag ${!active && 'tag__inactive'}">
            ${active ? checkSquareIcon : squareIcon}
            <div class="text">${formatTagName(tag)}</div>
        </button>`
    );
}

function getTweetImages(tweetId: string): string[] {
    return Array.from(document.querySelectorAll('a'))
        .filter((a) => a.href.includes(tweetId))
        .flatMap((a) => Array.from(a.querySelectorAll('img')))
        .map((img) => img.src);
}

export async function renderTweetDropdown() {
    let currentTweetId: string | null = null;
    let rerenderTagList: (() => void) | null = null;

    let tagButton: HTMLElement | null = null;
    let viewTagsButton: HTMLElement | null = null;

    // Tag modal
    const tagModal = document.createElement('div');
    tagModal.innerHTML = `<input id="tagInput" type="text" placeholder="Add a tag..." /><hr style="width: 100%" /><div id="tagsContainer"/>`;
    tagModal.classList.add('tag-dropdown');
    document.body.appendChild(tagModal);

    const tagInput = tagModal.querySelector<HTMLInputElement>('#tagInput')!;
    tagInput.maxLength = SANITIZE_INFO.maxLength;
    tagInput.addEventListener('keydown', async (event) => {
        const target = event.target as HTMLInputElement;
        if (verifyEvent(event)) {
            if (event.key === 'Enter') {
                if (currentTweetId === null) {
                    console.error('No tweet selected');
                    return;
                }

                await addTag(currentTweetId, target.value, getTweetImages(currentTweetId));
                target.value = '';
                rerenderTagList?.();
            } else {
                rerenderTagList?.();
            }
        } else {
            event.preventDefault();
        }
    });

    const tagsContainer = tagModal.querySelector('#tagsContainer')!;
    function clearTagsContainer() {
        tagsContainer.innerHTML = '';
    }

    // Create tag button
    function renderTagButtons(dropdown: HTMLElement, tagId: string, images: string[]) {
        if (tagButton === null || viewTagsButton === null) {
            tagButton = dropdown.childNodes[0].cloneNode(true) as HTMLElement;
            viewTagsButton = tagButton.cloneNode(true) as HTMLElement;

            const svgClasslist = tagButton.querySelector('svg')!.classList;
            tagButton.querySelector('span')!.innerText = 'Tag Tweet';
            tagButton.querySelector('svg')!.outerHTML = tagIcon;
            tagButton.querySelector('svg')!.classList.add(...svgClasslist);
            tagButton.querySelector('svg')!.style.stroke = 'currentColor';
            tagButton.querySelector('svg')!.style.fill = 'transparent';

            viewTagsButton.querySelector('span')!.innerText = 'View Tags';
            viewTagsButton.querySelector('svg')!.outerHTML = tagGalleryIcon;
            viewTagsButton.querySelector('svg')!.classList.add(...svgClasslist);
            viewTagsButton.querySelector('svg')!.style.stroke = 'currentColor';
            viewTagsButton.querySelector('svg')!.style.fill = 'transparent';
            viewTagsButton.querySelector('svg')!.style.height = '20px';
            viewTagsButton.querySelector('svg')!.style.width = '20px';
            viewTagsButton.addEventListener('click', async () => {
                window.location.href = window.location.origin + CUSTOM_PAGE_PATH;
            });
        }

        tagButton.id = tagId;
        tagButton.addEventListener('click', async () => {
            const rect = tagButton!.getBoundingClientRect();

            tagModal.style.top = `${rect.top + window.scrollY}px`;
            tagModal.style.left = `${rect.right + 10}px`;
            tagModal.style.display = 'block';

            async function renderTagList() {
                if (currentTweetId === null) {
                    return;
                }

                const tags = await getTags();
                const tagList = await listTags(currentTweetId);
                const filteredTagList = tagList.filter((tag) =>
                    tag.toLowerCase().includes(tagInput.value.toLowerCase())
                );

                clearTagsContainer();

                if (tagList.length === 0) {
                    tagsContainer.innerHTML = 'No tags yet!';
                    return;
                } else if (filteredTagList.length === 0) {
                    tagsContainer.innerHTML = `<div style="overflow: hidden; text-overflow: ellipsis; max-width: 200px">Create a new tag: ${tagInput.value}</div>`;
                    return;
                }

                const tagElements = filteredTagList.map((tag) =>
                    renderTag(tag, tags[tag].tweets.includes(currentTweetId ?? ''))
                );
                tagsContainer.append(...tagElements);

                for (const tag of tagModal.querySelectorAll('.tag')) {
                    tag.addEventListener('click', async () => {
                        if (currentTweetId === null) {
                            console.error('No tweet selected');
                            return;
                        }

                        const tagName = tag.id;
                        if (tagName in tags && tags[tagName].tweets.includes(currentTweetId)) {
                            await removeTag(currentTweetId, tagName);
                        } else {
                            await addTag(currentTweetId, tagName, images);
                        }

                        renderTagList();
                    });
                }
            }
            renderTagList();
            rerenderTagList = renderTagList;

            tagInput.focus();
        });

        dropdown.prepend(viewTagsButton);
        dropdown.prepend(tagButton);
    }

    await waitForElement('#layers');

    const dropdownObserver = new MutationObserver((mutationsList) => {
        mutationsList.forEach(async (mutation) => {
            if (mutation.addedNodes.length > 0) {
                waitForElement('div[role="menu"]', mutation.addedNodes[0] as ParentNode).then(
                    (menu) => {
                        const menuStyles = window.getComputedStyle(menu);
                        tagModal.style.border = menuStyles.border;
                        tagModal.style.borderRadius = menuStyles.borderRadius;
                        tagModal.style.backgroundColor = menuStyles.backgroundColor;
                        tagModal.style.color = menuStyles.color;
                        tagModal.style.boxShadow = menuStyles.boxShadow;
                    }
                );

                const dropdown = await waitForElement(
                    'div[data-testid="Dropdown"]',
                    mutation.addedNodes[0] as ParentNode
                );
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
                    // Already added
                    return;
                }

                // Find images
                const images = getTweetImages(id);

                if (images.length === 0) {
                    return;
                }

                renderTagButtons(dropdown, tagId, images);
            } else if (mutation.removedNodes.length > 0) {
                tagModal.style.display = 'none';
                clearTagsContainer();
                rerenderTagList = null;
            }
        });
    });

    dropdownObserver.observe(document.getElementById('layers')!, {
        childList: true,
    });
    //#endregion
}
