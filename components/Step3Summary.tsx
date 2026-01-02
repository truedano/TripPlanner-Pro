import React, { useState } from 'react';
import { TripData, SpotType } from '../types';
import { Printer, Calendar, Clock, AlertCircle, Wallet, BarChart3, TrendingUp, ListOrdered, MapPin, Car, Bed, Utensils } from 'lucide-react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { TripPdfDocument } from './TripPdfDocument';

interface Props {
  tripData: TripData;
}

export const Step3Summary: React.FC<Props> = ({ tripData }) => {
  const [viewMode, setViewMode] = useState<'itinerary' | 'journal' | 'budget'>('journal');

  if (!tripData.days || tripData.days.length === 0) return null;

  // 財務統計邏輯
  const allSpots = tripData.days.flatMap(d => d.spots);
  const totalActual = allSpots.reduce((sum, s) =>
    sum + (s.expenses?.reduce((acc, e) => acc + (e.amount || 0), 0) || 0), 0
  );

  // 核心邏輯
  const isBudgetSet = !!tripData.totalBudget && tripData.totalBudget > 0;
  const budget = isBudgetSet ? tripData.totalBudget : (totalActual || 1);
  const budgetProgress = isBudgetSet ? (totalActual / budget) * 100 : 0;
  const currency = tripData.currency || 'TWD';

  // 支出明細匯總
  const detailedExpenses = tripData.days.flatMap((day, dayIdx) =>
    day.spots.flatMap(spot =>
      (spot.expenses || []).map(exp => ({
        day: dayIdx + 1,
        spotName: spot.name,
        name: exp.name,
        amount: exp.amount
      }))
    )
  ).filter(e => e.amount > 0 || e.name);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000 max-w-5xl mx-auto pb-20 px-4">
      <div className="text-center mb-16 no-print space-y-6">
        <h2 className="text-5xl sm:text-7xl font-serif font-black text-slate-900 tracking-tight leading-none italic">
          {tripData.name || '這是一場無名的冒險'}
        </h2>
        <div className="flex flex-col items-center space-y-4">
          <div className="flex items-center space-x-3 text-slate-400 font-bold uppercase tracking-widest text-xs">
            <Calendar className="w-4 h-4 text-slate-300" />
            <span>{tripData.startDate} — {tripData.endDate}</span>
          </div>

          <div className="flex flex-wrap justify-center gap-4">
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

            <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-100 items-center">
              <PDFDownloadLink
                document={<TripPdfDocument tripData={tripData} viewMode={viewMode} />}
                fileName={`${tripData.name || '旅程'}_${viewMode === 'journal' ? '回憶日誌' : viewMode === 'itinerary' ? '行程表' : '財務報告'}.pdf`}
                className="flex items-center px-6 py-2 rounded-xl text-xs font-black text-slate-700 hover:bg-slate-50 transition-all"
              >
                {({ loading, error }) => {
                  if (error) {
                    console.error('PDF Generation Error:', error);
                    return <span className="flex items-center text-rose-500 text-xs"><AlertCircle className="w-4 h-4 mr-2" /> {error.toString() || '匯出失敗'}</span>;
                  }
                  return loading ? (
                    <span className="flex items-center text-slate-400"><Printer className="w-4 h-4 mr-2 animate-pulse" /> 準備中...</span>
                  ) : (
                    <span className="flex items-center"><Printer className="w-4 h-4 mr-2" /> 下載 PDF</span>
                  );
                }}
              </PDFDownloadLink>
            </div>
          </div>
        </div>
      </div>

      {viewMode === 'budget' ? (
        <div className="space-y-8 animate-in zoom-in-95 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col items-center text-center relative overflow-hidden">
              <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-4">
                {isBudgetSet ? '自訂總預算' : '預算狀態'}
              </span>
              <span className="text-4xl font-serif font-black italic text-slate-800">
                {currency} {isBudgetSet ? tripData.totalBudget?.toLocaleString() : '--'}
              </span>
              <TrendingUp className="w-6 h-6 text-slate-100 mt-4" />
            </div>
            <div className="bg-white p-8 rounded-[2.5rem] border border-emerald-100 shadow-sm flex flex-col items-center text-center">
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-4">目前實際總支出</span>
              <span className="text-4xl font-serif font-black italic text-emerald-600">{currency} {totalActual.toLocaleString()}</span>
              <Wallet className="w-6 h-6 text-emerald-100 mt-4" />
            </div>
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col items-center text-center">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">支出狀態</span>
              <span className={`text-4xl font-serif font-black italic ${isBudgetSet && budget - totalActual < 0 ? 'text-rose-500' : 'text-slate-800'}`}>
                {isBudgetSet ? `${currency} ${(budget - totalActual).toLocaleString()}` : '記錄中'}
              </span>
              <BarChart3 className="w-6 h-6 text-slate-100 mt-4" />
            </div>
          </div>

          <div className={`${isBudgetSet && budgetProgress > 100 ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100'} p-10 rounded-[3rem] border transition-colors`}>
            <div className="flex items-center justify-between mb-4">
              <span className={`text-sm font-black uppercase tracking-widest ${isBudgetSet && budgetProgress > 100 ? 'text-rose-800' : 'text-slate-400'}`}>
                {isBudgetSet ? '預算執行進度' : '支出統計中'}
              </span>
              <span className={`text-sm font-black ${isBudgetSet && budgetProgress > 100 ? 'text-rose-800' : 'text-slate-400'}`}>
                {isBudgetSet ? `${budgetProgress.toFixed(1)}%` : '--'}
              </span>
            </div>
            <div className="h-4 w-full bg-white rounded-full overflow-hidden shadow-inner">
              <div className={`h-full rounded-full transition-all duration-1000 ${budgetProgress > 100 ? 'bg-rose-600' : 'bg-emerald-500'}`} style={{ width: `${Math.min(budgetProgress, 100)}%` }}></div>
            </div>
            {isBudgetSet && budgetProgress > 100 && (
              <div className="mt-4 flex items-center justify-center space-x-2 text-rose-600 animate-pulse">
                <AlertCircle className="w-4 h-4" />
                <p className="text-xs font-black italic tracking-wide">注意：已超出預期支出上限！</p>
              </div>
            )}
          </div>

          <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-slate-800 flex items-center">
                <ListOrdered className="w-5 h-5 mr-2 text-emerald-500" /> 支出預算明細表
              </h3>
              <span className="text-xs font-bold text-slate-400">所有條目共 {detailedExpenses.length} 筆</span>
            </div>

            <div className="overflow-x-auto">
              {detailedExpenses.length > 0 ? (
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-50">
                      <th className="pb-4 text-[10px] font-black text-slate-300 uppercase tracking-widest">天數</th>
                      <th className="pb-4 text-[10px] font-black text-slate-300 uppercase tracking-widest pl-4">相關項目/景點</th>
                      <th className="pb-4 text-[10px] font-black text-slate-300 uppercase tracking-widest">支出名稱</th>
                      <th className="pb-4 text-[10px] font-black text-slate-300 uppercase tracking-widest text-right">金額 ({currency})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {detailedExpenses.map((exp, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors group">
                        <td className="py-4">
                          <span className="text-xs font-black text-slate-400">Day {exp.day}</span>
                        </td>
                        <td className="py-4 pl-4">
                          <span className="text-xs font-bold text-slate-600 truncate max-w-[150px] inline-block">{exp.spotName || '未命名項目'}</span>
                        </td>
                        <td className="py-4">
                          <span className="text-xs font-black text-slate-800">{exp.name || '未命名支出'}</span>
                        </td>
                        <td className="py-4 text-right">
                          <span className="text-sm font-black text-emerald-600">{exp.amount.toLocaleString()}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="py-20 text-center flex flex-col items-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <Wallet className="w-8 h-8 text-slate-200" />
                  </div>
                  <p className="text-slate-300 font-bold italic text-sm">尚無任何支出項目，請回到編輯器新增。</p>
                </div>
              )}
            </div>

            {/* 裝飾性漸層 */}
            <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white/50 to-transparent pointer-events-none"></div>
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
                {day.spots.map((spot) => {
                  const CategoryIcon = {
                    [SpotType.SPOT]: MapPin,
                    [SpotType.TRANSPORT]: Car,
                    [SpotType.STAY]: Bed,
                    [SpotType.MEAL]: Utensils
                  }[spot.type || SpotType.SPOT] || MapPin;

                  const categoryTheme = {
                    [SpotType.SPOT]: { color: 'text-blue-500', bg: 'bg-blue-50', label: '景點' },
                    [SpotType.TRANSPORT]: { color: 'text-orange-500', bg: 'bg-orange-50', label: '交通' },
                    [SpotType.STAY]: { color: 'text-purple-500', bg: 'bg-purple-50', label: '住宿' },
                    [SpotType.MEAL]: { color: 'text-rose-500', bg: 'bg-rose-50', label: '伙食' }
                  }[spot.type || SpotType.SPOT] || { color: 'text-blue-500', bg: 'bg-blue-50', label: '景點' };

                  return (
                    <div key={spot.id} className={`${viewMode === 'journal' ? 'max-w-4xl mx-auto' : 'bg-white rounded-[2rem] p-6 border border-slate-50 shadow-sm'}`}>
                      <div className="flex flex-col md:flex-row gap-6">
                        <div className="flex-grow">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-3">
                              <div className={`flex items-center px-3 py-1 rounded-full ${categoryTheme.bg} ${categoryTheme.color} text-[10px] font-black uppercase tracking-widest`}>
                                <CategoryIcon className="w-3 h-3 mr-1" />
                                <span>{categoryTheme.label}</span>
                              </div>
                              <div className="flex items-center text-slate-400 font-black text-[10px] uppercase tracking-widest">
                                <Clock className="w-3 h-3 mr-1" />
                                <span>{spot.startTime} — {spot.endTime}</span>
                              </div>
                            </div>
                            {spot.expenses && spot.expenses.length > 0 && (
                              <div className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                                {currency} {spot.expenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString()}
                              </div>
                            )}
                          </div>
                          <h4 className={`text-slate-900 font-black tracking-tight leading-tight mb-4 ${viewMode === 'journal' ? 'text-4xl font-serif italic' : 'text-2xl'}`}>{spot.name || '未命名項目'}</h4>
                          {spot.notes && (Array.isArray(spot.notes) ? spot.notes.length > 0 : typeof spot.notes === 'string' && spot.notes.trim() !== '') && (
                            <div className="text-slate-500 italic mb-6 space-y-2 border-l-2 border-slate-100 pl-4">
                              {Array.isArray(spot.notes) ? (
                                spot.notes.map(note => (
                                  <p key={note.id} className="text-sm">"{note.content}"</p>
                                ))
                              ) : (
                                <p className="text-sm">"{spot.notes}"</p>
                              )}
                            </div>
                          )}
                        </div>
                        {spot.images && spot.images.length > 0 && (
                          <div className="md:w-1/3 grid grid-cols-2 gap-2">
                            {spot.images.slice(0, 2).map((img, i) => (
                              <img key={i} src={img.url} className="w-full aspect-square object-cover rounded-xl" alt={img.caption || 'spot image'} />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
