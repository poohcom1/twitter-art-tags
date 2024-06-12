import { gmSetWithCache } from './cache';
import { KEY_USER_DATA } from '../constants';
import { UserData } from '../models';
import { getUserData } from './storage';
import { mergeData } from './dataManager';
import { asyncXmlHttpRequest } from '../utils';

export interface UserInfo {
    user_id: string;
    email: string;
    username: string;
    access_token: string;
}

export interface UserInfoData {
    userInfo: UserInfo;
    userDataExists: boolean;
    syncedAt: string;
}

interface UserDataRow {
    user_id: string;
    data: UserData;
    synced_at: string;
}

interface AccessTokenStore {
    accessToken: string;
    expiresAt: number;
}

const URL = process.env.SUPABASE_URL!;
const API_KEY = process.env.SUPABASE_KEY!;
const TABLE_NAME = 'user_data';

const LOCAL_STORAGE_KEY = 'twitter-art-tags_access-token';

// Tasks
export let loginRedirected = false;

{
    const paramsString = window.location.href.split('#')[1];
    if (paramsString) {
        const params = new URLSearchParams(paramsString);

        const date = new Date();
        date.setTime(date.getTime() + Number.parseInt(params.get('expires_in') ?? '0') * 1000);
        const store = {
            accessToken: params.get('access_token') ?? '',
            expiresAt: date.getTime(),
        };

        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(store));

        window.history.replaceState({}, document.title, window.location.pathname);

        loginRedirected = true;
    }
}

export async function getUserInfo(): Promise<UserInfoData | null> {
    let accessToken = '';

    const storeString = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (storeString) {
        const store: AccessTokenStore = JSON.parse(storeString);
        if (store.expiresAt > Date.now()) {
            accessToken = store.accessToken;
        }
    }

    if (accessToken) {
        try {
            const res = await asyncXmlHttpRequest({
                url: `${URL}/auth/v1/user`,
                method: 'GET',
                headers: {
                    apiKey: API_KEY,
                    Authorization: `Bearer ${accessToken}`,
                },
            });

            if (res.status >= 400) {
                console.warn('Get user error - status');
                const data: Supabase.UserResponseError = JSON.parse(res.responseText);
                alert(data.msg ?? JSON.stringify(res));
            } else {
                const data: Supabase.UserResponseSuccess = JSON.parse(res.responseText);
                const userInfo = {
                    user_id: data.id,
                    email: data.email,
                    username: data.user_metadata.preferred_username,
                    access_token: accessToken,
                };
                if (userInfo) {
                    const userData = await downloadData(userInfo);
                    return {
                        userInfo,
                        userDataExists: !!userData?.data,
                        syncedAt: userData?.synced_at ?? '',
                    };
                }
            }
        } catch (e: unknown) {
            console.warn('Get user error - rejected');
            console.error((e as GM.Response<unknown>).responseText ?? JSON.stringify(e));
            return null;
        }
    }

    return null;
}

export async function syncData(userInfo: UserInfo): Promise<boolean> {
    console.log('Downloading data...');
    const onlineData = await downloadData(userInfo);
    console.log('Data found: ' + !!onlineData);

    let data = await getUserData();

    if (onlineData) {
        data = mergeData(data, onlineData.data);
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

export async function signOut() {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
}

export async function uploadData(userInfo: UserInfo, data: UserData): Promise<boolean> {
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
