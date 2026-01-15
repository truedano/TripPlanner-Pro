import React, { useState, useEffect } from 'react';
import { Key, X, ExternalLink, CheckCircle2, AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { ApiKeyManager, GEMINI_MODEL } from '../utils/apiKeyManager';
import { logoutGoogle } from '../utils/googleDrive';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
}

export const ApiKeyModal: React.FC<Props> = ({ isOpen, onClose, onSave }) => {
    const [key, setKey] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [error, setError] = useState('');
    const [isValidating, setIsValidating] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const stored = ApiKeyManager.get();
            if (stored) setKey(stored);

            const handleEsc = (e: KeyboardEvent) => {
                if (e.key === 'Escape') onClose();
            };
            window.addEventListener('keydown', handleEsc);
            return () => window.removeEventListener('keydown', handleEsc);
        }
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleSave = async () => {
        if (!key.trim()) {
            setError('請輸入有效的 API Key');
            return;
        }

        setIsValidating(true);
        setError('');

        try {
            const ai = new GoogleGenAI({ apiKey: key.trim() });
            // 嘗試進行一次極小規模的呼叫以驗證 Key 的合法性
            await ai.models.generateContent({
                model: GEMINI_MODEL,
                contents: 'Ping',
                config: {
                    maxOutputTokens: 1
                }
            });

            ApiKeyManager.save(key);
            onSave();
            onClose();
        } catch (err: any) {
            console.error('API Key 驗證失敗:', err);
            const errMsg = err?.message || err?.statusText || '';
            const status = err?.status;

            if (status === 401 || errMsg.includes('401') || errMsg.toLowerCase().includes('not valid')) {
                setError('無效的 API Key，請檢查是否輸入正確。');
            } else if (status === 403 || errMsg.includes('403')) {
                setError('此 API Key 無權限使用該模型，或已遭停用。');
            } else if (status === 429 || errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED')) {
                setError('API 使用頻率已達上限，請稍後再試。');
            } else {
                setError('驗證時發生未知錯誤，請檢查網路連線或 Key 是否正確。');
            }
        } finally {
            setIsValidating(false);
        }
    };

    const handleClear = () => {
        ApiKeyManager.remove();
        logoutGoogle();
        setKey('');
        setError('');
        onSave();
    };

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center space-x-2 text-slate-800">
                        <div className="p-2 bg-blue-100 rounded-xl text-blue-600">
                            <Key className="w-5 h-5" />
                        </div>
                        <h3 className="font-black text-lg">設定 API Key</h3>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="space-y-4">
                        <p className="text-sm text-slate-500 font-medium leading-relaxed">
                            本應用程式採用 <span className="text-slate-900 font-bold">BYOK (Bring Your Own Key)</span> 模式。
                            您的 API Key 會儲存在本地瀏覽器中，絕不會發送至第三方伺服器。
                        </p>

                        <a
                            href="https://aistudio.google.com/app/apikey"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-4 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors group cursor-pointer border border-blue-100"
                        >
                            <div className="flex items-center space-x-3">
                                <div className="bg-white p-1.5 rounded-lg shadow-sm">
                                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs font-black text-blue-700 uppercase tracking-wider">免費獲取</span>
                                    <span className="text-sm font-bold text-blue-900 group-hover:underline">前往 Google AI Studio</span>
                                </div>
                            </div>
                            <ExternalLink className="w-4 h-4 text-blue-400 group-hover:translate-x-1 transition-transform" />
                        </a>

                        <div className="space-y-4">
                            <div className="relative">
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">您的 API Key</label>
                                <div className="relative">
                                    <input
                                        type={showKey ? "text" : "password"}
                                        value={key}
                                        onChange={(e) => setKey(e.target.value)}
                                        placeholder="貼上您的 API Key..."
                                        className={`w-full pl-5 pr-12 py-3.5 rounded-2xl bg-slate-50 border-2 outline-none transition-all font-mono text-sm font-bold text-slate-700 ${error ? 'border-rose-300 focus:border-rose-500 bg-rose-50' : 'border-transparent focus:bg-white focus:border-blue-500'}`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowKey(!showKey)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                                    >
                                        {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            {error && (
                                <div className="flex items-center mt-2 text-rose-500 text-xs font-bold animate-in slide-in-from-top-1">
                                    <AlertCircle className="w-3 h-3 mr-1" />
                                    {error}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex space-x-3 pt-2">
                        {ApiKeyManager.hasKey() && (
                            <button
                                onClick={handleClear}
                                className="px-5 py-3.5 rounded-xl font-black text-sm text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                            >
                                清除並登出
                            </button>
                        )}
                        <button
                            onClick={handleSave}
                            disabled={isValidating}
                            className={`flex-1 flex items-center justify-center space-x-2 bg-slate-900 text-white py-3.5 rounded-xl font-black text-sm hover:bg-black hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            {isValidating ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <CheckCircle2 className="w-4 h-4" />
                            )}
                            <span>{isValidating ? '驗證中...' : (key ? '儲存並更新' : '確認儲存')}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
