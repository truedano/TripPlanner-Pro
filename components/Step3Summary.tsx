
import React, { useState } from 'react';
import { TripData } from '../types';
import { Printer, Calendar, MapPin, Navigation, Clock, Camera, AlertCircle, Share2, BookOpen, List, Heart, Download } from 'lucide-react';

interface Props {
  tripData: TripData;
}

export const Step3Summary: React.FC<Props> = ({ tripData }) => {
  const [viewMode, setViewMode] = useState<'itinerary' | 'journal'>('journal');

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    // In a real app, this would generate a link. For now, we simulate success.
    alert('這份精美的日誌已準備好分享！ (您可以點擊列印按鈕並選擇「另存為 PDF」來傳送給好友)');
  };

  if (!tripData.days || tripData.days.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[2rem] border border-slate-100 shadow-xl max-w-lg mx-auto">
        <AlertCircle className="w-16 h-16 text-amber-500 mb-4" />
        <h3 className="text-xl font-black text-slate-800">無行程資料</h3>
        <p className="text-slate-500">請先完成行程紀錄與規劃。</p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000 max-w-5xl mx-auto pb-20">
      {/* Header Section */}
      <div className="text-center mb-16 no-print space-y-6">
        <div className="flex items-center justify-center space-x-1 text-rose-400 mb-2">
           <Heart className="w-4 h-4 fill-current" />
           <span className="text-[10px] font-black uppercase tracking-[0.3em]">Memories Crafted</span>
        </div>
        <h2 className="text-5xl sm:text-7xl font-serif font-black text-slate-900 tracking-tight leading-none italic">
          {tripData.name || '這是一場無名的冒險'}
        </h2>
        <div className="flex flex-col items-center space-y-4">
          <div className="flex items-center space-x-3 text-slate-400 font-bold uppercase tracking-widest text-xs">
            <Calendar className="w-4 h-4 text-slate-300" />
            <span>{tripData.startDate} — {tripData.endDate}</span>
          </div>
          
          <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-100">
            <button 
              onClick={() => setViewMode('journal')}
              className={`flex items-center px-6 py-2 rounded-xl text-xs font-black transition-all ${viewMode === 'journal' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <BookOpen className="w-3 h-3 mr-2" /> 回憶日誌
            </button>
            <button 
              onClick={() => setViewMode('itinerary')}
              className={`flex items-center px-6 py-2 rounded-xl text-xs font-black transition-all ${viewMode === 'itinerary' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <List className="w-3 h-3 mr-2" /> 條列行程
            </button>
          </div>
        </div>
      </div>

      {/* Floating Action Bar */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center bg-white/80 backdrop-blur-xl border border-slate-100 p-2 rounded-3xl shadow-2xl z-[60] no-print scale-110 sm:scale-100">
        <button
          onClick={handlePrint}
          className="flex items-center px-6 py-3 text-slate-700 font-black text-sm hover:bg-slate-50 rounded-2xl transition-all"
        >
          <Printer className="w-4 h-4 mr-2" /> 列印 / PDF
        </button>
        <div className="w-px h-6 bg-slate-100 mx-1"></div>
        <button
          onClick={handleShare}
          className="flex items-center px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-black transition-all shadow-xl active:scale-95"
        >
          <Share2 className="w-4 h-4 mr-2" /> 分享日誌
        </button>
      </div>

      {/* Main Content */}
      <div className="space-y-24">
        {tripData.days.map((day, dayIdx) => (
          <div key={day.date} className="print-break-inside-avoid">
            {/* Day Header */}
            <div className={`flex flex-col mb-12 ${viewMode === 'journal' ? 'items-center text-center' : 'items-start'}`}>
              <span className="text-blue-500 font-serif italic text-2xl mb-2">Day {dayIdx + 1}</span>
              <div className="h-px w-12 bg-blue-100 mb-4"></div>
              <h3 className="text-sm font-black text-slate-300 uppercase tracking-[0.4em]">{day.date}</h3>
            </div>

            <div className={viewMode === 'journal' ? 'space-y-20' : 'space-y-6'}>
              {day.spots.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 border border-dashed border-slate-100 rounded-[3rem] text-slate-300 font-serif italic">
                  一段靜謐的空白，或許是為了下一場精彩做準備。
                </div>
              ) : (
                day.spots.map((spot, spotIdx) => (
                  <div key={spot.id} className={`group ${viewMode === 'journal' ? 'space-y-8' : 'relative pl-12'}`}>
                    {/* Itinerary View Indicators */}
                    {viewMode === 'itinerary' && (
                      <>
                        {spotIdx !== day.spots.length - 1 && (
                          <div className="absolute left-[23px] top-12 bottom-[-40px] w-px bg-slate-200"></div>
                        )}
                        <div className="absolute left-0 top-1 w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm z-10 font-serif font-black italic text-slate-400 group-hover:border-blue-500 group-hover:text-blue-500 transition-colors">
                          {spotIdx + 1}
                        </div>
                      </>
                    )}

                    <div className={`${viewMode === 'journal' ? 'max-w-4xl mx-auto' : 'bg-white rounded-[2rem] p-6 border border-slate-50 shadow-sm'}`}>
                      <div className={`flex flex-col ${viewMode === 'journal' ? 'gap-10' : 'md:flex-row gap-6'}`}>
                        
                        {/* Info Section */}
                        <div className={`${viewMode === 'journal' ? 'text-center' : 'flex-grow md:w-1/2'}`}>
                          <div className={`flex items-center text-blue-400 font-black text-[10px] uppercase tracking-widest mb-4 ${viewMode === 'journal' ? 'justify-center' : ''}`}>
                            <Clock className="w-3 h-3 mr-1" />
                            <span>{spot.startTime || '--:--'} — {spot.endTime || '--:--'}</span>
                          </div>

                          <h4 className={`text-slate-900 font-black tracking-tight leading-tight mb-6 transition-colors ${viewMode === 'journal' ? 'text-4xl sm:text-6xl font-serif italic' : 'text-2xl group-hover:text-blue-600'}`}>
                            {spot.name}
                          </h4>
                          
                          {spot.notes && (
                            <div className={`relative mb-8 max-w-2xl mx-auto`}>
                              {viewMode === 'itinerary' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-100 rounded-full"></div>}
                              <p className={`text-slate-500 font-medium leading-relaxed italic ${viewMode === 'journal' ? 'text-xl sm:text-2xl font-serif text-slate-400' : 'pl-4 text-base'}`}>
                                "{spot.notes}"
                              </p>
                            </div>
                          )}

                          <div className={`flex items-center space-x-3 ${viewMode === 'journal' ? 'justify-center opacity-0 group-hover:opacity-100 transition-opacity no-print' : 'no-print'}`}>
                            {spot.mapUrl && (
                              <a
                                href={spot.mapUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center px-4 py-2 bg-slate-50 text-slate-500 rounded-xl text-xs font-black hover:bg-blue-50 hover:text-blue-600 transition-all border border-transparent hover:border-blue-100"
                              >
                                <Navigation className="w-3 h-3 mr-2" /> 地圖位置
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Image Gallery Section */}
                        {spot.images && spot.images.length > 0 && (
                          <div className={`${viewMode === 'journal' ? 'w-full' : 'md:w-1/2'} grid grid-cols-1 sm:grid-cols-2 gap-6`}>
                            {spot.images.map((img, i) => (
                              <div key={i} className="group/image-card space-y-3">
                                <div 
                                  className={`relative overflow-hidden rounded-[2rem] shadow-xl transition-all duration-700 hover:scale-[1.02] ${
                                    viewMode === 'journal' 
                                      ? (i === 0 && spot.images?.length === 1 ? 'aspect-[16/10]' : 'aspect-square')
                                      : 'aspect-video'
                                  }`}
                                >
                                  <img src={img.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover/image-card:opacity-100 transition-opacity"></div>
                                </div>
                                {img.caption && (
                                  <p className={`text-center text-slate-400 text-xs font-medium italic px-4 leading-relaxed`}>
                                    {img.caption}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Print Footer */}
      <div className="hidden print:block mt-32 text-center pt-20 border-t-2 border-slate-100">
        <h2 className="text-6xl font-serif font-black italic mb-6 text-slate-900">{tripData.name}</h2>
        <div className="flex items-center justify-center space-x-6 text-slate-300 text-sm font-black uppercase tracking-[0.5em]">
           <span>Travel Memories</span>
           <Heart className="w-4 h-4 fill-current text-rose-200" />
           <span>TripJournal Pro</span>
        </div>
        <p className="mt-8 text-[10px] text-slate-200 uppercase tracking-widest italic">Documented on {new Date().toLocaleDateString()}</p>
      </div>
    </div>
  );
};
