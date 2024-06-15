import { createEffect } from 'solid-js';
import styles from '../tag-gallery.module.scss';

interface ImageProps {
    tweetId: string;
    src: string;
}

export const ImageContainer = ({ tweetId, src }: ImageProps) => {
    return (
        <a
            class={`${styles.imageContainer}`}
            href={`https://x.com/x/status/${tweetId}`}
            target="_blank"
            rel="noreferrer"
        >
            <img src={src} loading="lazy" />
        </a>
    );
};
