import * as dataManagement from '../src/services/dataManagement';
import { userData } from './utils';

jest.useFakeTimers();

describe('dataManagement', () => {
    describe('e2e', () => {
        it('tweet deletion flow', () => {
            let data = userData({});
            data = dataManagement.tagTweet(data, 'tweet1', 'tag1', ['https://www.image1.com/']);

            const initialTime = Date.now();

            expect(Object.keys(dataManagement.getExistingTags(data))).toHaveLength(1);
            expect(Object.keys(dataManagement.getExistingTweets(data))).toHaveLength(1);

            expect(Object.keys(data.tags)).toHaveLength(1);
            expect(data.tags.tag1.tweets).toStrictEqual(['tweet1']);
            expect(data.tags.tag1.tweetsModifiedAt.tweet1).toStrictEqual(initialTime);
            expect(Object.keys(data.tweets)).toHaveLength(1);
            expect(data.tweets.tweet1.modifiedAt).toStrictEqual(initialTime);
            expect(data.tweets.tweet1.deletedAt).toStrictEqual(0);
            expect(data.tweets.tweet1.images).toStrictEqual(['https://www.image1.com/']);

            jest.advanceTimersByTime(1000);

            data = dataManagement.removeTweet(data, 'tweet1');
            expect(Object.keys(data.tags)).toHaveLength(1);
            expect(data.tags.tag1.tweets).toStrictEqual([]);
            expect(data.tags.tag1.tweetsModifiedAt.tweet1).toStrictEqual(initialTime + 1000);
            expect(Object.keys(data.tweets)).toHaveLength(1);
            expect(data.tweets.tweet1.modifiedAt).toStrictEqual(initialTime);
            expect(data.tweets.tweet1.deletedAt).toStrictEqual(initialTime + 1000);

            expect(Object.keys(dataManagement.getExistingTags(data))).toHaveLength(1);
            expect(Object.keys(dataManagement.getExistingTweets(data))).toHaveLength(0);
        });
    });

    describe('removeTweet', () => {
        it('should remove tweet from tags and tweets', () => {
            const data = userData({
                tags: {
                    tag1: { tweets: ['tweet1'] },
                },
                tweets: {
                    tweet1: {},
                },
            });

            const result = dataManagement.removeTweet(data, 'tweet1');
            expect(result).toEqual(
                userData({
                    tags: {
                        tag1: {
                            tweets: [],
                            modifiedAt: Date.now(),
                            tweetsModifiedAt: {
                                tweet1: Date.now(),
                            },
                        },
                    },
                    tweets: {
                        tweet1: { deletedAt: Date.now() },
                    },
                })
            );
        });
    });

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

            const result = dataManagement.mergeData(data1, data2);
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

            const result = dataManagement.mergeData(data1, data2);
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

            const result = dataManagement.mergeData(data1, data2);
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
