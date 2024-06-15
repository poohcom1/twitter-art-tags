import { dataManager } from '../src/services/dataManager';
import { userData } from './utils';

jest.useFakeTimers();

describe('dataManager', () => {
    describe('e2e', () => {
        it('tweet deletion flow', () => {
            let data = userData({});
            data = dataManager.tagTweet(data, 'tweet1', 'tag1', ['https://www.image1.com/']);

            const initialTime = Date.now();

            expect(Object.keys(dataManager.getExistingTags(data))).toHaveLength(1);
            expect(Object.keys(dataManager.getExistingTweets(data))).toHaveLength(1);

            expect(Object.keys(data.tags)).toHaveLength(1);
            expect(data.tags.tag1.tweets).toStrictEqual(['tweet1']);
            expect(data.tags.tag1.tweetsModifiedAt.tweet1).toStrictEqual(initialTime);
            expect(Object.keys(data.tweets)).toHaveLength(1);
            expect(data.tweets.tweet1.modifiedAt).toStrictEqual(initialTime);
            expect(data.tweets.tweet1.deletedAt).toStrictEqual(0);
            expect(data.tweets.tweet1.images).toStrictEqual(['https://www.image1.com/']);

            jest.advanceTimersByTime(1000);

            data = dataManager.removeTweet(data, 'tweet1');
            expect(Object.keys(data.tags)).toHaveLength(1);
            expect(data.tags.tag1.tweets).toStrictEqual([]);
            expect(data.tags.tag1.tweetsModifiedAt.tweet1).toStrictEqual(initialTime + 1000);
            expect(Object.keys(data.tweets)).toHaveLength(1);
            expect(data.tweets.tweet1.modifiedAt).toStrictEqual(initialTime);
            expect(data.tweets.tweet1.deletedAt).toStrictEqual(initialTime + 1000);

            expect(Object.keys(dataManager.getExistingTags(data))).toHaveLength(1);
            expect(Object.keys(dataManager.getExistingTweets(data))).toHaveLength(0);
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

            const result = dataManager.removeTweet(data, 'tweet1');
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

    describe('updateTimestamps', () => {
        it('should update all tags correctly', () => {
            const pastTime = Date.now() - 1000;
            const currentTime = Date.now();

            const oldData = userData({
                tags: {
                    currentTag: {
                        tweets: ['tweet1', 'tweet2'],
                        modifiedAt: currentTime,
                        deletedAt: pastTime,
                        tweetsModifiedAt: {
                            tweet1: currentTime,
                            tweet2: pastTime,
                        },
                    },
                    deletedTag: {
                        tweets: ['tweet2'],
                        modifiedAt: pastTime,
                        deletedAt: currentTime,
                    },
                },
            });

            jest.advanceTimersByTime(1000);

            const result = dataManager.updateTimeStamps(oldData);
            const updatedTime = Date.now();
            expect(result).toEqual(
                userData({
                    tags: {
                        currentTag: {
                            tweets: ['tweet1', 'tweet2'],
                            modifiedAt: updatedTime,
                            deletedAt: oldData.tags.currentTag.deletedAt,
                            tweetsModifiedAt: {
                                tweet1: updatedTime,
                                tweet2: updatedTime,
                            },
                        },
                        deletedTag: {
                            tweets: ['tweet2'],
                            modifiedAt: oldData.tags.deletedTag.modifiedAt,
                            deletedAt: updatedTime,
                            tweetsModifiedAt: {
                                tweet2: updatedTime,
                            },
                        },
                    },
                })
            );
        });
    });

    describe('mergeData', () => {
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

            const result = dataManager.mergeData(data1, data2);
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

            const result = dataManager.mergeData(data1, data2);
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

            const result = dataManager.mergeData(data1, data2);
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
