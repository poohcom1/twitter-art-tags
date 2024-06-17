import { Portal } from 'solid-js/web';
import { Svg } from '../../../common/Svg';
import styles from './image-modal.module.scss';
import tagGalleryStyles from '../../tag-gallery.module.scss';
import leftArrow from '/src/assets/arrow-left.svg';
import rightArrow from '/src/assets/arrow-right.svg';
import menu from '/src/assets/dot-menu.svg';
import close from '/src/assets/x-close.svg';
import { For, createEffect, createMemo, createSignal, onCleanup, onMount } from 'solid-js';
import { TagButton } from '../../../common/tagButton/TagButton';
import { formatTagName } from '../../../../utils';
import { TagModal, TagModalOptions } from '../../../tagModal/TagModal';

interface ImageModalProps {
    visible: boolean;
    tweetId: string;
    images: string[];
    index: number;
    tags: string[];
    onClose: () => void;
    onLeft?: () => void;
    onRight?: () => void;
    onTagClick: (tag: string) => void;
}

export const ImageModal = (props: ImageModalProps) => {
    const [getTagModalVisible, setTagModalVisible] = createSignal<TagModalOptions | null>(null);

    createEffect(() => {
        if (props.visible) {
            document.documentElement.style.overflowY = 'hidden';
        } else {
            document.documentElement.style.overflowY = 'scroll';
            setTagModalVisible(null);
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
        <>
            <TagModal class={tagGalleryStyles.tagModal} visible={getTagModalVisible()} />
            <Portal>
                <div
                    class={`${styles.modalContainer} ${props.visible && styles.modalContainerShow}`}
                    onClick={() => setTagModalVisible(null)}
                >
                    <div
                        class={styles.overlay}
                        onClick={() => {
                            if (!!getTagModalVisible()) return;
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
                            e.stopPropagation();
                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();

                            if (!getTagModalVisible())
                                setTagModalVisible({
                                    position: {
                                        top: rect.top + 10,
                                        right: rect.right,
                                        left: rect.left,
                                        space: 1,
                                    },
                                    tweetId: props.tweetId,
                                });
                            else setTagModalVisible(null);
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
                            if (!!getTagModalVisible()) return;
                            props.onClose();
                        }}
                    >
                        <div class={styles.innerTagsContainer} onClick={(e) => e.stopPropagation()}>
                            <For each={props.tags}>
                                {(tag) => (
                                    <TagButton
                                        active
                                        tag={tag}
                                        onClick={() => props.onTagClick(tag)}
                                        displayText={formatTagName(tag)}
                                    />
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
        </>
    );
};
