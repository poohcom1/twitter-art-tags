import { gmSetWithCache } from './cache';
import { KEY_USER_DATA } from '../constants';
import { UserData } from '../models';
import { getUserData } from './storage';
import { mergeData } from './dataManagement';

export interface UserInfo {
    user_id: string;
    email: string;
    access_token: string;
}

export interface UserInfoData {
    userInfo: UserInfo;
    userData: UserData | null;
}

interface UserDataRow {
    user_id: string;
    data: UserData;
}

interface AccessTokenStore {
    accessToken: string;
    expiresAt: number;
}

const URL = process.env.SUPABASE_URL!;
const API_KEY = process.env.SUPABASE_KEY!;

const LOCAL_STORAGE_KEY = 'twitter-art-tags_access-token';

export const TABLE_NAME = 'export_data';

// Tasks
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
        const userInfo = await new Promise<UserInfo | null>((resolve) =>
            GM.xmlHttpRequest({
                url: `${URL}/auth/v1/user`,
                method: 'GET',
                headers: {
                    apiKey: API_KEY,
                    Authorization: `Bearer ${accessToken}`,
                },
                onload: async (res) => {
                    if (res.status >= 400) {
                        console.warn('Get user error - status');
                        const data: Supabase.UserResponseError = JSON.parse(res.responseText);
                        alert(data.msg ?? JSON.stringify(res));
                    } else {
                        const data: Supabase.UserResponseSuccess = JSON.parse(res.responseText);
                        resolve({
                            user_id: data.id,
                            email: data.email,
                            access_token: accessToken,
                        });
                    }
                },
                onerror: (res) => {
                    console.warn('Get user error - rejected');
                    console.error(res.responseText);
                    resolve(null);
                },
            })
        );

        if (userInfo) {
            const userData = await downloadData(userInfo);
            return { userInfo, userData };
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
        data = mergeData(data, onlineData);
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
export async function signIn(): Promise<UserInfo | null> {
    return new Promise((resolve) =>
        GM.xmlHttpRequest({
            url: `${URL}/auth/v1/authorize?provider=twitter`,
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                apikey: API_KEY,
            },
            onload: async (res) => {
                window.location.href = res.finalUrl;
            },
            onerror: (res) => {
                console.warn('Sign in error - rejected');
                alert(res.responseText);
                resolve(null);
            },
        })
    );
}

export async function signOut() {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
}

export async function uploadData(userInfo: UserInfo, data: UserData): Promise<boolean> {
    const bodyJson: UserDataRow = {
        user_id: userInfo.user_id,
        data,
    };

    return new Promise((resolve) =>
        GM.xmlHttpRequest({
            url: `${URL}/rest/v1/${TABLE_NAME}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                apikey: API_KEY,
                Authorization: `Bearer ${userInfo.access_token}`,
                Prefer: 'resolution=merge-duplicates',
            },
            data: JSON.stringify(bodyJson),
            onload: (res) => {
                if (res.status >= 400) {
                    console.error(JSON.stringify(res));
                    resolve(false);
                } else {
                    resolve(true);
                }
            },
            onerror: (res) => {
                console.error(JSON.stringify(res));
                resolve(false);
            },
        })
    );
}

export async function downloadData(userInfo: UserInfo): Promise<UserData | null> {
    return new Promise((resolve) =>
        GM.xmlHttpRequest({
            url: `${URL}/rest/v1/${TABLE_NAME}?user_id=eq.${userInfo.user_id}`,
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                apikey: API_KEY,
                Authorization: `Bearer ${userInfo.access_token}`,
            },
            onload: (res) => {
                if (res.status >= 400) {
                    console.error(res);
                    resolve(null);
                } else {
                    const data: UserDataRow[] = JSON.parse(res.responseText);
                    resolve(data[0]?.data ?? null);
                }
            },
            onerror: (res) => {
                console.error(JSON.stringify(res));
                resolve(null);
            },
        })
    );
}

export async function deleteData(userInfo: UserInfo): Promise<boolean> {
    return new Promise((resolve) =>
        GM.xmlHttpRequest({
            url: `${URL}/rest/v1/${TABLE_NAME}?user_id=eq.${userInfo.user_id}`,
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                apikey: API_KEY,
                Authorization: `Bearer ${userInfo.access_token}`,
            },
            onload: (res) => {
                if (res.status >= 400) {
                    console.error(JSON.stringify(res));
                    resolve(false);
                } else {
                    resolve(true);
                }
            },
            onerror: (res) => {
                console.error(JSON.stringify(res));
                resolve(false);
            },
        })
    );
}
