import { CUSTOM_PAGE_PATH } from './constants';
import { Tags, Tag, Tweets, DataExport } from './models';
import { sanitizeTagName } from './utils';
import { safeParse } from 'valibot';

// Cache
const cache: Record<string, unknown> = {};

const pendingPromises: Record<string, Promise<void> | undefined> = {};
async function gmSetWithCache(key: string, value: unknown) {
    cache[key] = value;

    if (key in pendingPromises) {
        await pendingPromises[key];
    }

    pendingPromises[key] = GM.setValue(key, value);
}

async function gmGetWithCache<T>(key: string, defVal: T): Promise<T> {
    if (key in cache) {
        return cache[key] as T;
    }

    const value = await GM.getValue<T>(key, defVal);
    cache[key] = value;
    return value;
}

const KEY_TAGS = 'tags';
const KEY_TWEETS = 'tweets';

// Tag
export async function createTag(tagName: string) {
    tagName = sanitizeTagName(tagName);
    if (tagName === '') {
        console.error('Invalid tag name');
        return;
    }

    const tags = await gmGetWithCache<Tags>(KEY_TAGS, {});

    if (tagName in tags) {
        alert('Tag already exists');
        return;
    }

    tags[tagName] = {
        tweets: [],
        lastUpdated: Date.now(),
    };

    await gmSetWithCache(KEY_TAGS, tags);
}

export async function deleteTag(tagName: string) {
    const tags = await gmGetWithCache<Tags>(KEY_TAGS, {});

    if (!(tagName in tags)) {
        return;
    }

    delete tags[tagName];

    await gmSetWithCache(KEY_TAGS, tags);
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

    const tags = await gmGetWithCache<Tags>(KEY_TAGS, {});

    if (!(oldTagName in tags)) {
        return;
    }

    if (newTagName in tags) {
        alert('Tag already exists');
        return;
    }

    tags[newTagName] = tags[oldTagName];
    delete tags[oldTagName];

    await gmSetWithCache(KEY_TAGS, tags);
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

    const [tags, tweets] = await Promise.all([
        gmGetWithCache<Tags>(KEY_TAGS, {}),
        gmGetWithCache<Tweets>(KEY_TWEETS, {}),
    ]);

    if (!(tweetId in tweets) && imagesCache.length === 0) {
        console.error('New tweet being cached, but no images found');
        return;
    }

    let tag: Tag = {
        tweets: [],
        lastUpdated: Date.now(),
    };

    if (tagName in tags) {
        tag = tags[tagName];
    } else {
        tags[tagName] = tag;
    }

    tag.lastUpdated = Date.now();

    if (!tag.tweets.includes(tweetId)) {
        tag.tweets.push(tweetId);
    }

    if (imagesCache.length > 0) {
        tweets[tweetId] = {
            images: imagesCache,
        };
    }

    await Promise.all([gmSetWithCache(KEY_TAGS, tags), gmSetWithCache(KEY_TWEETS, tweets)]);
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

    const tags = await gmGetWithCache<Tags>(KEY_TAGS, {});

    if (!(tagName in tags)) {
        return;
    }

    tags[tagName].tweets = tags[tagName].tweets.filter((id) => id !== tweetId);

    await gmSetWithCache(KEY_TAGS, tags);
}

export async function removeTweet(tweetId: string) {
    const tags = await gmGetWithCache<Tags>(KEY_TAGS, {});

    for (const tag of Object.values(tags)) {
        tag.tweets = tag.tweets.filter((id) => id !== tweetId);
    }

    await gmSetWithCache(KEY_TAGS, tags);

    const tweets = await gmGetWithCache<Tweets>(KEY_TWEETS, {});

    delete tweets[tweetId];

    await gmSetWithCache(KEY_TWEETS, tweets);
}

export async function getTags(): Promise<Tags> {
    return gmGetWithCache(KEY_TAGS, {});
}

export async function getTweets(): Promise<Tweets> {
    return gmGetWithCache(KEY_TWEETS, {});
}

export async function setTags(tags: Tags) {
    await gmSetWithCache(KEY_TAGS, tags);
}

// Store
export async function exportData(): Promise<string> {
    const tags = await getTags();
    const tweets = await getTweets();

    const data = {
        tags,
        tweets,
    };

    return JSON.stringify(data, null, 2);
}

export async function importData(jsonString: string) {
    const data: unknown = JSON.parse(jsonString);
    const result = safeParse(DataExport, data);

    if (result.success) {
        await gmSetWithCache(KEY_TAGS, result.output.tags);
        await gmSetWithCache(KEY_TWEETS, result.output.tweets);
    } else {
        console.error(result.issues);
        alert(
            'Failed to import data due to potentially corrupted file. Check the console for more information.'
        );
    }
}

export function getExportFileName() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0'); // Months are zero-indexed
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');

    return `twitter-art-tag_data_${year}-${month}-${day}_${hours}.json`;
}

export async function clearAllTags() {
    if (!confirm('Are you sure you want to delete all tags?')) {
        return;
    }
    cache[KEY_TAGS] = {};
    cache[KEY_TWEETS] = {};
    GM.deleteValue(KEY_TAGS);
    GM.deleteValue(KEY_TWEETS);

    if (window.location.href.includes(CUSTOM_PAGE_PATH)) {
        window.location.reload();
    }
}
