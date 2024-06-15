import { Component, createEffect, createMemo, createSignal, onMount } from 'solid-js';
import styles from './tag-gallery.module.scss';
import { Title } from './components/Title';

import { Menu } from './components/Menu';
import { createTag } from '../../services/storage';
import { Svg } from '../templates/Svg';
import tagIcon from '/src/assets/tag.svg';
import deleteIcon from '/src/assets/delete.svg';
import squareIcon from '../../assets/square.svg';
import checkSquareIcon from '../../assets/check-square.svg';
import { formatTagName } from '../../utils';
import { Tag } from './components/Tag';
import { ImageContainer } from './components/ImageContainer';
import TagModal from '../tagModal/TagModal';
import { createStore, reconcile } from 'solid-js/store';
import { KEY_USER_DATA } from '../../constants';
import { UserData, RawUserData } from '../../models';
import { CACHE_UPDATE_EVENT, CacheUpdateEvent, gmGetWithCache } from '../../services/cache';
import { dataManager } from '../../services/dataManager';

const DEFAULT_USER_DATA: RawUserData = {
    tags: {},
    tweets: {},
};

const TagGalleryTest = () => {
    const [getSelectedTags, setSelectedTags] = createSignal<string[]>([]);
    const [userData, setUserData] = createStore<UserData>(DEFAULT_USER_DATA);

    createEffect(() => {
        GM.getValue<RawUserData>(KEY_USER_DATA, DEFAULT_USER_DATA).then((data) => {
            if (data) {
                setUserData(reconcile(dataManager.removeMetadata(data)));
            }
        });

        document.addEventListener(CACHE_UPDATE_EVENT, async (e) => {
            if ((e as CacheUpdateEvent).detail.key === KEY_USER_DATA) {
                setUserData(
                    reconcile(
                        dataManager.removeMetadata(
                            await gmGetWithCache<RawUserData>(KEY_USER_DATA, DEFAULT_USER_DATA)
                        )
                    )
                );
            }
        });
    });

    const getTagModal = createMemo(() => new TagModal([styles.tagModal]));

    const tagElements = createMemo(() =>
        Object.keys(userData.tags)
            .sort()
            .map((tag) => {
                const tweetsCount = Object.keys(userData.tags[tag].tweets).length;
                const active = getSelectedTags().includes(tag);
                return (
                    <Tag
                        tag={tag}
                        displayText={`${formatTagName(tag)} (${tweetsCount})`}
                        active={active}
                        onSelect={() => {
                            if (active && getSelectedTags().length === 1) setSelectedTags([]);
                            else setSelectedTags([tag]);
                        }}
                        onShiftSelect={() => {
                            if (active) setSelectedTags(getSelectedTags().filter((t) => t !== tag));
                            else setSelectedTags([...getSelectedTags(), tag]);
                        }}
                        onDeselectAll={() => setSelectedTags([])}
                    />
                );
            })
    );

    const imageElements = createMemo(() => {
        const { tweets, tags } = userData;
        const tweetIds = Object.keys(tags)
            .filter((tag) => getSelectedTags().includes(tag))
            .reduce(
                (acc, tag) => acc.filter((tweetId) => tags[tag].tweets.includes(tweetId)),
                Object.keys(tweets)
            )
            .reverse()
            .filter((tweetId) => tweetId in tweets);

        const allImages = tweetIds.flatMap((tweetId) => tweets[tweetId].images);
        return tweetIds.flatMap((tweetId) =>
            tweets[tweetId].images.map((src, ind) => {
                const tweetTags = createMemo(() =>
                    Object.keys(userData.tags).filter((tag) => tags[tag].tweets.includes(tweetId))
                );
                return (
                    <ImageContainer
                        tags={tweetTags()}
                        tweetId={tweetId}
                        src={src}
                        tagModal={getTagModal()}
                        selectedTags={getSelectedTags()}
                        setLockHover={() => {}} // TODO
                    />
                );
            })
        );
    });

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
            <div class={styles.tagsContainer}>{tagElements()}</div>
            <div class={styles.imageGallery}>{imageElements()}</div>
        </div>
    );
};

export default TagGalleryTest;
