import { Tag, Tags, UserData } from '../models';

export function createTag(userData: UserData, tagName: string): UserData {
    const { tags, tweets } = structuredClone(userData);
    tags[tagName] = {
        tweets: [],
        modifiedAt: Date.now(),
        deletedAt: 0,
        tweetsModifiedAt: {},
    };
    return { tags, tweets };
}

export function deleteTag(userData: UserData, tagName: string): UserData {
    const { tags, tweets } = structuredClone(userData);
    tags[tagName] = {
        ...tags[tagName],
        deletedAt: Date.now(),
    };
    return { tags, tweets };
}

export function renameTag(userData: UserData, oldTagName: string, newTagName: string): UserData {
    const { tags, tweets } = structuredClone(userData);
    tags[oldTagName].deletedAt = Date.now();
    tags[newTagName] = tags[oldTagName];
    tags[newTagName].modifiedAt = Date.now();
    for (const tweetId of tags[newTagName].tweets) {
        tags[newTagName].tweetsModifiedAt = tags[newTagName].tweetsModifiedAt ?? {};
        tags[newTagName].tweetsModifiedAt![tweetId] = Date.now();
    }
    return { tags, tweets };
}

export function tagTweet(
    userData: UserData,
    tweetId: string,
    tagName: string,
    imagesCache: string[]
): UserData {
    const { tags, tweets } = structuredClone(userData);
    let tag: Tag = {
        tweets: [],
        modifiedAt: Date.now(),
        deletedAt: 0,
        tweetsModifiedAt: {},
    };

    if (tagName in tags) {
        tag = tags[tagName];
    } else {
        tags[tagName] = tag;
    }

    tag.modifiedAt = Date.now();
    tag.tweetsModifiedAt[tweetId] = Date.now();

    if (!tag.tweets.includes(tweetId)) {
        tag.tweets.push(tweetId);
    }

    if (imagesCache.length > 0) {
        tweets[tweetId] = {
            images: imagesCache.map(stripeNameParam),
            modifiedAt: Date.now(),
            deletedAt: 0,
        };
    }
    tweets[tweetId].modifiedAt = Date.now();
    return { tags, tweets };
}

export function removeTag(userData: UserData, tweetId: string, tagName: string) {
    const { tags, tweets } = structuredClone(userData);
    tags[tagName].tweets = tags[tagName].tweets.filter((id) => id !== tweetId);
    tags[tagName].modifiedAt = Date.now();
    tags[tagName].tweetsModifiedAt[tweetId] = Date.now();
    tags[tagName].tweets.forEach((id) => {
        tweets[id].modifiedAt = Date.now();
    });
    return { tags, tweets };
}

export function removeTweet(userData: UserData, tweetId: string) {
    let newData = structuredClone(userData);

    newData.tweets[tweetId].deletedAt = Date.now();

    for (const tagName in newData.tags) {
        newData = removeTag(newData, tweetId, tagName);
    }
    return newData;
}
function stripeNameParam(url: string) {
    const urlObj = new URL(url);
    const searchParams = urlObj.searchParams;
    searchParams.delete('name');
    urlObj.search = searchParams.toString();
    return urlObj.toString();
}

export function tagExists(tags: Tags, tagName: string) {
    return tagName in tags && (tags[tagName].modifiedAt ?? 0) >= (tags[tagName].deletedAt ?? 0);
}

export function mergeData(data1: UserData, data2: UserData): UserData {
    const merged: UserData = {
        tags: {},
        tweets: {},
    };

    // Tags
    const tags1AndShared = Object.keys(data1.tags);
    const tags2 = Object.keys(data2.tags).filter((tag) => !tags1AndShared.includes(tag));

    // - Shared and unique to data1
    for (const tag of tags1AndShared) {
        if (!Object.keys(data2.tags).includes(tag)) {
            merged.tags[tag] = data1.tags[tag];
            continue;
        }

        // Shared
        const tag1 = data1.tags[tag];
        const tag2 = data2.tags[tag];

        const mergedTweets = [...new Set([...tag1.tweets, ...tag2.tweets])];
        const tweets: string[] = [];
        const mergedTweetsModifiedAt: Record<string, number> = {};

        for (const tweet of mergedTweets) {
            const modifiedAt1 = tag1.tweetsModifiedAt?.[tweet] ?? 0;
            const modifiedAt2 = tag2.tweetsModifiedAt?.[tweet] ?? 0;

            if (modifiedAt1 > modifiedAt2 && !tag1.tweets.includes(tweet)) {
                continue;
            } else if (modifiedAt2 > modifiedAt1 && !tag2.tweets.includes(tweet)) {
                continue;
            }

            tweets.push(tweet);
            mergedTweetsModifiedAt[tweet] = Math.max(modifiedAt1, modifiedAt2);
        }

        merged.tags[tag] = {
            modifiedAt: Math.max(tag1.modifiedAt ?? 0, tag2.modifiedAt ?? 0),
            deletedAt: Math.max(tag1.deletedAt ?? 0, tag2.deletedAt ?? 0),
            tweets,
            tweetsModifiedAt: mergedTweetsModifiedAt,
        };
    }

    // - Unique to data2
    for (const tag of tags2) {
        merged.tags[tag] = data2.tags[tag];
    }

    // Tweets
    const tweets1 = Object.keys(data1.tweets);
    const tweets2 = Object.keys(data2.tweets).filter((tweet) => !tweets1.includes(tweet));

    // - Shared and unique to data1
    for (const tweet of tweets1) {
        if (!Object.keys(data2.tweets).includes(tweet)) {
            merged.tweets[tweet] = data1.tweets[tweet];
            continue;
        }

        // Shared
        const tweet1 = data1.tweets[tweet];
        const tweet2 = data2.tweets[tweet];

        merged.tweets[tweet] = {
            modifiedAt: Math.max(tweet1.modifiedAt ?? 0, tweet2.modifiedAt ?? 0),
            deletedAt: Math.max(tweet1.deletedAt ?? 0, tweet2.deletedAt ?? 0),
            images: [...new Set([...tweet1.images, ...tweet2.images].map(stripeNameParam))],
        };
    }

    // - Unique to data2
    for (const tweet of tweets2) {
        merged.tweets[tweet] = data2.tweets[tweet];
    }

    return merged;
}
