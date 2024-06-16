import {
    Component,
    For,
    createEffect,
    createMemo,
    createSelector,
    createSignal,
    onMount,
} from 'solid-js';
import styles, { tag } from './tag-gallery.module.scss';
import { Title } from './components/Title';

import { Menu } from './components/Menu';
import { createTag } from '../../services/storage';
import { Svg } from '../templates/Svg';
import tagIcon from '/src/assets/tag.svg';
import deleteIcon from '/src/assets/delete.svg';
import squareIcon from '../../assets/square.svg';
import checkSquareIcon from '../../assets/check-square.svg';
import { formatTagName } from '../../utils';
import { TagButton as TagButton } from './components/TagButton';
import { ImageContainer, ImageProps } from './components/ImageContainer';
import TagModal from '../tagModal/TagModal';
import { createStore, reconcile } from 'solid-js/store';
import { KEY_USER_DATA } from '../../constants';
import { UserData, RawUserData, Tag } from '../../models';
import { CACHE_UPDATE_EVENT, CacheUpdateEvent, gmGetWithCache } from '../../services/cache';
import { dataManager } from '../../services/dataManager';

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

const TagGalleryTest = () => {
    const [viewModel, setViewModel] = createStore<GalleryView>({ tags: [], images: [] });

    const [getSelectedTags, setSelectedTags] = createSignal<string[]>([]);
    const [getOutlinedTweet, setOutlinedTweet] = createSignal<string | null>(null);

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

    const getTagModal = createMemo(() => new TagModal([styles.tagModal]));

    const isTagActive = createSelector<string[], string>(getSelectedTags, (tag, tags) =>
        tags.includes(tag)
    );
    const isImageOutlined = createSelector(getOutlinedTweet);

    return (
        <div class={styles.tagsGallery}>
            <Title />
            <div class={styles.optionsPanel}>
                <Svg svg={tagIcon} />
                <div class={styles.addTagContainer}>
                    <input
                        class={styles.addTag}
                        type="text"
                        placeholder="Press enter to create a tag..."
                    />
                    <button class={styles.addTagClear}>
                        <Svg svg={deleteIcon} />
                    </button>
                </div>
                <div class={styles.createTagHint} />
                <Menu />
            </div>
            <hr />
            <div class={styles.tagsContainer}>
                <For each={viewModel.tags}>
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
            </div>
            <div class={styles.imageGallery}>
                <For each={viewModel.images}>
                    {(imageView) => (
                        <ImageContainer
                            src={imageView.src}
                            tweetId={imageView.tweetId}
                            selectedTags={getSelectedTags()}
                            tags={imageView.tags}
                            tagModal={getTagModal()}
                            onMouseEnter={() => setOutlinedTweet(imageView.tweetId)}
                            onMouseLeave={() => setOutlinedTweet(null)}
                            outlined={isImageOutlined(imageView.tweetId)}
                            setLockHover={() => {}} // TODO
                        />
                    )}
                </For>
            </div>
        </div>
    );
};

export default TagGalleryTest;

function mapViewModel(rawUserData: RawUserData): GalleryView {
    const userData = dataManager.removeMetadata(rawUserData);
    const tags = Object.keys(userData.tags).map((tag) => ({
        tag,
        displayText: `${formatTagName(tag)} (${userData.tags[tag].tweets.length})`,
    }));
    const images = Object.keys(userData.tweets).map((tweetId) => ({
        tweetId: tweetId,
        src: userData.tweets[tweetId].images[0],
        tags: Object.keys(userData.tags).filter((tag) =>
            userData.tags[tag].tweets.includes(tweetId)
        ),
    }));
    return { tags: [...tags].sort(), images };
}
