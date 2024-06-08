import '../assets/tags-gallery.scss';
import { CUSTOM_PAGE_TITLE } from '../constants';
import {
    waitForElement,
    formatTagName,
    parseHTML,
    verifyTagName,
    SANITIZE_INFO,
    verifyEvent,
} from '../utils';
import {
    createTag,
    deleteTag,
    exportData,
    getExportFileName,
    getTags,
    getTweets,
    importData,
    removeTweet,
    renameTag,
} from '../storage';
import htmlHtml from '../assets/tags-gallery.html';
import tagIcon from '../assets/img/tag.svg';
import eyeIcon from '../assets/img/eye.svg';
import tagPlusIcon from '../assets/img/file-plus.svg';
import externalLinkIcon from '../assets/img/link-external.svg';
import pencilIcon from '../assets/img/pencil.svg';
import trashIcon from '../assets/img/trash.svg';
import squareIcon from '../assets/img/square.svg';
import checkSquareIcon from '../assets/img/check-square.svg';
import TagModal from '../components/TagModal';

const ID_IMPORT = 'tagImport';
const ID_EXPORT = 'tagExport';
const ID_TAGS = 'tags';
const ID_ADD_TAG = 'addTag';
const ID_IMAGE_GALLERY = 'imageGallery';

const CLASS_CONTEXT_MENU_ICON = 'context-menu-icon';
const CLASS_TAG_INACTIVE = 'tag__inactive';
const CLASS_IMAGE = 'image-container';
const CLASS_IMAGE_HOVER = 'image-container__hover';
const CLASS_IMAGE_LOADED = 'image-container__loaded';
const CLASS_IMAGE_SKELETON = 'image-container__skeleton';

// Render keys
enum RenderKeys {
    TAGS = 'tags',
    IMAGES = 'images',
}

export async function renderTagsGallery(tagModal: TagModal) {
    // Global states
    const cleanup: (() => void)[] = [];

    let selectedTags: string[] = [];
    let lockHover = false;

    let imageData: { tweetId: string; image: string; index: number; element: HTMLElement }[] = [];

    function rerender(renderKeys: RenderKeys[]) {
        renderTags(renderKeys);
        renderImages(renderKeys);

        cleanup.forEach((fn) => fn());
        cleanup.length = 0;
    }

    async function renderImages(renderKeys: RenderKeys[]) {
        const previousImages = imageData;
        const imageContainer = document.querySelector<HTMLElement>('#' + ID_IMAGE_GALLERY)!;

        if (renderKeys.includes(RenderKeys.IMAGES)) {
            imageContainer.innerHTML =
                `<div class="${CLASS_IMAGE} ${CLASS_IMAGE_SKELETON}"></div>`.repeat(15);
        }

        const [tags, tweets] = await Promise.all([getTags(), getTweets()]);

        // Images that have all selected tags
        if (renderKeys.includes(RenderKeys.IMAGES)) {
            imageData = Object.keys(tags)
                .filter((tag) => selectedTags.includes(tag))
                .reduce(
                    (acc, tag) => acc.filter((tweetId) => tags[tag].tweets.includes(tweetId)),
                    Object.keys(tweets)
                )
                .reverse()
                .filter((tweetId) => tweetId in tweets)
                .flatMap((tweetId, ind) =>
                    tweets[tweetId].images.map((image, index) => {
                        const atSamePos =
                            previousImages[ind]?.tweetId === tweetId &&
                            previousImages[ind]?.index === index;

                        return {
                            tweetId,
                            image,
                            index,
                            element: parseHTML(`
                            <a class="${CLASS_IMAGE} ${
                                !atSamePos && CLASS_IMAGE_LOADED
                            }" href="/poohcom1/status/${tweetId}" target="_blank">
                                <img src="${image}" />
                            </a>`),
                        };
                    })
                );
            imageContainer.innerHTML = '';
            imageContainer.append(...imageData.map((e) => e.element));
        }

        if (Object.keys(tags).length === 0) {
            imageContainer.innerHTML =
                '<div>No tags yet! Create one by clicking on the "..." menu of a tweet with images and selected "Tag Tweet"</div>';
        } else if (imageData.length === 0) {
            imageContainer.innerHTML = '<h3>Nothing to see here!</h3>';
        }

        // Menu item
        imageData.forEach((image) => {
            // Hover fx
            const tweetImages = imageData.filter((img) => img.tweetId === image.tweetId);

            const hoverFx = () => {
                if (lockHover) {
                    return;
                }

                document
                    .querySelectorAll('.' + CLASS_IMAGE_HOVER)
                    .forEach((img) => img.classList.remove(CLASS_IMAGE_HOVER));
                tweetImages.forEach((img) => img.element.classList.add(CLASS_IMAGE_HOVER));
            };
            const unhoverFx = () => {
                if (lockHover) {
                    return;
                }

                tweetImages.forEach((img) => img.element.classList.remove(CLASS_IMAGE_HOVER));
            };

            const onDocumentClick = () => {
                lockHover = false;
                unhoverFx();
            };

            image.element.addEventListener('mouseover', hoverFx);
            image.element.addEventListener('mouseout', unhoverFx);

            image.element.addEventListener('contextmenu', () => {
                lockHover = false;
                hoverFx();
                lockHover = true;
                tagModal.hide();
            });
            document.addEventListener('click', onDocumentClick);

            cleanup.push(() => {
                document.removeEventListener('click', onDocumentClick);
            });

            // Menu item
            const contextMenu = new VanillaContextMenu({
                scope: image.element,
                transitionDuration: 0,
                menuItems: [],
                normalizePosition: true,
                customNormalizeScope: document.querySelector<HTMLElement>('main')!
                    .firstElementChild as HTMLElement,
                openSubMenuOnHover: true,
                preventCloseOnClick: true,
                customClass: 'context-menu',
                onClose: () => {
                    lockHover = false;
                    tagModal.hide();
                },
            });

            const menuItems: MenuItem[] = [
                {
                    label: 'Open image',
                    iconHTML: createContextMenuIcon(eyeIcon),
                    callback: () => {
                        window.open(image.image, '_blank');
                        contextMenu.close();
                    },
                },
                {
                    label: 'Open tweet',
                    iconHTML: createContextMenuIcon(externalLinkIcon),
                    callback: () => {
                        window.open(`/poohcom1/status/${image.tweetId}`, '_blank');
                        contextMenu.close();
                    },
                },
                {
                    label: 'Edit tags',
                    iconHTML: createContextMenuIcon(tagPlusIcon),
                    callback: async (_, currentEvent) => {
                        tagModal.setStyles({
                            backgroundColor: '#1b1a1a',
                            color: '#eee',
                            padding: '12px',
                            borderRadius: '5px',
                            boxShadow:
                                'rgba(255, 255, 255, 0.05) 0px 0px 15px 0px, rgba(255, 255, 255, 0.05) 0px 0px 3px 1px',
                        });
                        const rect = (
                            currentEvent.currentTarget as HTMLElement
                        ).getBoundingClientRect();

                        tagModal.show(
                            image.tweetId,
                            [image.image],
                            {
                                top: rect.top, // don't spread
                                right: rect.right,
                                left: rect.left,
                                space: 1,
                            },
                            {
                                tagModified: async (tag) => {
                                    if (selectedTags.includes(tag)) {
                                        rerender([RenderKeys.TAGS, RenderKeys.IMAGES]);
                                    } else {
                                        rerender([RenderKeys.TAGS]);
                                    }
                                },
                            }
                        );
                    },
                },
                {
                    label: 'Remove tweet',
                    iconHTML: createContextMenuIcon(trashIcon),
                    callback: async () => {
                        if (confirm('Are you sure you want to remove this tweet from all tags?')) {
                            await removeTweet(image.tweetId);
                            rerender([RenderKeys.IMAGES, RenderKeys.TAGS]);
                        }
                        contextMenu.close();
                    },
                },
            ];

            const tagsMenu: MenuItem[] = Object.keys(tags)
                .filter((tag) => tags[tag].tweets.includes(image.tweetId))
                .map((tag) => ({
                    label: formatTagName(tag),
                    iconHTML: createContextMenuIcon(tagIcon),
                    callback: () => {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                        if (!(selectedTags.length === 1 && selectedTags[0] === tag)) {
                            // If not already selected
                            selectedTags = [tag];
                            rerender([RenderKeys.IMAGES, RenderKeys.TAGS]);
                        }

                        contextMenu.close();
                    },
                }));
            if (tagsMenu.length > 0) {
                menuItems.push('hr', ...tagsMenu);
            }

            contextMenu.updateOptions({ ...contextMenu.options, menuItems });
        });
    }

    async function renderTags(renderKeys: RenderKeys[]) {
        if (!renderKeys.includes(RenderKeys.TAGS) && !renderKeys.includes(RenderKeys.IMAGES)) {
            return;
        }

        const [tags, tweets] = await Promise.all([getTags(), getTweets()]);
        const tagList = Object.keys(tags);

        const tagsContainer = document.querySelector('#' + ID_TAGS)!;

        tagList.sort((a, b) => a.localeCompare(b));

        const tagElements = tagList.map((tag) => {
            const active = selectedTags.includes(tag);

            const tweetCount = tags[tag].tweets
                .map((tweetId) => tweets[tweetId]?.images.length)
                .reduce((a, b) => a + b, 0);

            const button = parseHTML<HTMLButtonElement>(
                `<button class="tag ${!active && CLASS_TAG_INACTIVE}">
                ${active ? checkSquareIcon : squareIcon}
                <div class="text">${formatTagName(tag)} (${tweetCount})</div>
            </button>`
            );

            button.addEventListener('click', () => {
                if (active) {
                    selectedTags = selectedTags.filter((t) => t !== tag);
                } else {
                    selectedTags.push(tag);
                }
                rerender([RenderKeys.IMAGES, RenderKeys.TAGS]);
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
                            rerender([RenderKeys.TAGS]);
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
                            rerender([RenderKeys.TAGS]);
                        },
                    },
                ],
            });

            return button;
        });

        tagsContainer.innerHTML = '';
        tagsContainer.append(...tagElements);
    }

    // Render page
    const main = (await waitForElement('div[data-testid="error-detail"]'))!.parentElement!;
    main.style.maxWidth = '100%';
    main.innerHTML = htmlHtml;

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

    // Tag input
    const tagInput = document.querySelector<HTMLInputElement>('#' + ID_ADD_TAG)!;
    tagInput.maxLength = SANITIZE_INFO.maxLength;
    tagInput.addEventListener('keydown', async (event) => {
        const target = event.target as HTMLInputElement;

        if (verifyEvent(event)) {
            if (event.key === 'Enter') {
                await createTag(target.value);
                target.value = '';
                rerender([RenderKeys.TAGS]);
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
                rerender([RenderKeys.TAGS, RenderKeys.IMAGES]);
            };
            reader.readAsText(file);
        });
        input.click();
    });

    // First load
    await renderTags([RenderKeys.IMAGES, RenderKeys.TAGS]);
    renderImages([RenderKeys.IMAGES, RenderKeys.TAGS]);
}

// Utils
function createContextMenuIcon(iconSvg: string): string {
    const icon = parseHTML(iconSvg);
    icon.classList.add(CLASS_CONTEXT_MENU_ICON);
    return icon.outerHTML;
}
