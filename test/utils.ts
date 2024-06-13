import { RawTag, RawTweet, RawUserData, Tag, Tweet, UserData } from '../src/models';

const TAG_DEFAULT: RawTag = {
    deletedAt: 0,
    modifiedAt: 1,
    tweets: [],
    tweetsModifiedAt: {},
};

const TWEET_DEFAULT: RawTweet = {
    deletedAt: 0,
    modifiedAt: 1,
    images: [],
};

export const userData = (partialData: {
    tags?: Record<string, Partial<RawTag>>;
    tweets?: Record<string, Partial<RawTweet>>;
}): RawUserData => ({
    tags: Object.fromEntries(
        Object.entries(partialData.tags || {}).map(([key, value]) => [
            key,
            { ...TAG_DEFAULT, ...value },
        ])
    ),
    tweets: Object.fromEntries(
        Object.entries(partialData.tweets || {}).map(([key, value]) => [
            key,
            { ...TWEET_DEFAULT, ...value },
        ])
    ),
});

export const tagsData = (tags: Record<string, Partial<RawTag>>): UserData => userData({ tags });
export const tweetsData = (tweets: Record<string, Partial<RawTweet>>): UserData =>
    userData({ tweets });
