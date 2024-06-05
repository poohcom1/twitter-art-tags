import { z } from 'zod';

const Tweet = z.object({
    images: z.array(z.string()),
});

const Tweets = z.record(Tweet);

export const Tag = z.object({
    tweets: z.array(z.string()),
    lastUpdated: z.number(),
});

const Tags = z.record(Tag);

export const DataExport = z.object({
    tweets: Tweets,
    tags: Tags,
});

// Type definitions
export type Tweet = z.infer<typeof Tweet>;
export type Tweets = z.infer<typeof Tweets>;
export type Tag = z.infer<typeof Tag>;
export type Tags = z.infer<typeof Tags>;
export type DataExport = z.infer<typeof DataExport>;
