
import React, { useState, useRef } from 'react';
import { TripData, Spot, DayPlan, SpotImage } from '../types';
import { Plus, Trash2, MapPin, ChevronUp, ChevronDown, Clock, Edit3, ExternalLink, X, Camera, Image as ImageIcon, Loader2, AlertCircle, Maximize2, Library, MessageSquare } from 'lucide-react';
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
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);
  
  const albumInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  if (!tripData.days || tripData.days.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[2rem] border border-slate-100 shadow-xl">
        <AlertCircle className="w-16 h-16 text-amber-500 mb-4" />
        <h3 className="text-xl font-black text-slate-800">尚未設定日期區間</h3>
        <p className="text-slate-500 mb-6">請先返回上一步設定旅程的開始與結束日期。</p>
      </div>
    );
  }

  const activeDay = tripData.days[activeDayIndex];

  const handleAddSpot = () => {
    setEditingSpot({
      id: crypto.randomUUID(),
      name: '',
      startTime: '',
      endTime: '',
      notes: '',
      mapUrl: '',
      images: []
    });
    setShowModal(true);
  };

  const handleEditSpot = (spot: Spot) => {
    setEditingSpot({ ...spot });
    setShowModal(true);
  };

  const saveSpot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSpot) return;

    const updatedDays = [...tripData.days];
    const spots = [...updatedDays[activeDayIndex].spots];
    
    const existingIndex = spots.findIndex(s => s.id === editingSpot.id);
    if (existingIndex > -1) {
      spots[existingIndex] = editingSpot;
    } else {
      spots.push(editingSpot);
    }
    
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
      
      const newImages: SpotImage[] = compressed.map(url => ({
        url,
        caption: ''
      }));

      setEditingSpot({
        ...editingSpot,
        images: [...(editingSpot.images || []), ...newImages]
      });
    } catch (err) {
      console.error("Image processing failed", err);
      alert("圖片處理失敗");
    } finally {
      setIsProcessingImage(false);
      if (albumInputRef.current) albumInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  const removeImage = (imgIdx: number) => {
    if (!editingSpot) return;
    const newImages = [...(editingSpot.images || [])];
    newImages.splice(imgIdx, 1);
    setEditingSpot({ ...editingSpot, images: newImages });
  };

  const updateImageCaption = (imgIdx: number, caption: string) => {
    if (!editingSpot || !editingSpot.images) return;
    const newImages = [...editingSpot.images];
    newImages[imgIdx] = { ...newImages[imgIdx], caption };
    setEditingSpot({ ...editingSpot, images: newImages });
  };

  const deleteSpot = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('確定要刪除這個景點嗎？')) return;
    const updatedDays = [...tripData.days];
    updatedDays[activeDayIndex].spots = updatedDays[activeDayIndex].spots.filter(s => s.id !== id);
    onUpdate({ days: updatedDays });
  };

  const moveSpot = (e: React.MouseEvent, index: number, direction: 'up' | 'down') => {
    e.stopPropagation();
    const updatedDays = [...tripData.days];
    const spots = [...updatedDays[activeDayIndex].spots];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= spots.length) return;
    
    [spots[index], spots[targetIndex]] = [spots[targetIndex], spots[index]];
    updatedDays[activeDayIndex].spots = spots;
    onUpdate({ days: updatedDays });
  };

  const openImageViewer = (e: React.MouseEvent, url: string) => {
    e.stopPropagation();
    setViewingImageUrl(url);
  };

  const isEditingExisting = editingSpot ? activeDay.spots.some(s => s.id === editingSpot.id) : false;

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="flex space-x-2 overflow-x-auto pb-4 mb-6 no-scrollbar">
        {tripData.days.map((day, idx) => (
          <button
            key={day.date}
            onClick={() => setActiveDayIndex(idx)}
            className={`px-6 py-3 rounded-2xl font-black whitespace-nowrap transition-all flex flex-col items-center ${
              activeDayIndex === idx 
                ? 'bg-blue-600 text-white shadow-xl shadow-blue-200 -translate-y-1' 
                : 'bg-white text-slate-400 border border-slate-100 hover:border-blue-200'
            }`}
          >
            <span className="text-[10px] opacity-70 uppercase tracking-tighter">Day {idx + 1}</span>
            <span className="text-sm">{new Date(day.date).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })}</span>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-[2rem] shadow-2xl shadow-slate-200/50 p-6 sm:p-10 min-h-[500px] border border-slate-50">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h3 className="text-2xl font-black text-slate-800">
              第 {activeDayIndex + 1} 天行程
            </h3>
            <p className="text-slate-400 text-sm font-medium mt-1">安排您的完美景點順序</p>
          </div>
          <button
            onClick={handleAddSpot}
            className="flex items-center px-6 py-3 bg-green-500 text-white rounded-2xl hover:bg-green-600 transition-all text-sm font-black shadow-lg shadow-green-100 active:scale-95"
          >
            <Plus className="w-5 h-5 mr-1" /> 新增景點
          </button>
        </div>

        {activeDay.spots.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-300 space-y-4 border-4 border-dashed border-slate-50 rounded-[2rem]">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center">
              <MapPin className="w-10 h-10 opacity-30" />
            </div>
            <p className="font-bold">點擊右上方按鈕開始新增景點</p>
          </div>
        ) : (
          <div className="space-y-6">
            {activeDay.spots.map((spot, idx) => (
              <div 
                key={spot.id} 
                onClick={() => handleEditSpot(spot)}
                className="group relative bg-slate-50 border border-slate-100 rounded-[1.5rem] p-5 cursor-pointer hover:shadow-2xl transition-all hover:bg-white hover:border-blue-200 hover:-translate-y-1"
              >
                <div className="flex items-start">
                  <div className="hidden sm:flex flex-col items-center justify-center w-28 pr-6 border-r border-slate-200 mr-6 shrink-0">
                    <span className="text-sm font-black text-blue-600 tracking-tighter">{spot.startTime || '--:--'}</span>
                    <div className="h-6 w-1 bg-blue-100 rounded-full my-1"></div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{spot.endTime || '--:--'}</span>
                  </div>

                  <div className="flex-grow space-y-3 overflow-hidden">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-4 overflow-hidden">
                        {/* Spot Card Thumbnail with Badge */}
                        {spot.images && spot.images.length > 0 && (
                          <div className="relative shrink-0">
                            <div 
                              onClick={(e) => openImageViewer(e, spot.images![0].url)}
                              className="relative w-16 h-16 rounded-xl overflow-hidden shadow-md group/thumb cursor-zoom-in"
                            >
                              <img src={spot.images[0].url} alt="" className="w-full h-full object-cover transition-transform group-hover/thumb:scale-110" />
                              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity">
                                <Maximize2 className="w-4 h-4 text-white" />
                              </div>
                            </div>
                            {spot.images.length > 1 && (
                              <div className="absolute -top-2 -right-2 bg-blue-600 text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-lg ring-1 ring-blue-100 animate-in zoom-in duration-300">
                                +{spot.images.length - 1}
                              </div>
                            )}
                          </div>
                        )}
                        <h4 className="font-black text-xl text-slate-800 truncate">{spot.name}</h4>
                      </div>

                      <div className="flex items-center space-x-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => moveSpot(e, idx, 'up')} className="p-2 text-slate-400 hover:text-blue-600 transition-colors" disabled={idx === 0}>
                          <ChevronUp className="w-5 h-5" />
                        </button>
                        <button onClick={(e) => moveSpot(e, idx, 'down')} className="p-2 text-slate-400 hover:text-blue-600 transition-colors" disabled={idx === activeDay.spots.length - 1}>
                          <ChevronDown className="w-5 h-5" />
                        </button>
                        <div className="w-px h-4 bg-slate-200 mx-1"></div>
                        <button onClick={(e) => deleteSpot(e, spot.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2">
                       {spot.notes && <div className="text-[10px] font-bold text-slate-400 flex items-center bg-slate-100 px-2 py-1 rounded-lg border border-slate-200/50"> <MessageSquare className="w-3 h-3 mr-1" /> 有筆記 </div>}
                       {spot.images && spot.images.some(img => img.caption) && <div className="text-[10px] font-bold text-slate-400 flex items-center bg-slate-100 px-2 py-1 rounded-lg border border-slate-200/50"> <ImageIcon className="w-3 h-3 mr-1" /> 有故事 </div>}
                    </div>

                    <div className="flex items-center space-x-4">
                      {spot.mapUrl && (
                        <div className="inline-flex items-center text-xs font-bold text-blue-500">
                          <ExternalLink className="w-3 h-3 mr-1" /> 地圖已儲存
                        </div>
                      )}
                      <div className="text-xs font-bold text-slate-300 flex items-center group-hover:text-blue-400 transition-colors">
                        <Edit3 className="w-3 h-3 mr-1" /> 點擊以修改內容
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Full Screen Image Viewer (Lightbox) */}
      {viewingImageUrl && (
        <div 
          className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/95 backdrop-blur-xl p-4 animate-in fade-in duration-300"
          onClick={() => setViewingImageUrl(null)}
        >
          <button 
            className="absolute top-6 right-6 p-3 text-white/50 hover:text-white transition-colors bg-white/10 rounded-full"
            onClick={() => setViewingImageUrl(null)}
          >
            <X className="w-8 h-8" />
          </button>
          <img 
            src={viewingImageUrl} 
            alt="Preview" 
            className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Spot Editor Modal - Enlarged to max-w-3xl */}
      {showModal && editingSpot && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-3xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col border border-white/20">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-3xl font-black text-slate-800">
                  {isEditingExisting ? '修改景點資訊' : '新增冒險景點'}
                </h3>
                <p className="text-slate-400 text-sm font-medium">資料將即時同步至您的本地儲存</p>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="w-12 h-12 rounded-full hover:bg-slate-50 flex items-center justify-center transition-colors"
              >
                <X className="w-8 h-8 text-slate-400" />
              </button>
            </div>
            
            <form onSubmit={saveSpot} className="p-8 sm:p-10 space-y-8 overflow-y-auto flex-grow custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column: Basic Info */}
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">景點名稱</label>
                    <input
                      required
                      autoFocus
                      type="text"
                      placeholder="請輸入景點名稱..."
                      value={editingSpot.name}
                      onChange={e => setEditingSpot({ ...editingSpot, name: e.target.value })}
                      className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-700 text-lg shadow-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">進入時間</label>
                      <input
                        type="time"
                        value={editingSpot.startTime}
                        onChange={e => setEditingSpot({ ...editingSpot, startTime: e.target.value })}
                        className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-700 shadow-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">離開時間</label>
                      <input
                        type="time"
                        value={editingSpot.endTime}
                        onChange={e => setEditingSpot({ ...editingSpot, endTime: e.target.value })}
                        className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-700 shadow-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Google Maps 連結</label>
                    <input
                      type="url"
                      placeholder="https://maps.google.com/..."
                      value={editingSpot.mapUrl}
                      onChange={e => setEditingSpot({ ...editingSpot, mapUrl: e.target.value })}
                      className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-700 text-sm shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">貼心筆記</label>
                    <textarea
                      rows={5}
                      placeholder="寫下給自己的提醒或回憶..."
                      value={editingSpot.notes}
                      onChange={e => setEditingSpot({ ...editingSpot, notes: e.target.value })}
                      className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-blue-500 outline-none transition-all font-medium text-slate-700 resize-none shadow-sm"
                    />
                  </div>
                </div>

                {/* Right Column: Album & Captions */}
                <div className="space-y-6">
                  <div className="bg-slate-50 p-6 sm:p-8 rounded-[2rem] border border-slate-100 flex flex-col h-full min-h-[400px]">
                    <div className="flex flex-col space-y-6 h-full">
                      <div className="flex items-center justify-between shrink-0">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">旅遊相簿</label>
                        <div className="flex space-x-2">
                          <button
                            type="button"
                            disabled={isProcessingImage}
                            onClick={() => cameraInputRef.current?.click()}
                            className="flex items-center space-x-2 text-xs font-black text-rose-600 hover:text-rose-700 bg-white px-3 py-2 rounded-xl transition-all active:scale-95 border border-rose-100 shadow-sm"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">立即拍照</span>
                          </button>
                          <button
                            type="button"
                            disabled={isProcessingImage}
                            onClick={() => albumInputRef.current?.click()}
                            className="flex items-center space-x-2 text-xs font-black text-blue-600 hover:text-blue-700 bg-white px-3 py-2 rounded-xl transition-all active:scale-95 border border-blue-100 shadow-sm"
                          >
                            <Library className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">從相簿選擇</span>
                          </button>
                        </div>
                        
                        <input
                          type="file"
                          ref={albumInputRef}
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={handleImageUpload}
                        />
                        <input
                          type="file"
                          ref={cameraInputRef}
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={handleImageUpload}
                        />
                      </div>
                      
                      {isProcessingImage && (
                        <div className="flex items-center justify-center py-4 space-x-3 text-blue-500 bg-blue-50/50 rounded-2xl shrink-0 animate-pulse">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span className="text-sm font-black italic">正在沖印您的回憶...</span>
                        </div>
                      )}

                      <div className="space-y-4 flex-grow overflow-y-auto pr-2 custom-scrollbar">
                        {editingSpot.images?.map((img, i) => (
                          <div key={i} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3 group/img-item animate-in slide-in-from-right-4 duration-300">
                            <div className="flex space-x-4">
                              <div className="relative w-24 h-24 shrink-0 shadow-md">
                                <img 
                                  src={img.url} 
                                  alt="" 
                                  className="w-full h-full object-cover rounded-xl cursor-zoom-in" 
                                  onClick={() => setViewingImageUrl(img.url)}
                                />
                                <button
                                  type="button"
                                  onClick={() => removeImage(i)}
                                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 hover:scale-110 shadow-lg transition-all"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <div className="flex-grow flex flex-col justify-center">
                                <div className="flex items-center text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                  <MessageSquare className="w-3 h-3 mr-1.5 text-blue-400" />
                                  <span>圖片故事</span>
                                </div>
                                <input
                                  type="text"
                                  placeholder="捕捉當下的感動..."
                                  value={img.caption}
                                  onChange={e => updateImageCaption(i, e.target.value)}
                                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-transparent focus:bg-white focus:border-blue-500 outline-none transition-all text-sm font-bold text-slate-600"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {(!editingSpot.images || editingSpot.images.length === 0) && !isProcessingImage && (
                          <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-slate-200 rounded-[2.5rem] text-slate-300 bg-white/50">
                            <ImageIcon className="w-12 h-12 mb-4 opacity-20" />
                            <span className="text-xs font-black uppercase tracking-[0.2em] text-center px-6">記錄旅程中的點點滴滴<br/><span className="text-[10px] opacity-50 mt-1 block">點擊上方按鈕開始</span></span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="pt-6 shrink-0 border-t border-slate-50">
                <button 
                  type="submit" 
                  className="w-full py-5 bg-blue-600 text-white rounded-[1.5rem] font-black text-xl hover:bg-blue-700 shadow-2xl shadow-blue-200 transition-all active:scale-[0.98] flex items-center justify-center space-x-3"
                >
                  <Save className="w-6 h-6" />
                  <span>確認儲存回憶</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Internal Save Icon for the button
const Save: React.FC<{className?: string}> = ({className}) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
    <polyline points="17 21 17 13 7 13 7 21"></polyline>
    <polyline points="7 3 7 8 15 8"></polyline>
  </svg>
);
