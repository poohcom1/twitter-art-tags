import { CUSTOM_PAGE_TITLE } from '../constants';
import { waitForElement, formatTagName, parseHTML, verifyTagName } from '../utils';
import {
    addTag,
    createTag,
    deleteTag,
    exportData,
    getExportFileName,
    getTags,
    getTweets,
    importData,
    removeTag,
    renameTag,
} from '../storage';
import htmlHtml from '../assets/tagsGallery.html';
import { MenuItem } from 'vanilla-context-menu/dist/@types/interface';
import tagIcon from '../assets/tag.svg';
import eyeIcon from '../assets/eye.svg';
import tagPlusIcon from '../assets/file-plus.svg';
import tagMinusIcon from '../assets/file-minus.svg';
import externalLinkIcon from '../assets/link-external.svg';
import pencilIcon from '../assets/pencil.svg';
import trashIcon from '../assets/trash.svg';

const ID_IMAGE = 'tagImage';
const ID_IMPORT = 'tagImport';
const ID_EXPORT = 'tagExport';
const ID_TAGS = 'tags';
const ID_ADD_TAG = 'addTag';

const CLASS_CONTEXT_MENU_ICON = 'context-menu-icon';
const CLASS_TAG_INACTIVE = 'tag__inactive';

// Global states
let selectedTags: string[] = [];
let imageCountCache = 10;

async function renderImages(showLoading = false) {
    const imageContainer = document.querySelector('.images-container')!;

    if (showLoading)
        imageContainer.innerHTML = `<div class="image-skeleton"></div>`.repeat(imageCountCache);

    const [tags, tweets] = await Promise.all([getTags(), getTweets()]);

    // Images that have all selected tags
    const imageLinks = Object.keys(tags)
        .filter((tag) => selectedTags.includes(tag))
        .reduce(
            (acc, tag) => acc.filter((tweetId) => tags[tag].tweets.includes(tweetId)),
            Object.keys(tweets)
        )
        .reverse()
        .filter((tweetId) => tweetId in tweets)
        .flatMap((tweetId) =>
            tweets[tweetId].images.map((image, index) => ({ tweetId, image, index }))
        );

    imageContainer.innerHTML = imageLinks
        .map(
            (link) =>
                `
                    <a id="${ID_IMAGE}__${link.tweetId}__${link.index}" class="image-container" href="${link.image}" target="_blank">
                        <img src="${link.image}" />
                    </a>
                    `
        )
        .join('');

    if (Object.keys(tags).length === 0) {
        imageContainer.innerHTML =
            '<h3>No tags yet!<br>Add one by clicking on the "..." menu of a tweet with images and selected "Tag Tweet"</h3>';
    } else if (imageLinks.length === 0) {
        imageContainer.innerHTML = '<h3>Nothing to see here!</h3>';
    }

    imageCountCache = imageLinks.length;

    imageLinks.forEach((link) => {
        const viewMenu: MenuItem[] = [
            {
                label: 'Open image',
                iconHTML: createContextMenuIcon(eyeIcon),
                callback: (e) => {
                    console.log(e.target);
                    window.open(link.image, '_blank');
                },
            },
            {
                label: 'Open tweet',
                iconHTML: createContextMenuIcon(externalLinkIcon),
                callback: () => {
                    window.open(`/poohcom1/status/${link.tweetId}`, '_blank');
                },
            },
        ];

        const tagEditMenu: MenuItem[] = [];
        const otherTags = Object.keys(tags).filter(
            (tag) => !tags[tag].tweets.includes(link.tweetId)
        );
        const existingTags = Object.keys(tags).filter((tag) =>
            tags[tag].tweets.includes(link.tweetId)
        );

        if (otherTags.length > 0) {
            tagEditMenu.push({
                label: 'Add to',
                iconHTML: createContextMenuIcon(tagPlusIcon),
                preventCloseOnClick: true,
                nestedMenu: otherTags.map((tag) => ({
                    label: formatTagName(tag),
                    iconHTML: createContextMenuIcon(tagPlusIcon),
                    callback: async () => {
                        await addTag(link.tweetId, tag, []);
                        rerender();
                    },
                })),
            });
        }
        if (existingTags.length > 0) {
            tagEditMenu.push({
                label: 'Remove from',
                iconHTML: createContextMenuIcon(tagMinusIcon),
                preventCloseOnClick: true,
                nestedMenu: existingTags.map((tag) => ({
                    label: formatTagName(tag),
                    iconHTML: createContextMenuIcon(tagMinusIcon),
                    callback: async () => {
                        await removeTag(link.tweetId, tag);
                        rerender();
                    },
                })),
            });
        }

        const tagsMenu: MenuItem[] = Object.keys(tags)
            .filter((tag) => tags[tag].tweets.includes(link.tweetId))
            .map((tag) => ({
                label: formatTagName(tag),
                iconHTML: createContextMenuIcon(tagIcon),
                callback: () => {
                    selectedTags = [tag];
                    rerender();
                },
            }));

        const menuItems: MenuItem[] = [...viewMenu];
        if (tagEditMenu.length > 0) {
            menuItems.push('hr');
            menuItems.push(...tagEditMenu);
        }
        if (tagsMenu.length > 0) {
            menuItems.push('hr');
            menuItems.push(...tagsMenu);
        }

        const ctxMenu = new VanillaContextMenu({
            scope: document.querySelector(`#${ID_IMAGE}__${link.tweetId}__${link.index}`)!,
            normalizePosition: true,
            transitionDuration: 0,
            menuItems,
        });

        ctxMenu.applyStyleOnContextMenu;
    });
}

async function renderTags() {
    const tags = await getTags();
    const tagList = Object.keys(tags);

    const tagsContainer = document.querySelector('#' + ID_TAGS)!;

    tagList.sort((a, b) => a.localeCompare(b));

    const tagElements = tagList.map((tag) => {
        const active = selectedTags.includes(tag);

        const button = parseHTML<HTMLButtonElement>(
            `<button class="tag ${!active && CLASS_TAG_INACTIVE}">${
                active ? '✔ ' : ''
            }${formatTagName(tag)} (${tags[tag].tweets.length})</button>`
        );

        button.addEventListener('click', () => {
            if (active) {
                selectedTags = selectedTags.filter((t) => t !== tag);
            } else {
                selectedTags.push(tag);
            }
            rerender(true);
        });

        new VanillaContextMenu({
            scope: button,
            normalizePosition: false,
            transitionDuration: 0,
            menuItems: [
                {
                    label: 'Rename',
                    iconHTML: createContextMenuIcon(pencilIcon),
                    callback: async () => {
                        let newTagName;
                        while (true) {
                            newTagName = prompt('Enter new tag name:', formatTagName(tag));
                            if (!newTagName) {
                                return;
                            }
                            if (verifyTagName(newTagName)) {
                                break;
                            } else {
                                alert(
                                    'Invalid tag name! Tag names can only contain letters, numbers, and spaces.'
                                );
                            }
                        }
                        await renameTag(tag, newTagName);
                        rerender();
                    },
                },
                {
                    label: 'Delete',
                    iconHTML: createContextMenuIcon(trashIcon),
                    callback: async () => {
                        if (!confirm('Are you sure you want to delete this tag?')) {
                            return;
                        }
                        await deleteTag(tag);
                        rerender();
                    },
                },
            ],
        });

        return button;
    });

    tagsContainer.innerHTML = '';
    tagsContainer.append(...tagElements);
}

function rerender(showLoading = false) {
    renderTags();
    renderImages(showLoading);
}

export async function renderTagsGallery() {
    // Render page
    const main = (await waitForElement('div[data-testid="error-detail"]')).parentElement!;
    main.style.maxWidth = '100%';
    main.innerHTML = htmlHtml;

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
    titleObserver.observe(document.querySelector('title')!, { childList: true });

    // Tag input
    const tagInput = document.querySelector<HTMLInputElement>('#' + ID_ADD_TAG)!;
    tagInput.addEventListener('keydown', async (event) => {
        const allowedChars = /^[a-zA-Z0-9 ]+$/;

        if (allowedChars.test(event.key) || event.key === 'Enter') {
            if (event.key === 'Enter') {
                const target = event.target as HTMLInputElement;
                console.log(target.value);

                await createTag(target.value);
                target.value = '';
                renderTags();
            }
        } else {
            event.preventDefault();
        }
    });

    // Tag export
    const tagExport = document.querySelector('#' + ID_EXPORT);
    tagExport!.addEventListener('click', async () => {
        const tags = await exportData();
        const blob = new Blob([tags], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;

        a.download = getExportFileName();
        a.click();
        URL.revokeObjectURL(url);
    });

    // Tag import
    const tagImport = document.querySelector('#' + ID_IMPORT);
    tagImport!.addEventListener('click', async () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.style.display = 'none';
        input.addEventListener('change', async () => {
            const file = input.files![0];
            const reader = new FileReader();
            reader.onload = async () => {
                if (!confirm('Are you sure you want to overwrite all tags?')) {
                    return;
                }
                await importData(reader.result as string);
                rerender();
            };
            reader.readAsText(file);
        });
        input.click();
    });

    rerender(true);
}

// Utils
function createContextMenuIcon(iconSvg: string): string {
    const icon = parseHTML(iconSvg);
    icon.classList.add(CLASS_CONTEXT_MENU_ICON);
    return icon.outerHTML;
}
