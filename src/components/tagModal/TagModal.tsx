import { For, JSX, Match, Switch, createEffect, createSelector, createSignal } from 'solid-js';
import { Portal, render } from 'solid-js/web';
import styles from './tag-modal.module.scss';
import { SANITIZE_INFO, formatTagName, sanitizeTagName, verifyEvent } from '../../utils';
import { createStore, reconcile } from 'solid-js/store';
import { KEY_USER_DATA } from '../../constants';
import { RawUserData } from '../../models';
import { CACHE_UPDATE_EVENT, CacheUpdateEvent, gmGetWithCache } from '../../services/cache';
import { DEFAULT_USER_DATA, addTag, removeTag } from '../../services/storage';
import { dataManager } from '../../services/dataManager';
import { TagButton } from '../common/tagButton/TagButton';

// Props
export interface TagModalOptions {
    tweetId: string;
    tweetImages?: string[];
    position: { top: number; left: number; right: number; space: number };
}

interface TagModalProps {
    visible: TagModalOptions | null;
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

// Component
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
                            const visible = props.visible;
                            if (!visible) {
                                return;
                            }

                            const tagFilter = sanitizeTagName(getInputValue());
                            if (viewModel.tags.map((t) => t.tag).includes(tagFilter)) {
                                await handleTagClick(tagFilter);
                                setInputValue('');
                            } else {
                                await addTag(visible.tweetId, tagFilter, visible.tweetImages ?? []);
                                setInputValue('');
                            }
                        } else if (e.key === 'Escape') {
                            setInputValue('');
                        } else if (!verifyEvent(e)) {
                            e.preventDefault();
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
                    <Switch>
                        <Match
                            when={getInputValue() && viewModel.tags.filter(isFiltered).length === 0}
                        >
                            <div style="overflow: hidden; text-overflow: ellipsis; max-width: 200px">
                                Create a new tag: {formatTagName(getInputValue())}
                            </div>
                        </Match>
                        <Match when={viewModel.tags.length === 0}>No tags yet!</Match>
                    </Switch>
                </div>
            </div>
        </Portal>
    );
};

// Adapter
interface TagModalAdapter {
    show: (visible: TagModalOptions) => void;
    hide: () => void;
    setStyles: (styles: Partial<JSX.CSSProperties>) => void;
}

export function createTagModal(): TagModalAdapter {
    const [visible, setVisible] = createSignal<TagModalOptions | null>(null);
    const [styles, setStyles] = createSignal<Partial<JSX.CSSProperties>>({});

    render(() => <TagModal visible={visible()} style={styles()} />, document.body);

    return {
        show: (visible: TagModalOptions) => setVisible(visible),
        hide: () => setVisible(null),
        setStyles: (styles: Partial<JSX.CSSProperties>) => setStyles(styles),
    };
}

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
