
import React, { useState } from 'react';
import { TripData, DayPlan } from '../types';
import { CalendarDays, Type as TypeIcon, Sparkles, Loader2, ArrowRight } from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';

interface Props {
  tripData: TripData;
  onUpdate: (updates: Partial<TripData>) => void;
  onNext: () => void;
}

export const Step1Setup: React.FC<Props> = ({ tripData, onUpdate, onNext }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const isValid = tripData.name.trim() !== '' && tripData.startDate !== '' && tripData.endDate !== '';
  
  // 手動初始化空白天數
  const handleManualSetup = () => {
    if (!isValid) return;
    
    const start = new Date(tripData.startDate);
    const end = new Date(tripData.endDate);
    const days: DayPlan[] = [];
    let current = new Date(start);
    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      days.push({ date: dateStr, spots: [] });
      current.setDate(current.getDate() + 1);
    }
    onUpdate({ days });
    onNext();
  };

  const generateAIPlan = async () => {
    if (!isValid) return;
    
    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const startDate = new Date(tripData.startDate);
      const endDate = new Date(tripData.endDate);
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      const prompt = `請為旅程「${tripData.name}」規劃一個為期 ${diffDays} 天的詳細行程。
      開始日期：${tripData.startDate}。
      每一天請規劃 3 到 4 個景點。
      輸出格式必須嚴格遵守提供的 JSON Schema。
      請使用正體中文撰寫。筆記內容請包含該景點的特色、推薦理由或交通提示。
      確保每個景點都有合理的 startTime (例如 09:00) 和 endTime (例如 11:30)。`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                date: { type: Type.STRING, description: 'ISO 格式日期 YYYY-MM-DD' },
                spots: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      startTime: { type: Type.STRING, description: 'HH:mm 格式' },
                      endTime: { type: Type.STRING, description: 'HH:mm 格式' },
                      notes: { type: Type.STRING },
                      mapUrl: { type: Type.STRING }
                    },
                    required: ['name', 'startTime', 'endTime', 'notes']
                  }
                }
              },
              required: ['date', 'spots']
            }
          }
        }
      });

      const text = response.text;
      if (!text) throw new Error('AI 回傳內容為空');

      const generatedDays = JSON.parse(text);
      
      // 為每個景點補上 ID 和必要的空陣列
      const processedDays = generatedDays.map((day: any) => ({
        ...day,
        spots: day.spots.map((spot: any) => ({
          ...spot,
          id: crypto.randomUUID(),
          images: []
        }))
      }));

      // 更新資料並直接跳轉，避開 App.tsx 的自動初始化
      onUpdate({ days: processedDays });
      onNext();
    } catch (error) {
      console.error('AI generation failed:', error);
      alert('AI 規劃失敗，請檢查網路連線或稍後再試。錯誤資訊：' + (error instanceof Error ? error.message : '未知錯誤'));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      {isGenerating && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/90 backdrop-blur-md">
          <div className="relative">
            <div className="w-24 h-24 bg-blue-600/10 rounded-full flex items-center justify-center animate-pulse">
              <Sparkles className="w-12 h-12 text-blue-600 animate-bounce" />
            </div>
            <div className="absolute -inset-4 border-2 border-dashed border-blue-200 rounded-full animate-[spin_10s_linear_infinite]"></div>
          </div>
          <h3 className="mt-8 text-2xl font-black text-slate-800 font-serif italic">正在編織您的完美冒險...</h3>
          <p className="text-slate-400 font-medium mt-2 text-center px-6">AI 正在為您挑選最棒的景點，請稍候片刻</p>
          <div className="mt-8 flex space-x-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.2}s` }}></div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 p-8 sm:p-10 border border-slate-50">
        <div className="space-y-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">開始規劃您的旅程</h2>
            <p className="text-slate-500 font-medium">輸入基本資訊來建立行程框架</p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="flex items-center text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                <TypeIcon className="w-3 h-3 mr-2 text-blue-500" /> 行程名稱
              </label>
              <input
                type="text"
                placeholder="例如：東京浪漫五日遊"
                value={tripData.name}
                onChange={(e) => onUpdate({ name: e.target.value })}
                className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-700 placeholder:text-slate-300 shadow-sm"
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
                  className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-700 shadow-sm"
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
                  className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-700 shadow-sm"
                />
              </div>
            </div>
          </div>

          {tripData.startDate && tripData.endDate && (
             <div className="bg-blue-50/50 p-4 rounded-2xl text-blue-600 text-sm font-black text-center border border-blue-100 animate-in zoom-in-95 duration-300">
               這趟旅程共計 {Math.ceil((new Date(tripData.endDate).getTime() - new Date(tripData.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} 天
             </div>
          )}

          <div className="pt-4 space-y-4">
            <button
              onClick={generateAIPlan}
              disabled={!isValid || isGenerating}
              className={`w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center space-x-2 transition-all shadow-lg ${
                isValid 
                  ? 'bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98]' 
                  : 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none'
              }`}
            >
              {isGenerating ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>使用 AI 智慧規劃全天行程</span>
                </>
              )}
            </button>
            
            <button
              onClick={handleManualSetup}
              disabled={!isValid || isGenerating}
              className={`w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center space-x-2 transition-all ${
                isValid 
                  ? 'bg-white text-slate-600 border border-slate-200 hover:border-slate-400 hover:bg-slate-50 active:scale-[0.98]' 
                  : 'bg-slate-50 text-slate-200 border border-transparent cursor-not-allowed'
              }`}
            >
              <span>手動建立行程框架</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        </div>
      </div>
      <p className="mt-8 text-center text-slate-300 text-xs font-medium leading-relaxed">
        提示：AI 會根據您的行程名稱與日期區間，<br/>自動推薦當地熱門景點、時間分配並生成貼心筆記。
      </p>
    </div>
  );
};
