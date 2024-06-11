import { ExportData, Tag, Tweet } from '../src/models';
import { createTag, getTags, mergeData } from '../src/storage';

global.alert = jest.fn();
global.GM = {
    getValue: jest.fn(),
    setValue: jest.fn(),
} as any;

const mockSetValue = jest.fn();
const mockGetValue = jest.fn();
jest.mock('../src/cache.ts', () => ({
    gmSetWithCache: (...args: any[]) => mockSetValue(...args),
    gmGetWithCache: (...args: any[]) => mockGetValue(...args),
}));

const TAG_DEFAULT: Tag = {
    deletedAt: 0,
    modifiedAt: 1,
    tweets: [],
    tweetsModifiedAt: {},
};

const TWEET_DEFAULT: Tweet = {
    deletedAt: 0,
    modifiedAt: 1,
    images: [],
};

describe('storage', () => {
    describe('createTag', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should not fail if tag exists but is deleted', async () => {
            mockGetValue.mockResolvedValueOnce({
                tag1: { tweets: [], deletedAt: 123 },
            });

            await createTag('tag1');

            expect(alert).not.toHaveBeenCalled();
            expect(mockSetValue).toHaveBeenCalled();
            expect(mockSetValue).toHaveBeenCalledWith('tags', {
                tag1: {
                    tweets: [],
                    modifiedAt: expect.any(Number),
                    deletedAt: 0,
                    tweetsModifiedAt: {},
                },
            });
        });

        it('should fail if tag exists', async () => {
            mockGetValue.mockResolvedValueOnce({
                tag1: { tweets: [] },
            });

            await createTag('tag1');

            expect(alert).toHaveBeenCalled();
            expect(mockSetValue).not.toHaveBeenCalled();
        });
    });

    describe('getTags', () => {
        it('should not return deleted tags', async () => {
            mockGetValue.mockResolvedValueOnce({
                tag1: { ...TAG_DEFAULT, tweets: [], deletedAt: 2, modifiedAt: 1 },
                tag2: { ...TAG_DEFAULT, tweets: [], deletedAt: 1, modifiedAt: 2 },
                tag3: { ...TAG_DEFAULT, tweets: [] },
            });

            const tags = await getTags();
            expect(tags).toEqual({
                tag2: { ...TAG_DEFAULT, tweets: [], deletedAt: 1, modifiedAt: 2 },
                tag3: { ...TAG_DEFAULT, tweets: [] },
            });
        });
    });

    describe('sync', () => {
        it('should merge normally if there are no overlaps', () => {
            const data1: ExportData = {
                tags: {
                    tag1: { ...TAG_DEFAULT, tweets: ['tweet1'] },
                },
                tweets: {
                    tweet1: { ...TWEET_DEFAULT, images: [] },
                },
            };
            const data2: ExportData = {
                tags: {
                    tag2: { ...TAG_DEFAULT, tweets: ['tweet2'] },
                },
                tweets: {
                    tweet2: { ...TWEET_DEFAULT, images: [] },
                },
            };

            const result = mergeData(data1, data2);
            expect(result).toEqual({
                tags: {
                    tag1: { ...TAG_DEFAULT, tweets: ['tweet1'] },
                    tag2: { ...TAG_DEFAULT, tweets: ['tweet2'] },
                },
                tweets: {
                    tweet1: { ...TWEET_DEFAULT, images: [] },
                    tweet2: { ...TWEET_DEFAULT, images: [] },
                },
            });
        });

        it('should delete if deleted_at is newer', () => {
            const data1: ExportData = {
                tags: {
                    tag1: { ...TAG_DEFAULT, modifiedAt: 100, tweets: ['tweet1'] },
                },
                tweets: {
                    tweet1: { ...TWEET_DEFAULT, deletedAt: 123, images: [] },
                },
            };
            const data2: ExportData = {
                tags: {
                    tag1: { ...TAG_DEFAULT, deletedAt: 123, tweets: ['tweet1'] },
                },
                tweets: {
                    tweet1: { ...TWEET_DEFAULT, modifiedAt: 100, images: [] },
                },
            };

            const result = mergeData(data1, data2);
            expect(result).toEqual({
                tags: {
                    tag1: {
                        deletedAt: 123,
                        modifiedAt: 100,
                        tweets: ['tweet1'],
                        tweetsModifiedAt: {
                            tweet1: 0,
                        },
                    },
                },
                tweets: {
                    tweet1: { deletedAt: 123, modifiedAt: 100, images: [] },
                },
            });
        });

        it('should delete tweet if deleted_at is newer', () => {
            const data1: ExportData = {
                tags: {
                    tag1: {
                        ...TAG_DEFAULT,
                        tweets: ['tweet1'],
                        tweetsModifiedAt: { tweet1: 100 },
                    },
                },
                tweets: {},
            };
            const data2: ExportData = {
                tags: {
                    tag1: { ...TAG_DEFAULT, tweets: [], tweetsModifiedAt: { tweet1: 123 } },
                },
                tweets: {},
            };

            const result = mergeData(data1, data2);
            expect(result).toEqual({
                tags: {
                    tag1: { ...TAG_DEFAULT, tweets: [], tweetsModifiedAt: {} },
                },
                tweets: {},
            });
        });
    });
});
