
import React, { useState } from 'react';
import { TripData, Spot } from '../types';
import { Check, X, Calendar, Copy, CheckSquare, Square } from 'lucide-react';
import { cn } from '../utils/classnames';

interface CopySpotModalProps {
    isOpen: boolean;
    tripData: TripData;
    spot: Spot;
    currentDayIndex: number;
    onClose: () => void;
    onConfirm: (targetDayIndices: number[]) => void;
}

export const CopySpotModal: React.FC<CopySpotModalProps> = ({
    isOpen,
    tripData,
    spot,
    currentDayIndex,
    onClose,
    onConfirm
}) => {
    const [selectedDays, setSelectedDays] = useState<number[]>([]);

    if (!isOpen) return null;

    const toggleDay = (idx: number) => {
        if (selectedDays.includes(idx)) {
            setSelectedDays(prev => prev.filter(i => i !== idx));
        } else {
            setSelectedDays(prev => [...prev, idx]);
        }
    };

    const toggleAll = () => {
        const availableDays = tripData.days
            .map((_, idx) => idx)
            .filter(idx => idx !== currentDayIndex);

        if (selectedDays.length === availableDays.length) {
            setSelectedDays([]);
        } else {
            setSelectedDays(availableDays);
        }
    };

    const handleConfirm = () => {
        if (selectedDays.length === 0) return;
        onConfirm(selectedDays);
    };

    const availableDays = tripData.days.filter((_, idx) => idx !== currentDayIndex);

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center px-4 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 flex flex-col animate-in zoom-in-95 duration-200 border border-slate-50 max-h-[90vh]">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                        <div className="p-3 bg-purple-50 rounded-2xl">
                            <Copy className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                            <h4 className="text-xl font-black text-slate-800 tracking-tight">複製住宿</h4>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">選擇要同步到的日期</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-300 hover:text-slate-600 transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl mb-6 border border-slate-100">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0">
                            <Check className="w-5 h-5 text-purple-500" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">複製對象</p>
                            <h5 className="font-black text-slate-700 truncate">{spot.name || '未命名住宿'}</h5>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between mb-4 px-2">
                    <span className="text-xs font-black text-slate-400">選擇目標日期</span>
                    <button
                        onClick={toggleAll}
                        className="text-xs font-black text-blue-600 hover:underline flex items-center"
                    >
                        {selectedDays.length === availableDays.length ? (
                            <><CheckSquare className="w-3.5 h-3.5 mr-1" /> 取消全選</>
                        ) : (
                            <><Square className="w-3.5 h-3.5 mr-1" /> 全選所有日期</>
                        )}
                    </button>
                </div>

                <div className="flex-grow overflow-y-auto custom-scrollbar space-y-2 mb-8 pr-2">
                    {tripData.days.map((day, idx) => {
                        if (idx === currentDayIndex) return null;
                        const isSelected = selectedDays.includes(idx);
                        return (
                            <button
                                key={idx}
                                onClick={() => toggleDay(idx)}
                                className={cn(
                                    "w-full flex items-center p-4 rounded-2xl border-2 transition-all text-left",
                                    isSelected
                                        ? "bg-purple-50 border-purple-200 shadow-sm"
                                        : "bg-white border-slate-50 hover:border-slate-200"
                                )}
                            >
                                <div className={cn(
                                    "w-6 h-6 rounded-lg flex items-center justify-center mr-4 transition-all",
                                    isSelected ? "bg-purple-500 text-white" : "bg-slate-100 text-transparent border border-slate-200"
                                )}>
                                    <Check className="w-4 h-4" />
                                </div>
                                <div className="flex-grow">
                                    <div className="flex items-center justify-between">
                                        <span className={cn("font-black text-sm", isSelected ? "text-purple-700" : "text-slate-600")}>
                                            第 {idx + 1} 天
                                        </span>
                                        <span className="text-[10px] font-bold text-slate-300">{day.date}</span>
                                    </div>
                                    {day.spots.some(s => s.type === 'stay') && (
                                        <p className="text-[9px] font-bold text-amber-500 mt-0.5">⚠️ 此日已有住宿紀錄</p>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>

                <div className="flex flex-col space-y-3">
                    <button
                        onClick={handleConfirm}
                        disabled={selectedDays.length === 0}
                        className={cn(
                            "w-full py-4 rounded-2xl font-black text-sm shadow-xl transition-all active:scale-95 flex items-center justify-center",
                            selectedDays.length > 0
                                ? "bg-purple-600 text-white hover:bg-purple-700 shadow-purple-100"
                                : "bg-slate-100 text-slate-300 cursor-not-allowed shadow-none"
                        )}
                    >
                        確認複製到 {selectedDays.length} 個日期
                    </button>
                    <button
                        onClick={onClose}
                        className="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-sm hover:bg-slate-200 transition-all active:scale-95"
                    >
                        取消
                    </button>
                </div>
            </div>
        </div>
    );
};
