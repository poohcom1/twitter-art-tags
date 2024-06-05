import { CUSTOM_PAGE_TITLE } from '../constants';
import { waitForElement, formatTagName, parseHTML, verifyTagName } from '../utils';
import {
    addTag,
    createTag,
    deleteTag,
    exportData,
    getTags,
    getTweets,
    importData,
    removeTag,
    renameTag,
} from '../storage';
import htmlHtml from './tagsGallery.html';

const ID_IMAGE = 'tagImage';
const ID_IMPORT = 'tagImport';
const ID_EXPORT = 'tagExport';
const ID_TAGS = 'tags';
const ID_ADD_TAG = 'addTag';

export async function renderTagsGallery() {
    // Global states
    let selectedTags: string[] = [];

    // Render page
    const main = (await waitForElement('div[data-testid="error-detail"]')).parentElement!;
    main.style.maxWidth = '100%';
    main.innerHTML = htmlHtml;

    // Render title
    document.title = CUSTOM_PAGE_TITLE;
    const titleObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                if (document.title !== CUSTOM_PAGE_TITLE) {
                    document.title = CUSTOM_PAGE_TITLE;
                }
            }
        });
    });
    titleObserver.observe(document.querySelector('title')!, { childList: true });

    // Render images
    async function renderImages() {
        const imageContainer = document.querySelector('.images-container')!;
        imageContainer.innerHTML = '';

        const [tags, tweets] = await Promise.all([getTags(), getTweets()]);

        // Images that have all selected tags
        const imageLinks = Object.keys(tags)
            .filter((tag) => selectedTags.includes(tag))
            .reduce(
                (acc, tag) => acc.filter((tweetId) => tags[tag].tweets.includes(tweetId)),
                Object.keys(tweets)
            )
            .reverse()
            .filter((tweetId) => tweetId in tweets)
            .flatMap((tweetId) =>
                tweets[tweetId].images.map((image, index) => ({ tweetId, image, index }))
            );

        imageContainer.innerHTML = imageLinks
            .map(
                (link) =>
                    `
                    <a id="${ID_IMAGE}__${link.tweetId}__${link.index}" class="image-container" href="${link.image}" target="_blank">
                        <img src="${link.image}" />
                    </a>
                    `
            )
            .join('');

        if (Object.keys(tags).length === 0) {
            imageContainer.innerHTML = '<h3>No tweets yet!</h3>';
        } else if (imageLinks.length === 0) {
            imageContainer.innerHTML = '<h3>Nothing to see here!</h3>';
        }

        imageLinks.forEach((link) => {
            new VanillaContextMenu({
                scope: document.querySelector(`#${ID_IMAGE}__${link.tweetId}__${link.index}`)!,
                normalizePosition: false,
                transitionDuration: 0,
                menuItems: [
                    {
                        label: 'Open image',
                        callback: () => {
                            window.open(link.image, '_blank');
                        },
                    },
                    {
                        label: 'Open tweet',
                        callback: () => {
                            window.open(`/poohcom1/status/${link.tweetId}`, '_blank');
                        },
                    },
                    'hr',
                    {
                        label: 'Add to',
                        preventCloseOnClick: true,
                        nestedMenu: Object.keys(tags)
                            .filter((tag) => !tags[tag].tweets.includes(link.tweetId))
                            .map((tag) => ({
                                label: ' + ' + formatTagName(tag),
                                callback: async () => {
                                    await addTag(link.tweetId, tag, []); // No need to fetch image, if a tweet is here, it's already in cache
                                    renderImages();
                                },
                            })),
                    },
                    {
                        label: 'Remove from',
                        preventCloseOnClick: true,
                        nestedMenu: Object.keys(tags)
                            .filter((tag) => tags[tag].tweets.includes(link.tweetId))
                            .map((tag) => ({
                                label: ' - ' + formatTagName(tag),
                                callback: async () => {
                                    await removeTag(link.tweetId, tag);
                                    renderImages();
                                },
                            })),
                    },
                    'hr',
                    ...Object.keys(tags)
                        .filter((tag) => tags[tag].tweets.includes(link.tweetId))
                        .map((tag) => ({
                            label: formatTagName(tag),
                            callback: () => {
                                document.querySelector<HTMLSelectElement>('#tagSelect')!.value =
                                    tag;
                                renderImages();
                            },
                        })),
                ],
            });
        });
    }
    renderImages();

    // Tag input
    const tagInput = document.querySelector<HTMLInputElement>('#' + ID_ADD_TAG)!;
    tagInput.addEventListener('keydown', async (event) => {
        const allowedChars = /^[a-zA-Z0-9 ]+$/;

        if (allowedChars.test(event.key) || event.key === 'Enter') {
            if (event.key === 'Enter') {
                const tagInput = event.target as HTMLInputElement;
                console.log(tagInput.value);

                await createTag(tagInput.value);
                tagInput.value = '';
                renderTags();
            }
        } else {
            event.preventDefault();
        }
    });

    // Tag select

    async function renderTags() {
        const tags = await getTags();
        const tagList = Object.keys(tags);

        const tagsContainer = document.querySelector('#' + ID_TAGS)!;

        tagList.sort((a, b) => a.localeCompare(b));

        const tagElements = tagList.map((tag) => {
            const active = selectedTags.includes(tag);

            const button = parseHTML<HTMLButtonElement>(
                `<button class="tag">${active ? '✔ ' : ''}${formatTagName(tag)} (${
                    tags[tag].tweets.length
                })</button>`
            );

            button.addEventListener('click', () => {
                if (active) {
                    selectedTags = selectedTags.filter((t) => t !== tag);
                } else {
                    selectedTags.push(tag);
                }
                renderTags();
                renderImages();
            });

            new VanillaContextMenu({
                scope: button,
                normalizePosition: false,
                transitionDuration: 0,
                menuItems: [
                    {
                        label: 'Rename',
                        callback: async () => {
                            const newTagName = prompt('Enter new tag name:', tag);
                            if (!newTagName) {
                                return;
                            }
                            if (!verifyTagName(newTagName)) {
                                alert(
                                    'Invalid tag name! Tag names can only contain letters, numbers, and spaces.'
                                );
                                return;
                            }
                            await renameTag(tag, newTagName);
                            renderTags();
                            renderImages();
                        },
                    },
                    {
                        label: 'Delete',
                        callback: async () => {
                            if (!confirm('Are you sure you want to delete this tag?')) {
                                return;
                            }
                            await deleteTag(tag);
                            renderTags();
                            renderImages();
                        },
                    },
                ],
            });

            return button;
        });

        tagsContainer.innerHTML = '';
        tagsContainer.append(...tagElements);
    }
    renderTags();

    // Tag export
    const tagExport = document.querySelector('#' + ID_EXPORT);
    tagExport!.addEventListener('click', async () => {
        const tags = await exportData();
        const blob = new Blob([tags], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;

        const date = new Date().toISOString().split('T')[0];
        a.download = `tags_${date}.json`;
        a.click();
        URL.revokeObjectURL(url);
    });

    // Tag import
    const tagImport = document.querySelector('#' + ID_IMPORT);
    tagImport!.addEventListener('click', async () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.style.display = 'none';
        input.addEventListener('change', async () => {
            const file = input.files![0];
            const reader = new FileReader();
            reader.onload = async () => {
                if (!confirm('Are you sure you want to overwrite all tags?')) {
                    return;
                }
                await importData(reader.result as string);
                renderTags();
                renderImages();
            };
            reader.readAsText(file);
        });
        input.click();
    });
}
