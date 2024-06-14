import template from './tag-gallery.pug';
import styles from './tag-gallery.module.scss';
import imageTemplate from './templates/image-container.pug';
import tagButtonTemplate from '../templates/tag-button.pug';
import { formatTagName, parseHTML, verifyEvent, verifyTagName } from '../../utils';
import {
    getTags,
    getTweets,
    removeTweet,
    renameTag,
    deleteTag,
    createTag,
    exportDataToFile,
    importDataFromFile,
    clearAllTags,
    getArchiveConsent,
    setArchiveConsent,
    removeTag,
    tagExists,
} from '../../services/storage';
import TagModal from '../tagModal/TagModal';
import tagIcon from '../../assets/tag.svg';
import eyeIcon from '../../assets/eye.svg';
import tagCheckIcon from '../../assets/file-check.svg';
import tagMinusIcon from '../../assets/file-minus.svg';
import externalLinkIcon from '../../assets/link-external.svg';
import pencilIcon from '../../assets/pencil.svg';
import trashIcon from '../../assets/trash.svg';
import squareIcon from '../../assets/square.svg';
import checkSquareIcon from '../../assets/check-square.svg';
import SyncModal from '../syncModal/SyncModal';
import { createArchive, loginRedirected } from '../../services/supabase';
import ImageModal from '../imageModal/ImageModal';

enum RenderKeys {
    TAGS = 'tags',
    TAGS_FILTER = 'tagsFilter',
    IMAGES = 'images',
}

interface TagData {
    tagName: string;
    displayText: string;
}

interface ImageData {
    tweetId: string;
    image: string;
    index: number;
    element: HTMLElement;
}

const IDS = {
    tagExport: 'tagExport',
    tagImport: 'tagImport',
    tagImportMerge: 'tagImportMerge',
    tagSync: 'tagSync',
    tagClear: 'tagClear',
    downloadImages: 'downloadImages',
};

export default class TagGallery {
    private cleanup: (() => void) | null = null;

    private tagModal: TagModal = new TagModal([styles.tagModal]);
    private imageModal: ImageModal = new ImageModal();
    private imageContainer: HTMLElement;
    private tagsContainer: HTMLElement;

    private selectedTags: string[] = [];
    private tagFilter: string = '';

    private lockHover = false;

    // Cache for faster render
    private imageData: ImageData[] = [];
    private tagData: TagData[] = [];

    public static exists() {
        return !!document.querySelector(`.${styles.tagsGallery}`);
    }

    constructor(parent: HTMLElement) {
        parent.style.maxWidth = '100%';
        parent.innerHTML = template({
            styles,
            ids: IDS,
        });
        this.imageContainer = document.querySelector<HTMLElement>(`.${styles.imageGallery}`)!;
        this.tagsContainer = document.querySelector<HTMLElement>(`.${styles.tagsContainer}`)!;

        // Add tag

        const addTagInput = document.querySelector<HTMLInputElement>(`.${styles.addTag}`)!;
        const addTagClear = document.querySelector<HTMLElement>(`.${styles.addTagClear}`)!;
        addTagClear.style.display = 'none';
        addTagInput.onkeydown = async (event) => {
            const target = event.target as HTMLInputElement;
            if (verifyEvent(event)) {
                if (event.key === 'Enter') {
                    if (await tagExists(target.value)) {
                        this.selectedTags = [target.value];
                        this.rerender([RenderKeys.IMAGES, RenderKeys.TAGS]);
                    } else {
                        const tagName = target.value;
                        await createTag(tagName);
                        target.value = '';
                        this.rerender([RenderKeys.TAGS]);
                    }
                    return;
                }
            } else {
                event.preventDefault();
            }
        };
        addTagInput.oninput = async (event) => {
            const target = event.target as HTMLInputElement;
            addTagClear.style.display = target.value === '' ? 'none' : 'block';
            this.tagFilter = target.value.toLocaleLowerCase();

            this.rerender([RenderKeys.TAGS_FILTER]);
        };
        addTagClear.onclick = () => {
            addTagInput.value = '';
            addTagClear.style.display = 'none';
            this.tagFilter = '';
            addTagInput.focus();
            this.rerender([RenderKeys.TAGS]);
        };

        // Menu
        const tagExport = document.querySelector<HTMLElement>(`#${IDS.tagExport}`)!;
        const tagImport = document.querySelector<HTMLElement>(`#${IDS.tagImport}`)!;
        const tagImportMerge = document.querySelector<HTMLElement>(`#${IDS.tagImportMerge}`)!;
        const tagClear = document.querySelector<HTMLElement>(`#${IDS.tagClear}`)!;
        const tagSyncBtn = document.querySelector<HTMLElement>(`#${IDS.tagSync}`)!;
        const downloadImages = document.querySelector<HTMLElement>(`#${IDS.downloadImages}`)!;

        const dropdown = document.querySelector<HTMLElement>(`.${styles.dotMenuDropdown}`)!;
        const closeDropdown = () => dropdown.classList.remove(styles.dotMenuDropdownVisible);
        document
            .querySelector<HTMLElement>(`.${styles.dotMenu}`)!
            .addEventListener('click', (e) => {
                e.stopPropagation();
                dropdown.classList.toggle(styles.dotMenuDropdownVisible);
            });
        document.onclick = closeDropdown;
        dropdown.onclick = (e) => e.stopPropagation();

        const tagSyncModal = new SyncModal({
            onClose: closeDropdown,
            onTagsUpdate: () => this.rerender(),
        });
        if (loginRedirected) {
            tagSyncModal.show();
        }

        tagExport.onclick = exportDataToFile;
        tagImport.onclick = () =>
            importDataFromFile(false).then(() => {
                this.rerender();
                closeDropdown();
            });
        tagImportMerge.onclick = () =>
            importDataFromFile(true).then(() => {
                this.rerender();
                closeDropdown();
            });
        tagClear.onclick = async () => {
            if (confirm('Are you sure you want to clear all data?')) {
                await clearAllTags();
                this.rerender();
            }
            closeDropdown();
        };
        tagSyncBtn.onclick = () => {
            closeDropdown();
            tagSyncModal.show();
        };

        let creatingArchive = false;
        const downloadText = downloadImages.textContent;
        downloadImages.onclick = async () => {
            if (creatingArchive) {
                return;
            }

            const consent = await getArchiveConsent();
            if (!consent) {
                if (
                    !confirm(
                        'Due to limitations on a userscript, the download feature uses an API to create a zip file of all images. This does not store any data.\n\nDo you want to proceed?'
                    )
                ) {
                    return;
                }
                setArchiveConsent(true);
            }

            creatingArchive = true;
            downloadImages.textContent = 'Creating archive...';
            downloadImages.classList.add(styles.dropdownItemDisabled);

            const success = await createArchive();

            if (!success) {
                alert('Failed to create archive!');
            }

            downloadImages.textContent = downloadText;
            downloadImages.classList.remove(styles.dropdownItemDisabled);
            creatingArchive = false;
        };

        // Render
        this.renderTags([RenderKeys.IMAGES, RenderKeys.TAGS]).then(() =>
            this.renderImages([RenderKeys.IMAGES, RenderKeys.TAGS])
        );
    }

    public async rerender(renderKeys: RenderKeys[] = [RenderKeys.IMAGES, RenderKeys.TAGS]) {
        const tagRender = this.renderTags(renderKeys);
        const imageRender = this.renderImages(renderKeys);

        this.cleanup?.();
        this.cleanup = null;

        await Promise.all([tagRender, imageRender]);
    }

    private async renderImages(renderKeys: RenderKeys[]) {
        if (!renderKeys.includes(RenderKeys.IMAGES) && !renderKeys.includes(RenderKeys.TAGS)) {
            return;
        }

        const previousImages = this.imageData;
        let actualSelected: ImageData | null = null;

        if (renderKeys.includes(RenderKeys.IMAGES)) {
            this.imageContainer.innerHTML =
                `<div class="${styles.imageContainer} ${styles.imageContainerSkeleton}"></div>`.repeat(
                    15
                );
        }

        const [tags, tweets] = await Promise.all([getTags(), getTweets()]);

        // Images that have all selected tags
        if (renderKeys.includes(RenderKeys.IMAGES)) {
            const tweetIds = Object.keys(tags)
                .filter((tag) => this.selectedTags.includes(tag))
                .reduce(
                    (acc, tag) => acc.filter((tweetId) => tags[tag].tweets.includes(tweetId)),
                    Object.keys(tweets)
                )
                .reverse()
                .filter((tweetId) => tweetId in tweets);

            const allImages = tweetIds.flatMap((tweetId) => tweets[tweetId].images);

            this.imageData = tweetIds.flatMap((tweetId, ind) =>
                tweets[tweetId].images.map((image, index) => {
                    const atSamePos =
                        previousImages[ind]?.tweetId === tweetId &&
                        previousImages[ind]?.index === index;

                    const imageContainer = parseHTML(
                        imageTemplate({
                            className: `${styles.imageContainer} ${
                                !atSamePos && styles.imageContainerLoaded
                            }`,
                            src: image,
                        })
                    );
                    imageContainer.onclick = () => {
                        if (this.lockHover) {
                            return;
                        }

                        this.imageModal.show(allImages, allImages.indexOf(image));
                    };

                    return {
                        tweetId,
                        image,
                        index,
                        element: imageContainer,
                    };
                })
            );
            this.imageContainer.innerHTML = '';
            this.imageContainer.append(...this.imageData.map((e) => e.element));
        }

        if (Object.keys(tags).length === 0) {
            this.imageContainer.innerHTML =
                '<div>No tags yet! Create one by clicking on the "..." menu of a tweet with images and selecting "Tag Tweet"</div>';
        } else if (this.imageData.length === 0) {
            this.imageContainer.innerHTML = '<h3>Nothing to see here!</h3>';
        }

        // Menu item
        const clearAll = () =>
            document
                .querySelectorAll('.' + styles.imageContainerHover)
                .forEach((img) => img.classList.remove(styles.imageContainerHover));

        const onMouseEnter = (image: ImageData) => {
            actualSelected = image;
            if (this.lockHover) {
                return;
            }
            const tweetImages = this.imageData.filter((img) => img.tweetId === image.tweetId);
            clearAll();
            tweetImages.forEach((img) => img.element.classList.add(styles.imageContainerHover));
        };

        const onMouseLeave = (image: ImageData) => {
            if (actualSelected === image) {
                actualSelected = null;
            }
            if (this.lockHover) {
                return;
            }

            const tweetImages = this.imageData.filter((img) => img.tweetId === image.tweetId);
            tweetImages.forEach((img) => img.element.classList.remove(styles.imageContainerHover));
        };

        const onDocumentClick = () => {
            this.lockHover = false;
            if (actualSelected) {
                onMouseEnter(actualSelected);
            } else {
                clearAll();
            }
        };
        document.addEventListener('click', onDocumentClick);
        this.cleanup = () => document.removeEventListener('click', onDocumentClick);

        this.imageData.forEach((image) => {
            // Hover fx
            image.element.addEventListener('mouseover', () => onMouseEnter(image));
            image.element.addEventListener('mouseout', () => onMouseLeave(image));

            image.element.addEventListener('contextmenu', () => {
                this.lockHover = false;
                onMouseEnter(image);
                this.lockHover = true;
                this.tagModal.hide();
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
                customClass: styles.contextMenu,
                onClose: () => {
                    this.lockHover = false;
                    this.tagModal.hide();
                },
            });

            const menuItems: MenuItem[] = [
                {
                    label: 'Edit tags',
                    iconHTML: createContextMenuIcon(tagCheckIcon),
                    callback: async (_, currentEvent) => {
                        currentEvent.stopPropagation();

                        const rect = (
                            currentEvent.currentTarget as HTMLElement
                        ).getBoundingClientRect();

                        this.tagModal.show(
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
                                    if (this.selectedTags.includes(tag)) {
                                        this.rerender([RenderKeys.TAGS, RenderKeys.IMAGES]);
                                    } else {
                                        this.rerender([RenderKeys.TAGS]);
                                    }
                                },
                            }
                        );
                    },
                },
            ];

            if (this.selectedTags.length === 1) {
                menuItems.push({
                    label: `Untag ${formatTagName(this.selectedTags[0])}`,
                    iconHTML: createContextMenuIcon(tagMinusIcon),
                    callback: async () => {
                        await removeTag(image.tweetId, this.selectedTags[0]);
                        this.rerender([RenderKeys.IMAGES, RenderKeys.TAGS]);
                        contextMenu.close();
                    },
                });
            }

            menuItems.push(
                {
                    label: 'Delete tweet',
                    iconHTML: createContextMenuIcon(trashIcon),
                    callback: async () => {
                        if (confirm('Are you sure you want to delete this tweet from all tags?')) {
                            await removeTweet(image.tweetId);
                            this.rerender([RenderKeys.IMAGES, RenderKeys.TAGS]);
                        }
                        contextMenu.close();
                    },
                },
                'hr',
                {
                    label: 'Open tweet',
                    iconHTML: createContextMenuIcon(externalLinkIcon),
                    callback: () => {
                        window.open(`/poohcom1/status/${image.tweetId}`, '_blank');
                        contextMenu.close();
                    },
                },
                {
                    label: 'Open image',
                    iconHTML: createContextMenuIcon(eyeIcon),
                    callback: () => {
                        window.open(image.image, '_blank');
                        contextMenu.close();
                    },
                }
            );

            const tagsMenu: MenuItem[] = Object.keys(tags)
                .filter((tag) => tags[tag].tweets.includes(image.tweetId))
                .sort((a, b) => a.localeCompare(b))
                .map((tag) => ({
                    label: formatTagName(tag),
                    iconHTML: createContextMenuIcon(tagIcon),
                    callback: async () => {
                        if (!(this.selectedTags.length === 1 && this.selectedTags[0] === tag)) {
                            // If not already selected
                            this.selectedTags = [tag];
                            await this.rerender([RenderKeys.IMAGES, RenderKeys.TAGS]);
                        }

                        contextMenu.close();

                        await new Promise((resolve) => setTimeout(resolve, 10));

                        window.scrollTo({
                            top: 0,
                            behavior: 'smooth',
                        });
                    },
                }));
            if (tagsMenu.length > 0) {
                menuItems.push('hr', ...tagsMenu);
            }

            contextMenu.updateOptions({ ...contextMenu.options, menuItems });
        });
    }

    private async renderTags(renderKeys: RenderKeys[]) {
        if (
            !renderKeys.includes(RenderKeys.TAGS) &&
            !renderKeys.includes(RenderKeys.IMAGES) &&
            !renderKeys.includes(RenderKeys.TAGS_FILTER)
        ) {
            return;
        }

        const [tags, tweets] = await Promise.all([getTags(), getTweets()]);
        this.tagData = Object.keys(tags).map((tag) => {
            const tweetCount = tags[tag].tweets
                .map((tweetId) => tweets[tweetId]?.images.length)
                .reduce((a, b) => a + b, 0);

            return {
                tagName: tag,
                displayText: `${formatTagName(tag)} (${tweetCount})`,
            };
        });

        const tagList = this.tagData.filter(
            (tag) =>
                this.tagFilter === '' ||
                tag.displayText.toLocaleLowerCase().includes(this.tagFilter)
        );

        tagList.sort((a, b) => a.tagName.localeCompare(b.tagName));

        const tagElements = tagList.map((tagData) => {
            const active = this.selectedTags.includes(tagData.tagName);
            const button = parseHTML(
                tagButtonTemplate({
                    className: `${styles.tag} ${!active && styles.tagInactive}`,
                    icon: active ? checkSquareIcon : squareIcon,
                    text: tagData.displayText,
                })
            );
            const select = () => {
                if (this.selectedTags.length === 1 && this.selectedTags[0] === tagData.tagName) {
                    this.selectedTags = [];
                } else {
                    this.selectedTags = [tagData.tagName];
                }
                this.rerender([RenderKeys.IMAGES, RenderKeys.TAGS]);
            };

            const modifySelection = () => {
                if (active) {
                    this.selectedTags = this.selectedTags.filter((t) => t !== tagData.tagName);
                } else {
                    this.selectedTags.push(tagData.tagName);
                }
                this.rerender([RenderKeys.IMAGES, RenderKeys.TAGS]);
            };

            button.addEventListener('click', (e) => {
                if (e.shiftKey) {
                    modifySelection();
                } else {
                    select();
                }
            });

            new VanillaContextMenu({
                scope: button,
                customClass: active ? styles.contextMenuWide : styles.contextMenu,
                normalizePosition: false,
                transitionDuration: 0,
                menuItems: [
                    {
                        label: active ? 'Deselect' : 'Select',
                        iconHTML: createContextMenuIcon(active ? squareIcon : checkSquareIcon),
                        callback: select,
                    },
                    {
                        label: active ? 'Remove from selection' : 'Add to selection',
                        iconHTML: createNoIcon(),
                        callback: modifySelection,
                    },
                    {
                        label: 'Deselect all',
                        iconHTML: createNoIcon(),
                        callback: () => {
                            this.selectedTags = [];
                            this.rerender([RenderKeys.IMAGES, RenderKeys.TAGS]);
                        },
                    },
                    'hr',
                    {
                        label: 'Rename',
                        iconHTML: createContextMenuIcon(pencilIcon),
                        callback: async () => {
                            let newTagName;
                            while (true) {
                                newTagName = prompt(
                                    'Enter new tag name:',
                                    formatTagName(tagData.tagName)
                                );
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
                            await renameTag(tagData.tagName, newTagName);
                            this.rerender([RenderKeys.TAGS]);
                        },
                    },
                    {
                        label: 'Delete',
                        iconHTML: createContextMenuIcon(trashIcon),
                        callback: async () => {
                            if (!confirm('Are you sure you want to delete this tag?')) {
                                return;
                            }
                            await deleteTag(tagData.tagName);
                            if (this.selectedTags.includes(tagData.tagName)) {
                                this.selectedTags = [];
                                this.rerender([RenderKeys.TAGS, RenderKeys.IMAGES]);
                            } else {
                                this.rerender([RenderKeys.TAGS]);
                            }
                        },
                    },
                ],
            });

            return button;
        });

        this.tagsContainer.innerHTML = '';
        this.tagsContainer.append(...tagElements);

        if (this.tagFilter !== '' && !tagList.find((tag) => tag.tagName === this.tagFilter)) {
            let text = `Press Enter to create&nbsp;<strong>${formatTagName(
                this.tagFilter
            )}</strong>`;

            if (tagElements.length > 0) {
                text = 'or ' + text;
            }

            this.tagsContainer.innerHTML += `<div class=${styles.empty}>${text}</div>`;
        }
    }
}

// Utils
function createContextMenuIcon(iconSvg: string): string {
    const icon = parseHTML(iconSvg);
    icon.classList.add(styles.contextMenuIcon);
    return icon.outerHTML;
}

function createNoIcon(): string {
    const icon = parseHTML('<div />');
    icon.classList.add(styles.contextMenuIcon);
    return icon.outerHTML;
}
