import { For, JSX, Show, createEffect, createSelector, createSignal } from 'solid-js';
import { Portal } from 'solid-js/web';
import styles from './tag-modal.module.scss';
import { SANITIZE_INFO, formatTagName } from '../../utils';
import { createStore, reconcile } from 'solid-js/store';
import { KEY_USER_DATA } from '../../constants';
import { RawUserData } from '../../models';
import { CACHE_UPDATE_EVENT, CacheUpdateEvent, gmGetWithCache } from '../../services/cache';
import {
    DEFAULT_USER_DATA,
    addTag,
    createTag,
    removeTag,
    sanitizeTagName,
} from '../../services/storage';
import { dataManager } from '../../services/dataManager';
import { TagButton } from '../common/TagButton';

// Props
export interface TagModalVisible {
    tweetId: string;
    tweetImages?: string[];
    position: { top: number; left: number; right: number; space: number };
}

interface TagModalProps {
    visible: TagModalVisible | null;
    class?: string;
    style?: Partial<JSX.CSSProperties>;
}

// Store
interface TagViewModel {
    tag: string;
    tagged: boolean;
}

interface TagModalViewModel {
    tags: TagViewModel[];
}

export const TagModal = (props: TagModalProps) => {
    const [viewModel, setViewModel] = createStore<TagModalViewModel>({ tags: [] });

    const [getInputValue, setInputValue] = createSignal('');

    let tagModalRef!: HTMLDivElement;
    let inputRef!: HTMLInputElement;

    createEffect(() => {
        const visible = props.visible;
        if (!visible) {
            return;
        }

        // Store
        GM.getValue<RawUserData>(KEY_USER_DATA, DEFAULT_USER_DATA).then((data) => {
            if (data) {
                setViewModel(reconcile(mapViewModel(data, visible.tweetId)));
            }
        });
        document.addEventListener(CACHE_UPDATE_EVENT, async (e) => {
            if ((e as CacheUpdateEvent).detail.key === KEY_USER_DATA) {
                const data = await gmGetWithCache<RawUserData>(KEY_USER_DATA, DEFAULT_USER_DATA);
                if (data) {
                    setViewModel(reconcile(mapViewModel(data, visible.tweetId)));
                }
            }
        });

        // Positioning
        const position = visible.position;
        const modalRightEdge = position.right + tagModalRef.offsetWidth + position.space + 10;
        const modalBottomEdge = position.top + tagModalRef.offsetHeight;

        // Get the current scroll positions
        const scrollLeft = document.documentElement.scrollLeft;
        const scrollTop = document.documentElement.scrollTop;

        if (modalRightEdge > window.innerWidth + scrollLeft) {
            tagModalRef.style.left = `${
                position.left - tagModalRef.offsetWidth - position.space
            }px`;
        } else {
            tagModalRef.style.left = `${position.right + position.space}px`;
        }

        if (modalBottomEdge > window.innerHeight) {
            tagModalRef.style.top = `${
                position.top - (modalBottomEdge - (window.innerHeight + scrollTop))
            }px`;
        } else {
            tagModalRef.style.top = `${position.top + scrollTop}px`;
        }

        inputRef.focus();
    });

    const handleTagClick = async (tagName: string) => {
        const visible = props.visible;
        if (!visible) {
            return;
        }
        if (visible.tweetId === null) {
            console.error('No tweet selected');
            return;
        }

        if (viewModel.tags.find((tag) => tag.tag === tagName)?.tagged) {
            await removeTag(visible.tweetId, tagName);
        } else {
            await addTag(visible.tweetId, tagName, visible.tweetImages ?? []);
        }

        inputRef.focus();
    };

    const isFiltered = createSelector<string, TagViewModel>(
        getInputValue,
        (tag, input) => input === '' || tag.tag.toLowerCase().includes(input.toLowerCase())
    );

    return (
        <Portal>
            <div
                ref={tagModalRef}
                class={`${styles.tagModal} ${props.class}`}
                style={{ ...props.style, display: props.visible ? 'block' : 'none' }}
                on:click={(e) => e.stopPropagation()}
            >
                <input
                    ref={inputRef}
                    value={getInputValue()}
                    onInput={(e) => setInputValue(e.currentTarget.value)}
                    onKeyDown={async (e) => {
                        if (e.key === 'Enter') {
                            const tagFilter = sanitizeTagName(getInputValue());
                            if (viewModel.tags.map((t) => t.tag).includes(tagFilter)) {
                                await handleTagClick(tagFilter);
                                setInputValue('');
                            } else {
                                createTag(tagFilter);
                                setInputValue('');
                            }
                        } else if (e.key === 'Escape') {
                            setInputValue('');
                        }
                    }}
                    class={styles.tagInput}
                    type="text"
                    placeholder="Add a tag"
                    maxlength={SANITIZE_INFO.maxLength}
                />
                <div class={styles.tagsContainer}>
                    <For each={viewModel.tags.filter(isFiltered)}>
                        {(tagView) => (
                            <TagButton
                                showIcon
                                active={tagView.tagged}
                                tag={tagView.tag}
                                onClick={() => handleTagClick(tagView.tag)}
                                displayText={formatTagName(tagView.tag)}
                            />
                        )}
                    </For>
                    <Show when={viewModel.tags.length === 0}>No tags yet!</Show>
                    <Show when={viewModel.tags.filter(isFiltered).length === 0}>
                        <div style="overflow: hidden; text-overflow: ellipsis; max-width: 200px">
                            Create a new tag: {formatTagName(getInputValue())}
                        </div>
                    </Show>
                </div>
            </div>
        </Portal>
    );
};

function mapViewModel(rawUserData: RawUserData, tweetId: string): TagModalViewModel {
    const userData = dataManager.removeMetadata(rawUserData);
    const { tags } = userData;
    const tagViewModels = Object.keys(tags)
        .sort()
        .map((tag) => ({
            tag,
            tagged: tags[tag].tweets.includes(tweetId),
        }));

    return { tags: tagViewModels };
}
