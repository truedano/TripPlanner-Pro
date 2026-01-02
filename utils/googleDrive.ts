
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
                setTimeout(checkGapi, 100);
            }
        };

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
                setTimeout(checkGis, 100);
            }
        };

        checkGapi();
        checkGis();
    });
};

export const getAccessToken = (silent = false): Promise<string> => {
    // Check localStorage for a valid cached token (with 5 min buffer)
    const cachedToken = localStorage.getItem(TOKEN_KEY);
    const expiresAt = parseInt(localStorage.getItem(EXPIRES_KEY) || '0');

    if (cachedToken && Date.now() < expiresAt - 300000) {
        return Promise.resolve(cachedToken);
    }

    if (silent) {
        return Promise.reject(new Error('Silent sync: No valid token available'));
    }

    return new Promise((resolve, reject) => {
        if (!tokenClient) {
            reject(new Error('Google Client not initialized'));
            return;
        }

        tokenClient.callback = (resp: any) => {
            if (resp.error !== undefined) {
                reject(resp);
                return;
            }
            localStorage.setItem(TOKEN_KEY, resp.access_token);
            localStorage.setItem(EXPIRES_KEY, (Date.now() + (resp.expires_in * 1000)).toString());
            resolve(resp.access_token);
        };

        // prompt: '' will attempt to reuse existing session if possible
        tokenClient.requestAccessToken({ prompt: '' });
    });
};

export const saveTripToDrive = async (trip: TripData, silent = false) => {
    if (!gapiInited || !gisInited) {
        const success = await initGoogleServices();
        if (!success) throw new Error('Failed to initialize Google Services');
    }

    const token = await getAccessToken(silent);
    window.gapi.client.setToken({ access_token: token });

    // 1. Search for existing file with this trip ID in appProperties
    const q = `appProperties has { key='tripId' and value='${trip.id}' } and trashed=false`;
    const response = await window.gapi.client.drive.files.list({
        q: q,
        fields: 'files(id, name)',
        spaces: 'drive',
    });

    const files = response.result.files;
    const fileContent = JSON.stringify(trip, null, 2);
    // 檔名加入 ID 前 8 碼以區分不同裝置產生的同名行程
    const shortId = trip.id.includes('-') ? trip.id.split('-')[0] : trip.id.substring(0, 8);
    const fileMetadata = {
        name: `[TripPlanner] ${trip.name}_${shortId}.json`,
        mimeType: 'application/json',
        appProperties: {
            tripId: trip.id,
        },
    };

    if (files && files.length > 0) {
        // Update existing
        const fileId = files[0].id;
        // Directly call updateFile helper
        return updateFile(fileId, fileMetadata, fileContent);
    } else {
        // Create new
        return createFile(fileMetadata, fileContent);
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
