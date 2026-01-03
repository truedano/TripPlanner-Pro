
import React from 'react';
import { Spot, SpotType } from '../types';
import { MapPin, Car, Bed, Utensils, GripVertical, Trash2, Clock } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableSpotItemProps {
    spot: Spot;
    currency?: string;
    onClick: () => void;
    onDelete: () => void;
}

export const SortableSpotItem: React.FC<SortableSpotItemProps> = ({
    spot,
    currency,
    onClick,
    onDelete
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: spot.id });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 'auto',
        opacity: isDragging ? 0.3 : 1,
        touchAction: 'none'
    };

    const typeStyles = {
        [SpotType.SPOT]: { icon: MapPin, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', label: '景點' },
        [SpotType.TRANSPORT]: { icon: Car, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100', label: '交通' },
        [SpotType.STAY]: { icon: Bed, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100', label: '住宿' },
        [SpotType.MEAL]: { icon: Utensils, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100', label: '伙食' },
    };

    const currentType = spot.type || SpotType.SPOT;
    const styleConfig = typeStyles[currentType];
    const Icon = styleConfig.icon;

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`group border rounded-[2.5rem] p-4 sm:p-5 hover:shadow-xl transition-all hover:bg-white select-none ${styleConfig.bg} ${styleConfig.border} hover:border-blue-200`}
        >
            <div className="flex items-start">
                {/* Drag Handle */}
                <div
                    {...attributes}
                    {...listeners}
                    className="self-center mr-2 sm:mr-3 p-3 -ml-2 text-slate-300 group-hover:text-blue-400 transition-colors cursor-grab active:cursor-grabbing touch-none"
                >
                    <GripVertical className="w-5 h-5" />
                </div>

                <div onClick={onClick} className="flex flex-grow items-start min-w-0 cursor-pointer">
                    {/* Time indicator - localized responsive styling */}
                    <div className="flex flex-col items-center justify-center w-12 sm:w-24 pr-3 sm:pr-4 border-r border-slate-100 sm:border-slate-200 mr-3 sm:mr-6 shrink-0">
                        <span className={`text-[10px] sm:text-xs font-black ${styleConfig.color}`}>{spot.startTime || '--:--'}</span>
                        <div className={`h-3 sm:h-4 w-0.5 my-0.5 sm:my-1 opacity-20 ${styleConfig.color.replace('text-', 'bg-')}`}></div>
                        <span className="text-[10px] font-bold text-slate-400 scale-[0.85] sm:scale-100">{spot.endTime || '--:--'}</span>
                    </div>

                    <div className="flex-grow min-w-0">
                        <div className="flex justify-between items-start gap-2 mb-2">
                            <div className="flex flex-col min-w-0 flex-1">
                                <span className={`text-[10px] font-black uppercase tracking-tighter mb-1 ${styleConfig.color}`}>{styleConfig.label}</span>
                                <h4 className="font-black text-base sm:text-lg text-slate-800 truncate">{spot.name || `未命名${styleConfig.label}`}</h4>
                            </div>

                            <div className="flex items-center shrink-0 space-x-1">
                                {spot.mapUrl && (
                                    <div className="p-2 text-blue-400 opacity-60" title="已設定地圖連結">
                                        <MapPin className="w-4 h-4" />
                                    </div>
                                )}
                                {spot.expenses && spot.expenses.length > 0 && (
                                    <div className="bg-emerald-50 px-3 py-1 rounded-full text-emerald-600 text-[10px] sm:text-xs font-black whitespace-nowrap">
                                        {currency} {spot.expenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString()}
                                    </div>
                                )}
                                {spot.lat !== undefined && spot.lng !== undefined && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const url = `https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lng}`;
                                            window.open(url, '_blank');
                                        }}
                                        className="p-2.5 bg-blue-600 text-white hover:bg-blue-700 transition-all rounded-xl shadow-md hover:shadow-lg active:scale-95 flex items-center justify-center group/nav"
                                        title="啟動導航"
                                    >
                                        <Car className="w-4 h-4" />
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDelete();
                                    }}
                                    className="p-2 text-slate-300 hover:text-red-500 transition-colors rounded-full hover:bg-slate-100/50"
                                    title="刪除紀錄"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="text-xs font-bold text-slate-300 group-hover:text-blue-400 transition-colors flex items-center mb-1">
                            <Icon className="w-3 h-3 mr-1" /> 編輯詳細
                        </div>

                        {spot.images && spot.images.length > 0 && (
                            <div className="flex items-center space-x-2 mt-3 overflow-x-auto no-scrollbar pb-1">
                                {spot.images.map((img, idx) => (
                                    <img key={idx} src={img.url} className="w-12 h-12 rounded-lg object-cover border border-slate-100 shadow-sm shrink-0" alt="thumbnail" />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
