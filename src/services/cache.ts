// Cache
const cache: Record<string, unknown> = {};

const pendingPromises: Record<string, Promise<void> | undefined> = {};
export async function gmSetWithCache<T>(key: string, value: T) {
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

export async function clearCache(key: string, defaultValue: unknown) {
    cache[key] = defaultValue;
}

export async function reloadCache(key: string, defaultValue: unknown) {
    cache[key] = await GM.getValue(key, defaultValue);
}
