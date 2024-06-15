import { Component, createEffect, createMemo, createSignal, onMount } from 'solid-js';
import styles from './tag-gallery.module.scss';
import { Title } from './components/Title';

import { template } from 'solid-js/web';
import { Menu } from './components/Menu';
import { userDataStore } from '../../services/userDataStore';
import { createTag } from '../../services/storage';
import { Svg } from '../templates/Svg';
import tagIcon from '/src/assets/tag.svg';
import deleteIcon from '/src/assets/delete.svg';
import squareIcon from '../../assets/square.svg';
import checkSquareIcon from '../../assets/check-square.svg';
import { formatTagName } from '../../utils';
import { Tag } from './components/Tag';

const TagGalleryTest = () => {
    const [getSelectedTags, setSelectedTags] = createSignal<string[]>([]);

    const tagElements = createMemo(() =>
        Object.keys(userDataStore.tags)
            .sort()
            .map((tag) => {
                const tweetsCount = Object.keys(userDataStore.tags[tag].tweets).length;
                const active = getSelectedTags().includes(tag);

                return (
                    <Tag
                        tag={tag}
                        displayText={`${formatTagName(tag)} (${tweetsCount})`}
                        active={active}
                        onSelect={() => {
                            if (active) setSelectedTags([]);
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
            <div class={styles.imageGallery}></div>
        </div>
    );
};

export default TagGalleryTest;
