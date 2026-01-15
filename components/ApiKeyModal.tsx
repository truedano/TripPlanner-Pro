import React, { useState, useEffect } from 'react';
import { Key, X, ExternalLink, CheckCircle2, AlertCircle, Eye, EyeOff, Loader2, Trash2, Plus } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { ApiKeyManager, GEMINI_MODEL } from '../utils/apiKeyManager';
import { logoutGoogle } from '../utils/googleDrive';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
}

export const ApiKeyModal: React.FC<Props> = ({ isOpen, onClose, onSave }) => {
    const [keys, setKeys] = useState<string[]>([]);
    const [newKey, setNewKey] = useState('');
    const [showSavedKeys, setShowSavedKeys] = useState(false);
    const [showNewKey, setShowNewKey] = useState(false);
    const [error, setError] = useState('');
    const [isValidating, setIsValidating] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const stored = ApiKeyManager.getAll();
            setKeys(stored);

            const handleEsc = (e: KeyboardEvent) => {
                if (e.key === 'Escape') onClose();
            };
            window.addEventListener('keydown', handleEsc);
            return () => window.removeEventListener('keydown', handleEsc);
        }
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleAddKey = async () => {
        const trimmed = newKey.trim();
        if (!trimmed) {
            setError('請輸入有效的 API Key');
            return;
        }

        if (keys.includes(trimmed)) {
            setError('此 API Key 已存在於清單中');
            return;
        }

        setIsValidating(true);
        setError('');

        try {
            const ai = new GoogleGenAI({ apiKey: trimmed });

            // 建立 10 秒超時機制
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('TIMEOUT')), 10000)
            );

            // 嘗試進行一次極小規模的呼叫以驗證 Key 的合法性
            const validationPromise = ai.models.generateContent({
                model: GEMINI_MODEL,
                contents: 'Ping',
                config: {
                    maxOutputTokens: 1
                }
            });

            // 競爭賽：超時或完成
            await Promise.race([validationPromise, timeoutPromise]);

            const updatedKeys = [...keys, trimmed];
            setKeys(updatedKeys);
            ApiKeyManager.saveAll(updatedKeys);
            setNewKey('');
            onSave();
        } catch (err: any) {
            console.error('API Key 驗證失敗:', err);
            const errMsg = err?.message || err?.statusText || '';
            const status = err?.status;

            if (err.message === 'TIMEOUT') {
                setError('驗證超時，請檢查您的網路連線是否穩定。');
            } else if (status === 401 || errMsg.includes('401') || errMsg.toLowerCase().includes('not valid')) {
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

    const handleDeleteKey = (index: number) => {
        const updatedKeys = keys.filter((_, i) => i !== index);
        setKeys(updatedKeys);
        ApiKeyManager.saveAll(updatedKeys);
        onSave();
    };

    const handleClear = () => {
        ApiKeyManager.remove();
        logoutGoogle();
        setKeys([]);
        setNewKey('');
        setError('');
        onSave();
    };

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center space-x-2 text-slate-800">
                        <div className="p-2 bg-blue-100 rounded-xl text-blue-600">
                            <Key className="w-5 h-5" />
                        </div>
                        <h3 className="font-black text-lg">設定 Gemini API Keys</h3>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto no-scrollbar">
                    <div className="space-y-4">
                        <p className="text-sm text-slate-500 font-medium leading-relaxed bg-blue-50/50 p-4 rounded-2xl border border-blue-50">
                            本應用程式採用 <span className="text-slate-900 font-bold">BYOK</span> 模式。您可輸入多組 Key 以平衡負載。每組 Key 限制為 15 RPM。
                        </p>

                        <a
                            href="https://aistudio.google.com/app/apikey"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all group border border-slate-100"
                        >
                            <div className="flex items-center space-x-3">
                                <div className="bg-white p-1.5 rounded-xl shadow-sm border border-slate-50">
                                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                                </div>
                                <div>
                                    <span className="text-xs font-black text-blue-600 uppercase tracking-wider block">免費獲取</span>
                                    <span className="text-sm font-bold text-slate-700 group-hover:underline">前往 Google AI Studio</span>
                                </div>
                            </div>
                            <ExternalLink className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                        </a>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between ml-1">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">已儲存的 API Keys ({keys.length})</label>
                                {keys.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setShowSavedKeys(!showSavedKeys)}
                                        className="text-[10px] font-black text-blue-500 hover:text-blue-600 uppercase tracking-widest transition-colors flex items-center"
                                    >
                                        {showSavedKeys ? <EyeOff className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
                                        {showSavedKeys ? '全部隱藏' : '全部顯示'}
                                    </button>
                                )}
                            </div>
                            {keys.length === 0 ? (
                                <div className="text-center py-8 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-100">
                                    <p className="text-xs font-bold text-slate-300">尚未新增任何 API Key</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {keys.map((k, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-100 group hover:bg-white hover:shadow-sm transition-all animate-in slide-in-from-left-2 duration-200">
                                            <div className="flex items-center space-x-3 overflow-hidden">
                                                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-black flex-shrink-0">
                                                    {idx + 1}
                                                </div>
                                                <code className="text-xs font-mono font-bold text-slate-500 truncate">
                                                    {showSavedKeys ? k : `${k.slice(0, 8)}••••••••${k.slice(-4)}`}
                                                </code>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteKey(idx)}
                                                className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="pt-4 border-t border-slate-50">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">新增 API Key</label>
                            <div className="flex space-x-2">
                                <div className="relative flex-1">
                                    <input
                                        type={showNewKey ? "text" : "password"}
                                        value={newKey}
                                        onChange={(e) => setNewKey(e.target.value)}
                                        placeholder="貼上新的 API Key..."
                                        className={`w-full pl-5 pr-12 py-3.5 rounded-2xl bg-slate-50 border-2 outline-none transition-all font-mono text-sm font-bold text-slate-700 ${error ? 'border-rose-300 focus:border-rose-500 bg-rose-50' : 'border-transparent focus:bg-white focus:border-blue-500'}`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewKey(!showNewKey)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 transition-colors"
                                    >
                                        {showNewKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                <button
                                    onClick={handleAddKey}
                                    disabled={isValidating || !newKey.trim()}
                                    className="px-5 bg-slate-900 text-white rounded-2xl font-black text-xs hover:bg-black transition-all flex items-center space-x-2 disabled:opacity-50 shadow-lg active:scale-95"
                                >
                                    {isValidating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                    <span className="hidden sm:inline">新增</span>
                                </button>
                            </div>
                            {error && (
                                <div className="flex items-center mt-3 text-rose-500 text-[10px] font-black animate-in slide-in-from-top-1 px-1">
                                    <AlertCircle className="w-3 h-3 mr-1.5" />
                                    {error}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex space-x-3 pt-4 border-t border-slate-50">
                        {keys.length > 0 && (
                            <button
                                onClick={handleClear}
                                className="px-6 py-4 rounded-2xl font-black text-xs text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all"
                            >
                                清除全部
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="flex-1 flex items-center justify-center space-x-2 bg-slate-900 text-white py-4 rounded-2xl font-black text-sm hover:bg-black hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl"
                        >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>完成設定</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
