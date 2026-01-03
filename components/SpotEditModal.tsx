
import React, { useRef } from 'react';
import { Spot, SpotType, IdentifiableSpotImage } from '../types';
import { X, MapPin, Zap, Clock, Wallet, Plus, Trash2, Edit3, Camera, Library } from 'lucide-react';
import { DndContext, closestCenter, SensorDescriptor, SensorOptions } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableImageItem } from './SortableImageItem';

interface SpotEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    spot: Spot;
    editingImages: IdentifiableSpotImage[];
    currency: string;
    onSpotChange: (updates: Partial<Spot>) => void;
    onImagesChange: (newImages: IdentifiableSpotImage[]) => void;
    onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    isProcessingImage: boolean;
    addExpenseItem: () => void;
    removeExpenseItem: (id: string) => void;
    updateExpenseItem: (id: string, updates: Partial<{ name: string, amount: number }>) => void;
    addNoteItem: () => void;
    removeNoteItem: (id: string) => void;
    updateNoteItem: (id: string, content: string) => void;
    getCurrentTime: () => string;
    imageSensors: SensorDescriptor<SensorOptions>[];
    handleImageDragEnd: (event: any) => void;
}

export const SpotEditModal: React.FC<SpotEditModalProps> = ({
    isOpen,
    onClose,
    spot,
    editingImages,
    currency,
    onSpotChange,
    onImagesChange,
    onImageUpload,
    isProcessingImage,
    addExpenseItem,
    removeExpenseItem,
    updateExpenseItem,
    addNoteItem,
    removeNoteItem,
    updateNoteItem,
    getCurrentTime,
    imageSensors,
    handleImageDragEnd
}) => {
    const albumInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const startTimeInputRef = useRef<HTMLInputElement>(null);
    const endTimeInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in"
            onClick={onClose}
        >
            <div
                className="bg-white w-full max-w-3xl rounded-[2.5rem] shadow-2xl max-h-[90vh] flex flex-col overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="text-2xl font-black text-slate-800">
                        {spot.type === SpotType.TRANSPORT ? '交通紀錄' : spot.type === SpotType.STAY ? '住宿紀錄' : spot.type === SpotType.MEAL ? '伙食紀錄' : '景點規劃'}
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full"><X className="w-6 h-6 text-slate-400" /></button>
                </div>

                <div className="p-8 space-y-8 overflow-y-auto flex-grow custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                                    {spot.type === SpotType.TRANSPORT ? '交通工具 / 路線' : spot.type === SpotType.STAY ? '住宿名稱 / 飯店' : spot.type === SpotType.MEAL ? '餐廳 / 小吃名稱' : '景點名稱'}
                                </label>
                                <input
                                    required
                                    type="text"
                                    placeholder={spot.type === SpotType.TRANSPORT ? "例如：捷運、計程車、JR山手線..." : spot.type === SpotType.STAY ? "例如：希爾頓飯店、APA Hotel..." : spot.type === SpotType.MEAL ? "例如：一蘭拉麵、築地市場..." : "景點名稱"}
                                    value={spot.name}
                                    onChange={e => onSpotChange({ name: e.target.value })}
                                    className="w-full px-5 py-3 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-blue-500 outline-none font-bold text-slate-700"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                    地圖連結 (Google Maps URL)
                                </label>
                                <div className="relative group">
                                    <input
                                        type="url"
                                        placeholder="貼上 Google Maps 網址..."
                                        value={spot.mapUrl || ''}
                                        onChange={e => onSpotChange({ mapUrl: e.target.value })}
                                        className="w-full px-5 py-3 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-blue-500 outline-none font-bold text-slate-700 pr-12"
                                    />
                                    {spot.mapUrl && (
                                        <a
                                            href={spot.mapUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                                            title="開啟地圖"
                                        >
                                            <MapPin className="w-5 h-5" />
                                        </a>
                                    )}
                                </div>
                            </div>
                            <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50">
                                <label className="block text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2 flex items-center">
                                    <Zap className="w-3 h-3 mr-1" /> 快速貼上座標 (LAT, LNG)
                                </label>
                                <input
                                    type="text"
                                    placeholder="貼上如：25.034, 121.564"
                                    onChange={e => {
                                        const val = e.target.value;
                                        if (val.includes(',')) {
                                            const [latStr, lngStr] = val.split(',').map(s => s.trim());
                                            const lat = parseFloat(latStr);
                                            const lng = parseFloat(lngStr);
                                            if (!isNaN(lat) && !isNaN(lng)) {
                                                onSpotChange({ lat, lng });
                                                e.target.value = ''; // 成功後清空，方便下次貼入
                                            }
                                        }
                                    }}
                                    className="w-full px-4 py-2 rounded-xl bg-white border border-blue-100 outline-none text-xs font-bold text-slate-600 focus:border-blue-400 placeholder:text-blue-200"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">緯度 (LAT)</label>
                                    <input
                                        type="number"
                                        step="any"
                                        placeholder="例如: 25.034"
                                        value={spot.lat ?? ''}
                                        onChange={e => onSpotChange({ lat: e.target.value ? parseFloat(e.target.value) : undefined })}
                                        className="w-full px-4 py-2 rounded-xl bg-slate-50 border border-slate-100 outline-none text-xs font-bold text-slate-600 focus:border-blue-400"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">經度 (LNG)</label>
                                    <input
                                        type="number"
                                        step="any"
                                        placeholder="例如: 121.521"
                                        value={spot.lng ?? ''}
                                        onChange={e => onSpotChange({ lng: e.target.value ? parseFloat(e.target.value) : undefined })}
                                        className="w-full px-4 py-2 rounded-xl bg-slate-50 border border-slate-100 outline-none text-xs font-bold text-slate-600 focus:border-blue-400"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="relative group">
                                    <label className="absolute -top-6 left-0 text-[10px] font-black text-slate-400 uppercase tracking-widest">開始時間 (24H)</label>
                                    <input
                                        type="text"
                                        placeholder="HH:mm"
                                        maxLength={5}
                                        value={spot.startTime || ''}
                                        onChange={e => {
                                            let val = e.target.value.replace(/[^0-9]/g, '');
                                            if (val.length >= 3) {
                                                val = val.slice(0, 2) + ':' + val.slice(2, 4);
                                            }
                                            const parts = val.split(':');
                                            if (parts[0] && parseInt(parts[0]) > 23) return;
                                            if (parts[1] && parseInt(parts[1]) > 59) return;
                                            onSpotChange({ startTime: val });
                                        }}
                                        className="w-full px-5 py-3 rounded-2xl bg-slate-50 font-bold text-slate-700 pr-28 placeholder:text-slate-300 relative z-10"
                                    />
                                    <input
                                        type="time"
                                        ref={startTimeInputRef}
                                        className="absolute inset-0 opacity-0 pointer-events-none"
                                        onChange={e => onSpotChange({ startTime: e.target.value })}
                                    />
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-0.5 z-20">
                                        {spot.startTime && (
                                            <button
                                                type="button"
                                                onClick={() => onSpotChange({ startTime: '' })}
                                                className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors"
                                                title="清除時間"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => onSpotChange({ startTime: getCurrentTime() })}
                                            className="p-1.5 text-slate-300 hover:text-amber-500 transition-colors"
                                            title="設為現在時間"
                                        >
                                            <Zap className="w-4 h-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                try {
                                                    startTimeInputRef.current?.showPicker();
                                                } catch (e) {
                                                    startTimeInputRef.current?.focus();
                                                }
                                            }}
                                            className="p-1.5 text-slate-300 hover:text-blue-500 transition-colors"
                                            title="開啟時間選取器"
                                        >
                                            <Clock className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <div className="relative group">
                                    <label className="absolute -top-6 left-0 text-[10px] font-black text-slate-400 uppercase tracking-widest">結束時間 (24H)</label>
                                    <input
                                        type="text"
                                        placeholder="HH:mm"
                                        maxLength={5}
                                        value={spot.endTime || ''}
                                        onChange={e => {
                                            let val = e.target.value.replace(/[^0-9]/g, '');
                                            if (val.length >= 3) {
                                                val = val.slice(0, 2) + ':' + val.slice(2, 4);
                                            }
                                            const parts = val.split(':');
                                            if (parts[0] && parseInt(parts[0]) > 23) return;
                                            if (parts[1] && parseInt(parts[1]) > 59) return;
                                            onSpotChange({ endTime: val });
                                        }}
                                        className="w-full px-5 py-3 rounded-2xl bg-slate-50 font-bold text-slate-700 pr-28 placeholder:text-slate-300 relative z-10"
                                    />
                                    <input
                                        type="time"
                                        ref={endTimeInputRef}
                                        className="absolute inset-0 opacity-0 pointer-events-none"
                                        onChange={e => onSpotChange({ endTime: e.target.value })}
                                    />
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-0.5 z-20">
                                        {spot.endTime && (
                                            <button
                                                type="button"
                                                onClick={() => onSpotChange({ endTime: '' })}
                                                className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors"
                                                title="清除時間"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => onSpotChange({ endTime: getCurrentTime() })}
                                            className="p-1.5 text-slate-300 hover:text-amber-500 transition-colors"
                                            title="設為現在時間"
                                        >
                                            <Zap className="w-4 h-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                try {
                                                    endTimeInputRef.current?.showPicker();
                                                } catch (e) {
                                                    endTimeInputRef.current?.focus();
                                                }
                                            }}
                                            className="p-1.5 text-slate-300 hover:text-blue-500 transition-colors"
                                            title="開啟時間選取器"
                                        >
                                            <Clock className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50 p-6 rounded-[2rem] space-y-4 border border-slate-100">
                                <div className="flex items-center justify-between text-slate-400 mb-2">
                                    <div className="flex items-center space-x-2">
                                        <Wallet className="w-4 h-4" />
                                        <span className="text-xs font-black uppercase tracking-widest">支出紀錄 ({currency})</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={addExpenseItem}
                                        className="text-blue-600 text-[10px] font-black hover:underline flex items-center bg-white px-2 py-1 rounded-lg border border-slate-100"
                                    >
                                        <Plus className="w-3 h-3 mr-1" />新增明細
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {spot.expenses?.map((exp) => (
                                        <div key={exp.id} className="group flex items-center space-x-3 p-4 bg-white rounded-2xl border border-slate-200 hover:border-blue-200 transition-all animate-in slide-in-from-left-2 duration-200 shadow-sm hover:shadow-md">
                                            <input
                                                type="text"
                                                placeholder="支出項目名稱..."
                                                value={exp.name}
                                                onChange={e => updateExpenseItem(exp.id, { name: e.target.value })}
                                                className="flex-grow bg-transparent text-sm font-black text-slate-700 outline-none placeholder:text-slate-300"
                                            />
                                            <div className="flex items-center space-x-2 border-l border-slate-100 pl-4">
                                                <input
                                                    type="number"
                                                    placeholder="0"
                                                    value={exp.amount || ''}
                                                    onChange={e => updateExpenseItem(exp.id, { amount: Number(e.target.value) })}
                                                    className="w-20 bg-transparent text-base font-black text-emerald-600 outline-none text-right"
                                                />
                                                <span className="text-[10px] font-black text-emerald-300">{currency}</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeExpenseItem(exp.id)}
                                                className="p-1 px-2 text-slate-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                    {(!spot.expenses || spot.expenses.length === 0) && (
                                        <div className="text-center py-4 border-2 border-dashed border-slate-200 rounded-xl text-slate-300 text-[10px] font-bold">
                                            尚無支出明細
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="bg-slate-50 p-6 rounded-[2rem] space-y-4 border border-slate-100 mt-6">
                                <div className="flex items-center justify-between text-slate-400 mb-2">
                                    <div className="flex items-center space-x-2">
                                        <Edit3 className="w-4 h-4" />
                                        <span className="text-xs font-black uppercase tracking-widest">貼心筆記</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={addNoteItem}
                                        className="text-blue-600 text-[10px] font-black hover:underline flex items-center bg-white px-2 py-1 rounded-lg border border-slate-100"
                                    >
                                        <Plus className="w-3 h-3 mr-1" />新增筆記
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {spot.notes?.map((note) => (
                                        <div key={note.id} className="flex items-start space-x-2 animate-in slide-in-from-left-2 duration-200">
                                            <textarea
                                                rows={2}
                                                placeholder="輸入筆記..."
                                                value={note.content}
                                                onChange={e => updateNoteItem(note.id, e.target.value)}
                                                className="flex-grow px-4 py-3 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-700 outline-none focus:border-blue-400 resize-none"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeNoteItem(note.id)}
                                                className="p-1.5 text-slate-300 hover:text-red-500 transition-colors mt-1"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                    {(!spot.notes || spot.notes.length === 0) && (
                                        <div className="text-center py-4 border-2 border-dashed border-slate-200 rounded-xl text-slate-300 text-[10px] font-bold">
                                            尚無筆記內容
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 flex flex-col h-full min-h-[300px]">
                                <div className="flex items-center justify-between mb-4">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">相簿</label>
                                    <div className="flex items-center space-x-3">
                                        <button type="button" onClick={() => cameraInputRef.current?.click()} className="text-blue-600 text-xs font-black hover:underline flex items-center">
                                            <Camera className="w-3 h-3 mr-1" />拍照
                                        </button>
                                        <button type="button" onClick={() => albumInputRef.current?.click()} className="text-blue-600 text-xs font-black hover:underline flex items-center">
                                            <Library className="w-3 h-3 mr-1" />上傳
                                        </button>
                                    </div>
                                    <input type="file" ref={cameraInputRef} accept="image/*" capture="environment" className="hidden" onChange={onImageUpload} />
                                    <input type="file" ref={albumInputRef} accept="image/*" multiple className="hidden" onChange={onImageUpload} />
                                </div>
                                <div className="space-y-2 overflow-y-auto max-h-[350px] pr-2 custom-scrollbar">
                                    {isProcessingImage && <div className="flex items-center justify-center p-4 text-xs font-bold text-blue-500 animate-pulse italic">處理圖片中...</div>}
                                    <DndContext sensors={imageSensors} collisionDetection={closestCenter} onDragEnd={handleImageDragEnd}>
                                        <SortableContext items={editingImages.map(i => i.internalId)} strategy={verticalListSortingStrategy}>
                                            {editingImages.map((img, i) => (
                                                <SortableImageItem
                                                    key={img.internalId}
                                                    image={img}
                                                    onRemove={() => {
                                                        const newImg = [...editingImages];
                                                        newImg.splice(i, 1);
                                                        onImagesChange(newImg);
                                                    }}
                                                    onChangeCaption={(val) => {
                                                        const newImg = [...editingImages];
                                                        newImg[i].caption = val;
                                                        onImagesChange(newImg);
                                                    }}
                                                />
                                            ))}
                                        </SortableContext>
                                    </DndContext>
                                </div>
                            </div>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="w-full py-4 bg-blue-600 text-white rounded-[1.5rem] font-black text-lg hover:bg-blue-700 shadow-xl transition-all active:scale-95">完成</button>
                </div>
            </div>
        </div>
    );
};
