import { object, array, record, number, string, InferOutput } from 'valibot';

const Tweet = object({
    images: array(string()),
});

const Tweets = record(string(), Tweet);

export const Tag = object({
    tweets: array(string()),
    lastUpdated: number(),
});

const Tags = record(string(), Tag);

export const DataExport = object({
    tweets: Tweets,
    tags: Tags,
});

// Type definitions
export type Tweet = InferOutput<typeof Tweet>;
export type Tweets = InferOutput<typeof Tweets>;
export type Tag = InferOutput<typeof Tag>;
export type Tags = InferOutput<typeof Tags>;
export type DataExport = InferOutput<typeof DataExport>;
