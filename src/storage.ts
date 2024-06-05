import { Tags, Tag, Tweets, DataExport } from './models';
import { sanitizeTagName } from './utils';
import { z } from 'zod';

const KEY_TAGS = 'tags';
const KEY_TWEETS = 'tweets';

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

    if (tags[tagName].tweets.length === 0) {
        delete tags[tagName];
    }

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
    const result = DataExport.safeParse(data);

    if (result.success) {
        await GM.setValue(KEY_TAGS, result.data.tags);
        await GM.setValue(KEY_TWEETS, result.data.tweets);
    } else {
        alert(
            'Failed to import data due to potentially corrupted file. Check the console for more information.'
        );
        console.error(result.error);
    }
}
