import { Component, createEffect, createSignal, onMount } from 'solid-js';
import styles from './tag-gallery.module.scss';
import { Title } from './components/Title';
import tagIcon from '/src/assets/tag.svg';
import deleteIcon from '/src/assets/delete.svg';
import { template } from 'solid-js/web';
import { Menu } from './components/Menu';

const TagSvg = template(tagIcon);
const DeleteSvg = template(deleteIcon);

const TagGalleryTest = () => {
    return (
        <div class={styles.tagsGallery}>
            <Title />
            <div class={styles.optionsPanel}>
                <TagSvg />
                <div class={styles.addTagContainer}>
                    <input
                        class={styles.addTag}
                        type="text"
                        placeholder="Press enter to create a tag..."
                    />
                    <button class={styles.addTagClear}>
                        <DeleteSvg />
                    </button>
                </div>
                <div class={styles.createTagHint} />
                <Menu />
            </div>
        </div>
    );
};

export default TagGalleryTest;
