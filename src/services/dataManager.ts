import {
    RawTag,
    RawTags,
    RawTweet,
    RawTweets,
    RawUserData,
    UserData,
    WithMetadata,
} from '../models';

// Getters
export function filterExists(data?: WithMetadata): boolean {
    if (!data) {
        return false;
    }
    return data.modifiedAt >= data.deletedAt;
}

export function getExistingTags(userData: RawUserData): RawTags {
    const existingTags: RawTags = {};
    for (const tagName in userData.tags) {
        if (filterExists(userData.tags[tagName])) {
            existingTags[tagName] = userData.tags[tagName];
        }
    }
    return existingTags;
}

export function getExistingTweets(userData: RawUserData): RawTweets {
    const existingTweets: RawTweets = {};
    for (const tweetId in userData.tweets) {
        if (filterExists(userData.tweets[tweetId])) {
            existingTweets[tweetId] = userData.tweets[tweetId];
        }
    }
    return existingTweets;
}

// Setters
export function createTag(userData: RawUserData, tagName: string): RawUserData {
    const { tags, tweets } = structuredClone(userData);
    tags[tagName] = {
        tweets: [],
        modifiedAt: Date.now(),
        deletedAt: 0,
        tweetsModifiedAt: {},
    };
    return { tags, tweets };
}

export function deleteTag(userData: RawUserData, tagName: string): RawUserData {
    const { tags, tweets } = structuredClone(userData);
    tags[tagName] = {
        ...tags[tagName],
        deletedAt: Date.now(),
    };
    return { tags, tweets };
}

export function renameTag(
    userData: RawUserData,
    oldTagName: string,
    newTagName: string
): RawUserData {
    const { tags, tweets } = structuredClone(userData);
    tags[oldTagName].deletedAt = Date.now();
    tags[newTagName] = structuredClone(tags[oldTagName]);
    tags[newTagName].deletedAt = 0;
    tags[newTagName].modifiedAt = Date.now();
    for (const tweetId of tags[newTagName].tweets) {
        tags[newTagName].tweetsModifiedAt = tags[newTagName].tweetsModifiedAt ?? {};
        tags[newTagName].tweetsModifiedAt![tweetId] = Date.now();
    }
    return { tags, tweets };
}

export function tagTweet(
    userData: RawUserData,
    tweetId: string,
    tagName: string,
    imagesCache: string[]
): RawUserData {
    const { tags, tweets } = structuredClone(userData);
    let tag: RawTag = {
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

    tweets[tweetId] = {
        images: tweets[tweetId]?.images ?? imagesCache.map(stripeNameParam),
        modifiedAt: Date.now(),
        deletedAt: tweets[tweetId]?.deletedAt ?? 0,
    };

    tweets[tweetId].modifiedAt = Date.now();
    return { tags, tweets };
}

export function removeTag(userData: RawUserData, tweetId: string, tagName: string) {
    const { tags, tweets } = structuredClone(userData);
    tags[tagName].tweets = tags[tagName].tweets.filter((id) => id !== tweetId);
    tags[tagName].modifiedAt = Date.now();
    tags[tagName].tweetsModifiedAt[tweetId] = Date.now();
    tags[tagName].tweets.forEach((id) => {
        tweets[id].modifiedAt = Date.now();
    });
    return { tags, tweets };
}

export function removeTweet(userData: RawUserData, tweetId: string) {
    let newData = structuredClone(userData);

    for (const tagName in newData.tags) {
        if (!newData.tags[tagName].tweets.includes(tweetId)) {
            continue;
        }
        newData = removeTag(newData, tweetId, tagName);
    }
    newData.tweets[tweetId].deletedAt = Date.now();
    return newData;
}

// sync
function stripeNameParam(url: string) {
    const urlObj = new URL(url);
    const searchParams = urlObj.searchParams;
    searchParams.delete('name');
    urlObj.search = searchParams.toString();
    return urlObj.toString();
}

export function updateTimeStamps(userData: RawUserData): RawUserData {
    const { tags, tweets } = userData;

    const now = Date.now();
    for (const tag of Object.keys(tags)) {
        if (filterExists(tags[tag])) {
            tags[tag].modifiedAt = now;
        } else {
            tags[tag].deletedAt = now;
        }

        for (const tweet of tags[tag].tweets) {
            tags[tag].tweetsModifiedAt[tweet] = now;
        }
    }

    for (const tweet of Object.keys(tweets)) {
        if (filterExists(tweets[tweet])) {
            tweets[tweet].modifiedAt = now;
        } else {
            tweets[tweet].deletedAt = now;
        }
    }

    return userData;
}

export function mergeData(data1: RawUserData, data2: RawUserData): RawUserData {
    const merged: RawUserData = {
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
            images: [
                ...new Set([
                    ...tweet1.images.map(stripeNameParam),
                    ...tweet2.images.map(stripeNameParam),
                ]),
            ],
        };
    }

    // - Unique to data2
    for (const tweet of tweets2) {
        merged.tweets[tweet] = data2.tweets[tweet];
    }

    return merged;
}

export function removeMetadata(userData: RawUserData): UserData {
    const { tags, tweets } = userData;

    const pureData: UserData = {
        tags: {},
        tweets: {},
    };

    for (const tag in tags) {
        if (filterExists(tags[tag])) {
            pureData.tags[tag] = {
                tweets: tags[tag].tweets,
            };
        }
    }

    for (const tweet in tweets) {
        if (filterExists(tweets[tweet])) {
            pureData.tweets[tweet] = {
                images: tweets[tweet].images,
            };
        }
    }

    return pureData;
}

export function equals(data1: RawUserData, data2: RawUserData): boolean {
    const data1Tags = Object.keys(data1.tags);
    const data2Tags = Object.keys(data2.tags);

    if (data1Tags.length !== data2Tags.length) {
        return false;
    }

    for (const tag of data1Tags) {
        if (!data2Tags.includes(tag)) {
            return false;
        }

        if (!eqTag(data1.tags[tag], data2.tags[tag])) {
            return false;
        }
    }

    const data1Tweets = Object.keys(data1.tweets);
    const data2Tweets = Object.keys(data2.tweets);

    if (data1Tweets.length !== data2Tweets.length) {
        return false;
    }

    for (const tweet of data1Tweets) {
        if (!data2Tweets.includes(tweet)) {
            return false;
        }

        if (!eqTweet(data1.tweets[tweet], data2.tweets[tweet])) {
            return false;
        }
    }

    return true;
}

function eqTag(tag1: RawTag, tag2: RawTag) {
    const dateEqual = tag1.modifiedAt === tag2.modifiedAt && tag1.deletedAt === tag2.deletedAt;
    const tweetsEqual = eqSet(new Set(tag1.tweets), new Set(tag2.tweets));
    const tweetsModifiedAtEqual = eqSet(
        new Set(Object.keys(tag1.tweetsModifiedAt ?? {})),
        new Set(Object.keys(tag2.tweetsModifiedAt ?? {}))
    );
    return dateEqual && tweetsEqual && tweetsModifiedAtEqual;
}

function eqTweet(tweet1: RawTweet, tweet2: RawTweet) {
    return (
        tweet1.modifiedAt === tweet2.modifiedAt &&
        tweet1.deletedAt === tweet2.deletedAt &&
        eqSet(new Set(tweet1.images), new Set(tweet2.images))
    );
}

function eqSet<T>(xs: Set<T>, ys: Set<T>) {
    return xs.size === ys.size && [...xs].every((x) => ys.has(x));
}
