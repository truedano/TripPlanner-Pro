
import React, { useState, useRef, useMemo } from 'react';
import { TripData, Spot, SpotImage, ExpenseCategory } from '../types';
import { Plus, MapPin, Edit3, X, Library, Wallet, GripVertical, Camera, Trash2 } from 'lucide-react';
import { compressImage } from '../utils/image';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDroppable,
  DragEndEvent,
  DragStartEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Props {
  tripData: TripData;
  onUpdate: (updates: Partial<TripData>) => void;
}

interface IdentifiableSpotImage extends SpotImage {
  internalId: string;
}

interface DroppableDayTabProps {
  dayIndex: number;
  date: string;
  isActive: boolean;
  onClick: () => void;
}

// 可拖曳的日期分頁 (Droppable Tab)
const DroppableDayTab: React.FC<DroppableDayTabProps> = ({
  dayIndex,
  date,
  isActive,
  onClick
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `day-tab-${dayIndex}`,
    data: { index: dayIndex }
  });

  return (
    <button
      type="button"
      ref={setNodeRef}
      onClick={onClick}
      className={`relative px-6 py-3 rounded-2xl font-black transition-all flex flex-col items-center flex-shrink-0 ${isActive
        ? 'bg-blue-600 text-white shadow-xl -translate-y-1'
        : isOver
          ? 'bg-blue-100 text-blue-600 border-2 border-blue-300 scale-105'
          : 'bg-white text-slate-400 border border-slate-100 hover:border-blue-200'
        }`}
    >
      <span className="text-[10px] opacity-70 uppercase">Day {dayIndex + 1}</span>
      <span className="text-sm">{new Date(date).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })}</span>
    </button>
  );
};

interface SortableSpotItemProps {
  spot: Spot;
  currency?: string;
  onClick: () => void;
}

// 可排序的景點卡片 (Sortable Spot Item)
const SortableSpotItem: React.FC<SortableSpotItemProps> = ({
  spot,
  currency,
  onClick
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: spot.id });

  const style = {
    // 使用 Translate 而非 Transform，避免縮放時的副作用，提升排序穩定度
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.3 : 1,
    // 雖然 CSS class 有 touch-none，這裡強制加 style 確保生效
    touchAction: 'none'
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="group bg-slate-50 border border-slate-100 rounded-[1.5rem] p-5 hover:shadow-xl transition-all hover:bg-white hover:border-blue-200 cursor-grab active:cursor-grabbing touch-none select-none"
    >
      <div className="flex items-start">
        {/* 拖曳手柄 - 僅作為視覺提示 */}
        <div
          className="self-center mr-3 p-3 -ml-2 text-slate-300 group-hover:text-blue-400 transition-colors"
        >
          <GripVertical className="w-5 h-5" />
        </div>

        <div onClick={onClick} className="flex flex-grow items-start">
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
                  {currency} {spot.expense.actual.toLocaleString()}
                </div>
              )}
            </div>
            <div className="text-xs font-bold text-slate-300 group-hover:text-blue-400 transition-colors flex items-center">
              <Edit3 className="w-3 h-3 mr-1" /> 編輯紀錄
            </div>
            {spot.images && spot.images.length > 0 && (
              <div className="flex items-center space-x-2 mt-3 overflow-x-auto no-scrollbar">
                {spot.images.map((img, idx) => (
                  <img key={idx} src={img.url} className="w-12 h-12 rounded-lg object-cover border border-slate-100 shadow-sm" alt="thumbnail" />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface SortableImageItemProps {
  image: IdentifiableSpotImage;
  onRemove: () => void;
  onChangeCaption: (newCaption: string) => void;
}

const SortableImageItem: React.FC<SortableImageItemProps> = ({ image, onRemove, onChangeCaption }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: image.internalId });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 20 : 'auto',
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex space-x-3 bg-white p-3 rounded-xl border border-slate-100 items-center ${isDragging ? 'shadow-lg' : ''}`}
    >
      <div {...attributes} {...listeners} className="text-slate-300 cursor-grab active:cursor-grabbing hover:text-blue-400 p-1">
        <GripVertical className="w-5 h-5" />
      </div>
      <img src={image.url} className="w-12 h-12 rounded-lg object-cover" />
      <input
        type="text"
        placeholder="描述..."
        value={image.caption}
        onChange={e => onChangeCaption(e.target.value)}
        className="flex-grow text-xs font-medium outline-none"
        onPointerDown={e => e.stopPropagation()}
        onKeyDown={e => e.stopPropagation()}
      />
      <button
        type="button"
        onClick={onRemove}
        className="p-1 text-slate-300 hover:text-red-500 transition-colors"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
};

export const Step2Editor: React.FC<Props> = ({ tripData, onUpdate }) => {
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingSpot, setEditingSpot] = useState<Spot | null>(null);
  const [editingImages, setEditingImages] = useState<IdentifiableSpotImage[]>([]);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [activeDragSpotId, setActiveDragSpotId] = useState<string | null>(null);

  const albumInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

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

  // Data helpers
  const activeDay = (tripData.days && tripData.days.length > 0) ? tripData.days[activeDayIndex] : undefined;
  const activeDaySpots = activeDay ? activeDay.spots : [];
  const spotIds = useMemo(() => activeDaySpots.map(s => s.id), [activeDaySpots]);

  if (!tripData.days || tripData.days.length === 0 || !activeDay) return null;

  const dailyTotal = activeDay.spots.reduce((sum, spot) => sum + (spot.expense?.actual || 0), 0);

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
      const reordered = arrayMove(editingImages, oldIndex, newIndex);
      updateImages(reordered);
    }
  };

  const handleAddSpot = () => {
    const newSpot: Spot = {
      id: crypto.randomUUID(),
      name: '',
      startTime: '',
      endTime: '',
      notes: '',
      mapUrl: '',
      images: [],
      expense: { estimated: 0, actual: 0, category: ExpenseCategory.OTHER }
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
      expense: spot.expense || { estimated: 0, actual: 0, category: ExpenseCategory.OTHER }
    });
    setEditingImages((spot.images || []).map(img => ({ ...img, internalId: crypto.randomUUID() })));
    setShowModal(true);
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

  const updateExpense = (updates: Partial<NonNullable<Spot['expense']>>) => {
    if (!editingSpot) return;
    const newExpense = { ...(editingSpot.expense || { estimated: 0, actual: 0, category: ExpenseCategory.OTHER }), ...updates };
    handleSpotChange({ expense: newExpense });
  };

  const activeSpotData = activeDragSpotId ? activeDay.spots.find(s => s.id === activeDragSpotId) : null;

  return (
    <div className="animate-in fade-in duration-500">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex space-x-2 overflow-x-auto pb-4 mb-6 no-scrollbar items-center">
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
            <SortableContext
              items={spotIds}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-6">
                {activeDay.spots.map((spot) => (
                  <SortableSpotItem
                    key={spot.id}
                    spot={spot}
                    currency={tripData.currency}
                    onClick={() => handleEditSpot(spot)}
                  />
                ))}
              </div>
            </SortableContext>
          )}
        </div>

        <DragOverlay>
          {activeSpotData ? (
            <div className="bg-white border-2 border-blue-500 rounded-[1.5rem] p-5 shadow-2xl opacity-90 cursor-grabbing rotate-2 scale-105">
              <div className="flex items-start">
                <div className="mr-3 text-blue-500 pt-1"><GripVertical className="w-5 h-5" /></div>
                <div>
                  <div className="text-xs font-black text-blue-500 mb-1">{activeSpotData.startTime} - {activeSpotData.endTime}</div>
                  <h4 className="font-black text-lg text-slate-800">{activeSpotData.name}</h4>
                  {activeSpotData.expense && activeSpotData.expense.actual > 0 && (
                    <div className="mt-1 text-xs font-black text-emerald-600 bg-emerald-50 inline-block px-2 py-0.5 rounded-md">
                      {tripData.currency} {activeSpotData.expense.actual.toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {showModal && editingSpot && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
          <div className="bg-white w-full max-w-3xl rounded-[2.5rem] shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-2xl font-black text-slate-800">編輯景點與支出</h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-50 rounded-full"><X className="w-6 h-6 text-slate-400" /></button>
            </div>

            <div className="p-8 space-y-8 overflow-y-auto flex-grow custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">景點名稱</label>
                    <input
                      required
                      type="text"
                      value={editingSpot.name}
                      onChange={e => handleSpotChange({ name: e.target.value })}
                      className="w-full px-5 py-3 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-blue-500 outline-none font-bold text-slate-700"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <input type="time" value={editingSpot.startTime} onChange={e => handleSpotChange({ startTime: e.target.value })} className="px-5 py-3 rounded-2xl bg-slate-50 font-bold text-slate-700" />
                    <input type="time" value={editingSpot.endTime} onChange={e => handleSpotChange({ endTime: e.target.value })} className="px-5 py-3 rounded-2xl bg-slate-50 font-bold text-slate-700" />
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
                    onChange={e => handleSpotChange({ notes: e.target.value })}
                    className="w-full px-5 py-3 rounded-2xl bg-slate-50 font-medium text-slate-700 resize-none"
                  />
                </div>

                <div className="space-y-6">
                  <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 flex flex-col h-full min-h-[300px]">
                    <div className="flex items-center justify-between mb-4">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">相簿</label>
                      <div className="flex items-center space-x-3">
                        <button type="button" onClick={() => cameraInputRef.current?.click()} className="text-blue-600 text-xs font-black hover:underline flex items-center">
                          <Camera className="w-3 h-3 mr-1" />拍照
                        </button>
                        <button type="button" onClick={() => albumInputRef.current?.click()} className="text-blue-600 text-xs font-black hover:underline flex items-center">
                          <Library className="w-3 h-3 mr-1" />上傳
                        </button>
                      </div>
                      <input type="file" ref={cameraInputRef} accept="image/*" capture="environment" className="hidden" onChange={handleImageUpload} />
                      <input type="file" ref={albumInputRef} accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
                    </div>
                    <div className="space-y-2 overflow-y-auto max-h-[350px] pr-2 custom-scrollbar">
                      {isProcessingImage && <div className="flex items-center justify-center p-4 text-xs font-bold text-blue-500 animate-pulse italic">處理圖片中...</div>}
                      <DndContext sensors={imageSensors} collisionDetection={closestCenter} onDragEnd={handleImageDragEnd}>
                        <SortableContext items={editingImages.map(i => i.internalId)} strategy={verticalListSortingStrategy}>
                          {editingImages.map((img, i) => (
                            <SortableImageItem
                              key={img.internalId}
                              image={img}
                              onRemove={() => {
                                const newImg = [...editingImages];
                                newImg.splice(i, 1);
                                updateImages(newImg);
                              }}
                              onChangeCaption={(val) => {
                                const newImg = [...editingImages];
                                newImg[i].caption = val;
                                updateImages(newImg);
                              }}
                            />
                          ))}
                        </SortableContext>
                      </DndContext>
                    </div>
                  </div>
                </div>
              </div>
              <button type="button" onClick={() => setShowModal(false)} className="w-full py-4 bg-blue-600 text-white rounded-[1.5rem] font-black text-lg hover:bg-blue-700 shadow-xl transition-all active:scale-95">完成</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
