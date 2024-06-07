import { Tags, Tag, Tweets, DataExport } from './models';
import { sanitizeTagName } from './utils';
import { safeParse } from 'valibot';

const KEY_TAGS = 'tags';
const KEY_TWEETS = 'tweets';

// Tag
export async function createTag(tagName: string) {
    tagName = sanitizeTagName(tagName);
    if (tagName === '') {
        console.error('Invalid tag name');
        return;
    }

    const tags = await GM.getValue<Tags>(KEY_TAGS, {});

    if (tagName in tags) {
        alert('Tag already exists');
        return;
    }

    tags[tagName] = {
        tweets: [],
        lastUpdated: Date.now(),
    };

    await GM.setValue(KEY_TAGS, tags);
}

export async function deleteTag(tagName: string) {
    const tags = await GM.getValue<Tags>(KEY_TAGS, {});

    if (!(tagName in tags)) {
        return;
    }

    delete tags[tagName];

    await GM.setValue(KEY_TAGS, tags);
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

    const tags = await GM.getValue<Tags>(KEY_TAGS, {});

    if (!(oldTagName in tags)) {
        return;
    }

    if (newTagName in tags) {
        alert('Tag already exists');
        return;
    }

    tags[newTagName] = tags[oldTagName];
    delete tags[oldTagName];

    await GM.setValue(KEY_TAGS, tags);
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
        GM.getValue<Tags>(KEY_TAGS, {}),
        GM.getValue<Tweets>(KEY_TWEETS, {}),
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

    await Promise.all([GM.setValue(KEY_TAGS, tags), GM.setValue(KEY_TWEETS, tweets)]);
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

    const tags = await GM.getValue<Tags>(KEY_TAGS, {});

    if (!(tagName in tags)) {
        return;
    }

    tags[tagName].tweets = tags[tagName].tweets.filter((id) => id !== tweetId);

    await GM.setValue(KEY_TAGS, tags);
}

export async function removeTweet(tweetId: string) {
    const tags = await GM.getValue<Tags>(KEY_TAGS, {});

    for (const tag of Object.values(tags)) {
        tag.tweets = tag.tweets.filter((id) => id !== tweetId);
    }

    await GM.setValue(KEY_TAGS, tags);

    const tweets = await GM.getValue<Tweets>(KEY_TWEETS, {});

    delete tweets[tweetId];

    await GM.setValue(KEY_TWEETS, tweets);
}

export async function getTags(): Promise<Tags> {
    return GM.getValue(KEY_TAGS, {});
}

export async function getTweets(): Promise<Tweets> {
    return GM.getValue(KEY_TWEETS, {});
}

export async function setTags(tags: Tags) {
    await GM.setValue(KEY_TAGS, tags);
}

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
        await GM.setValue(KEY_TAGS, result.output.tags);
        await GM.setValue(KEY_TWEETS, result.output.tweets);
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
    await GM.deleteValue(KEY_TAGS);
}
