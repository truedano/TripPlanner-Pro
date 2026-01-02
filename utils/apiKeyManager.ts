import CryptoJS from 'crypto-js';

export const trip_journal_gemini_api_key = 'trip_journal_gemini_api_key';
const SYSTEM_SECRET = 'trip_planner_pro_secure_v1_system_key';

interface StoredApiKey {
    encrypted: string;
    isEncrypted: boolean;
}

export const ApiKeyManager = {
    // Encrypt the key with system secret
    encrypt: (text: string): string => {
        return CryptoJS.AES.encrypt(text, SYSTEM_SECRET).toString();
    },

    // Decrypt the key with system secret
    decrypt: (encrypted: string): string | null => {
        try {
            const bytes = CryptoJS.AES.decrypt(encrypted, SYSTEM_SECRET);
            const originalText = bytes.toString(CryptoJS.enc.Utf8);
            return originalText || null;
        } catch (e) {
            return null;
        }
    },

    // Save the key (always encrypted with system secret)
    save: (key: string) => {
        if (!key) return;
        const trimmedKey = key.trim();

        const data: StoredApiKey = {
            encrypted: ApiKeyManager.encrypt(trimmedKey),
            isEncrypted: true
        };

        localStorage.setItem(trip_journal_gemini_api_key, JSON.stringify(data));
        // Remove old plain text key if exists
        localStorage.removeItem('gemini_api_key');
    },

    // Get the key (auto-decrypt)
    get: (): string | null => {
        const stored = localStorage.getItem(trip_journal_gemini_api_key);
        if (!stored) {
            // Fallback to legacy key
            return localStorage.getItem('gemini_api_key');
        }

        try {
            const data: StoredApiKey = JSON.parse(stored);

            // Try to decrypt with system secret
            const decrypted = ApiKeyManager.decrypt(data.encrypted);
            if (decrypted) return decrypted;

            // Fallback for transition: if it was somehow stored as plaintext marked as encrypted=false
            if (data.isEncrypted === false) {
                return data.encrypted;
            }
        } catch (e) {
            return null;
        }

        return null;
    },

    // Check if a key exists and is valid
    hasKey: (): boolean => {
        return !!ApiKeyManager.get();
    },

    // Always false as we don't have user-locked keys anymore
    isLocked: (): boolean => {
        return false;
    },

    // Remove the key
    remove: () => {
        localStorage.removeItem(trip_journal_gemini_api_key);
        localStorage.removeItem('gemini_api_key');
    }
};
