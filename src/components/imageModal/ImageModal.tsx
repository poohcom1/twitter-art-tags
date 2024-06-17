import { Portal } from 'solid-js/web';
import { Svg } from '../templates/Svg';
import styles from './image-modal.module.scss';
import tagGalleryStyiles from '../tagGallery/tag-gallery.module.scss';
import leftArrow from '/src/assets/arrow-left.svg';
import rightArrow from '/src/assets/arrow-right.svg';
import menu from '/src/assets/dot-menu.svg';
import close from '/src/assets/x-close.svg';
import { For, createEffect, createMemo, onCleanup, onMount } from 'solid-js';
import { TagButton } from '../tagGallery/components/TagButton';
import { formatTagName } from '../../utils';
import TagModal from '../tagModal/TagModal';

interface ImageModalProps {
    visible: boolean;
    tweetId: string;
    images: string[];
    index: number;
    tags: string[];
    onClose: () => void;
    onLeft?: () => void;
    onRight?: () => void;
}

export const ImageModal = (props: ImageModalProps) => {
    const getTagModal = createMemo(() => new TagModal([tagGalleryStyiles.tagModal]));

    createEffect(() => {
        if (props.visible) {
            document.documentElement.style.overflowY = 'hidden';
        } else {
            document.documentElement.style.overflowY = 'scroll';
        }

        return () => (document.documentElement.style.overflowY = 'scroll');
    });

    // Shortcut
    const handleKeyDown = (e: KeyboardEvent) => {
        if (props.visible) {
            if (e.key === 'Escape') {
                props.onClose();
            }
            if ((e.key === 'ArrowLeft' || (e.shiftKey && e.key === 'Tab')) && props.index > 0) {
                e.preventDefault();
                props.onLeft?.();
            }
            if (
                (e.key === 'ArrowRight' || e.key === 'Tab') &&
                props.index < props.images.length - 1
            ) {
                e.preventDefault();
                props.onRight?.();
            }
        }
    };
    onMount(() => document.addEventListener('keydown', handleKeyDown));
    onCleanup(() => document.removeEventListener('keydown', handleKeyDown));

    return (
        <Portal>
            <div
                class={`${styles.modalContainer} ${props.visible && styles.modalContainerShow}`}
                onClick={() => getTagModal().hide()}
            >
                <div
                    class={styles.overlay}
                    onClick={() => {
                        if (getTagModal().isVisible()) return;
                        props.onClose();
                    }}
                />
                <div
                    class={`${styles.arrowContainer} ${styles.arrowContainerLeft}`}
                    style={props.index <= 0 ? { opacity: 0.5 } : {}}
                    onClick={props.onLeft}
                >
                    <Svg svg={leftArrow} />
                </div>
                <img class={styles.image} src={props.images[props.index]} />
                <div
                    class={styles.menuButton}
                    onClick={(e) => {
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();

                        getTagModal().show(props.tweetId, [], {
                            // don't spread
                            top: rect.top + 10,
                            right: rect.right,
                            left: rect.left,
                            space: 1,
                        });
                    }}
                >
                    <Svg svg={menu} />
                </div>
                <div class={styles.closeButton} onClick={props.onClose}>
                    <Svg svg={close} />
                </div>
                <div
                    class={styles.tagsContainer}
                    onClick={() => {
                        if (getTagModal().isVisible()) return;
                        props.onClose();
                    }}
                >
                    <div class={styles.innerTagsContainer} onClick={(e) => e.stopPropagation()}>
                        <For each={props.tags}>
                            {(tag) => (
                                <TagButton active tag={tag} displayText={formatTagName(tag)} />
                            )}
                        </For>
                    </div>
                </div>
                <div
                    class={`${styles.arrowContainer} ${styles.arrowContainerRight}`}
                    style={props.index >= props.images.length - 1 ? { opacity: 0.5 } : {}}
                    onClick={props.onRight}
                >
                    <Svg svg={rightArrow} />
                </div>
            </div>
        </Portal>
    );
};
