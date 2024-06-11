import { mergeData } from '../src/services/dataManagement';
import { userData } from './utils';

describe('dataManager', () => {
    describe('sync', () => {
        it('should merge normally if there are no overlaps', () => {
            const data1 = userData({
                tags: {
                    tag1: { tweets: ['tweet1'] },
                },
                tweets: {
                    tweet1: {},
                },
            });
            const data2 = userData({
                tags: {
                    tag2: { tweets: ['tweet2'] },
                },
                tweets: {
                    tweet2: {},
                },
            });

            const result = mergeData(data1, data2);
            expect(result).toEqual(
                userData({
                    tags: {
                        tag1: { tweets: ['tweet1'] },
                        tag2: { tweets: ['tweet2'] },
                    },
                    tweets: {
                        tweet1: {},
                        tweet2: {},
                    },
                })
            );
        });

        it('should delete tag if deleted_at is newer', () => {
            const data1 = userData({
                tags: {
                    tag1: { modifiedAt: 100, tweets: ['tweet1'], tweetsModifiedAt: { tweet1: 5 } },
                },
                tweets: {
                    tweet1: { deletedAt: 123 },
                },
            });
            const data2 = userData({
                tags: {
                    tag1: { deletedAt: 123, tweets: ['tweet1'] },
                },
                tweets: {
                    tweet1: { modifiedAt: 100 },
                },
            });

            const result = mergeData(data1, data2);
            expect(result).toEqual(
                userData({
                    tags: {
                        tag1: {
                            deletedAt: 123,
                            modifiedAt: 100,
                            tweets: ['tweet1'],
                            tweetsModifiedAt: { tweet1: 5 },
                        },
                    },
                    tweets: {
                        tweet1: { deletedAt: 123, modifiedAt: 100 },
                    },
                })
            );
        });

        it('should delete tweet if deleted_at is newer', () => {
            const data1 = userData({
                tags: {
                    tag1: {
                        tweets: ['tweet1'],
                        tweetsModifiedAt: { tweet1: 100 },
                    },
                },
            });
            const data2 = userData({
                tags: {
                    tag1: { tweetsModifiedAt: { tweet1: 123 } },
                },
            });

            const result = mergeData(data1, data2);
            expect(result).toEqual(
                userData({
                    tags: {
                        tag1: { tweets: [], tweetsModifiedAt: {} },
                    },
                })
            );
        });
    });
});
