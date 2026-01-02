
import React, { useRef } from 'react';
import { TripData } from '../types';
import { Plus, MapPin, Calendar, Trash2, ChevronRight, Luggage, Heart, Download, Upload } from 'lucide-react';
import { ModalType } from './ModernModal';

interface Props {
  trips: TripData[];
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onCreate: () => void;
  onImport: (trips: TripData[]) => void;
  showAlert: (title: string, message: string, type?: ModalType) => void;
}

export const TripDashboard: React.FC<Props> = ({ trips, onSelect, onDelete, onCreate, onImport, showAlert }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    if (trips.length === 0) {
      showAlert('無法匯出', '目前尚無任何旅程紀錄可以匯出備份。', 'alert');
      return;
    }
    const dataStr = JSON.stringify(trips, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `trip-journal-backup-${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleExportSingleTrip = (e: React.MouseEvent, trip: TripData) => {
    e.stopPropagation();
    e.preventDefault();
    const dataStr = JSON.stringify(trip, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileName = `trip-${trip.name || 'untitled'}-${trip.startDate || 'date'}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileName);
    linkElement.click();
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (Array.isArray(imported)) {
          onImport(imported);
        } else if (imported && typeof imported === 'object' && imported.id) {
          // Single trip import - Treat as NEW trip to avoid collision
          const newTrip = {
            ...imported,
            id: crypto.randomUUID(),
            name: `${imported.name} (匯入copy)`,
            lastModified: Date.now()
          };
          onImport([newTrip as TripData]);
        } else {
          showAlert('格式錯誤', '匯入的檔案格式不正確，請確認是正確的備份檔案。', 'confirm');
        }
      } catch (err) {
        showAlert('解析失敗', '無法讀取匯入的檔案內容。', 'confirm');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
        <div>
          <div className="flex items-center space-x-2 text-rose-400 mb-2">
            <Heart className="w-4 h-4 fill-current" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Adventure Library</span>
          </div>
          <h2 className="text-5xl font-serif font-black text-slate-900 italic tracking-tight">我的冒險回憶錄</h2>
          <p className="text-slate-400 font-medium mt-2">點擊卡片，再次細味那些令人難忘的旅程片段。</p>
        </div>

        <div className="flex items-center space-x-2 no-print">
          <button
            onClick={handleImportClick}
            className="flex items-center px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-black hover:bg-slate-50 transition-all"
          >
            <Upload className="w-3.5 h-3.5 mr-1.5" /> 匯入備份
          </button>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
          <button
            onClick={handleExport}
            className="flex items-center px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-black hover:bg-slate-50 transition-all"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" /> 匯出所有
          </button>
        </div>
      </div>

      {trips.length === 0 ? (
        <div className="bg-white rounded-[3rem] py-32 flex flex-col items-center justify-center text-center px-6 shadow-sm border border-slate-50">
          <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-8 rotate-3 transition-transform hover:rotate-0">
            <Luggage className="w-10 h-10 text-slate-200" />
          </div>
          <h3 className="text-3xl font-serif font-black text-slate-900 mb-4 italic">這裡暫時還是一片空白</h3>
          <p className="text-slate-400 mb-10 max-w-sm font-medium">還沒有任何紀錄嗎？讓我們開始捕捉下一場冒險的精彩瞬間吧！</p>
          <button
            onClick={onCreate}
            className="flex items-center px-10 py-4 bg-slate-900 text-white rounded-[2rem] font-black shadow-2xl shadow-slate-200 hover:bg-black transition-all active:scale-95"
          >
            <Plus className="w-5 h-5 mr-2 text-rose-400" /> 建立第一份日誌
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {trips.map(trip => {
            const totalSpots = trip.days ? trip.days.reduce((acc, day) => acc + (day.spots ? day.spots.length : 0), 0) : 0;
            const duration = trip.startDate && trip.endDate
              ? Math.ceil((new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
              : 0;

            let firstImage = null;
            for (const day of trip.days) {
              for (const spot of day.spots) {
                if (spot.images && spot.images.length > 0) {
                  firstImage = spot.images[0].url;
                  break;
                }
              }
              if (firstImage) break;
            }

            return (
              <div
                key={trip.id}
                onClick={() => onSelect(trip.id)}
                className="group relative bg-white rounded-[2.5rem] overflow-hidden shadow-sm border border-slate-50 hover:shadow-2xl hover:-translate-y-2 transition-all cursor-pointer"
              >
                <div className="aspect-[4/3] relative overflow-hidden bg-slate-50">
                  {firstImage ? (
                    <img src={firstImage} alt="" className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all duration-700 group-hover:scale-110" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-100/50">
                      <MapPin className="w-12 h-12 text-slate-200" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent"></div>

                  <div className="absolute top-6 left-6">
                    <div className="bg-white/20 backdrop-blur-md text-white px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase border border-white/20">
                      {duration > 0 ? `${duration} DAYS` : 'SETUP'}
                    </div>
                  </div>

                  <div className="absolute top-6 right-6 z-30 flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={(e) => handleExportSingleTrip(e, trip)}
                      className="p-2.5 text-white/50 hover:text-white hover:bg-blue-500 rounded-full transition-all bg-black/20 backdrop-blur-md border border-white/20 active:scale-90"
                      title="匯出此行程"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        onDelete(trip.id);
                      }}
                      className="p-2.5 text-white/50 hover:text-white hover:bg-red-500 rounded-full transition-all bg-black/20 backdrop-blur-md border border-white/20 active:scale-90"
                      title="刪除行程"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="p-8">
                  <div className="flex flex-col mb-6">
                    <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2">Memory Collector</span>
                    <h4 className="text-2xl font-serif font-black text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1 italic">
                      {trip.name || '未命名回憶錄'}
                    </h4>
                  </div>

                  <div className="space-y-3 mb-8">
                    <div className="flex items-center text-slate-400 text-sm font-bold">
                      <Calendar className="w-4 h-4 mr-3 text-slate-200" />
                      {trip.startDate ? trip.startDate : '尚未紀錄日期'}
                    </div>
                    <div className="flex items-center text-slate-400 text-sm font-bold">
                      <MapPin className="w-4 h-4 mr-3 text-slate-200" />
                      {totalSpots} 個珍貴片段
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
                    <span className="text-[10px] text-slate-300 font-black uppercase tracking-widest">
                      JOURNAL UPDATED {new Date(trip.lastModified).toLocaleDateString()}
                    </span>
                    <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-all">
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          <button
            onClick={onCreate}
            className="flex flex-col items-center justify-center rounded-[2.5rem] border-2 border-dashed border-slate-200 bg-transparent p-8 hover:bg-white hover:border-slate-400 transition-all text-slate-300 hover:text-slate-900 group min-h-[300px]"
          >
            <div className="w-14 h-14 rounded-full bg-slate-50 group-hover:bg-slate-900 flex items-center justify-center mb-4 transition-all group-hover:text-white group-hover:scale-110">
              <Plus className="w-6 h-6" />
            </div>
            <span className="font-serif italic font-black text-lg">開啟新的日誌</span>
            <span className="text-[10px] font-black uppercase tracking-widest mt-1 opacity-50">Start documenting</span>
          </button>
        </div>
      )}
    </div>
  );
};
