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

const URL = 'https://ecitekeqfiimnyuofxdm.supabase.co';
const API_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjaXRla2VxZmlpbW55dW9meGRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTc5Mzg0NzIsImV4cCI6MjAzMzUxNDQ3Mn0.PCajHHYAxk7whNanAqOHrMuTC--_dGSfaF3DvwYzZJc';

export const TABLE_NAME = 'export_data';

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

export async function syncData(userInfo: UserInfo): Promise<boolean> {
    const onlineData = await downloadData(userInfo);

    let data = await getExportData();

    if (onlineData) {
        data = mergeData(data, onlineData);
    }

    const success = await uploadData(userInfo, data);

    if (success) {
        await gmSetWithCache(KEY_USER_DATA, data);
    }

    return success;
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
                    alert(res);
                    resolve(false);
                } else {
                    resolve(true);
                }
            },
            onerror: (res) => {
                alert(res);
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
                    alert(res);
                    resolve(null);
                } else {
                    const data: ExportDataRow[] = JSON.parse(res.responseText);
                    resolve(data[0]?.data ?? null);
                }
            },
            onerror: (res) => {
                alert(res);
                resolve(null);
            },
        })
    );
}
