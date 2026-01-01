
import React from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export type ModalType = 'confirm' | 'alert' | 'success' | 'warning';

interface ModernModalProps {
    isOpen: boolean;
    type?: ModalType;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel?: () => void;
    showCancel?: boolean;
}

export const ModernModal: React.FC<ModernModalProps> = ({
    isOpen,
    type = 'confirm',
    title,
    message,
    confirmText = '確定',
    cancelText = '取消',
    onConfirm,
    onCancel,
    showCancel = true
}) => {
    if (!isOpen) return null;

    const config = {
        confirm: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50', btn: 'bg-red-500 hover:bg-red-600 shadow-red-100' },
        alert: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-50', btn: 'bg-blue-600 hover:bg-blue-700 shadow-blue-100' },
        success: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50', btn: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100' },
        warning: { icon: AlertCircle, color: 'text-orange-500', bg: 'bg-orange-50', btn: 'bg-orange-600 hover:bg-orange-700 shadow-orange-100' },
    }[type];

    const Icon = config.icon;

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center px-4 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm shadow-inner" onClick={onCancel || onConfirm}></div>
            <div className="relative bg-white w-full max-w-[360px] rounded-[2.5rem] shadow-2xl p-8 flex flex-col items-center text-center animate-in zoom-in-95 duration-200 border border-slate-50">
                <div className={`w-20 h-20 ${config.bg} rounded-full flex items-center justify-center mb-6`}>
                    <Icon className={`w-10 h-10 ${config.color}`} />
                </div>

                <h4 className="text-xl font-black text-slate-800 mb-2 tracking-tight">{title}</h4>
                <p className="text-sm font-bold text-slate-400 mb-8 leading-relaxed px-2">
                    {message}
                </p>

                <div className="flex flex-col w-full space-y-3">
                    <button
                        onClick={onConfirm}
                        className={`w-full py-4 text-white rounded-2xl font-black text-sm shadow-xl transition-all active:scale-95 ${config.btn}`}
                    >
                        {confirmText}
                    </button>

                    {(type === 'confirm' || (showCancel && onCancel)) && (
                        <button
                            onClick={onCancel || onConfirm}
                            className="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-sm hover:bg-slate-200 transition-all active:scale-95"
                        >
                            {cancelText}
                        </button>
                    )}
                </div>

                {!showCancel && !onCancel && (
                    <button onClick={onConfirm} className="absolute top-6 right-6 p-2 text-slate-300 hover:text-slate-600 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                )}
            </div>
        </div>
    );
};
