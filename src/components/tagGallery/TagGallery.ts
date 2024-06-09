import template from './tag-gallery.pug';
import styles from './tag-gallery.module.scss';
import imageTemplate from './templates/image-container.pug';
import tagButtonTemplate from '../templates/tag-button.pug';
import { formatTagName, parseHTML, verifyTagName } from '../../utils';
import { getTags, getTweets, removeTweet, renameTag, deleteTag } from '../../storage';
import TagModal from '../tagModal/TagModal';
import tagIcon from '../../assets/tag.svg';
import eyeIcon from '../../assets/eye.svg';
import tagPlusIcon from '../../assets/file-plus.svg';
import externalLinkIcon from '../../assets/link-external.svg';
import pencilIcon from '../../assets/pencil.svg';
import trashIcon from '../../assets/trash.svg';
import squareIcon from '../../assets/square.svg';
import checkSquareIcon from '../../assets/check-square.svg';

enum RenderKeys {
    TAGS = 'tags',
    IMAGES = 'images',
}

interface ImageData {
    tweetId: string;
    image: string;
    index: number;
    element: HTMLElement;
}

export default class TagGallery {
    private cleanup: (() => void)[] = [];

    private tagModal: TagModal;
    private imageContainer: HTMLElement;
    private tagsContainer: HTMLElement;

    private selectedTags: string[] = [];
    private imageData: ImageData[] = [];
    private lockHover = false;

    public static exists() {
        return !!document.querySelector(`.${styles.tagsGallery}`);
    }

    constructor(parent: HTMLElement) {
        this.tagModal = new TagModal([styles.tagModal]);
        parent.style.maxWidth = '100%';
        parent.innerHTML = template({
            styles,
        });
        this.imageContainer = document.querySelector<HTMLElement>(`.${styles.imageGallery}`)!;
        this.tagsContainer = document.querySelector<HTMLElement>(`.${styles.tagsContainer}`)!;

        this.renderTags([RenderKeys.IMAGES, RenderKeys.TAGS]).then(() =>
            this.renderImages([RenderKeys.IMAGES, RenderKeys.TAGS])
        );
    }

    public async rerender(renderKeys: RenderKeys[] = [RenderKeys.IMAGES, RenderKeys.TAGS]) {
        const tagRender = this.renderTags(renderKeys);
        const imageRender = this.renderImages(renderKeys);

        this.cleanup.forEach((fn) => fn());
        this.cleanup.length = 0;

        await Promise.all([tagRender, imageRender]);
    }

    private async renderImages(renderKeys: RenderKeys[]) {
        const previousImages = this.imageData;

        if (renderKeys.includes(RenderKeys.IMAGES)) {
            this.imageContainer.innerHTML =
                `<div class="${styles.imageContainer} ${styles.imageContainerSkeleton}"></div>`.repeat(
                    15
                );
        }

        const [tags, tweets] = await Promise.all([getTags(), getTweets()]);

        // Images that have all selected tags
        if (renderKeys.includes(RenderKeys.IMAGES)) {
            this.imageData = Object.keys(tags)
                .filter((tag) => this.selectedTags.includes(tag))
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
                            element: parseHTML(
                                imageTemplate({
                                    className: `${styles.imageContainer} ${
                                        !atSamePos && styles.imageContainerLoaded
                                    }`,
                                    href: `/poohcom1/status/${tweetId}`,
                                    src: image,
                                })
                            ),
                        };
                    })
                );
            this.imageContainer.innerHTML = '';
            this.imageContainer.append(...this.imageData.map((e) => e.element));
        }

        if (Object.keys(tags).length === 0) {
            this.imageContainer.innerHTML =
                '<div>No tags yet! Create one by clicking on the "..." menu of a tweet with images and selected "Tag Tweet"</div>';
        } else if (this.imageData.length === 0) {
            this.imageContainer.innerHTML = '<h3>Nothing to see here!</h3>';
        }

        // Menu item
        this.imageData.forEach((image) => {
            // Hover fx
            const tweetImages = this.imageData.filter((img) => img.tweetId === image.tweetId);

            const hoverFx = () => {
                if (this.lockHover) {
                    return;
                }

                document
                    .querySelectorAll('.' + styles.imageContainerHover)
                    .forEach((img) => img.classList.remove(styles.imageContainerHover));
                tweetImages.forEach((img) => img.element.classList.add(styles.imageContainerHover));
            };
            const unhoverFx = () => {
                if (this.lockHover) {
                    return;
                }

                tweetImages.forEach((img) =>
                    img.element.classList.remove(styles.imageContainerHover)
                );
            };

            const onDocumentClick = () => {
                this.lockHover = false;
                unhoverFx();
            };

            image.element.addEventListener('mouseover', hoverFx);
            image.element.addEventListener('mouseout', unhoverFx);

            image.element.addEventListener('contextmenu', () => {
                this.lockHover = false;
                hoverFx();
                this.lockHover = true;
                this.tagModal.hide();
            });
            document.addEventListener('click', onDocumentClick);

            this.cleanup.push(() => {
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
                customClass: styles.contextMenu,
                onClose: () => {
                    this.lockHover = false;
                    this.tagModal.hide();
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
                'hr',
                {
                    label: 'Edit tags',
                    iconHTML: createContextMenuIcon(tagPlusIcon),
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
                {
                    label: 'Remove tweet',
                    iconHTML: createContextMenuIcon(trashIcon),
                    callback: async () => {
                        if (confirm('Are you sure you want to remove this tweet from all tags?')) {
                            await removeTweet(image.tweetId);
                            this.rerender([RenderKeys.IMAGES, RenderKeys.TAGS]);
                        }
                        contextMenu.close();
                    },
                },
            ];

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
        if (!renderKeys.includes(RenderKeys.TAGS) && !renderKeys.includes(RenderKeys.IMAGES)) {
            return;
        }

        const [tags, tweets] = await Promise.all([getTags(), getTweets()]);
        const tagList = Object.keys(tags);

        tagList.sort((a, b) => a.localeCompare(b));

        const tagElements = tagList.map((tag) => {
            const active = this.selectedTags.includes(tag);
            const tweetCount = tags[tag].tweets
                .map((tweetId) => tweets[tweetId]?.images.length)
                .reduce((a, b) => a + b, 0);

            const button = parseHTML(
                tagButtonTemplate({
                    className: `${styles.tag} ${!active && styles.tagInactive}`,
                    icon: active ? checkSquareIcon : squareIcon,
                    text: `${formatTagName(tag)} (${tweetCount})`,
                })
            );
            const select = () => {
                if (this.selectedTags.length === 1 && this.selectedTags[0] === tag) {
                    this.selectedTags = [];
                } else {
                    this.selectedTags = [tag];
                }
                this.rerender([RenderKeys.IMAGES, RenderKeys.TAGS]);
            };

            const modifySelection = () => {
                if (active) {
                    this.selectedTags = this.selectedTags.filter((t) => t !== tag);
                } else {
                    this.selectedTags.push(tag);
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
                        label: 'Deselct all',
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
                            await deleteTag(tag);
                            this.rerender([RenderKeys.TAGS]);
                        },
                    },
                ],
            });

            return button;
        });

        this.tagsContainer.innerHTML = '';
        this.tagsContainer.append(...tagElements);
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
