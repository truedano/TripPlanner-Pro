
import React from 'react';
import { TripData } from '../types';
import { CalendarDays, Type } from 'lucide-react';

interface Props {
  tripData: TripData;
  onUpdate: (updates: Partial<TripData>) => void;
}

export const Step1Setup: React.FC<Props> = ({ tripData, onUpdate }) => {
  return (
    <div className="max-w-lg mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 p-8 sm:p-10 border border-slate-50">
        <div className="space-y-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">開始規劃您的旅程</h2>
            <p className="text-slate-500 font-medium">輸入基本資訊來建立行程框架</p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="flex items-center text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                <Type className="w-3 h-3 mr-2 text-blue-500" /> 行程名稱
              </label>
              <input
                type="text"
                placeholder="例如：東京浪漫五日遊"
                value={tripData.name}
                onChange={(e) => onUpdate({ name: e.target.value })}
                className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-700 placeholder:text-slate-300"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                  <CalendarDays className="w-3 h-3 mr-2 text-blue-500" /> 開始日期
                </label>
                <input
                  type="date"
                  value={tripData.startDate}
                  onChange={(e) => onUpdate({ startDate: e.target.value })}
                  className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-700"
                />
              </div>
              <div>
                <label className="flex items-center text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                  <CalendarDays className="w-3 h-3 mr-2 text-blue-500" /> 結束日期
                </label>
                <input
                  type="date"
                  value={tripData.endDate}
                  onChange={(e) => onUpdate({ endDate: e.target.value })}
                  className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-700"
                />
              </div>
            </div>
          </div>

          {tripData.startDate && tripData.endDate && (
             <div className="bg-blue-50/50 p-4 rounded-2xl text-blue-600 text-sm font-black text-center border border-blue-100">
               這趟旅程共計 {Math.ceil((new Date(tripData.endDate).getTime() - new Date(tripData.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} 天
             </div>
          )}
        </div>
      </div>
      <p className="mt-8 text-center text-slate-300 text-xs font-medium">
        提示：您可以隨時點擊右上角的垃圾桶圖標來移除此行程
      </p>
    </div>
  );
};
