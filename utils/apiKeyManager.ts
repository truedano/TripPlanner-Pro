export const STORAGE_KEY = 'gemini_api_key';

export const ApiKeyManager = {
    get: (): string | null => {
        return localStorage.getItem(STORAGE_KEY);
    },

    set: (key: string) => {
        if (!key) return;
        localStorage.setItem(STORAGE_KEY, key.trim());
    },

    remove: () => {
        localStorage.removeItem(STORAGE_KEY);
    },

    hasKey: (): boolean => {
        return !!localStorage.getItem(STORAGE_KEY);
    }
};
