import { addTag, getTags, removeTag } from '../storage';
import { SANITIZE_INFO, formatTagName, parseHTML, verifyEvent } from '../utils';
import squareIcon from '../assets/square.svg';
import checkSquareIcon from '../assets/check-square.svg';

interface TagModalCallbacks {
    tagCreated?: (tag: string) => void;
    tagModified?: (tag: string, tweetId: string) => void;
}

export default class TagModal {
    private tagModal: HTMLElement;
    private tagInput: HTMLInputElement;
    private tagsContainer: HTMLElement;

    private callbacks: Partial<TagModalCallbacks> = {};
    private tagInputKeydownListener: ((ev: KeyboardEvent) => void) | null = null;

    constructor() {
        this.tagModal = document.createElement('div');
        this.tagModal.innerHTML = `<input id="tagInput" type="text" placeholder="Add a tag..." /><hr style="width: 100%" /><div id="tagsContainer"/>`;
        this.tagModal.classList.add('tag-dropdown');
        this.tagModal.style.backgroundColor = document.body.style.backgroundColor;
        document.body.appendChild(this.tagModal);

        this.tagInput = this.tagModal.querySelector<HTMLInputElement>('#tagInput')!;
        this.tagInput.maxLength = SANITIZE_INFO.maxLength;
        this.tagsContainer = this.tagModal.querySelector('#tagsContainer')!;
    }

    public show(
        tweetId: string,
        images: string[],
        position: { top: number; left: number },
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
                this.tagsContainer.innerHTML = `<div style="overflow: hidden; text-overflow: ellipsis; max-width: 200px">Create a new tag: ${this.tagInput.value}</div>`;
                return;
            }

            const tagElements = filteredTagList.map((tag) =>
                renderTag(tag, tags[tag].tweets.includes(tweetId ?? ''))
            );
            this.tagsContainer.append(...tagElements);

            for (const tag of this.tagModal.querySelectorAll('.tag')) {
                tag.addEventListener('click', async () => {
                    if (tweetId === null) {
                        console.error('No tweet selected');
                        return;
                    }

                    const tagName = tag.id;
                    if (tagName in tags && tags[tagName].tweets.includes(tweetId)) {
                        await removeTag(tweetId, tagName);
                    } else {
                        await addTag(tweetId, tagName, images);
                    }

                    this.callbacks.tagModified?.(tagName, tweetId);

                    renderTags();
                });
            }
        };

        // Setup input
        this.tagInput.focus();
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
                    this.callbacks.tagCreated?.(tagName);
                } else {
                    renderTags();
                }
            } else {
                event.preventDefault();
            }
        };
        this.tagInput.addEventListener('keydown', this.tagInputKeydownListener);

        renderTags();

        // Show
        this.tagModal.style.top = `${position.top + window.scrollY}px`;
        this.tagModal.style.left = `${position.left}px`;
        this.tagModal.style.display = 'block';
    }

    public hide() {
        this.tagModal.style.display = 'none';
        this.clearTags();
    }

    public setStyles(styles: Partial<CSSStyleDeclaration>) {
        Object.assign(this.tagModal.style, styles);
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

function renderTag(tag: string, active: boolean): HTMLButtonElement {
    return parseHTML(
        `<button id="${tag}" class="tag ${!active && 'tag__inactive'}">
            ${active ? checkSquareIcon : squareIcon}
            <div class="text">${formatTagName(tag)}</div>
        </button>`
    );
}
