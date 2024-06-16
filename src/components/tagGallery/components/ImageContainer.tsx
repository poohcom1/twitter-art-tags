import { createEffect, createMemo } from 'solid-js';
import styles, { tag } from '../tag-gallery.module.scss';
import TagModal from '../../tagModal/TagModal';
import tagIcon from '/src/assets/tag.svg';
import eyeIcon from '/src/assets/eye.svg';
import tagCheckIcon from '/src/assets/file-check.svg';
import tagMinusIcon from '/src/assets/file-minus.svg';
import externalLinkIcon from '/src/assets/link-external.svg';
import pencilIcon from '/src/assets/pencil.svg';
import trashIcon from '/src/assets/trash.svg';
import squareIcon from '/src/assets/square.svg';
import checkSquareIcon from '/src/assets/check-square.svg';
import { formatTagName, parseHTML } from '../../../utils';
import { removeTag, removeTweet } from '../../../services/storage';
import { image } from '../../imageModal/image-modal.module.scss';
import { UserData } from '../../../models';

export interface ImageProps {
    tweetId: string;
    src: string;
    tagModal: TagModal;
    selectedTags: string[];
    tags: string[];
    outlined: boolean;
    setLockHover: (lock: boolean) => void;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
    key?: string;
}

export const ImageContainer = (props: ImageProps) => {
    let ref: HTMLElement;

    createEffect(() => {
        console.log('image rerender');
        const contextMenu = new VanillaContextMenu({
            scope: ref,
            transitionDuration: 0,
            menuItems: [],
            normalizePosition: true,
            customNormalizeScope: document.querySelector<HTMLElement>('main')!
                .firstElementChild as HTMLElement,
            openSubMenuOnHover: true,
            preventCloseOnClick: true,
            customClass: styles.contextMenu,
            onClose: () => {
                props.setLockHover?.(false);
                props.tagModal.hide();
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

                    props.tagModal.show(props.tweetId, [props.src], {
                        top: rect.top, // don't spread
                        right: rect.right,
                        left: rect.left,
                        space: 1,
                    });
                },
            },
        ];

        if (props.selectedTags.length === 1) {
            menuItems.push({
                label: `Untag ${formatTagName(props.selectedTags[0])}`,
                iconHTML: createContextMenuIcon(tagMinusIcon),
                callback: async () => {
                    await removeTag(props.tweetId, props.selectedTags[0]);
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
                        await removeTweet(props.tweetId);
                    }
                    contextMenu.close();
                },
            },
            'hr',
            {
                label: 'Open tweet',
                iconHTML: createContextMenuIcon(externalLinkIcon),
                callback: () => {
                    window.open(`/poohcom1/status/${props.tweetId}`, '_blank');
                    contextMenu.close();
                },
            },
            {
                label: 'Open image',
                iconHTML: createContextMenuIcon(eyeIcon),
                callback: () => {
                    window.open(props.src, '_blank');
                    contextMenu.close();
                },
            }
        );

        const tagsMenu: MenuItem[] = props.tags.map((tag) => ({
            label: formatTagName(tag),
            iconHTML: createContextMenuIcon(tagIcon),
            callback: async () => {
                if (!(props.selectedTags.length === 1 && props.selectedTags[0] === tag)) {
                    // If not already selected
                    props.selectedTags = [tag];
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

    return (
        <a
            onMouseEnter={props.onMouseEnter}
            onMouseLeave={props.onMouseLeave}
            ref={(el) => (ref = el)}
            class={`${styles.imageContainer} ${props.outlined && styles.imageContainerHover}`}
            // href={`https://x.com/x/status/${tweetId}`}
            target="_blank"
            rel="noreferrer"
        >
            <img src={props.src} loading="lazy" />
        </a>
    );
};

// TODO: Refactor to use jsx
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
