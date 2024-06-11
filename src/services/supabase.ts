import { gmSetWithCache } from './cache';
import { KEY_USER_DATA } from '../constants';
import { UserData } from '../models';
import { getExportData } from './storage';
import { mergeData } from './dataManagement';

export interface UserInfo {
    access_token: string;
    user_id: string;
    expires_at: number;
}

interface ExportDataRow {
    user_id: string;
    data: UserData;
}

const URL = process.env.SUPABASE_URL!;
const API_KEY = process.env.SUPABASE_KEY!;

export const TABLE_NAME = 'export_data';

// Tasks
export async function syncData(userInfo: UserInfo): Promise<boolean> {
    console.log('Downloading data...');
    const onlineData = await downloadData(userInfo);
    console.log('Data found: ' + !!onlineData);

    let data = await getExportData();

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
export async function signIn(email: string, password: string): Promise<UserInfo | null> {
    return new Promise((resolve) =>
        GM.xmlHttpRequest({
            url: `${URL}/auth/v1/token?grant_type=password`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                apikey: API_KEY,
            },
            data: JSON.stringify({
                email,
                password,
            }),
            onload: async (res) => {
                if (res.status >= 400) {
                    console.warn('Sign in error - status');
                    const data: Supabase.TokenResponseError = JSON.parse(res.responseText);
                    alert(data.error_description ?? JSON.stringify(res));
                    resolve(null);
                } else {
                    const data: Supabase.TokenResponseSuccess = JSON.parse(res.responseText);
                    const userInfo: UserInfo = {
                        access_token: data.access_token,
                        user_id: data.user.id,
                        expires_at: data.expires_at,
                    };
                    resolve(userInfo);
                }
            },
            onerror: (res) => {
                console.warn('Sign in error - rejected');
                alert(res.responseText);
                resolve(null);
            },
        })
    );
}

export async function signUp(email: string, password: string): Promise<UserInfo | null> {
    return new Promise((resolve) =>
        GM.xmlHttpRequest({
            url: `${URL}/auth/v1/signup`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                apikey: API_KEY,
            },
            data: JSON.stringify({
                email,
                password,
            }),
            onload: async (res) => {
                if (res.status >= 400) {
                    console.warn('Sign up error - status');
                    const data: Supabase.SignUpResponseErrpr = JSON.parse(res.responseText);
                    alert(data.msg ?? JSON.stringify(res));
                    resolve(null);
                } else {
                    const data: Supabase.TokenResponseSuccess = JSON.parse(res.responseText);
                    const userInfo: UserInfo = {
                        access_token: data.access_token,
                        user_id: data.user.id,
                        expires_at: data.expires_at,
                    };
                    resolve(userInfo);
                }
            },
            onerror: (res) => {
                console.warn('Sign up error - rejected');
                alert(res.responseText);
                resolve(null);
            },
        })
    );
}

export async function uploadData(userInfo: UserInfo, data: UserData): Promise<boolean> {
    const bodyJson: ExportDataRow = {
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
                    const data: ExportDataRow[] = JSON.parse(res.responseText);
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
