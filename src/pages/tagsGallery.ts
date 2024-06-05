import VanillaContextMenu from 'vanilla-context-menu';
import { CUSTOM_PAGE_TITLE } from '../constants';
import { waitForElement, formatTagName } from '../utils';
import { addTag, exportData, getTags, getTweets, importData, removeTag, setTags } from '../storage';
import { Tags } from '../models';

const ID_IMAGE = 'tagImage';
const KEY_SELECTED_TAG = 'selectedTag';

export async function renderTagsGallery() {
    const main = (await waitForElement('div[data-testid="error-detail"]')).parentElement!;
    main.style.maxWidth = '100%';
    main.innerHTML = `
    <div class="root">
        <h2>Tags</h2>
        <div style="display: flex; gap: 10px">
            <select id="tagSelect"></select>

            <button id="tagExport" style="margin-left: auto">Export Tags</button>
            <button id="tagImport">Import Tags</button>
        </div>
        <hr />
        <div class="images-container"></div>
    </div>
    `;
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
        const tagName = document.querySelector<HTMLSelectElement>('#tagSelect')!.value;
        const tagData = tags[tagName] || { tweets: [] };

        const imageLinks = [...tagData.tweets]
            .reverse()
            .filter((tweetId) => tweetId in tweets)
            .flatMap((tweetId) =>
                tweets[tweetId].images.map((image, index) => ({
                    tweetId,
                    image,
                    index,
                }))
            );

        imageContainer.innerHTML = imageLinks
            .map(
                (link) =>
                    `
                    <a id="${ID_IMAGE}__${link.tweetId}__${link.index}" class="image-container" href="/poohcom1/status/${link.tweetId}" target="_blank">
                        <img src="${link.image}" />
                    </a>
                    `
            )
            .join('');

        if (tagSelect.innerHTML === '') {
            tagSelect.innerHTML = `<option disabled selected value=""> --- </option>`;
            imageContainer.innerHTML = '<h3>No tags yet</h3>';
        } else if (imageLinks.length === 0) {
            imageContainer.innerHTML = '<h3>No tweets yet</h3>';
        }

        imageLinks.forEach((link) => {
            new VanillaContextMenu({
                scope: document.querySelector(`#${ID_IMAGE}__${link.tweetId}__${link.index}`)!,
                normalizePosition: false,
                transitionDuration: 0,
                menuItems: [
                    {
                        label: 'View',
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
                                    await addTag(link.tweetId, tag);
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

    // Tag select
    const tagSelect = document.querySelector<HTMLSelectElement>('#tagSelect')!;

    async function renderTagSelect() {
        const tags = await getTags();
        let selectedTag = await GM.getValue(KEY_SELECTED_TAG, '');
        const tagList = Object.keys(tags);
        if (!tagList.includes(selectedTag)) {
            selectedTag = '';
            GM.setValue(KEY_SELECTED_TAG, '');
        }
        tagList.sort((a, b) => a.localeCompare(b));
        tagSelect.innerHTML = tagList
            .map((tag) => `<option value="${tag}">${formatTagName(tag)}</option>`)
            .join('');
        tagSelect.value = selectedTag || tagList[0] || '';
        tagSelect.addEventListener('change', (event) => {
            renderImages();
            GM.setValue(KEY_SELECTED_TAG, (event.target as HTMLSelectElement).value);
        });
        renderImages();
    }
    renderTagSelect();

    // Tag export
    const tagExport = document.querySelector('#tagExport');
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
    const tagImport = document.querySelector('#tagImport');
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
                renderTagSelect();
            };
            reader.readAsText(file);
        });
        input.click();
    });
}
