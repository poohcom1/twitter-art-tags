import { KEY_TWEETS, KEY_TAGS } from './constants';
import { Tweets, Tags } from './models';

export const cacheInvalidated = new Event('cacheInvalidated');
if (process.env.NODE_ENV !== 'test') {
    document.addEventListener('visibilitychange', () => {
        delete cache[KEY_TWEETS];
        delete cache[KEY_TAGS];
        Promise.all([GM.getValue<Tweets>(KEY_TWEETS, {}), GM.getValue<Tags>(KEY_TAGS, {})]).then(
            ([tweets, tags]) => {
                cache[KEY_TWEETS] = tweets;
                cache[KEY_TAGS] = tags;
                document.dispatchEvent(cacheInvalidated);
            }
        );
    });
}

// Cache
const cache: Record<string, unknown> = {};

const pendingPromises: Record<string, Promise<void> | undefined> = {};
export async function gmSetWithCache(key: string, value: unknown) {
    cache[key] = value;

    if (key in pendingPromises) {
        await pendingPromises[key];
    }

    pendingPromises[key] = GM.setValue(key, value);
}

export async function gmGetWithCache<T>(key: string, defVal: T): Promise<T> {
    if (key in cache) {
        GM.getValue(key, cache[key]).then((v) => (cache[key] = v)); // Update cache
        return cache[key] as T;
    }

    const value = await GM.getValue<T>(key, defVal);
    cache[key] = value;
    return value;
}

export async function clearCache() {
    cache[KEY_TAGS] = {};
    cache[KEY_TWEETS] = {};
}
