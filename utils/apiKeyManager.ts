import CryptoJS from 'crypto-js';

export const STORAGE_KEY = 'trip_journal_gemini_api_key'; // Use a new identification prefix

interface StoredApiKey {
    encrypted: string;
    isEncrypted: boolean;
}

// In-memory cache for the decrypted key during the session
let sessionKey: string | null = null;

export const ApiKeyManager = {
    // Encrypt the key with a password
    encrypt: (text: string, password: string): string => {
        return CryptoJS.AES.encrypt(text, password).toString();
    },

    // Decrypt the key with a password
    decrypt: (encrypted: string, password: string): string | null => {
        try {
            const bytes = CryptoJS.AES.decrypt(encrypted, password);
            const originalText = bytes.toString(CryptoJS.enc.Utf8);
            return originalText || null;
        } catch (e) {
            return null;
        }
    },

    // Save the key (optionally encrypted)
    save: (key: string, password?: string) => {
        if (!key) return;
        const trimmedKey = key.trim();

        let data: StoredApiKey;
        if (password) {
            data = {
                encrypted: ApiKeyManager.encrypt(trimmedKey, password),
                isEncrypted: true
            };
            sessionKey = trimmedKey;
        } else {
            // If no password provided, store in plain text (not recommended but for backward compatibility/simplicity)
            // Actually, let's force encryption or at least store it in a way we know it's not encrypted
            data = {
                encrypted: trimmedKey,
                isEncrypted: false
            };
            sessionKey = trimmedKey;
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        // Remove old plain text key if exists
        localStorage.removeItem('gemini_api_key');
    },

    // Get the key from cache or storage
    get: (password?: string): string | null => {
        if (sessionKey) return sessionKey;

        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) {
            // Fallback to legacy key for transition
            return localStorage.getItem('gemini_api_key');
        }

        try {
            const data: StoredApiKey = JSON.parse(stored);
            if (!data.isEncrypted) {
                sessionKey = data.encrypted;
                return sessionKey;
            }

            if (password) {
                const decrypted = ApiKeyManager.decrypt(data.encrypted, password);
                if (decrypted) {
                    sessionKey = decrypted;
                    return sessionKey;
                }
            }
        } catch (e) {
            return null;
        }

        return null;
    },

    // Check if a key exists
    hasKey: (): boolean => {
        return !!localStorage.getItem(STORAGE_KEY) || !!localStorage.getItem('gemini_api_key');
    },

    // Check if the stored key needs a password to unlock
    isLocked: (): boolean => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return false;
        try {
            const data: StoredApiKey = JSON.parse(stored);
            return data.isEncrypted && !sessionKey;
        } catch (e) {
            return false;
        }
    },

    // Remove the key
    remove: () => {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem('gemini_api_key');
        sessionKey = null;
    },

    // Set session key directly (after independent validation if needed)
    setSessionKey: (key: string) => {
        sessionKey = key;
    }
};
