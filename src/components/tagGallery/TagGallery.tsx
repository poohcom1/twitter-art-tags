import {
    For,
    Match,
    Show,
    Switch,
    createEffect,
    createSelector,
    createSignal,
    on,
    onCleanup,
} from 'solid-js';
import styles from './tag-gallery.module.scss';
import { Title } from './components/Title';
import { Menu } from './components/Menu';
import { Svg } from '../common/Svg';
import tagIcon from '/src/assets/tag.svg';
import deleteIcon from '/src/assets/delete.svg';
import { formatTagName, sanitizeTagName, sortFilter, verifyEvent } from '../../utils';
import { ImageContainer } from './components/ImageContainer';
import { UserData } from '../../models';
import { createUserDataStore, createTag } from '../../services/storage';
import { ImageModal } from './components/imageModal/ImageModal';
import { TagEdit } from './components/TagEdit';
import { TagModal, TagModalOptions } from '../tagModal/TagModal';

type TagView = {
    tag: string;
    displayText: string;
};
type ImageView = {
    src: string;
    tweetId: string;
    tags: string[];
    index: number;
};
type GalleryView = {
    tags: TagView[];
    images: ImageView[];
};

const ID = 'tag-gallery';

export const TagGallery = () => {
    const viewModel = createUserDataStore({ tags: [], images: [] }, () => mapViewModel);

    const [getSelectedTags, setSelectedTags] = createSignal<string[]>([]);
    const [getOutlinedTweet, setOutlinedTweet] = createSignal<string | null>(null);
    const [getOutlineLocked, setOutlineLocked] = createSignal<boolean>(false);
    const [getTagFilter, setTagFilter] = createSignal<string>('');
    const [getCurrentModalImage, setCurrentModalImage] = createSignal<number>(-1);

    const [getTagModalVisible, setTagModalVisible] = createSignal<TagModalOptions | null>(null);

    let actualHoverElement: ImageView | null = null;

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
    createEffect(() => {
        // Fix edge case where one of the selected tags is removed
        const tags = viewModel.tags;
        const tagList = tags.map((t) => t.tag);
        const selectedTags = getSelectedTags();
        const existingSelectedTags = selectedTags.filter((tag) => tagList.includes(tag));
        if (selectedTags.length !== existingSelectedTags.length) {
            setSelectedTags(existingSelectedTags);
        }
    });

    const isTagActive = createSelector<string[], string>(getSelectedTags, (tag, tags) =>
        tags.includes(tag)
    );
    const isImageOutlined = createSelector(getOutlinedTweet);
    const isTagFiltered = createSelector<string, TagView>(getTagFilter, (tag, filter) => {
        return tag.tag === '' || tag.tag.toLowerCase().includes(filter.toLowerCase());
    });
    const isImageSelected = createSelector<string[], ImageView>(
        getSelectedTags,
        (image, tags) => tags.length === 0 || tags.every((tag) => image.tags.includes(tag))
    );
    const isImageShown = createSelector<string[], number>(
        getSelectedTags,
        (ind) => ind < getDisplayedImages()
    );

    const currentTags = () =>
        viewModel.tags
            .filter(isTagFiltered)
            .sort((a, b) => sortFilter(getTagFilter())(a.tag, b.tag));
    const currentImages = () =>
        viewModel.images.filter(isImageSelected).filter((_, ind) => isImageShown(ind));

    // Very basic virtualization
    const IMAGE_LOAD_COUNT = 30;
    const [getDisplayedImages, setDisplayedImages] = createSignal<number>(Infinity);
    let loadMoreRef!: HTMLDivElement;
    createEffect(
        on(
            getSelectedTags,
            () => {
                setDisplayedImages(IMAGE_LOAD_COUNT);
            },
            { defer: true }
        )
    );
    createEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (
                        entry.isIntersecting &&
                        getDisplayedImages() < viewModel.images.filter(isImageSelected).length
                    ) {
                        setDisplayedImages((prev) => prev + IMAGE_LOAD_COUNT);
                    }
                });
            },
            {
                rootMargin: '100px 0px 100px 0px',
            }
        );
        observer.observe(loadMoreRef);
        onCleanup(() => observer.disconnect());
    });

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
                            } else if (!verifyEvent(e)) {
                                e.preventDefault();
                            }
                        }}
                        class={styles.addTag}
                        type="text"
                        placeholder="Press enter to create a tag..."
                    />
                    <button
                        onClick={() => setTagFilter('')}
                        class={styles.addTagClear}
                        tabIndex={-1}
                    >
                        <Svg svg={deleteIcon} />
                    </button>
                </div>
                <div class={styles.createTagHint} />
                <Menu />
            </div>
            <hr />
            <div class={styles.tagsContainer}>
                <For each={currentTags()}>
                    {(tagView) => (
                        <TagEdit
                            showIcon
                            tag={tagView.tag}
                            displayText={tagView.displayText}
                            active={isTagActive(tagView.tag)}
                            onSelect={() => {
                                if (isTagActive(tagView.tag) && getSelectedTags().length === 1)
                                    setSelectedTags([]);
                                else setSelectedTags([tagView.tag]);
                                setTagFilter(''); // Clear on click
                            }}
                            onShiftSelect={() => {
                                if (isTagActive(tagView.tag))
                                    setSelectedTags(
                                        getSelectedTags().filter((t) => t !== tagView.tag)
                                    );
                                else setSelectedTags([...getSelectedTags(), tagView.tag]);
                                setTagFilter(''); // Clear on click
                            }}
                            onDeselectAll={() => setSelectedTags([])}
                            onContextMenu={() => setTagModalVisible(null)}
                        />
                    )}
                </For>
                <Show
                    when={
                        viewModel.tags.length > 0 &&
                        viewModel.tags.filter(isTagFiltered).length === 0 &&
                        !viewModel.tags.map((t) => t.tag).includes(getTagFilter())
                    }
                >
                    <div class={styles.clearFilters}>
                        <span class={styles.clearFiltersButton} onClick={() => setTagFilter('')}>
                            Clear filters
                        </span>
                        <span style={{ opacity: 0.7 }}>
                            <i>or</i> Press Enter to create tag:
                        </span>
                        <strong>{formatTagName(getTagFilter())}</strong>
                    </div>
                </Show>
            </div>
            <div class={styles.imagesContainer}>
                <For each={currentImages()}>
                    {(imageView, index) => (
                        <ImageContainer
                            src={imageView.src}
                            tweetId={imageView.tweetId}
                            selectedTags={getSelectedTags()}
                            tags={imageView.tags}
                            showTagCount={imageView.index === 0}
                            onClick={() => {
                                if (getOutlineLocked()) return;
                                setCurrentModalImage(index);
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
                                setTagModalVisible(null);
                            }}
                            onTagSelected={setSelectedTags}
                            onTagModalShow={setTagModalVisible}
                            onTagModalHide={() => setTagModalVisible(null)}
                            outlined={isImageOutlined(imageView.tweetId)}
                            setLockHover={setOutlineLocked}
                        />
                    )}
                </For>
                <div ref={loadMoreRef} />
                <div class={styles.noImages}>
                    <Switch>
                        <Match when={viewModel.tags.length === 0}>
                            <h3>No tags yet!</h3>
                            <br />
                            <div>
                                Tag a tweet by clicking on the ... menu and selecting{' '}
                                <strong>Tag Tweet</strong>
                            </div>
                        </Match>
                        <Match when={currentImages().length === 0}>
                            <h3>Nothing to see here!</h3>
                            <br />
                            <div class={styles.clearButton} onClick={() => setSelectedTags([])}>
                                Clear Tags
                            </div>
                        </Match>
                    </Switch>
                </div>
            </div>
            <ImageModal
                visible={getCurrentModalImage() >= 0}
                images={currentImages().map((i) => i.src)}
                index={getCurrentModalImage()}
                tweetId={currentImages()[getCurrentModalImage()]?.tweetId || ''}
                tags={currentImages()[getCurrentModalImage()]?.tags || []}
                onTagClick={(tag) => {
                    setSelectedTags([tag]);
                    setCurrentModalImage(-1);
                }}
                onClose={() => setCurrentModalImage(-1)}
                onLeft={() => setCurrentModalImage(Math.max(0, getCurrentModalImage() - 1))}
                onRight={() =>
                    setCurrentModalImage(
                        Math.min(currentImages().length - 1, getCurrentModalImage() + 1)
                    )
                }
            />
            <TagModal visible={getTagModalVisible()} class={styles.tagModal} />
        </div>
    );
};

export const tagGalleryExists = () => document.getElementById(ID) !== null;

function mapViewModel(userData: UserData): GalleryView {
    const tags = Object.keys(userData.tags).map((tag) => ({
        tag,
        displayText: `${formatTagName(tag)} (${userData.tags[tag].tweets.length})`,
    }));
    const images = Object.keys(userData.tweets)
        .flatMap((tweetId) =>
            userData.tweets[tweetId].images
                .map((src, index) => ({
                    tweetId: tweetId,
                    src,
                    tags: Object.keys(userData.tags)
                        .filter((tag) => userData.tags[tag].tweets.includes(tweetId))
                        .sort(),
                    index,
                }))
                .reverse()
        )
        .reverse();
    return { tags: [...tags].sort((a, b) => a.tag.localeCompare(b.tag)), images };
}
