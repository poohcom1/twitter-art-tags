import { clearCache, gmGetWithCache, gmSetWithCache, reloadCache } from './cache';
import { CUSTOM_PAGE_PATH, KEY_USER_DATA } from '../constants';
import { UserDataSchema, Tweets, UserData, Tags } from '../models';
import { safeParse } from 'valibot';
import * as dataManagement from './dataManagement';

const DEFAULT_USER_DATA: UserData = {
    tags: {},
    tweets: {},
};

// Cache
export const cacheInvalidated = new Event('cacheInvalidated');
if (process.env.NODE_ENV !== 'test') {
    document.addEventListener('visibilitychange', () => {
        clearCache(KEY_USER_DATA);
        reloadCache(KEY_USER_DATA).then(() => document.dispatchEvent(cacheInvalidated));
    });
}

// Sanitize
function sanitizeTagName(tagName: string) {
    return tagName.trim().toLowerCase();
}

// Management

// Tag
export async function createTag(tagName: string) {
    tagName = sanitizeTagName(tagName);
    if (tagName === '') {
        console.error('Invalid tag name');
        return;
    }

    const data = await gmGetWithCache<UserData>(KEY_USER_DATA, DEFAULT_USER_DATA);

    if (dataManagement.filterExists(data.tags[tagName])) {
        alert('Tag already exists');
        return;
    }

    await gmSetWithCache<UserData>(KEY_USER_DATA, dataManagement.createTag(data, tagName));
}

export async function deleteTag(tagName: string) {
    const data = await gmGetWithCache<UserData>(KEY_USER_DATA, DEFAULT_USER_DATA);

    if (!(tagName in data.tags)) {
        return;
    }

    await gmSetWithCache<UserData>(KEY_USER_DATA, dataManagement.deleteTag(data, tagName));
}

export async function renameTag(oldTagName: string, newTagName: string) {
    oldTagName = sanitizeTagName(oldTagName);
    newTagName = sanitizeTagName(newTagName);
    if (oldTagName === '' || newTagName === '') {
        console.error('Invalid tag name');
        return;
    }
    if (oldTagName === newTagName) {
        return;
    }

    const data = await gmGetWithCache<UserData>(KEY_USER_DATA, DEFAULT_USER_DATA);

    if (!(oldTagName in data.tags)) {
        return;
    }

    if (dataManagement.filterExists(data.tags[newTagName])) {
        alert('Tag already exists');
        return;
    }

    await gmSetWithCache<UserData>(
        KEY_USER_DATA,
        dataManagement.renameTag(data, oldTagName, newTagName)
    );
}

// Tweet
export async function addTag(tweetId: string, tagName: string, imagesCache: string[]) {
    if (tweetId === null) {
        console.error('No tweet selected');
        return;
    }
    tagName = sanitizeTagName(tagName);
    if (tagName === '') {
        console.error('Invalid tag name');
        return;
    }

    const data = await gmGetWithCache<UserData>(KEY_USER_DATA, DEFAULT_USER_DATA);

    if (!(tweetId in data.tweets) && imagesCache.length === 0) {
        console.error('New tweet being cached, but no images found');
        return;
    }

    await gmSetWithCache<UserData>(
        KEY_USER_DATA,
        dataManagement.tagTweet(data, tweetId, tagName, imagesCache)
    );
}

export async function removeTag(tweetId: string, tagName: string) {
    if (tweetId === null) {
        console.error('No tweet selected');
        return;
    }
    tagName = sanitizeTagName(tagName);
    if (tagName === '') {
        console.error('Invalid tag name');
        return;
    }

    const { tags, tweets } = await gmGetWithCache<UserData>(KEY_USER_DATA, DEFAULT_USER_DATA);

    if (!(tagName in tags)) {
        return;
    }
    await gmSetWithCache<UserData>(
        KEY_USER_DATA,
        dataManagement.removeTag({ tags, tweets }, tweetId, tagName)
    );
}

export async function removeTweet(tweetId: string) {
    const data = await gmGetWithCache<UserData>(KEY_USER_DATA, DEFAULT_USER_DATA);
    await gmSetWithCache<UserData>(KEY_USER_DATA, dataManagement.removeTweet(data, tweetId));
}

// Get data

export async function getTags(): Promise<Tags> {
    return dataManagement.getExistingTags(
        await gmGetWithCache<UserData>(KEY_USER_DATA, DEFAULT_USER_DATA)
    );
}

export async function getTweets(): Promise<Tweets> {
    return dataManagement.getExistingTweets(
        await gmGetWithCache<UserData>(KEY_USER_DATA, DEFAULT_USER_DATA)
    );
}

// Store
export async function getExportData(): Promise<UserData> {
    return await gmGetWithCache<UserData>(KEY_USER_DATA, DEFAULT_USER_DATA);
}

export async function setImportData(jsonString: string, merge: boolean = false) {
    const data: unknown = JSON.parse(jsonString);
    const result = safeParse(UserDataSchema, data);

    if (result.success) {
        let importedData = result.output;
        if (merge) {
            const currentData: UserData = await gmGetWithCache<UserData>(
                KEY_USER_DATA,
                DEFAULT_USER_DATA
            );
            importedData = dataManagement.mergeData(currentData, result.output);
        } else {
            // Update modifiedAt and deletedAt
            const { tags, tweets } = importedData;

            const now = Date.now();
            for (const tag of Object.keys(importedData.tags)) {
                if (dataManagement.filterExists(tags[tag])) {
                    tags[tag].modifiedAt = now;
                } else {
                    tags[tag].deletedAt = now;
                }

                for (const tweet of tags[tag].tweets) {
                    tweets[tweet].modifiedAt = now;
                }
            }

            for (const tweet of Object.keys(importedData.tweets)) {
                if (dataManagement.filterExists(tweets[tweet])) {
                    tweets[tweet].modifiedAt = now;
                } else {
                    tweets[tweet].deletedAt = now;
                }
            }
        }

        await gmSetWithCache(KEY_USER_DATA, importedData);
    } else {
        console.error(result.issues);
        alert(
            'Failed to import data due to potentially corrupted file. Check the console for more information.'
        );
    }
}

const exportFilename = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0'); // Months are zero-indexed
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    return `twitter-art-tag_data_${year}-${month}-${day}_${hours}.json`;
};

export async function exportDataToFile() {
    const tags = JSON.stringify(await getExportData(), null, 2);
    const blob = new Blob([tags], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;

    a.download = exportFilename();
    a.click();
    URL.revokeObjectURL(url);
}

export function importDataFromFile(merge: boolean): Promise<void> {
    return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.style.display = 'none';
        input.addEventListener('change', async () => {
            const file = input.files![0];
            const reader = new FileReader();
            reader.onload = async () => {
                if (!merge) {
                    if (!confirm('Are you sure you want to overwrite all tags?')) {
                        return;
                    }
                }
                await setImportData(reader.result as string, merge);

                resolve();
            };
            reader.readAsText(file);
        });
        input.click();
    });
}

export async function clearAllTags() {
    if (!confirm('Are you sure you want to delete all tags?')) {
        return;
    }
    clearCache(KEY_USER_DATA);
    GM.deleteValue(KEY_USER_DATA);

    if (window.location.href.includes(CUSTOM_PAGE_PATH)) {
        window.location.reload();
    }
}
