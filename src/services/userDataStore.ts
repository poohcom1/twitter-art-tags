import { createStore } from 'solid-js/store';
import { RawUserData, UserData } from '../models';
import { createEffect } from 'solid-js';
import * as dataManager from '../services/dataManager';
import { KEY_USER_DATA } from '../constants';
import { CACHE_UPDATE_EVENT, CacheUpdateEvent, gmGetWithCache } from './cache';

const DEFAULT_USER_DATA: RawUserData = {
    tags: {},
    tweets: {},
};

const [userData, set] = createStore<UserData>(DEFAULT_USER_DATA);

createEffect(() => {
    GM.getValue<RawUserData>(KEY_USER_DATA, DEFAULT_USER_DATA).then((data) => {
        if (data) {
            set(dataManager.removeMetadata(data));
        }
    });

    document.addEventListener(CACHE_UPDATE_EVENT, async (e) => {
        if ((e as CacheUpdateEvent).detail.key === KEY_USER_DATA) {
            set(
                dataManager.removeMetadata(
                    await gmGetWithCache<RawUserData>(KEY_USER_DATA, DEFAULT_USER_DATA)
                )
            );
        }
    });
});

export { userData as userDataStore };
