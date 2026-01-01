
import React, { useState, useRef, useMemo } from 'react';
import { TripData, Spot, SpotImage, SpotType, ExpenseCategory, ExpenseItem } from '../types';
import { Plus, MapPin, Edit3, X, Library, Wallet, GripVertical, Camera, Trash2, Clock, Car, Bed, AlertCircle, Utensils } from 'lucide-react';
import { ModernModal } from './ModernModal';
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
  onDelete: () => void;
}

// 可排序的景點卡片 (Sortable Spot Item)
const SortableSpotItem: React.FC<SortableSpotItemProps> = ({
  spot,
  currency,
  onClick,
  onDelete
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
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.3 : 1,
    touchAction: 'none'
  };

  const typeStyles = {
    [SpotType.SPOT]: { icon: MapPin, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', label: '景點' },
    [SpotType.TRANSPORT]: { icon: Car, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100', label: '交通' },
    [SpotType.STAY]: { icon: Bed, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100', label: '住宿' },
    [SpotType.MEAL]: { icon: Utensils, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100', label: '伙食' },
  };

  const currentType = spot.type || SpotType.SPOT;
  const styleConfig = typeStyles[currentType];
  const Icon = styleConfig.icon;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`group border rounded-[1.5rem] p-5 hover:shadow-xl transition-all hover:bg-white cursor-grab active:cursor-grabbing touch-none select-none ${styleConfig.bg} ${styleConfig.border} hover:border-blue-200`}
    >
      <div className="flex items-start">
        <div className="self-center mr-3 p-3 -ml-2 text-slate-300 group-hover:text-blue-400 transition-colors">
          <GripVertical className="w-5 h-5" />
        </div>

        <div onClick={onClick} className="flex flex-grow items-start">
          <div className="hidden sm:flex flex-col items-center justify-center w-24 pr-4 border-r border-slate-200 mr-6 shrink-0">
            <span className={`text-xs font-black ${styleConfig.color}`}>{spot.startTime || '--:--'}</span>
            <div className={`h-4 w-0.5 my-1 opacity-30 ${styleConfig.bg.replace('bg-', 'bg-')}`}></div>
            <span className="text-[10px] font-bold text-slate-400">{spot.endTime || '--:--'}</span>
          </div>
          <div className="flex-grow">
            <div className="flex justify-between items-start mb-2">
              <div className="flex flex-col">
                <span className={`text-[10px] font-black uppercase tracking-tighter mb-1 ${styleConfig.color}`}>{styleConfig.label}</span>
                <h4 className="font-black text-lg text-slate-800 truncate">{spot.name || `未命名${styleConfig.label}`}</h4>
              </div>
              {spot.expenses && spot.expenses.length > 0 && (
                <div className="bg-emerald-50 px-3 py-1 rounded-full text-emerald-600 text-xs font-black">
                  {currency} {spot.expenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString()}
                </div>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="ml-2 p-2 text-slate-300 hover:text-red-500 transition-colors rounded-full hover:bg-slate-100/50"
                title="刪除紀錄"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="text-xs font-bold text-slate-300 group-hover:text-blue-400 transition-colors flex items-center">
              <Icon className="w-3 h-3 mr-1" /> 編輯詳細
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
  const [activeCategory, setActiveCategory] = useState<SpotType>(SpotType.SPOT);
  const [deleteId, setDeleteId] = useState<string | null>(null);
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

  // Grouping logic
  const groupSpots = activeDaySpots.filter(s => !s.type || s.type === SpotType.SPOT);
  const groupTransport = activeDaySpots.filter(s => s.type === SpotType.TRANSPORT);
  const groupStay = activeDaySpots.filter(s => s.type === SpotType.STAY);
  const groupMeals = activeDaySpots.filter(s => s.type === SpotType.MEAL);

  const spotIds = useMemo(() => activeDaySpots.map(s => s.id), [activeDaySpots]);

  if (!tripData.days || tripData.days.length === 0 || !activeDay) return null;

  const getCurrentTime = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  };

  const dailyTotal = activeDay.spots.reduce((sum, spot) =>
    sum + (spot.expenses?.reduce((s, e) => s + e.amount, 0) || 0), 0
  );


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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 border-b border-slate-50 pb-6">
            <div>
              <h3 className="text-2xl font-black text-slate-800">第 {activeDayIndex + 1} 天紀錄</h3>
              <div className="flex items-center mt-1 space-x-3">
                <span className="text-slate-400 text-sm font-medium">當日總支出：</span>
                <span className="text-emerald-600 text-sm font-black">{tripData.currency} {dailyTotal.toLocaleString()}</span>
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

          {/* 分類 Tab - 優化手機端顯示 */}
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
            {/* 景點區塊 */}
            {activeCategory === SpotType.SPOT && (
              <section>
                <SortableContext items={groupSpots.map(s => s.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-4">
                    {groupSpots.map(spot => (
                      <SortableSpotItem
                        key={spot.id}
                        spot={spot}
                        currency={tripData.currency}
                        onClick={() => handleEditSpot(spot)}
                        onDelete={() => handleDeleteSpot(spot.id)}
                      />
                    ))}
                    {groupSpots.length === 0 && (
                      <div className="py-24 text-center border-4 border-dashed border-slate-50 rounded-[2.5rem] flex flex-col items-center">
                        <MapPin className="w-12 h-12 text-slate-200 mb-4" />
                        <p className="text-slate-300 font-bold">尚無景點行程，點擊上方按鈕新增</p>
                      </div>
                    )}
                  </div>
                </SortableContext>
              </section>
            )}

            {/* 交通區塊 */}
            {activeCategory === SpotType.TRANSPORT && (
              <section>
                <SortableContext items={groupTransport.map(s => s.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-4">
                    {groupTransport.map(spot => (
                      <SortableSpotItem
                        key={spot.id}
                        spot={spot}
                        currency={tripData.currency}
                        onClick={() => handleEditSpot(spot)}
                        onDelete={() => handleDeleteSpot(spot.id)}
                      />
                    ))}
                    {groupTransport.length === 0 && (
                      <div className="py-24 text-center border-4 border-dashed border-slate-50 rounded-[2.5rem] flex flex-col items-center">
                        <Car className="w-12 h-12 text-slate-200 mb-4" />
                        <p className="text-slate-300 font-bold">尚無交通紀錄，紀錄您的移動開修</p>
                      </div>
                    )}
                  </div>
                </SortableContext>
              </section>
            )}

            {/* 住宿區塊 */}
            {activeCategory === SpotType.STAY && (
              <section>
                <SortableContext items={groupStay.map(s => s.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-4">
                    {groupStay.map(spot => (
                      <SortableSpotItem
                        key={spot.id}
                        spot={spot}
                        currency={tripData.currency}
                        onClick={() => handleEditSpot(spot)}
                        onDelete={() => handleDeleteSpot(spot.id)}
                      />
                    ))}
                    {groupStay.length === 0 && (
                      <div className="py-24 text-center border-4 border-dashed border-slate-50 rounded-[2.5rem] flex flex-col items-center">
                        <Bed className="w-12 h-12 text-slate-200 mb-4" />
                        <p className="text-slate-300 font-bold">尚無住宿紀錄，紀錄休息地點與費用</p>
                      </div>
                    )}
                  </div>
                </SortableContext>
              </section>
            )}

            {/* 伙食區塊 */}
            {activeCategory === SpotType.MEAL && (
              <section>
                <SortableContext items={groupMeals.map(s => s.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-4">
                    {groupMeals.map(spot => (
                      <SortableSpotItem
                        key={spot.id}
                        spot={spot}
                        currency={tripData.currency}
                        onClick={() => handleEditSpot(spot)}
                        onDelete={() => handleDeleteSpot(spot.id)}
                      />
                    ))}
                    {groupMeals.length === 0 && (
                      <div className="py-24 text-center border-4 border-dashed border-slate-50 rounded-[2.5rem] flex flex-col items-center">
                        <Utensils className="w-12 h-12 text-slate-200 mb-4" />
                        <p className="text-slate-300 font-bold">尚無伙食紀錄，紀錄美食地圖與花費</p>
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

      {showModal && editingSpot && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
          <div className="bg-white w-full max-w-3xl rounded-[2.5rem] shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-2xl font-black text-slate-800">
                {editingSpot.type === SpotType.TRANSPORT ? '交通紀錄' : editingSpot.type === SpotType.STAY ? '住宿紀錄' : editingSpot.type === SpotType.MEAL ? '伙食紀錄' : '景點規劃'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-50 rounded-full"><X className="w-6 h-6 text-slate-400" /></button>
            </div>

            <div className="p-8 space-y-8 overflow-y-auto flex-grow custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                      {editingSpot.type === SpotType.TRANSPORT ? '交通工具 / 路線' : editingSpot.type === SpotType.STAY ? '住宿名稱 / 飯店' : editingSpot.type === SpotType.MEAL ? '餐廳 / 小吃名稱' : '景點名稱'}
                    </label>
                    <input
                      required
                      type="text"
                      placeholder={editingSpot.type === SpotType.TRANSPORT ? "例如：捷運、計程車、JR山手線..." : editingSpot.type === SpotType.STAY ? "例如：希爾頓飯店、APA Hotel..." : editingSpot.type === SpotType.MEAL ? "例如：一蘭拉麵、築地市場..." : "景點名稱"}
                      value={editingSpot.name}
                      onChange={e => handleSpotChange({ name: e.target.value })}
                      className="w-full px-5 py-3 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-blue-500 outline-none font-bold text-slate-700"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative group">
                      <input type="time" value={editingSpot.startTime} onChange={e => handleSpotChange({ startTime: e.target.value })} className="w-full px-5 py-3 rounded-2xl bg-slate-50 font-bold text-slate-700 pr-12" />
                      <button
                        type="button"
                        onClick={() => handleSpotChange({ startTime: getCurrentTime() })}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-300 hover:text-blue-500 transition-colors"
                        title="設為現在時間"
                      >
                        <Clock className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="relative group">
                      <input type="time" value={editingSpot.endTime} onChange={e => handleSpotChange({ endTime: e.target.value })} className="w-full px-5 py-3 rounded-2xl bg-slate-50 font-bold text-slate-700 pr-12" />
                      <button
                        type="button"
                        onClick={() => handleSpotChange({ endTime: getCurrentTime() })}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-300 hover:text-blue-500 transition-colors"
                        title="設為現在時間"
                      >
                        <Clock className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-6 rounded-[2rem] space-y-4 border border-slate-100">
                    <div className="flex items-center justify-between text-slate-400 mb-2">
                      <div className="flex items-center space-x-2">
                        <Wallet className="w-4 h-4" />
                        <span className="text-xs font-black uppercase tracking-widest">支出紀錄 ({tripData.currency})</span>
                      </div>
                      <button
                        type="button"
                        onClick={addExpenseItem}
                        className="text-blue-600 text-[10px] font-black hover:underline flex items-center bg-white px-2 py-1 rounded-lg border border-slate-100"
                      >
                        <Plus className="w-3 h-3 mr-1" />新增明細
                      </button>
                    </div>
                    <div className="space-y-3">
                      {editingSpot.expenses?.map((exp) => (
                        <div key={exp.id} className="group flex items-center space-x-3 p-4 bg-white rounded-2xl border border-slate-200 hover:border-blue-200 transition-all animate-in slide-in-from-left-2 duration-200 shadow-sm hover:shadow-md">
                          <input
                            type="text"
                            placeholder="支出項目名稱..."
                            value={exp.name}
                            onChange={e => updateExpenseItem(exp.id, { name: e.target.value })}
                            className="flex-grow bg-transparent text-sm font-black text-slate-700 outline-none placeholder:text-slate-300"
                          />
                          <div className="flex items-center space-x-2 border-l border-slate-100 pl-4">
                            <input
                              type="number"
                              placeholder="0"
                              value={exp.amount || ''}
                              onChange={e => updateExpenseItem(exp.id, { amount: Number(e.target.value) })}
                              className="w-20 bg-transparent text-base font-black text-emerald-600 outline-none text-right"
                            />
                            <span className="text-[10px] font-black text-emerald-300">{tripData.currency}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeExpenseItem(exp.id)}
                            className="p-1 px-2 text-slate-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      {(!editingSpot.expenses || editingSpot.expenses.length === 0) && (
                        <div className="text-center py-4 border-2 border-dashed border-slate-200 rounded-xl text-slate-300 text-[10px] font-bold">
                          尚無支出明細
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-slate-50 p-6 rounded-[2rem] space-y-4 border border-slate-100 mt-6">
                    <div className="flex items-center justify-between text-slate-400 mb-2">
                      <div className="flex items-center space-x-2">
                        <Edit3 className="w-4 h-4" />
                        <span className="text-xs font-black uppercase tracking-widest">貼心筆記</span>
                      </div>
                      <button
                        type="button"
                        onClick={addNoteItem}
                        className="text-blue-600 text-[10px] font-black hover:underline flex items-center bg-white px-2 py-1 rounded-lg border border-slate-100"
                      >
                        <Plus className="w-3 h-3 mr-1" />新增筆記
                      </button>
                    </div>
                    <div className="space-y-3">
                      {editingSpot.notes?.map((note) => (
                        <div key={note.id} className="flex items-start space-x-2 animate-in slide-in-from-left-2 duration-200">
                          <textarea
                            rows={2}
                            placeholder="輸入筆記..."
                            value={note.content}
                            onChange={e => updateNoteItem(note.id, e.target.value)}
                            className="flex-grow px-4 py-3 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-700 outline-none focus:border-blue-400 resize-none"
                          />
                          <button
                            type="button"
                            onClick={() => removeNoteItem(note.id)}
                            className="p-1.5 text-slate-300 hover:text-red-500 transition-colors mt-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      {(!editingSpot.notes || editingSpot.notes.length === 0) && (
                        <div className="text-center py-4 border-2 border-dashed border-slate-200 rounded-xl text-slate-300 text-[10px] font-bold">
                          尚無筆記內容
                        </div>
                      )}
                    </div>
                  </div>
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
