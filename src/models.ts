import { object, array, record, number, string, InferOutput } from 'valibot';

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
export type Tweet = InferOutput<typeof TweetSchema>;
export type Tweets = InferOutput<typeof TweetsSchema>;
export type Tag = InferOutput<typeof TagSchema>;
export type Tags = InferOutput<typeof TagsSchema>;
export type UserData = InferOutput<typeof UserDataSchema>;

export interface WithMetadata {
    modifiedAt: number;
    deletedAt: number;
}
