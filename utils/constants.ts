import { MapPin, Car, Bed, Utensils } from 'lucide-react';
import { SpotType } from '../types';

export const CATEGORY_THEMES = {
    [SpotType.SPOT]: {
        label: '景點',
        icon: MapPin,
        color: 'text-blue-500',
        hexColor: '#3B82F6',
        bgColor: 'bg-blue-50',
        dotColor: 'bg-blue-500',
        tabActiveColor: 'bg-white text-blue-600 shadow-sm',
        buttonColor: 'bg-blue-500 hover:bg-blue-600'
    },
    [SpotType.TRANSPORT]: {
        label: '交通',
        icon: Car,
        color: 'text-orange-500',
        hexColor: '#F97316',
        bgColor: 'bg-orange-50',
        dotColor: 'bg-orange-500',
        tabActiveColor: 'bg-white text-orange-600 shadow-sm',
        buttonColor: 'bg-orange-500 hover:bg-orange-600'
    },
    [SpotType.STAY]: {
        label: '住宿',
        icon: Bed,
        color: 'text-purple-500',
        hexColor: '#A855F7',
        bgColor: 'bg-purple-50',
        dotColor: 'bg-purple-500',
        tabActiveColor: 'bg-white text-purple-600 shadow-sm',
        buttonColor: 'bg-purple-500 hover:bg-purple-600'
    },
    [SpotType.MEAL]: {
        label: '伙食',
        icon: Utensils,
        color: 'text-rose-500',
        hexColor: '#F43F5E',
        bgColor: 'bg-rose-50',
        dotColor: 'bg-rose-500',
        tabActiveColor: 'bg-white text-rose-600 shadow-sm',
        buttonColor: 'bg-rose-500 hover:bg-rose-600'
    },
} as const;

export const DEFAULT_CATEGORY = SpotType.SPOT;
