
import React from 'react';
import { useDroppable } from '@dnd-kit/core';

interface DroppableDayTabProps {
    dayIndex: number;
    date: string;
    isActive: boolean;
    onClick: () => void;
}

export const DroppableDayTab: React.FC<DroppableDayTabProps> = ({
    dayIndex,
    date,
    isActive,
    onClick
}) => {
    const { setNodeRef, isOver } = useDroppable({
        id: `day-tab-${dayIndex}`,
        data: { index: dayIndex }
    });

    return (
        <button
            type="button"
            ref={setNodeRef}
            onClick={onClick}
            className={`relative px-6 py-4 min-w-[5rem] rounded-2xl font-black transition-all flex flex-col items-center flex-shrink-0 ${isActive
                ? 'bg-blue-600 text-white shadow-xl -translate-y-1'
                : isOver
                    ? 'bg-blue-100 text-blue-600 border-2 border-blue-300 scale-105'
                    : 'bg-white text-slate-400 border border-slate-100 hover:border-blue-200'
                }`}
        >
            <span className="text-[10px] opacity-70 uppercase leading-none mb-1">Day {dayIndex + 1}</span>
            <span className="text-sm leading-none">{new Date(date).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })}</span>
        </button>
    );
};
