import styles from './tag-modal.module.scss';
import template from './tag-modal.pug';
import { addTag, getTags, removeTag } from '../../storage';
import { SANITIZE_INFO, formatTagName, parseHTML, verifyEvent } from '../../utils';
import squareIcon from '../../assets/img/square.svg';
import checkSquareIcon from '../../assets/img/check-square.svg';

interface TagModalCallbacks {
    tagModified?: (tag: string, tweetId: string) => void;
}

export default class TagModal {
    private tagModal: HTMLElement;
    private tagInput: HTMLInputElement;
    private tagsContainer: HTMLElement;

    private callbacks: Partial<TagModalCallbacks> = {};
    private tagInputKeydownListener: ((ev: KeyboardEvent) => void) | null = null;

    constructor(classNames: string[] = []) {
        this.tagModal = parseHTML(
            template({
                styles,
                inputMaxLength: SANITIZE_INFO.maxLength,
            })
        );
        this.tagModal.onclick = (e) => e.stopPropagation(); // Prevent parent context menu from closing
        this.tagModal.classList.add(...classNames);
        document.body.appendChild(this.tagModal);

        this.tagInput = this.tagModal.querySelector(`.${styles.tagInput}`) as HTMLInputElement;
        this.tagsContainer = this.tagModal.querySelector(`.${styles.tagsContainer}`) as HTMLElement;
    }

    public async show(
        tweetId: string,
        images: string[],
        position: { top: number; left: number; right: number; space: number },
        callbacks?: TagModalCallbacks
    ) {
        this.callbacks = callbacks ?? {};
        // Render tags
        const renderTags = async () => {
            if (tweetId === null) {
                return;
            }

            const tags = await getTags();
            const tagList = await listTags(tweetId);
            const filteredTagList = tagList.filter((tag) =>
                tag.toLowerCase().includes(this.tagInput.value.toLowerCase())
            );

            this.clearTags();

            if (tagList.length === 0) {
                this.tagsContainer.innerHTML = 'No tags yet!';
                return;
            } else if (filteredTagList.length === 0) {
                this.tagsContainer.innerHTML = `<div style="overflow: hidden; text-overflow: ellipsis; max-width: 200px">Create a new tag: ${formatTagName(
                    this.tagInput.value
                )}</div>`;
                return;
            }

            const tagButtons = filteredTagList.map((tagName) =>
                renderTag(tagName, tags[tagName].tweets.includes(tweetId ?? ''), async () => {
                    if (tweetId === null) {
                        console.error('No tweet selected');
                        return;
                    }

                    if (tagName in tags && tags[tagName].tweets.includes(tweetId)) {
                        await removeTag(tweetId, tagName);
                    } else {
                        await addTag(tweetId, tagName, images);
                    }

                    this.callbacks.tagModified?.(tagName, tweetId);

                    renderTags();
                })
            );
            this.tagsContainer.append(...tagButtons);
        };

        // Setup input
        if (this.tagInputKeydownListener) {
            this.tagInput.removeEventListener('keydown', this.tagInputKeydownListener);
        }
        this.tagInputKeydownListener = async (event) => {
            const target = event.target as HTMLInputElement;
            if (verifyEvent(event)) {
                if (event.key === 'Enter') {
                    if (tweetId === null) {
                        console.error('No tweet selected');
                        return;
                    }

                    const tagName = target.value;

                    await addTag(tweetId, tagName, images);
                    target.value = '';
                    renderTags();
                    this.callbacks.tagModified?.(tagName, tweetId);
                } else {
                    renderTags();
                }
            } else {
                event.preventDefault();
            }
        };
        this.tagInput.addEventListener('keydown', this.tagInputKeydownListener);

        await renderTags();

        this.tagModal.style.display = 'block';
        // Show
        const modalRightEdge = position.right + this.tagModal.offsetWidth + position.space + 10;
        const modalBottomEdge = position.top + this.tagModal.offsetHeight;

        // Get the current scroll positions
        const scrollLeft = document.documentElement.scrollLeft;
        const scrollTop = document.documentElement.scrollTop;

        if (modalRightEdge > window.innerWidth + scrollLeft) {
            this.tagModal.style.left = `${
                position.left - this.tagModal.offsetWidth - position.space
            }px`;
        } else {
            this.tagModal.style.left = `${position.right + position.space}px`;
        }

        if (modalBottomEdge > window.innerHeight + scrollTop) {
            this.tagModal.style.top = `${
                position.top - (modalBottomEdge - (window.innerHeight + scrollTop))
            }px`;
        } else {
            this.tagModal.style.top = `${position.top + scrollTop}px`;
        }

        // Focus
        this.tagInput.focus();
    }

    public hide() {
        this.tagModal.style.display = 'none';
        this.clearTags();
    }

    public setStyles(style: Partial<CSSStyleDeclaration>) {
        Object.assign(this.tagModal.style, style);
    }

    public addClass(className: string) {
        this.tagModal.classList.add(className);
    }

    private clearTags() {
        this.tagsContainer.innerHTML = '';
    }
}

async function listTags(tweetId: string): Promise<string[]> {
    if (tweetId === null) {
        console.error('No tweet selected');
        return [];
    }

    const tags = await getTags();
    const tagArray = Object.keys(tags);
    tagArray.sort((a, b) => a.localeCompare(b));
    return tagArray;
}

function renderTag(tag: string, active: boolean, onClick: () => void): HTMLButtonElement {
    const html = parseHTML(
        `<button class="${styles.tag} ${!active && styles.tagInactive}">
            ${active ? checkSquareIcon : squareIcon}
            <div class="text">${formatTagName(tag)}</div>
        </button>`
    );

    html.onclick = onClick;
    return html as HTMLButtonElement;
}
