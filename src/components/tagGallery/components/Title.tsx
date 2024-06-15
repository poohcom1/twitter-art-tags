import styles from '../tag-gallery.module.scss';
import questionMark from '/src/assets/question-mark.svg';
import githubIcon from '/src/assets/github.svg';
import { template } from 'solid-js/web';

const QuestionMarkIcon = template(questionMark);
const GithubIcon = template(githubIcon);

export const Title = () => (
    <div class={styles.title}>
        <h1>Tag Gallery</h1>
        <div class={styles.help} title="Right click to view more options for tags and images">
            <QuestionMarkIcon />
        </div>
        <div class={styles.github}>
            <a href="https://github.com/poohcom1/twitter-art-tags" target="_blank">
                <GithubIcon />
            </a>
        </div>
    </div>
);
