import { array, InferOutput, number, object, record, string } from 'valibot';

const TweetSchema = object({
    images: array(string()),
    // Meta
    modifiedAt: number(),
    deletedAt: number(),
});
const TweetsSchema = record(string(), TweetSchema);

export const TagSchema = object({
    tweets: array(string()),
    // Meta
    modifiedAt: number(),
    deletedAt: number(),
    tweetsModifiedAt: record(string(), number()),
});
const TagsSchema = record(string(), TagSchema);

export const UserDataSchema = object({
    tweets: TweetsSchema,
    tags: TagsSchema,
});

// Type definitions
export type RawTweet = InferOutput<typeof TweetSchema>;
export type RawTweets = InferOutput<typeof TweetsSchema>;
export type RawTag = InferOutput<typeof TagSchema>;
export type RawTags = InferOutput<typeof TagsSchema>;
/**
 * Schema for representing tags and tweets data.
 * Existences of tags and image depends on metadata, so tags that are present in the tags object may have already been deleted.
 * Use the dataManager.ts module to interact with this data.
 */
export type RawUserData = InferOutput<typeof UserDataSchema>;

export type Tweet = Omit<RawTweet, keyof WithMetadata>;
export type Tweets = Record<string, Tweet>;
export type Tag = Omit<RawTag, keyof WithMetadata | 'tweetsModifiedAt'>;
export type Tags = Record<string, Tag>;

export interface UserData {
    tweets: Tweets;
    tags: Tags;
}

export interface WithMetadata {
    modifiedAt: number;
    deletedAt: number;
}
