
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
                        // apiKey: API_KEY, // Optional for Drive strictly with OAuth, but good for discovery
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
                    callback: '', // defined at request time
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

export const getAccessToken = (): Promise<string> => {
    return new Promise((resolve, reject) => {
        if (!tokenClient) {
            reject(new Error('Google Client not initialized'));
            return;
        }

        tokenClient.callback = (resp: any) => {
            if (resp.error !== undefined) {
                reject(resp);
            }
            resolve(resp.access_token);
        };

        // Prompt the user for consent
        // skip_prompt: true only works if we already authorized.
        // simpler to just ask always or let GIS handle it (it auto-skips if valid usually)
        tokenClient.requestAccessToken({ prompt: '' });
    });
};

export const saveTripToDrive = async (trip: TripData) => {
    if (!gapiInited || !gisInited) {
        const success = await initGoogleServices();
        if (!success) throw new Error('Failed to initialize Google Services');
    }

    // Check if we have a token (simple check, GAPI client usually handles usage if we set token)
    // But wait, gapi.client needs the token set.
    // We need to request token first.
    const token = await getAccessToken();
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
    const fileMetadata = {
        name: `[TripPlanner] ${trip.name}.json`,
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

const createMultipartBody = (metadata: any, content: string, isUpdate: boolean) => {
    return null;
}

// Helper for Create
const createFile = async (metadata: any, content: string) => {
    const boundary = '314159265358979323846'; // Simple boundary
    const delimiter = "\r\n--" + boundary + "\r\n";
    const close_delim = "\r\n--" + boundary + "--";

    // RFC 1341: The first boundary does not need a leading CRLF if it's the start of the body, 
    // but the delimiter variable has it. Let's construct it carefully.

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
