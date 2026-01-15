import CryptoJS from 'crypto-js';

export const trip_journal_gemini_api_key = 'trip_journal_gemini_api_key';
export const GEMINI_MODEL = 'gemini-3-flash-preview';
const SYSTEM_SECRET = 'trip_planner_pro_secure_v1_system_key';
const GEMINI_RPM_LIMIT = 15;

interface StoredApiKey {
    encrypted: string;
    isEncrypted: boolean;
}

interface ApiKeyConfig {
    keys: StoredApiKey[];
}

// In-memory usage tracker
const usageHistory: Record<string, number[]> = {};

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

    // Save a list of keys
    saveAll: (keys: string[]) => {
        const config: ApiKeyConfig = {
            keys: keys.map(k => ({
                encrypted: ApiKeyManager.encrypt(k.trim()),
                isEncrypted: true
            }))
        };
        localStorage.setItem(trip_journal_gemini_api_key, JSON.stringify(config));
        localStorage.removeItem('gemini_api_key');
    },

    // Add a single key to the existing list
    add: (key: string) => {
        if (!key) return;
        const keys = ApiKeyManager.getAll();
        if (keys.includes(key.trim())) return;
        ApiKeyManager.saveAll([...keys, key.trim()]);
    },

    // Legacy save (replaces everything with one key)
    save: (key: string) => {
        if (!key) return;
        ApiKeyManager.saveAll([key]);
    },

    // Get all decrypted keys
    getAll: (): string[] => {
        const stored = localStorage.getItem(trip_journal_gemini_api_key);
        if (!stored) {
            const legacy = localStorage.getItem('gemini_api_key');
            return legacy ? [legacy] : [];
        }

        try {
            const data = JSON.parse(stored);

            // Handle array format
            if (data.keys && Array.isArray(data.keys)) {
                return data.keys
                    .map((k: StoredApiKey) => ApiKeyManager.decrypt(k.encrypted))
                    .filter((k: string | null): k is string => !!k);
            }

            // Handle old single key format
            if (data.encrypted) {
                const decrypted = ApiKeyManager.decrypt(data.encrypted);
                return decrypted ? [decrypted] : [];
            }

            if (data.isEncrypted === false && data.encrypted) {
                return [data.encrypted];
            }
        } catch (e) {
            return [];
        }

        return [];
    },

    // Get an available key with rate limiting (marks a hit)
    get: (): string | null => {
        const keys = ApiKeyManager.getAll();
        if (keys.length === 0) return null;

        const now = Date.now();
        const oneMinuteAgo = now - 60000;

        // Clean up old history and find available keys
        const stats = keys.map(key => {
            if (!usageHistory[key]) usageHistory[key] = [];
            usageHistory[key] = usageHistory[key].filter(t => t > oneMinuteAgo);
            return { key, count: usageHistory[key].length };
        });

        // Filter keys that are under the limit
        const available = stats.filter(s => s.count < GEMINI_RPM_LIMIT);

        if (available.length === 0) {
            // If none available, perhaps return the one that will be available soonest?
            // Or just return null and let the caller handle it.
            // For now, let's return null to signify "exhausted".
            return null;
        }

        // Sort by usage (load balance) - pick the one with fewest hits in the last minute
        available.sort((a, b) => a.count - b.count);

        const selected = available[0].key;
        usageHistory[selected].push(now);

        return selected;
    },

    // Just check if any key exists without recording a hit
    hasKey: (): boolean => {
        return ApiKeyManager.getAll().length > 0;
    },

    // Remove all keys
    remove: () => {
        localStorage.removeItem(trip_journal_gemini_api_key);
        localStorage.removeItem('gemini_api_key');
        // Also clear in-memory history
        for (const key in usageHistory) {
            delete usageHistory[key];
        }
    }
};
