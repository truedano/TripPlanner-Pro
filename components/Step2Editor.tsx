
import React, { useState, useMemo, useEffect } from 'react';
import { TripData, Spot, SpotType, ExpenseItem, IdentifiableSpotImage } from '../types';
import { Plus, MapPin, X, GripVertical, Trash2, Car, Bed, Utensils, Sparkles, Loader2, Navigation, AlertCircle, Map as MapIcon, List, Route } from 'lucide-react';
import { ModernModal } from './ModernModal';
import { compressImage } from '../utils/image';
import { DroppableDayTab } from './DroppableDayTab';
import { SortableSpotItem } from './SortableSpotItem';
import { SpotEditModal } from './SpotEditModal';
import { GoogleGenAI, Type } from '@google/genai';
import { ApiKeyManager } from '../utils/apiKeyManager';
import { ModalType } from './ModernModal';
import TripMap from './TripMap';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
  DragEndEvent,
  DragStartEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';

interface Props {
  tripData: TripData;
  onUpdate: (updates: Partial<TripData>) => void;
  onBack?: () => void;
  onNext?: () => void;
  showAlert: (title: string, message: string, type?: ModalType, onConfirm?: () => void) => void;
}

export const Step2Editor: React.FC<Props> = ({ tripData, onUpdate, showAlert }) => {
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingSpot, setEditingSpot] = useState<Spot | null>(null);
  const [editingImages, setEditingImages] = useState<IdentifiableSpotImage[]>([]);
  const [activeCategory, setActiveCategory] = useState<SpotType>(SpotType.SPOT);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [activeDragSpotId, setActiveDragSpotId] = useState<string | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [dismissedHintDay, setDismissedHintDay] = useState<number[]>([]);
  const [showMap, setShowMap] = useState(false);

  // DnD Sensors
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const imageSensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Esc Key Support for Modal
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowModal(false);
    };
    if (showModal) {
      window.addEventListener('keydown', handleEsc);
    }
    return () => window.removeEventListener('keydown', handleEsc);
  }, [showModal]);

  // Data helpers
  const activeDay = (tripData.days && tripData.days.length > 0) ? tripData.days[activeDayIndex] : undefined;
  const activeDaySpots = activeDay ? activeDay.spots : [];

  // Grouping logic
  const groupSpots = activeDaySpots.filter(s => !s.type || s.type === SpotType.SPOT);
  const groupTransport = activeDaySpots.filter(s => s.type === SpotType.TRANSPORT);
  const groupStay = activeDaySpots.filter(s => s.type === SpotType.STAY);
  const groupMeals = activeDaySpots.filter(s => s.type === SpotType.MEAL);

  if (!tripData.days || tripData.days.length === 0 || !activeDay) return null;

  const getCurrentTime = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  };

  const dailyTotal = activeDay.spots.reduce((sum, spot) =>
    sum + (spot.expenses?.reduce((s, e) => s + e.amount, 0) || 0), 0
  );

  const handleOptimizeRoute = async () => {
    const spotsWithNames = activeDay.spots.filter(s => s.name);
    if (spotsWithNames.length < 3) {
      showAlert('無法優化', '當天至少需要 3 個地點才能進行路徑優化。', 'warning');
      return;
    }

    const apiKey = ApiKeyManager.get();
    if (!apiKey) {
      showAlert('API 金鑰缺失', '請先設定 Gemini API 金鑰以使用路線優化功能。', 'warning');
      return;
    }

    setIsOptimizing(true);
    try {
      const ai = new GoogleGenAI({ apiKey });
      const inputData = spotsWithNames.map(s => ({ id: s.id, name: s.name, mapUrl: s.mapUrl, lat: s.lat, lng: s.lng }));

      const prompt = `你是一位專業的日本旅遊與行程規劃專家。我有一份單日的旅遊景點清單（包含景點名稱、Google Maps 連結與座標）。
請分析這些地點的相對位置，並執行以下動作：
1. 回傳一個「優化後」最順路、且不繞路的推薦排序順序。
2. 如果輸入中缺少座標 (lat, lng)，或是您認為座標有誤，請根據您的專業知識提供正確的座標。

**要求：**
1. 僅根據地理位置進行排序。
2. 回傳結果必須是一個包含物件的 JSON 陣列，每個物件包含 id, lat, lng。
3. 順序必須是優化後的順序。

**輸入資料：**
${JSON.stringify(inputData)}

**輸出範例：**
[{"id": "uuid-1", "lat": 35.123, "lng": 139.456}, {"id": "uuid-2", "lat": 35.456, "lng": 139.789}]`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json'
        }
      });

      let responseText = response.text || '[]';
      responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

      const optimizedSpotsData = JSON.parse(responseText);

      if (Array.isArray(optimizedSpotsData) && optimizedSpotsData.length > 0) {
        const remainingSpots = activeDay.spots.filter(s => !s.name);

        // 建立一個 map 來快速查找 AI 回傳的座標資訊
        const spotDataMap = new Map(optimizedSpotsData.map((item: any) => [item.id, item]));

        const sortedSpots = [...spotsWithNames].sort((a, b) => {
          const aIndex = optimizedSpotsData.findIndex((item: any) => item.id === a.id);
          const bIndex = optimizedSpotsData.findIndex((item: any) => item.id === b.id);
          if (aIndex === -1 && bIndex === -1) return 0;
          if (aIndex === -1) return 1;
          if (bIndex === -1) return -1;
          return aIndex - bIndex;
        }).map(spot => {
          const aiData = spotDataMap.get(spot.id) as any;
          if (aiData) {
            return { ...spot, lat: aiData.lat, lng: aiData.lng };
          }
          return spot;
        });

        const newDays = [...tripData.days];
        newDays[activeDayIndex] = { ...activeDay, spots: [...sortedSpots, ...remainingSpots] };
        onUpdate({ days: newDays });
        showAlert('優化完成', '已根據 AI 分析重新排列最順路的地點順序！', 'success');
      }
    } catch (error: any) {
      console.error('Route optimization failed', error);

      const errorMessage = error?.message || '';
      if (errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
        // 嘗試從錯誤訊息中提取等待時間 (例如 "Please retry in 50.8s")
        const retryMatch = errorMessage.match(/retry in ([\d.]+)s/);
        const waitTime = retryMatch ? `，請在大約 ${Math.ceil(parseFloat(retryMatch[1]))} 秒後再試一次` : '，請稍候再試';

        showAlert('AI 忙碌中 (配額限制)', `目前的 API 使用量已達上限${waitTime}。這是因為免費版 API 有頻率限制。`, 'warning');
      } else {
        showAlert('優化失敗', 'AI 路線優化暫時無法使用，請檢查網路連線或稍後再試。', 'alert');
      }
    } finally {
      setIsOptimizing(false);
    }
  };

  // Sync Logic
  const syncSpotToParent = (updatedSpot: Spot) => {
    const updatedDays = [...tripData.days];
    const spots = [...updatedDays[activeDayIndex].spots];
    const index = spots.findIndex(s => s.id === updatedSpot.id);
    if (index !== -1) {
      spots[index] = updatedSpot;
      updatedDays[activeDayIndex] = { ...updatedDays[activeDayIndex], spots: spots };
      onUpdate({ days: updatedDays });
    }
  };

  const handleSpotChange = (updates: Partial<Spot>) => {
    if (!editingSpot) return;
    const updated = { ...editingSpot, ...updates };
    setEditingSpot(updated);
    syncSpotToParent(updated);
  };

  const updateImages = (newImages: IdentifiableSpotImage[]) => {
    setEditingImages(newImages);
    if (editingSpot) {
      const cleanImages = newImages.map(({ internalId, ...rest }) => rest);
      handleSpotChange({ images: cleanImages });
    }
  };

  // Event handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragSpotId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragSpotId(null);
    if (!over) return;

    const activeSpotId = active.id as string;
    const overId = over.id as string;

    if (overId.startsWith('day-tab-')) {
      const targetDayIndex = parseInt(overId.replace('day-tab-', ''), 10);
      if (targetDayIndex !== activeDayIndex) {
        const newDays = [...tripData.days];
        const sourceSpots = [...newDays[activeDayIndex].spots];
        const targetSpots = [...newDays[targetDayIndex].spots];
        const spotIndex = sourceSpots.findIndex(s => s.id === activeSpotId);
        if (spotIndex !== -1) {
          const [movedSpot] = sourceSpots.splice(spotIndex, 1);
          targetSpots.push(movedSpot);
          newDays[activeDayIndex] = { ...newDays[activeDayIndex], spots: sourceSpots };
          newDays[targetDayIndex] = { ...newDays[targetDayIndex], spots: targetSpots };
          onUpdate({ days: newDays });
        }
      }
      return;
    }

    if (activeSpotId !== overId) {
      const oldIndex = activeDay.spots.findIndex((s) => s.id === activeSpotId);
      const newIndex = activeDay.spots.findIndex((s) => s.id === overId);
      if (oldIndex !== -1 && newIndex !== -1) {
        const newSpots = arrayMove(activeDay.spots, oldIndex, newIndex);
        const newDays = [...tripData.days];
        newDays[activeDayIndex] = { ...activeDay, spots: newSpots };
        onUpdate({ days: newDays });
      }
    }
  };

  const handleImageDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = editingImages.findIndex((i) => i.internalId === active.id);
      const newIndex = editingImages.findIndex((i) => i.internalId === over.id);
      const reordered = arrayMove<IdentifiableSpotImage>(editingImages, oldIndex, newIndex);
      updateImages(reordered);
    }
  };

  const handleAddSpot = (type: SpotType = SpotType.SPOT) => {
    const isToday = new Date().toISOString().split('T')[0] === activeDay.date;
    const newSpot: Spot = {
      id: crypto.randomUUID(),
      type,
      name: '',
      startTime: isToday ? getCurrentTime() : '',
      endTime: '',
      notes: [],
      mapUrl: '',
      images: [],
      expenses: []
    };

    const updatedDays = [...tripData.days];
    updatedDays[activeDayIndex].spots.push(newSpot);
    onUpdate({ days: updatedDays });

    setEditingSpot(newSpot);
    setEditingImages([]);
    setShowModal(true);
  };

  const handleEditSpot = (spot: Spot) => {
    setEditingSpot({
      ...spot,
      expenses: spot.expenses || [],
      notes: Array.isArray(spot.notes) ? spot.notes : []
    });
    setEditingImages((spot.images || []).map(img => ({ ...img, internalId: crypto.randomUUID() })));
    setShowModal(true);
  };

  const handleDeleteSpot = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    const updatedDays = [...tripData.days];
    const spots = updatedDays[activeDayIndex].spots.filter(s => s.id !== deleteId);
    updatedDays[activeDayIndex] = { ...updatedDays[activeDayIndex], spots };
    onUpdate({ days: updatedDays });
    setDeleteId(null);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !editingSpot) return;
    const inputElement = e.target;
    setIsProcessingImage(true);
    try {
      const files = Array.from(inputElement.files) as File[];
      const compressed = await Promise.all(files.map(file => compressImage(file)));
      const newImages: IdentifiableSpotImage[] = compressed.map(url => ({ url, caption: '', internalId: crypto.randomUUID() }));
      updateImages([...editingImages, ...newImages]);
    } finally {
      setIsProcessingImage(false);
      inputElement.value = '';
    }
  };

  const addExpenseItem = () => {
    if (!editingSpot) return;
    const newItem: ExpenseItem = { id: crypto.randomUUID(), name: '', amount: 0 };
    handleSpotChange({ expenses: [...(editingSpot.expenses || []), newItem] });
  };

  const removeExpenseItem = (id: string) => {
    if (!editingSpot) return;
    handleSpotChange({ expenses: editingSpot.expenses.filter(e => e.id !== id) });
  };

  const updateExpenseItem = (id: string, updates: Partial<{ name: string, amount: number }>) => {
    if (!editingSpot) return;
    handleSpotChange({
      expenses: editingSpot.expenses.map(e => e.id === id ? { ...e, ...updates } : e)
    });
  };

  const addNoteItem = () => {
    if (!editingSpot) return;
    const newItem = { id: crypto.randomUUID(), content: '' };
    handleSpotChange({ notes: [...(editingSpot.notes || []), newItem] });
  };

  const removeNoteItem = (id: string) => {
    if (!editingSpot) return;
    handleSpotChange({ notes: editingSpot.notes.filter(n => n.id !== id) });
  };

  const updateNoteItem = (id: string, content: string) => {
    if (!editingSpot) return;
    handleSpotChange({
      notes: editingSpot.notes.map(n => n.id === id ? { ...n, content } : n)
    });
  };

  const activeSpotData = activeDragSpotId ? activeDay.spots.find(s => s.id === activeDragSpotId) : null;

  // 智慧建議判斷
  const showOptimizeHint = activeDay.spots.filter(s => s.name).length >= 3 && !dismissedHintDay.includes(activeDayIndex);

  return (
    <div className="animate-in fade-in duration-500">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex space-x-2 overflow-x-auto p-2 pb-4 mb-6 no-scrollbar items-center">
          {tripData.days.map((day, idx) => (
            <DroppableDayTab
              key={day.date}
              dayIndex={idx}
              date={day.date}
              isActive={activeDayIndex === idx}
              onClick={() => setActiveDayIndex(idx)}
            />
          ))}
        </div>

        {/* AI 智慧建議橫幅 */}
        {showOptimizeHint && (
          <div className="mb-6 bg-gradient-to-r from-indigo-600 via-blue-600 to-blue-500 rounded-[2rem] p-5 sm:p-6 shadow-2xl relative overflow-hidden group animate-in slide-in-from-top-4 duration-500">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-125 transition-transform duration-1000">
              <Sparkles className="w-32 h-32 text-white" />
            </div>
            <div className="relative flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md ring-4 ring-white/10">
                  <Sparkles className="w-6 h-6 text-white animate-pulse" />
                </div>
                <div>
                  <h4 className="text-white font-black text-lg">探索更順暢的路線！</h4>
                  <p className="text-blue-50 text-xs font-bold opacity-90">AI 發現這天的景點順序可以再更優化，要讓行程更順路嗎？</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 w-full sm:w-auto">
                <button
                  onClick={() => setDismissedHintDay(prev => [...prev, activeDayIndex])}
                  className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-white/70 hover:text-white text-xs font-black transition-colors"
                >
                  暫時不用
                </button>
                <button
                  onClick={handleOptimizeRoute}
                  disabled={isOptimizing}
                  className="flex-1 sm:flex-none bg-white text-blue-600 px-6 py-2.5 rounded-xl text-xs font-black shadow-lg hover:shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center disabled:opacity-50"
                >
                  {isOptimizing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  立即優化
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-[2rem] shadow-xl p-6 sm:p-10 min-h-[500px] border border-slate-50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 border-b border-slate-50 pb-6">
            <div className="flex items-center space-x-4">
              <div>
                <h3 className="text-2xl font-black text-slate-800">第 {activeDayIndex + 1} 天紀錄</h3>
                <div className="flex items-center mt-1 space-x-3">
                  <span className="text-slate-400 text-sm font-medium">當日總支出：</span>
                  <span className="text-emerald-600 text-sm font-black">{tripData.currency} {dailyTotal.toLocaleString()}</span>
                </div>
              </div>
              <div className="flex p-1 bg-slate-50 rounded-2xl border border-slate-100">
                {/* 小型優化按鈕 */}
                <button
                  onClick={handleOptimizeRoute}
                  disabled={isOptimizing}
                  title="AI 路線優化"
                  className={`flex p-2.5 rounded-xl transition-all active:scale-95 disabled:opacity-50 ${isOptimizing ? 'bg-blue-100 text-blue-600' : 'text-slate-400 hover:text-blue-600 hover:bg-white hover:shadow-sm'}`}
                >
                  {isOptimizing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Route className="w-5 h-5" />}
                </button>

                {/* 地圖切換按鈕 */}
                <button
                  onClick={() => setShowMap(!showMap)}
                  title={showMap ? "切換至列表" : "切換至地圖"}
                  className={`flex p-2.5 rounded-xl transition-all active:scale-95 ${showMap
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-400 hover:text-blue-600 hover:bg-white hover:shadow-sm'
                    }`}
                >
                  {showMap ? <List className="w-5 h-5" /> : <MapIcon className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <button
              onClick={() => handleAddSpot(activeCategory)}
              className={`w-full sm:w-auto flex items-center justify-center px-6 py-4 sm:py-3 text-white rounded-2xl transition-all text-base sm:text-sm font-black shadow-lg ${activeCategory === SpotType.TRANSPORT ? 'bg-orange-500 hover:bg-orange-600' :
                activeCategory === SpotType.STAY ? 'bg-purple-500 hover:bg-purple-600' :
                  activeCategory === SpotType.MEAL ? 'bg-rose-500 hover:bg-rose-600' :
                    'bg-blue-500 hover:bg-blue-600'
                }`}
            >
              <Plus className="w-5 h-5 mr-1" /> 新增{activeCategory === SpotType.TRANSPORT ? '交通' : activeCategory === SpotType.STAY ? '住宿' : activeCategory === SpotType.MEAL ? '伙食' : '景點'}
            </button>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-2xl mb-8 w-full gap-1">
            <button
              onClick={() => setActiveCategory(SpotType.SPOT)}
              className={`flex-1 flex items-center justify-center space-x-1.5 py-3 rounded-xl font-black text-xs sm:text-sm transition-all ${activeCategory === SpotType.SPOT ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                }`}
            >
              <MapPin className="w-4 h-4 shrink-0" />
              <span className="hidden xs:inline">景點</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeCategory === SpotType.SPOT ? 'bg-blue-50 text-blue-500' : 'bg-slate-200 text-slate-500'}`}>{groupSpots.length}</span>
            </button>
            <button
              onClick={() => setActiveCategory(SpotType.TRANSPORT)}
              className={`flex-1 flex items-center justify-center space-x-1.5 py-3 rounded-xl font-black text-xs sm:text-sm transition-all ${activeCategory === SpotType.TRANSPORT ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                }`}
            >
              <Car className="w-4 h-4 shrink-0" />
              <span className="hidden xs:inline">交通</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeCategory === SpotType.TRANSPORT ? 'bg-orange-50 text-orange-500' : 'bg-slate-200 text-slate-500'}`}>{groupTransport.length}</span>
            </button>
            <button
              onClick={() => setActiveCategory(SpotType.STAY)}
              className={`flex-1 flex items-center justify-center space-x-1.5 py-3 rounded-xl font-black text-xs sm:text-sm transition-all ${activeCategory === SpotType.STAY ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                }`}
            >
              <Bed className="w-4 h-4 shrink-0" />
              <span className="hidden xs:inline">住宿</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeCategory === SpotType.STAY ? 'bg-purple-50 text-purple-500' : 'bg-slate-200 text-slate-500'}`}>{groupStay.length}</span>
            </button>
            <button
              onClick={() => setActiveCategory(SpotType.MEAL)}
              className={`flex-1 flex items-center justify-center space-x-1.5 py-3 rounded-xl font-black text-xs sm:text-sm transition-all ${activeCategory === SpotType.MEAL ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                }`}
            >
              <Utensils className="w-4 h-4 shrink-0" />
              <span className="hidden xs:inline">伙食</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeCategory === SpotType.MEAL ? 'bg-rose-50 text-rose-500' : 'bg-slate-200 text-slate-500'}`}>{groupMeals.length}</span>
            </button>
          </div>

          <div className="min-h-[300px] animate-in fade-in slide-in-from-bottom-2 duration-300">
            {showMap ? (
              <div className="h-[500px] w-full">
                <TripMap spots={activeDay.spots} />
              </div>
            ) : (
              <section>
                <SortableContext
                  items={
                    activeCategory === SpotType.SPOT ? groupSpots.map(s => s.id) :
                      activeCategory === SpotType.TRANSPORT ? groupTransport.map(s => s.id) :
                        activeCategory === SpotType.STAY ? groupStay.map(s => s.id) :
                          groupMeals.map(s => s.id)
                  }
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-4">
                    {(
                      activeCategory === SpotType.SPOT ? groupSpots :
                        activeCategory === SpotType.TRANSPORT ? groupTransport :
                          activeCategory === SpotType.STAY ? groupStay :
                            groupMeals
                    ).map(spot => (
                      <SortableSpotItem
                        key={spot.id}
                        spot={spot}
                        currency={tripData.currency}
                        onClick={() => handleEditSpot(spot)}
                        onDelete={() => handleDeleteSpot(spot.id)}
                      />
                    ))}
                    {(
                      activeCategory === SpotType.SPOT ? groupSpots.length :
                        activeCategory === SpotType.TRANSPORT ? groupTransport.length :
                          activeCategory === SpotType.STAY ? groupStay.length :
                            groupMeals.length
                    ) === 0 && (
                        <div className="py-24 text-center border-4 border-dashed border-slate-50 rounded-[2.5rem] flex flex-col items-center">
                          {activeCategory === SpotType.SPOT ? <MapPin className="w-12 h-12 text-slate-200 mb-4" /> :
                            activeCategory === SpotType.TRANSPORT ? <Car className="w-12 h-12 text-slate-200 mb-4" /> :
                              activeCategory === SpotType.STAY ? <Bed className="w-12 h-12 text-slate-200 mb-4" /> :
                                <Utensils className="w-12 h-12 text-slate-200 mb-4" />}
                          <p className="text-slate-300 font-bold">
                            {activeCategory === SpotType.SPOT ? '尚無景點行程，點擊上方按鈕新增' :
                              activeCategory === SpotType.TRANSPORT ? '尚無交通紀錄，紀錄您的移動開銷' :
                                activeCategory === SpotType.STAY ? '尚無住宿紀錄，紀錄休息地點與費用' :
                                  '尚無伙食紀錄，紀錄美食地圖與花費'}
                          </p>
                        </div>
                      )}
                  </div>
                </SortableContext>
              </section>
            )}
          </div>
        </div>

        <DragOverlay>
          {activeSpotData ? (
            <div className="bg-white border-2 border-blue-500 rounded-[1.5rem] p-5 shadow-2xl opacity-90 cursor-grabbing rotate-2 scale-105">
              <div className="flex items-start">
                <div className="mr-3 text-blue-500 pt-1"><GripVertical className="w-5 h-5" /></div>
                <div>
                  <div className="text-xs font-black text-blue-500 mb-1">{activeSpotData.startTime} - {activeSpotData.endTime}</div>
                  <h4 className="font-black text-lg text-slate-800">{activeSpotData.name}</h4>
                  {activeSpotData.expenses && activeSpotData.expenses.length > 0 && (
                    <div className="mt-1 text-xs font-black text-emerald-600 bg-emerald-50 inline-block px-2 py-0.5 rounded-md">
                      {tripData.currency} {activeSpotData.expenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {editingSpot && (
        <SpotEditModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          spot={editingSpot}
          editingImages={editingImages}
          currency={tripData.currency || 'TWD'}
          onSpotChange={handleSpotChange}
          onImagesChange={updateImages}
          onImageUpload={handleImageUpload}
          isProcessingImage={isProcessingImage}
          addExpenseItem={addExpenseItem}
          removeExpenseItem={removeExpenseItem}
          updateExpenseItem={updateExpenseItem}
          addNoteItem={addNoteItem}
          removeNoteItem={removeNoteItem}
          updateNoteItem={updateNoteItem}
          getCurrentTime={getCurrentTime}
          imageSensors={imageSensors}
          handleImageDragEnd={handleImageDragEnd}
        />
      )}

      <ModernModal
        isOpen={!!deleteId}
        type="confirm"
        title="確定要刪除嗎？"
        message="這項動作將無法撤銷，該筆行程與支出紀錄將會消失。"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
};
