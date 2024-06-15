import { gmSetWithCache } from './cache';
import { KEY_USER_DATA, KEY_USER_TOKEN } from '../constants';
import { RawUserData } from '../models';
import { getRawUserData, getUserData } from './storage';
import { dataManager } from './dataManager';
import { asyncXmlHttpRequest, saveFile } from '../utils';

export interface UserInfo {
    user_id: string;
    email: string;
    username: string;
    access_token: string;
}

export interface UserInfoData {
    userInfo: UserInfo;
    userDataExists: boolean;
    userDataSynced: boolean;
    syncedAt: string;
}

interface UserDataRow {
    user_id: string;
    data: RawUserData;
    synced_at: string;
}

interface AccessTokenStore {
    accessToken: string;
    expiresAt: number;
    refreshToken: string;
}

const URL = process.env.SUPABASE_URL!;
const API_KEY = process.env.SUPABASE_KEY!;
const TABLE_NAME = 'user_data';

// Tasks
export let loginRedirected = false;

{
    const paramsString = window.location.href.split('#')[1];
    if (paramsString) {
        const params = new URLSearchParams(paramsString);

        const date = new Date();
        date.setTime(date.getTime() + Number.parseInt(params.get('expires_in') ?? '0') * 1000);
        const userStore = {
            accessToken: params.get('access_token') ?? '',
            refreshToken: params.get('refresh_token') ?? '',
            expiresAt: date.getTime(),
        };

        GM.setValue(KEY_USER_TOKEN, userStore);

        window.history.replaceState({}, document.title, window.location.pathname);

        loginRedirected = true;
    }
}

export async function getUserInfo(): Promise<UserInfoData | null> {
    let accessToken = '';

    const userStore = await GM.getValue<AccessTokenStore>(KEY_USER_TOKEN, null);
    if (userStore) {
        if (userStore.expiresAt > Date.now()) {
            accessToken = userStore.accessToken;
        } else {
            const refreshedData = await refreshToken(userStore);
            if (refreshedData) {
                accessToken = refreshedData.accessToken;
            }
        }
    }

    try {
        if (accessToken) {
            const encodedSession = accessToken.split('.')[1];
            const data: Supabase.JWTToken = JSON.parse(atob(encodedSession));
            const userInfo = {
                user_id: data.sub,
                email: data.email,
                username: data.user_metadata.preferred_username,
                access_token: accessToken,
            };
            const [onlineUserData, localUserData] = await Promise.all([
                downloadData(userInfo),
                getRawUserData(),
            ]);
            return {
                userInfo,
                userDataExists: !!onlineUserData?.data,
                userDataSynced:
                    onlineUserData !== null
                        ? dataManager.equals(localUserData, onlineUserData.data)
                        : false,
                syncedAt: onlineUserData?.synced_at ?? '',
            };
        }
    } catch (e: unknown) {
        console.log('Error getting user info: ' + JSON.stringify(e));
    }

    return null;
}

export async function syncData(userInfo: UserInfo): Promise<boolean> {
    console.log('Downloading data...');
    const onlineData = await downloadData(userInfo);
    console.log('Data found: ' + !!onlineData);

    let data = await getRawUserData();

    if (onlineData) {
        data = dataManager.mergeData(data, onlineData.data);
    }

    console.log('Uploading data...');
    const success = await uploadData(userInfo, data);
    console.log('Data uploaded successfully: ' + success);

    if (success) {
        await gmSetWithCache(KEY_USER_DATA, data);
    }

    return success;
}

// API
export async function signIn(): Promise<void> {
    try {
        const res = await asyncXmlHttpRequest({
            url: `${URL}/auth/v1/authorize?provider=twitter`,
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                apikey: API_KEY,
            },
        });

        window.location.href = res.finalUrl;
    } catch (e: unknown) {
        console.warn('Sign in error - rejected');
        console.error(JSON.stringify(e));
        alert('Failed to redirect to twitter login');
    }
}

export async function signOut(userInfo: UserInfo) {
    await GM.deleteValue(KEY_USER_TOKEN);

    asyncXmlHttpRequest({
        url: `${URL}/auth/v1/logout`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            apikey: API_KEY,
            Authorization: `Bearer ${userInfo.access_token}`,
        },
    });
}

async function refreshToken(tokenData: AccessTokenStore): Promise<AccessTokenStore | null> {
    let res: GM.Response<unknown>;
    try {
        // https://github.com/supabase/auth-js/blob/5c43ca5ffda8b9cccc493a47a4d3a6194a057ad2/src/GoTrueClient.ts#L838
        res = await asyncXmlHttpRequest({
            url: `${URL}/auth/v1/token?grant_type=refresh_token`,
            method: 'POST',
            headers: {
                apiKey: API_KEY,
            },
            data: JSON.stringify({
                refresh_token: tokenData.refreshToken,
            }),
        });
    } catch (e) {
        console.error('Refresh token error -- ' + JSON.stringify(e));
        return null;
    }

    if (res.status >= 400) {
        console.error('Refresh token status error -- ' + JSON.stringify(res));
        return null;
    }

    const data: Supabase.TokenResponseSuccess = JSON.parse(res.responseText);

    const store: AccessTokenStore = {
        accessToken: data.access_token,
        expiresAt: data.expires_at * 1000,
        refreshToken: data.refresh_token,
    };

    await GM.setValue(KEY_USER_TOKEN, store);

    return store;
}

export async function uploadData(userInfo: UserInfo, data: RawUserData): Promise<boolean> {
    const bodyJson: UserDataRow = {
        user_id: userInfo.user_id,
        data,
        synced_at: new Date().toISOString(),
    };

    try {
        const res = await asyncXmlHttpRequest({
            url: `${URL}/rest/v1/${TABLE_NAME}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                apikey: API_KEY,
                Authorization: `Bearer ${userInfo.access_token}`,
                Prefer: 'resolution=merge-duplicates',
            },
            data: JSON.stringify(bodyJson),
        });

        if (res.status >= 400) {
            console.error(JSON.stringify(res));
            return false;
        }

        if (res.status >= 400) {
            console.error(JSON.stringify(res));
            return false;
        } else {
            return true;
        }
    } catch (e) {
        console.error(JSON.stringify(e));
        return false;
    }
}

async function downloadData(userInfo: UserInfo): Promise<UserDataRow | null> {
    try {
        const res = await asyncXmlHttpRequest({
            url: `${URL}/rest/v1/${TABLE_NAME}?user_id=eq.${userInfo.user_id}`,
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                apikey: API_KEY,
                Authorization: `Bearer ${userInfo.access_token}`,
            },
        });

        if (res.status >= 400) {
            console.error(res);
            return null;
        }

        const data: UserDataRow[] = JSON.parse(res.responseText);
        return data[0] ?? null;
    } catch (e: unknown) {
        console.error(JSON.stringify(e));
        return null;
    }
}

export async function deleteData(userInfo: UserInfo): Promise<boolean> {
    try {
        const res = await asyncXmlHttpRequest({
            url: `${URL}/rest/v1/${TABLE_NAME}?user_id=eq.${userInfo.user_id}`,
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                apikey: API_KEY,
                Authorization: `Bearer ${userInfo.access_token}`,
            },
        });

        if (res.status >= 400) {
            console.error(JSON.stringify(res));
            return false;
        } else {
            return true;
        }
    } catch (e: unknown) {
        console.error(JSON.stringify(e));
        return false;
    }
}

export async function createArchive(): Promise<boolean> {
    const userData = await getUserData();

    let res: GM.Response<unknown>;

    try {
        res = await asyncXmlHttpRequest({
            url: `${URL}/functions/v1/create-image-archive`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${API_KEY}`,
            },
            data: JSON.stringify(userData),
            binary: true,
            responseType: 'blob',
        });
    } catch (e) {
        console.error(`Create archive reject error -- ${JSON.stringify(e)}`);
        return false;
    }

    if (res.status >= 400) {
        console.error(`Create archive status error -- ${JSON.stringify(res)}`);
        return false;
    } else {
        const blob = new Blob([res.response], { type: 'application/octet-stream' });
        saveFile(blob, 'twitter-art-tags_images.zip');
        return true;
    }
}
