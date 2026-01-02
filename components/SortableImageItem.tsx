
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';
import { IdentifiableSpotImage } from '../types';

interface SortableImageItemProps {
    image: IdentifiableSpotImage;
    onRemove: () => void;
    onChangeCaption: (newCaption: string) => void;
}

export const SortableImageItem: React.FC<SortableImageItemProps> = ({ image, onRemove, onChangeCaption }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: image.internalId });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        zIndex: isDragging ? 20 : 'auto',
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`flex space-x-3 bg-white p-3 rounded-xl border border-slate-100 items-center ${isDragging ? 'shadow-lg' : ''}`}
        >
            <div {...attributes} {...listeners} className="text-slate-300 cursor-grab active:cursor-grabbing hover:text-blue-400 p-1">
                <GripVertical className="w-5 h-5" />
            </div>
            <img src={image.url} className="w-12 h-12 rounded-lg object-cover" alt="spot" />
            <input
                type="text"
                placeholder="描述..."
                value={image.caption}
                onChange={e => onChangeCaption(e.target.value)}
                className="flex-grow text-xs font-medium outline-none"
                onPointerDown={e => e.stopPropagation()}
                onKeyDown={e => e.stopPropagation()}
            />
            <button
                type="button"
                onClick={onRemove}
                className="p-1 text-slate-300 hover:text-red-500 transition-colors"
            >
                <Trash2 className="w-4 h-4" />
            </button>
        </div>
    );
};
