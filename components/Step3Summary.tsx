
import React, { useState } from 'react';
import { TripData, ExpenseCategory } from '../types';
import { Printer, Calendar, MapPin, Navigation, Clock, Camera, AlertCircle, Share2, BookOpen, List, Heart, Wallet, PieChart, BarChart3, TrendingUp, Info } from 'lucide-react';

interface Props {
  tripData: TripData;
}

export const Step3Summary: React.FC<Props> = ({ tripData }) => {
  const [viewMode, setViewMode] = useState<'itinerary' | 'journal' | 'budget'>('journal');

  const handlePrint = () => window.print();

  if (!tripData.days || tripData.days.length === 0) return null;

  // 財務統計邏輯
  const allSpots = tripData.days.flatMap(d => d.spots);
  const totalActual = allSpots.reduce((sum, s) => sum + (s.expense?.actual || 0), 0);
  const totalEstimated = allSpots.reduce((sum, s) => sum + (s.expense?.estimated || 0), 0);
  
  // 核心邏輯更新：區分預算來源
  const isBudgetSet = !!tripData.totalBudget && tripData.totalBudget > 0;
  const budget = isBudgetSet ? tripData.totalBudget : (totalEstimated || 1); // 避免除以 0
  const budgetProgress = (totalActual / budget) * 100;

  const categoryTotals = Object.values(ExpenseCategory).map(cat => ({
    name: cat,
    total: allSpots.filter(s => s.expense?.category === cat).reduce((sum, s) => sum + (s.expense?.actual || 0), 0)
  })).filter(c => c.total > 0).sort((a, b) => b.total - a.total);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000 max-w-5xl mx-auto pb-20">
      <div className="text-center mb-16 no-print space-y-6">
        <h2 className="text-5xl sm:text-7xl font-serif font-black text-slate-900 tracking-tight leading-none italic">
          {tripData.name || '這是一場無名的冒險'}
        </h2>
        <div className="flex flex-col items-center space-y-4">
          <div className="flex items-center space-x-3 text-slate-400 font-bold uppercase tracking-widest text-xs">
            <Calendar className="w-4 h-4 text-slate-300" />
            <span>{tripData.startDate} — {tripData.endDate}</span>
          </div>
          
          <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-100">
            <button onClick={() => setViewMode('journal')} className={`flex items-center px-6 py-2 rounded-xl text-xs font-black transition-all ${viewMode === 'journal' ? 'bg-slate-900 text-white' : 'text-slate-400'}`}>
              回憶日誌
            </button>
            <button onClick={() => setViewMode('itinerary')} className={`flex items-center px-6 py-2 rounded-xl text-xs font-black transition-all ${viewMode === 'itinerary' ? 'bg-slate-900 text-white' : 'text-slate-400'}`}>
              條列行程
            </button>
            <button onClick={() => setViewMode('budget')} className={`flex items-center px-6 py-2 rounded-xl text-xs font-black transition-all ${viewMode === 'budget' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}>
              財務報告
            </button>
          </div>
        </div>
      </div>

      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center bg-white/80 backdrop-blur-xl border border-slate-100 p-2 rounded-3xl shadow-2xl z-[60] no-print">
        <button onClick={handlePrint} className="flex items-center px-6 py-3 text-slate-700 font-black text-sm hover:bg-slate-50 rounded-2xl"><Printer className="w-4 h-4 mr-2" /> 列印 / PDF</button>
      </div>

      {viewMode === 'budget' ? (
        <div className="space-y-8 animate-in zoom-in-95 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col items-center text-center relative overflow-hidden">
              {isBudgetSet ? (
                <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-4">自訂總預算</span>
              ) : (
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center">
                  <Info className="w-3 h-3 mr-1" /> 系統估算總額
                </span>
              )}
              <span className="text-4xl font-serif font-black italic text-slate-800">{tripData.currency} {isBudgetSet ? tripData.totalBudget?.toLocaleString() : totalEstimated.toLocaleString()}</span>
              <TrendingUp className="w-6 h-6 text-slate-100 mt-4" />
            </div>
            <div className="bg-white p-8 rounded-[2.5rem] border border-emerald-100 shadow-sm flex flex-col items-center text-center">
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-4">目前實際總支出</span>
              <span className="text-4xl font-serif font-black italic text-emerald-600">{tripData.currency} {totalActual.toLocaleString()}</span>
              <Wallet className="w-6 h-6 text-emerald-100 mt-4" />
            </div>
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col items-center text-center">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">預算剩餘</span>
              <span className={`text-4xl font-serif font-black italic ${budget - totalActual < 0 ? 'text-rose-500' : 'text-slate-800'}`}>
                {tripData.currency} {(budget - totalActual).toLocaleString()}
              </span>
              <BarChart3 className="w-6 h-6 text-slate-100 mt-4" />
            </div>
          </div>

          <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-8">
               <h3 className="text-xl font-black text-slate-800 flex items-center">
                 <PieChart className="w-5 h-5 mr-2 text-blue-500" /> 支出分類佔比
               </h3>
               <span className="text-xs font-bold text-slate-400">依實際支出計算</span>
            </div>
            {totalActual > 0 ? (
              <div className="space-y-6">
                {categoryTotals.map(cat => (
                  <div key={cat.name} className="space-y-2">
                    <div className="flex justify-between items-end">
                      <span className="text-sm font-black text-slate-700">{cat.name}</span>
                      <span className="text-sm font-bold text-slate-400">{tripData.currency} {cat.total.toLocaleString()} ({((cat.total / totalActual) * 100).toFixed(1)}%)</span>
                    </div>
                    <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden">
                      <div className="h-full bg-slate-800 rounded-full" style={{ width: `${(cat.total / totalActual) * 100}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-300 font-bold italic">尚無任何支出紀錄</div>
            )}
          </div>
          
          <div className={`${isBudgetSet || totalActual > 0 ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100'} p-10 rounded-[3rem] border`}>
             <div className="flex items-center justify-between mb-4">
               <span className={`text-sm font-black uppercase tracking-widest ${isBudgetSet || totalActual > 0 ? 'text-rose-800' : 'text-slate-400'}`}>
                 {isBudgetSet ? '預算執行進度' : '支出相對於系統估算之比例'}
               </span>
               <span className={`text-sm font-black ${isBudgetSet || totalActual > 0 ? 'text-rose-800' : 'text-slate-400'}`}>
                 {isBudgetSet || totalEstimated > 0 ? `${budgetProgress.toFixed(1)}%` : '0%'}
               </span>
             </div>
             <div className="h-4 w-full bg-white rounded-full overflow-hidden shadow-inner">
               <div className={`h-full rounded-full transition-all duration-1000 ${budgetProgress > 100 ? 'bg-rose-600' : 'bg-emerald-500'}`} style={{ width: `${Math.min(budgetProgress, 100)}%` }}></div>
             </div>
             {budgetProgress > 100 && (
               <div className="mt-4 flex items-center justify-center space-x-2 text-rose-600 animate-pulse">
                 <AlertCircle className="w-4 h-4" />
                 <p className="text-xs font-black italic tracking-wide">注意：已超出預期支出上限！</p>
               </div>
             )}
             {!isBudgetSet && (
               <p className="mt-4 text-[10px] text-slate-400 font-bold text-center italic">
                 提示：您未設定總預算，目前的百分比是根據行程中所有景點的「估計支出」總和計算。
               </p>
             )}
          </div>
        </div>
      ) : (
        <div className="space-y-24">
          {tripData.days.map((day, dayIdx) => (
            <div key={day.date} className="print-break-inside-avoid">
              <div className={`flex flex-col mb-12 ${viewMode === 'journal' ? 'items-center text-center' : 'items-start'}`}>
                <span className="text-blue-500 font-serif italic text-2xl mb-2">Day {dayIdx + 1}</span>
                <h3 className="text-sm font-black text-slate-300 uppercase tracking-[0.4em]">{day.date}</h3>
              </div>
              <div className={viewMode === 'journal' ? 'space-y-20' : 'space-y-6'}>
                {day.spots.map((spot, spotIdx) => (
                  <div key={spot.id} className={`${viewMode === 'journal' ? 'max-w-4xl mx-auto' : 'bg-white rounded-[2rem] p-6 border border-slate-50 shadow-sm'}`}>
                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="flex-grow">
                         <div className="flex items-center justify-between mb-4">
                           <div className="flex items-center text-blue-400 font-black text-[10px] uppercase tracking-widest">
                             <Clock className="w-3 h-3 mr-1" />
                             <span>{spot.startTime} — {spot.endTime}</span>
                           </div>
                           {spot.expense && spot.expense.actual > 0 && (
                             <div className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                               {tripData.currency} {spot.expense.actual.toLocaleString()}
                             </div>
                           )}
                         </div>
                         <h4 className={`text-slate-900 font-black tracking-tight leading-tight mb-4 ${viewMode === 'journal' ? 'text-4xl font-serif italic' : 'text-2xl'}`}>{spot.name}</h4>
                         {spot.notes && <p className="text-slate-500 italic mb-6">"{spot.notes}"</p>}
                      </div>
                      {spot.images && spot.images.length > 0 && (
                        <div className="md:w-1/3 grid grid-cols-2 gap-2">
                           {spot.images.slice(0, 2).map((img, i) => (
                             <img key={i} src={img.url} className="w-full aspect-square object-cover rounded-xl" />
                           ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
