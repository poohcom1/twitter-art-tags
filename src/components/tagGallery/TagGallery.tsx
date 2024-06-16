import {
    For,
    Match,
    Show,
    Switch,
    createEffect,
    createMemo,
    createSelector,
    createSignal,
} from 'solid-js';
import styles from './tag-gallery.module.scss';
import { Title } from './components/Title';

import { Menu } from './components/Menu';
import { Svg } from '../templates/Svg';
import tagIcon from '/src/assets/tag.svg';
import deleteIcon from '/src/assets/delete.svg';
import { formatTagName } from '../../utils';
import { TagButton as TagButton } from './components/TagButton';
import { ImageContainer } from './components/ImageContainer';
import TagModal from '../tagModal/TagModal';
import { createStore, reconcile } from 'solid-js/store';
import { KEY_USER_DATA } from '../../constants';
import { RawUserData } from '../../models';
import { CACHE_UPDATE_EVENT, CacheUpdateEvent, gmGetWithCache } from '../../services/cache';
import { dataManager } from '../../services/dataManager';
import ImageModal from '../imageModal/ImageModal';
import { createTag, sanitizeTagName, tagExists } from '../../services/storage';

const DEFAULT_USER_DATA: RawUserData = {
    tags: {},
    tweets: {},
};

type TagView = {
    tag: string;
    displayText: string;
};
type ImageView = {
    src: string;
    tweetId: string;
    tags: string[];
};
type GalleryView = {
    tags: TagView[];
    images: ImageView[];
};

const ID = 'tag-gallery';

export const TagGallery = () => {
    const [viewModel, setViewModel] = createStore<GalleryView>({ tags: [], images: [] });

    const [getSelectedTags, setSelectedTags] = createSignal<string[]>([]);
    const [getOutlinedTweet, setOutlinedTweet] = createSignal<string | null>(null);
    const [getOutlineLocked, setOutlineLocked] = createSignal<boolean>(false);
    const [getTagFilter, setTagFilter] = createSignal<string>('');

    const getTagModal = createMemo(() => new TagModal([styles.tagModal]));
    const getImageModal = createMemo(() => new ImageModal());

    let actualHoverElement: ImageView | null = null;

    // Store update
    createEffect(() => {
        GM.getValue<RawUserData>(KEY_USER_DATA, DEFAULT_USER_DATA).then((data) => {
            if (data) {
                setViewModel(reconcile(mapViewModel(data)));
            }
        });

        document.addEventListener(CACHE_UPDATE_EVENT, async (e) => {
            if ((e as CacheUpdateEvent).detail.key === KEY_USER_DATA) {
                const data = await gmGetWithCache<RawUserData>(KEY_USER_DATA, DEFAULT_USER_DATA);
                if (data) {
                    setViewModel(reconcile(mapViewModel(data)));
                }
            }
        });
    });

    // Outline/Hover lock
    createEffect(() => {
        const onDocumentClick = () => {
            setOutlineLocked(false);
            if (actualHoverElement) {
                setOutlinedTweet(actualHoverElement.tweetId);
            } else {
                setOutlinedTweet(null);
            }
        };
        document.addEventListener('click', onDocumentClick);
        return () => document.removeEventListener('click', onDocumentClick);
    });

    const isTagActive = createSelector<string[], string>(getSelectedTags, (tag, tags) =>
        tags.includes(tag)
    );
    const isImageOutlined = createSelector(getOutlinedTweet);

    const isTagFiltered = createSelector<string, TagView>(
        getTagFilter,
        (tag, filter) => tag.tag === '' || tag.tag.toLowerCase().includes(filter.toLowerCase())
    );
    const isImageSelected = createSelector<string[], ImageView>(
        getSelectedTags,
        (image, tags) => tags.length === 0 || tags.every((tag) => image.tags.includes(tag))
    );

    return (
        <div id={ID} class={styles.tagsGallery}>
            <Title />
            <div class={styles.optionsPanel}>
                <Svg svg={tagIcon} />
                <div class={styles.addTagContainer}>
                    <input
                        value={getTagFilter()}
                        onInput={(e) => setTagFilter((e.target as HTMLInputElement).value)}
                        onKeyDown={async (e) => {
                            if (e.key === 'Enter') {
                                const tagFilter = sanitizeTagName(getTagFilter());
                                if (viewModel.tags.map((t) => t.tag).includes(tagFilter)) {
                                    setSelectedTags([tagFilter]);
                                    setTagFilter('');
                                    return;
                                } else {
                                    createTag(tagFilter);
                                    setTagFilter('');
                                }
                            } else if (e.key === 'Escape') {
                                setTagFilter('');
                            }
                        }}
                        class={styles.addTag}
                        type="text"
                        placeholder="Press enter to create a tag..."
                    />
                    <button onClick={() => setTagFilter('')} class={styles.addTagClear}>
                        <Svg svg={deleteIcon} />
                    </button>
                </div>
                <div class={styles.createTagHint} />
                <Menu />
            </div>
            <hr />
            <div class={styles.tagsContainer}>
                <For each={viewModel.tags.filter(isTagFiltered)}>
                    {(tagView) => (
                        <TagButton
                            tag={tagView.tag}
                            displayText={tagView.displayText}
                            active={isTagActive(tagView.tag)}
                            onSelect={() => {
                                if (isTagActive(tagView.tag) && getSelectedTags().length === 1)
                                    setSelectedTags([]);
                                else setSelectedTags([tagView.tag]);
                            }}
                            onShiftSelect={() => {
                                if (isTagActive(tagView.tag))
                                    setSelectedTags(
                                        getSelectedTags().filter((t) => t !== tagView.tag)
                                    );
                                else setSelectedTags([...getSelectedTags(), tagView.tag]);
                            }}
                            onDeselectAll={() => setSelectedTags([])}
                        />
                    )}
                </For>
                <Switch>
                    <Match
                        when={
                            viewModel.tags.length > 0 &&
                            viewModel.tags.filter(isTagFiltered).length === 0
                        }
                    >
                        <div class={styles.clearFilters}>
                            Nothing to see here!{' '}
                            <span
                                class={styles.clearFiltersButton}
                                onClick={() => setTagFilter('')}
                            >
                                Clear filters
                            </span>
                        </div>
                    </Match>
                </Switch>
            </div>
            <div class={styles.imagesContainer}>
                <For each={viewModel.images.filter(isImageSelected)}>
                    {(imageView, index) => (
                        <ImageContainer
                            src={imageView.src}
                            tweetId={imageView.tweetId}
                            selectedTags={getSelectedTags()}
                            tags={imageView.tags}
                            tagModal={getTagModal()}
                            onClick={() => {
                                if (getOutlineLocked()) return;
                                getImageModal().show(
                                    viewModel.images.map((i) => i.src),
                                    index()
                                );
                            }}
                            onMouseEnter={() => {
                                actualHoverElement = imageView;
                                if (getOutlineLocked()) return;
                                setOutlinedTweet(imageView.tweetId);
                            }}
                            onMouseLeave={() => {
                                if (actualHoverElement === imageView) actualHoverElement = null;
                                if (getOutlineLocked()) return;
                                setOutlinedTweet(null);
                            }}
                            onContextMenu={() => {
                                setOutlinedTweet(imageView.tweetId);
                                setOutlineLocked(true);
                                getTagModal().hide();
                            }}
                            outlined={isImageOutlined(imageView.tweetId)}
                            setLockHover={setOutlineLocked}
                        />
                    )}
                </For>
                <div class={styles.noImages}>
                    <Switch>
                        <Match when={viewModel.tags.length === 0}>
                            <h3>No tags yet!</h3>
                            <br />
                            <div>
                                Tag a tweet by clicking on the ... menu and selected{' '}
                                <strong>Tag Tweet</strong>
                            </div>
                        </Match>
                        <Match when={viewModel.images.filter(isImageSelected).length === 0}>
                            <h3>Nothing to see here!</h3>
                            <br />
                            <div class={styles.clearButton} onClick={() => setSelectedTags([])}>
                                Clear Tags
                            </div>
                        </Match>
                    </Switch>
                </div>
            </div>
        </div>
    );
};

export const tagGalleryExists = () => document.getElementById(ID) !== null;

function mapViewModel(rawUserData: RawUserData): GalleryView {
    const userData = dataManager.removeMetadata(rawUserData);
    const tags = Object.keys(userData.tags).map((tag) => ({
        tag,
        displayText: `${formatTagName(tag)} (${userData.tags[tag].tweets.length})`,
    }));
    const images = Object.keys(userData.tweets).flatMap((tweetId) =>
        userData.tweets[tweetId].images.map((src) => ({
            tweetId: tweetId,
            src,
            tags: Object.keys(userData.tags).filter((tag) =>
                userData.tags[tag].tweets.includes(tweetId)
            ),
        }))
    );
    return { tags: [...tags].sort((a, b) => a.tag.localeCompare(b.tag)), images };
}
