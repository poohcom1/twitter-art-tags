import { object, array, record, number, string, InferOutput } from 'valibot';

const Tweet = object({
    images: array(string()),
    // Meta
    modifiedAt: number(),
    deletedAt: number(),
});
const Tweets = record(string(), Tweet);

export const Tag = object({
    tweets: array(string()),
    // Meta
    modifiedAt: number(),
    deletedAt: number(),
    tweetsModifiedAt: record(string(), number()),
});
const Tags = record(string(), Tag);

export const ExportData = object({
    tweets: Tweets,
    tags: Tags,
});

// Type definitions
export type Tweet = InferOutput<typeof Tweet>;
export type Tweets = InferOutput<typeof Tweets>;
export type Tag = InferOutput<typeof Tag>;
export type Tags = InferOutput<typeof Tags>;
export type ExportData = InferOutput<typeof ExportData>;

export interface WithMetadata {
    modifiedAt: number;
    deletedAt: number;
}
