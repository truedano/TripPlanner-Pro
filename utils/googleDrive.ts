
import { TripData } from '../types';

// Replace with your actual Client ID or use environment variable
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || ''; // Optional if using only OAuth for Drive, but GAPI usually needs it for discovery
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

declare global {
    interface Window {
        google: any;
        gapi: any;
    }
}

let tokenClient: any;
let gapiInited = false;
let gisInited = false;

// Persistent keys
const TOKEN_KEY = 'tj_gdrive_access_token';
const EXPIRES_KEY = 'tj_gdrive_token_expires';

export const isGoogleSyncEnabled = () => {
    return !!CLIENT_ID && !!localStorage.getItem(TOKEN_KEY);
};

export const initGoogleServices = async () => {
    if (!CLIENT_ID) {
        console.warn('Google Client ID is missing. Google Drive features will not work.');
        return false;
    }

    return new Promise<boolean>((resolve) => {
        let attemptsGapi = 0;
        const checkGapi = () => {
            if (window.gapi) {
                window.gapi.load('client', async () => {
                    await window.gapi.client.init({
                        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
                    });
                    gapiInited = true;
                    if (gisInited) resolve(true);
                });
            } else {
                attemptsGapi++;
                if (attemptsGapi > 50) { // 5 seconds timeout
                    console.error('Google GAPI script failed to load.');
                    resolve(false);
                    return;
                }
                setTimeout(checkGapi, 100);
            }
        };

        let attemptsGis = 0;
        const checkGis = () => {
            if (window.google && window.google.accounts) {
                tokenClient = window.google.accounts.oauth2.initTokenClient({
                    client_id: CLIENT_ID,
                    scope: SCOPES,
                    callback: (resp: any) => {
                        if (resp.access_token) {
                            localStorage.setItem(TOKEN_KEY, resp.access_token);
                            localStorage.setItem(EXPIRES_KEY, (Date.now() + (resp.expires_in * 1000)).toString());
                        }
                    },
                });
                gisInited = true;
                if (gapiInited) resolve(true);
            } else {
                attemptsGis++;
                if (attemptsGis > 50) { // 5 second timeout
                    console.error('Google GIS script failed to load.');
                    resolve(false);
                    return;
                }
                setTimeout(checkGis, 100);
            }
        };

        checkGapi();
        checkGis();
    });
};

// 檢查目前的連線狀態
export const getCloudConnection = () => {
    const token = localStorage.getItem(TOKEN_KEY);
    const expires = parseInt(localStorage.getItem(EXPIRES_KEY) || '0');
    if (!token || Date.now() > expires - 300000) return 'disconnected';
    return 'connected';
};

// 強制登入授權
export const loginGoogle = (): Promise<string> => {
    return new Promise((resolve, reject) => {
        if (!tokenClient) {
            reject(new Error('Google 服務尚未初始化'));
            return;
        }
        tokenClient.callback = (resp: any) => {
            if (resp.error) {
                reject(resp);
                return;
            }
            localStorage.setItem(TOKEN_KEY, resp.access_token);
            localStorage.setItem(EXPIRES_KEY, (Date.now() + (resp.expires_in * 1000)).toString());
            resolve(resp.access_token);
        };
        tokenClient.requestAccessToken({ prompt: 'select_account' });
    });
};

export const getAccessToken = (silent = false): Promise<string> => {
    const cachedToken = localStorage.getItem(TOKEN_KEY);
    const expiresAt = parseInt(localStorage.getItem(EXPIRES_KEY) || '0');

    if (cachedToken && Date.now() < expiresAt - 300000) {
        return Promise.resolve(cachedToken);
    }

    if (silent) {
        return Promise.reject(new Error('Silent sync: No valid token'));
    }

    return loginGoogle();
};

export const saveTripToDrive = async (trip: TripData, silent = false): Promise<number> => {
    if (!gapiInited || !gisInited) {
        const success = await initGoogleServices();
        if (!success) throw new Error('初始化失敗');
    }

    const token = await getAccessToken(silent);
    window.gapi.client.setToken({ access_token: token });

    const now = Date.now();
    const tripToSave = { ...trip, lastSyncedAt: now };
    const q = `appProperties has { key='tripId' and value='${trip.id}' } and trashed=false`;
    const response = await window.gapi.client.drive.files.list({
        q: q,
        fields: 'files(id, name)',
        spaces: 'drive',
    });

    const files = response.result.files;
    const fileContent = JSON.stringify(tripToSave, null, 2);
    const shortId = trip.id.includes('-') ? trip.id.split('-')[0] : trip.id.substring(0, 8);
    const fileMetadata = {
        name: `[TripPlanner] ${trip.name}_${shortId}.json`,
        mimeType: 'application/json',
        appProperties: {
            tripId: trip.id,
        },
    };

    if (files && files.length > 0) {
        await updateFile(files[0].id, fileMetadata, fileContent);
    } else {
        await createFile(fileMetadata, fileContent);
    }
    return now;
};

// 從雲端獲取所有行程檔案列表
export const listAllTripsFromDrive = async () => {
    if (!gapiInited || !gisInited) {
        await initGoogleServices();
    }
    const token = await getAccessToken(true);
    window.gapi.client.setToken({ access_token: token });

    const q = "name contains '[TripPlanner]' and mimeType = 'application/json' and trashed = false";
    let allFiles: any[] = [];
    let pageToken: string | undefined = undefined;

    do {
        const response: any = await window.gapi.client.drive.files.list({
            q: q,
            fields: 'nextPageToken, files(id, name, appProperties)',
            spaces: 'drive',
            pageToken: pageToken
        });

        const files = response.result.files;
        if (files) {
            allFiles = allFiles.concat(files);
        }
        pageToken = response.result.nextPageToken;
    } while (pageToken);

    return allFiles;
};

// 下載特定檔案內容
export const downloadFileContent = async (fileId: string): Promise<TripData | null> => {
    try {
        const response = await window.gapi.client.drive.files.get({
            fileId: fileId,
            alt: 'media',
        });
        const data = response.result;
        if (!data) return null;
        if (!Array.isArray(data.days)) data.days = [];
        return data;
    } catch (e) {
        console.error('Download failed', e);
        return null;
    }
};

// Helper for Create
const createFile = async (metadata: any, content: string) => {
    const boundary = '314159265358979323846'; // Simple boundary
    const delimiter = "\r\n--" + boundary + "\r\n";
    const close_delim = "\r\n--" + boundary + "--";

    // Body construction
    const multipartRequestBody =
        "--" + boundary + "\r\n" +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        content +
        close_delim;

    const request = window.gapi.client.request({
        'path': '/upload/drive/v3/files',
        'method': 'POST',
        'params': { 'uploadType': 'multipart' },
        'headers': {
            'Content-Type': 'multipart/related; boundary=' + boundary
        },
        'body': multipartRequestBody
    });

    return await request;
};

// Helper for Update
const updateFile = async (fileId: string, metadata: any, content: string) => {
    const boundary = '314159265358979323846';
    const delimiter = "\r\n--" + boundary + "\r\n";
    const close_delim = "\r\n--" + boundary + "--";

    const multipartRequestBody =
        "--" + boundary + "\r\n" +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        content +
        close_delim;

    const request = window.gapi.client.request({
        'path': '/upload/drive/v3/files/' + fileId,
        'method': 'PATCH',
        'params': { 'uploadType': 'multipart' },
        'headers': {
            'Content-Type': 'multipart/related; boundary=' + boundary
        },
        'body': multipartRequestBody
    });

    return await request;
};

export const logoutGoogle = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EXPIRES_KEY);
};

export const getDriveProfile = async () => {
    try {
        const response = await window.gapi.client.drive.about.get({
            fields: 'user'
        });
        return response.result.user;
    } catch (e) {
        return null;
    }
};

// 刪除雲端檔案
export const deleteTripFromDrive = async (tripId: string) => {
    if (!gapiInited || !gisInited) return;
    try {
        const token = await getAccessToken(true);
        window.gapi.client.setToken({ access_token: token });

        // 1. 先找出 ID 對應的檔案
        const q = `appProperties has { key='tripId' and value='${tripId}' } and trashed=false`;
        const searchResponse = await window.gapi.client.drive.files.list({
            q: q,
            fields: 'files(id)',
            spaces: 'drive',
        });

        const files = searchResponse.result.files;
        if (files && files.length > 0) {
            // 2. 將其移至垃圾桶 (Delete 在 Drive API 通常指永久刪除，Trash 較安全)
            await window.gapi.client.drive.files.update({
                fileId: files[0].id,
                trashed: true
            });
            console.log(`Cloud file for trip ${tripId} moved to trash.`);
        }
    } catch (e) {
        console.error('Delete from Drive failed', e);
    }
};
