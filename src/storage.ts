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

    const tags = await GM.getValue<Tags>(KEY_TAGS, {});

    if (!(oldTagName in tags)) {
        return;
    }

    tags[newTagName] = tags[oldTagName];
    delete tags[oldTagName];

    await GM.setValue(KEY_TAGS, tags);
}

// Tweet
export async function addTag(tweetId: string, tagName: string) {
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

    await GM.setValue(KEY_TAGS, tags);

    const tweets = await GM.getValue<Tweets>(KEY_TWEETS, {});

    const images = Array.from(document.querySelectorAll('a'))
        .filter((a) => a.href.includes(tweetId))
        .flatMap((a) => Array.from(a.querySelectorAll('img')))
        .map((img) => img.src);
    console.log(images);

    if (images.length === 0) {
        return;
    }

    tweets[tweetId] = {
        images,
    };

    await GM.setValue(KEY_TWEETS, tweets);
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

    tags[tagName].tweets = tags[tagName].tweets.filter((tweetId) => tweetId !== tweetId);

    await GM.setValue(KEY_TAGS, tags);
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

export async function clearAllTags() {
    if (!confirm('Are you sure you want to delete all tags?')) {
        return;
    }
    await GM.deleteValue(KEY_TAGS);
}
