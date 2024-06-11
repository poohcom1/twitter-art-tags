import { KEY_USER_DATA } from '../src/constants';
import { Tag, Tweet, UserData } from '../src/models';
import { createTag, getTags } from '../src/services/storage';
import { tagsData } from './utils';

global.alert = jest.fn();
global.GM = {
    getValue: jest.fn(),
    setValue: jest.fn(),
} as any;

const mockSetValue = jest.fn();
const mockGetValue = jest.fn();
jest.mock('../src/services/cache.ts', () => ({
    gmSetWithCache: (...args: any[]) => mockSetValue(...args),
    gmGetWithCache: (...args: any[]) => mockGetValue(...args),
}));

describe('storage', () => {
    describe('createTag', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should not fail if tag exists but is deleted', async () => {
            mockGetValue.mockResolvedValueOnce(
                tagsData({
                    tag1: { tweets: [], deletedAt: 123 },
                })
            );

            await createTag('tag1');

            expect(alert).not.toHaveBeenCalled();
            expect(mockSetValue).toHaveBeenCalled();
            expect(mockSetValue).toHaveBeenCalledWith(
                KEY_USER_DATA,
                tagsData({
                    tag1: {
                        tweets: [],
                        modifiedAt: expect.any(Number),
                        deletedAt: 0,
                        tweetsModifiedAt: {},
                    },
                })
            );
        });

        it('should fail if tag exists', async () => {
            mockGetValue.mockResolvedValueOnce(
                tagsData({
                    tag1: { tweets: [] },
                })
            );

            await createTag('tag1');

            expect(alert).toHaveBeenCalled();
            expect(mockSetValue).not.toHaveBeenCalled();
        });
    });

    describe('getTags', () => {
        it('should not return deleted tags', async () => {
            mockGetValue.mockResolvedValueOnce(
                tagsData({
                    tag1: { deletedAt: 2, modifiedAt: 1 },
                    tag2: { deletedAt: 1, modifiedAt: 2 },
                    tag3: {},
                })
            );

            const tags = await getTags();
            expect(tags).toEqual(
                tagsData({
                    tag2: { deletedAt: 1, modifiedAt: 2 },
                    tag3: {},
                }).tags
            );
        });
    });
});
