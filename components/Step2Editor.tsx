
import React, { useState, useRef } from 'react';
import { TripData, Spot, DayPlan, SpotImage, ExpenseCategory } from '../types';
import { Plus, Trash2, MapPin, ChevronUp, ChevronDown, Clock, Edit3, X, Library, Wallet } from 'lucide-react';
import { compressImage } from '../utils/image';

interface Props {
  tripData: TripData;
  onUpdate: (updates: Partial<TripData>) => void;
}

export const Step2Editor: React.FC<Props> = ({ tripData, onUpdate }) => {
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingSpot, setEditingSpot] = useState<Spot | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  
  const albumInputRef = useRef<HTMLInputElement>(null);

  if (!tripData.days || tripData.days.length === 0) return null;

  const activeDay = tripData.days[activeDayIndex];
  const dailyTotal = activeDay.spots.reduce((sum, spot) => sum + (spot.expense?.actual || 0), 0);
  const dailyEstimated = activeDay.spots.reduce((sum, spot) => sum + (spot.expense?.estimated || 0), 0);

  const handleAddSpot = () => {
    setEditingSpot({
      id: crypto.randomUUID(),
      name: '',
      startTime: '',
      endTime: '',
      notes: '',
      mapUrl: '',
      images: [],
      expense: { estimated: 0, actual: 0, category: ExpenseCategory.OTHER }
    });
    setShowModal(true);
  };

  const handleEditSpot = (spot: Spot) => {
    setEditingSpot({ 
      ...spot, 
      expense: spot.expense || { estimated: 0, actual: 0, category: ExpenseCategory.OTHER } 
    });
    setShowModal(true);
  };

  const saveSpot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSpot) return;
    const updatedDays = [...tripData.days];
    const spots = [...updatedDays[activeDayIndex].spots];
    const existingIndex = spots.findIndex(s => s.id === editingSpot.id);
    if (existingIndex > -1) spots[existingIndex] = editingSpot;
    else spots.push(editingSpot);
    updatedDays[activeDayIndex] = { ...updatedDays[activeDayIndex], spots };
    onUpdate({ days: updatedDays });
    setShowModal(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !editingSpot) return;
    setIsProcessingImage(true);
    try {
      const files = Array.from(e.target.files) as File[];
      const compressed = await Promise.all(files.map(file => compressImage(file)));
      const newImages: SpotImage[] = compressed.map(url => ({ url, caption: '' }));
      setEditingSpot({ ...editingSpot, images: [...(editingSpot.images || []), ...newImages] });
    } finally {
      setIsProcessingImage(false);
      if (albumInputRef.current) albumInputRef.current.value = '';
    }
  };

  const updateExpense = (updates: Partial<NonNullable<Spot['expense']>>) => {
    if (!editingSpot) return;
    setEditingSpot({
      ...editingSpot,
      expense: { ...(editingSpot.expense || { estimated: 0, actual: 0, category: ExpenseCategory.OTHER }), ...updates }
    });
  };

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex space-x-2 overflow-x-auto pb-4 mb-6 no-scrollbar">
        {tripData.days.map((day, idx) => (
          <button
            key={day.date}
            onClick={() => setActiveDayIndex(idx)}
            className={`px-6 py-3 rounded-2xl font-black transition-all flex flex-col items-center ${
              activeDayIndex === idx ? 'bg-blue-600 text-white shadow-xl -translate-y-1' : 'bg-white text-slate-400 border border-slate-100 hover:border-blue-200'
            }`}
          >
            <span className="text-[10px] opacity-70 uppercase">Day {idx + 1}</span>
            <span className="text-sm">{new Date(day.date).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })}</span>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-[2rem] shadow-xl p-6 sm:p-10 min-h-[500px] border border-slate-50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
          <div>
            <h3 className="text-2xl font-black text-slate-800">第 {activeDayIndex + 1} 天行程</h3>
            <div className="flex items-center mt-1 space-x-3">
              <span className="text-slate-400 text-sm font-medium">當日支出：</span>
              <span className="text-emerald-600 text-sm font-black">{tripData.currency} {dailyTotal.toLocaleString()}</span>
            </div>
          </div>
          <button onClick={handleAddSpot} className="flex items-center px-6 py-3 bg-green-500 text-white rounded-2xl hover:bg-green-600 transition-all text-sm font-black shadow-lg">
            <Plus className="w-5 h-5 mr-1" /> 新增景點
          </button>
        </div>

        {activeDay.spots.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 border-4 border-dashed border-slate-50 rounded-[2rem] text-slate-300 font-bold">
            <MapPin className="w-12 h-12 opacity-20 mb-4" />
            <p>點擊右上方按鈕開始紀錄回憶與開銷</p>
          </div>
        ) : (
          <div className="space-y-6">
            {activeDay.spots.map((spot) => (
              <div key={spot.id} onClick={() => handleEditSpot(spot)} className="group bg-slate-50 border border-slate-100 rounded-[1.5rem] p-5 cursor-pointer hover:shadow-xl transition-all hover:bg-white hover:border-blue-200">
                <div className="flex items-start">
                  <div className="hidden sm:flex flex-col items-center justify-center w-24 pr-4 border-r border-slate-200 mr-6 shrink-0">
                    <span className="text-xs font-black text-blue-600">{spot.startTime || '--:--'}</span>
                    <div className="h-4 w-0.5 bg-blue-100 my-1"></div>
                    <span className="text-[10px] font-bold text-slate-400">{spot.endTime || '--:--'}</span>
                  </div>
                  <div className="flex-grow">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-black text-lg text-slate-800 truncate">{spot.name}</h4>
                      {spot.expense && spot.expense.actual > 0 && (
                        <div className="bg-emerald-50 px-3 py-1 rounded-full text-emerald-600 text-xs font-black">
                          {tripData.currency} {spot.expense.actual.toLocaleString()}
                        </div>
                      )}
                    </div>
                    <div className="text-xs font-bold text-slate-300 group-hover:text-blue-400 transition-colors flex items-center">
                      <Edit3 className="w-3 h-3 mr-1" /> 編輯紀錄
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && editingSpot && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
          <div className="bg-white w-full max-w-3xl rounded-[2.5rem] shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-2xl font-black text-slate-800">編輯景點與支出</h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-50 rounded-full"><X className="w-6 h-6 text-slate-400" /></button>
            </div>
            
            <form onSubmit={saveSpot} className="p-8 space-y-8 overflow-y-auto flex-grow custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">景點名稱</label>
                    <input 
                      required 
                      type="text" 
                      value={editingSpot.name} 
                      onChange={e => setEditingSpot({ ...editingSpot, name: e.target.value })} 
                      className="w-full px-5 py-3 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-blue-500 outline-none font-bold text-slate-700" 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <input type="time" value={editingSpot.startTime} onChange={e => setEditingSpot({ ...editingSpot, startTime: e.target.value })} className="px-5 py-3 rounded-2xl bg-slate-50 font-bold text-slate-700" />
                    <input type="time" value={editingSpot.endTime} onChange={e => setEditingSpot({ ...editingSpot, endTime: e.target.value })} className="px-5 py-3 rounded-2xl bg-slate-50 font-bold text-slate-700" />
                  </div>
                  
                  <div className="bg-slate-50 p-6 rounded-[2rem] space-y-4 border border-slate-100">
                    <div className="flex items-center space-x-2 text-slate-400 mb-2">
                      <Wallet className="w-4 h-4" />
                      <span className="text-xs font-black uppercase tracking-widest">支出紀錄 ({tripData.currency})</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 mb-1">預估金額</label>
                        <input type="number" value={editingSpot.expense?.estimated || ''} onChange={e => updateExpense({ estimated: Number(e.target.value) })} className="w-full px-4 py-2 rounded-xl bg-white border border-slate-200 font-bold text-slate-600" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 mb-1">實際支出</label>
                        <input type="number" value={editingSpot.expense?.actual || ''} onChange={e => updateExpense({ actual: Number(e.target.value) })} className="w-full px-4 py-2 rounded-xl bg-white border border-emerald-200 font-bold text-emerald-600 outline-none" />
                      </div>
                    </div>
                  </div>

                  <textarea 
                    rows={3} 
                    placeholder="貼心筆記..." 
                    value={editingSpot.notes} 
                    onChange={e => setEditingSpot({ ...editingSpot, notes: e.target.value })} 
                    className="w-full px-5 py-3 rounded-2xl bg-slate-50 font-medium text-slate-700 resize-none" 
                  />
                </div>

                <div className="space-y-6">
                  <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 flex flex-col h-full min-h-[300px]">
                    <div className="flex items-center justify-between mb-4">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">相簿</label>
                      <button type="button" onClick={() => albumInputRef.current?.click()} className="text-blue-600 text-xs font-black hover:underline flex items-center"><Library className="w-3 h-3 mr-1" />上傳</button>
                      <input type="file" ref={albumInputRef} accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
                    </div>
                    <div className="space-y-4 overflow-y-auto max-h-[350px] pr-2 custom-scrollbar">
                      {isProcessingImage && <div className="flex items-center justify-center p-4 text-xs font-bold text-blue-500 animate-pulse italic">處理圖片中...</div>}
                      {editingSpot.images?.map((img, i) => (
                        <div key={i} className="flex space-x-3 bg-white p-3 rounded-xl border border-slate-100">
                          <img src={img.url} className="w-12 h-12 rounded-lg object-cover" />
                          <input 
                            type="text" 
                            placeholder="描述..." 
                            value={img.caption} 
                            onChange={e => {
                              const newImg = [...(editingSpot.images || [])];
                              newImg[i].caption = e.target.value;
                              setEditingSpot({...editingSpot, images: newImg});
                            }} 
                            className="flex-grow text-xs font-medium outline-none" 
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded-[1.5rem] font-black text-lg hover:bg-blue-700 shadow-xl transition-all active:scale-95">確認儲存</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
