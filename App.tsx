
import React, { useState, useEffect, useMemo } from 'react';
import { TripDashboard } from './components/TripDashboard';
import { Step1Setup } from './components/Step1Setup';
import { Step2Editor } from './components/Step2Editor';
import { Step3Summary } from './components/Step3Summary';
import { TripData, Step } from './types';
import { Calendar, MapPin, CheckCircle, ChevronLeft, ChevronRight, Save, Plus, Trash2, Heart, Loader2, Settings } from 'lucide-react';
import { ApiKeyModal } from './components/ApiKeyModal';
import { ModernModal, ModalType } from './components/ModernModal';
import { db } from './db';

const TRIPS_STORAGE_KEY_LEGACY = 'trip_planner_all_trips';
const ACTIVE_TRIP_ID_KEY = 'trip_planner_active_id';

const App: React.FC = () => {
  const [trips, setTrips] = useState<TripData[]>([]);
  const [activeTripId, setActiveTripId] = useState<string | null>(() => {
    return localStorage.getItem(ACTIVE_TRIP_ID_KEY) || null;
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  // Modal State
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    type: ModalType;
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({
    isOpen: false,
    type: 'alert',
    title: '',
    message: ''
  });

  const activeTrip = useMemo(() => trips.find(t => t.id === activeTripId), [trips, activeTripId]);

  const hasDays = activeTrip && activeTrip.days && activeTrip.days.length > 0;

  const [step, setStep] = useState<Step>(Step.DASHBOARD);

  // 初始化資料庫與遷移舊資料
  useEffect(() => {
    const initData = async () => {
      setIsLoading(true);
      try {
        // 1. 檢查是否有舊的 localStorage 資料需要遷移
        const legacyData = localStorage.getItem(TRIPS_STORAGE_KEY_LEGACY);
        if (legacyData) {
          const parsedLegacy: TripData[] = JSON.parse(legacyData);
          if (parsedLegacy.length > 0) {
            await db.trips.bulkPut(parsedLegacy);
            localStorage.removeItem(TRIPS_STORAGE_KEY_LEGACY);
            console.log('Legacy data migrated to IndexedDB');
          }
        }

        // 2. 從 IndexedDB 讀取所有行程
        const allTrips = await db.trips.orderBy('lastModified').reverse().toArray();
        setTrips(allTrips);

        // 3. 判斷目前的 Step
        if (activeTripId) {
          const current = allTrips.find(t => t.id === activeTripId);
          if (current) {
            setStep(current.days.length > 0 ? Step.PLANNING : Step.SETUP);
          } else {
            setActiveTripId(null);
            setStep(Step.DASHBOARD);
          }
        }
      } catch (err) {
        console.error('Failed to initialize database:', err);
      } finally {
        setIsLoading(false);
      }
    };
    initData();
  }, []);

  useEffect(() => {
    if (activeTripId) {
      localStorage.setItem(ACTIVE_TRIP_ID_KEY, activeTripId);
    } else {
      localStorage.removeItem(ACTIVE_TRIP_ID_KEY);
    }
  }, [activeTripId]);

  const handleCreateNewTrip = async () => {
    const newTrip: TripData = {
      id: crypto.randomUUID(),
      name: '',
      startDate: '',
      endDate: '',
      days: [],
      lastModified: Date.now()
    };
    await db.trips.add(newTrip);
    setTrips(prev => [newTrip, ...prev]);
    setActiveTripId(newTrip.id);
    setStep(Step.SETUP);
  };

  const handleSelectTrip = (id: string) => {
    setActiveTripId(id);
    const trip = trips.find(t => t.id === id);
    if (trip && (!trip.days || trip.days.length === 0)) {
      setStep(Step.SETUP);
    } else {
      setStep(Step.PLANNING);
    }
  };

  const handleDeleteTrip = async (id: string) => {
    setModalConfig({
      isOpen: true,
      type: 'confirm',
      title: '確定要永久刪除嗎？',
      message: '此動作將無法還原，這份旅程的所有回憶與紀錄將會永久消失。',
      onConfirm: async () => {
        await db.trips.delete(id);
        setTrips(prev => prev.filter(t => t.id !== id));
        if (activeTripId === id) {
          setActiveTripId(null);
          setStep(Step.DASHBOARD);
        }
        setModalConfig(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleUpdateActiveTrip = async (updates: Partial<TripData>) => {
    if (!activeTripId) return;
    const now = Date.now();
    await db.trips.update(activeTripId, { ...updates, lastModified: now });
    setTrips(prev => prev.map(t =>
      t.id === activeTripId
        ? { ...t, ...updates, lastModified: now }
        : t
    ));
  };

  const handleImportTrips = async (importedTrips: TripData[]) => {
    await db.trips.bulkPut(importedTrips);
    const allTrips = await db.trips.orderBy('lastModified').reverse().toArray();
    setTrips(allTrips);
    setModalConfig({
      isOpen: true,
      type: 'success',
      title: '匯入成功',
      message: `已成功匯入 ${importedTrips.length} 份旅程檔案！`,
      onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
    });
  };

  const showAlert = (title: string, message: string, type: ModalType = 'alert', onConfirm?: () => void) => {
    setModalConfig({
      isOpen: true,
      type,
      title,
      message,
      onConfirm: () => {
        onConfirm?.();
        setModalConfig(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const nextStep = () => {
    if (step === Step.SETUP && activeTrip) {
      if (!activeTrip.name || !activeTrip.startDate || !activeTrip.endDate) {
        showAlert('遺漏資訊', '請先填寫行程名稱與旅遊日期區間。');
        return;
      }
      if (activeTrip.days.length === 0) {
        showAlert('行程未建立', '請先使用 AI 智慧規劃或手動建立行程框架。');
        return;
      }
    }
    setStep(prev => (prev < 3 ? prev + 1 : prev));
  };

  const prevStep = () => setStep(prev => (prev > 1 ? prev - 1 : prev));

  const navSteps = [
    { id: Step.SETUP, label: '設定', icon: Calendar },
    { id: Step.PLANNING, label: '紀錄', icon: MapPin },
    { id: Step.SUMMARY, label: '回憶', icon: CheckCircle },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
        <p className="text-slate-400 font-bold italic tracking-widest uppercase text-xs">正在喚醒您的回憶...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FDFDFC]">
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-100 sticky top-0 z-50 no-print">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setActiveTripId(null);
                setStep(Step.DASHBOARD);
              }}
              className="flex items-center space-x-2 group transition-all"
            >
              <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-slate-200 group-hover:scale-105 transition-transform">
                <Heart className="w-5 h-5 fill-current text-rose-400" />
              </div>
              <div className="flex flex-col items-start leading-none hidden sm:flex">
                <h1 className="text-xl font-black text-slate-800 font-serif">
                  Trip<span className="text-blue-600">Journal</span>
                </h1>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Memory Collector</span>
              </div>
            </button>

            {step !== Step.DASHBOARD && (
              <div className="flex items-center space-x-4">
                <button
                  onClick={prevStep}
                  disabled={step === Step.SETUP}
                  className="p-2 text-slate-300 hover:text-slate-900 disabled:opacity-10 transition-colors"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <div className="flex space-x-2">
                  {navSteps.map(s => (
                    <div
                      key={s.id}
                      className={`h-1.5 rounded-full transition-all duration-500 ${step === s.id ? 'w-8 bg-slate-900' : 'w-4 bg-slate-100'}`}
                    />
                  ))}
                </div>
                <button
                  onClick={nextStep}
                  disabled={step === Step.SUMMARY}
                  className="p-2 text-slate-300 hover:text-slate-900 disabled:opacity-10 transition-colors"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>
            )}

            <div className="flex items-center space-x-3">
              {step === Step.DASHBOARD ? (
                <button
                  onClick={handleCreateNewTrip}
                  className="flex items-center px-5 py-2.5 bg-slate-900 text-white rounded-2xl text-sm font-black shadow-lg shadow-slate-200 hover:bg-black transition-all active:scale-95"
                >
                  <Plus className="w-4 h-4 mr-1" /> 紀錄旅程
                </button>
              ) : (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => activeTripId && handleDeleteTrip(activeTripId)}
                    className="p-2.5 text-slate-300 hover:text-red-500 transition-colors rounded-2xl hover:bg-red-50"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => {
                      setActiveTripId(null);
                      setStep(Step.DASHBOARD);
                    }}
                    className="px-5 py-2.5 text-xs font-black text-slate-600 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-all uppercase tracking-widest"
                  >
                    關閉
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowApiKeyModal(true)}
              className="ml-4 p-2 text-slate-300 hover:text-slate-900 transition-colors rounded-xl hover:bg-slate-50"
              title="API Key 設定"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-5xl w-full mx-auto px-4 py-8">
        {step === Step.DASHBOARD && (
          <TripDashboard
            trips={trips}
            onSelect={handleSelectTrip}
            onDelete={handleDeleteTrip}
            onCreate={handleCreateNewTrip}
            onImport={handleImportTrips}
            showAlert={showAlert}
          />
        )}
        {step === Step.SETUP && activeTrip && (
          <Step1Setup
            tripData={activeTrip}
            onUpdate={handleUpdateActiveTrip}
            onNext={() => setStep(Step.PLANNING)}
            showAlert={showAlert}
          />
        )}
        {step === Step.PLANNING && activeTrip && <Step2Editor tripData={activeTrip} onUpdate={handleUpdateActiveTrip} />}
        {step === Step.SUMMARY && activeTrip && <Step3Summary tripData={activeTrip} />}
      </main>

      <footer className="bg-white py-12 text-center no-print">
        <div className="max-w-xs mx-auto space-y-4">
          <Heart className="w-6 h-6 mx-auto text-rose-200 fill-current" />
          <p className="text-slate-400 text-xs font-medium leading-relaxed">
            TripJournal 協助您珍藏每一段珍貴的旅途時光。<br />
            所有資料皆安全的儲存於您的本地設備。
          </p>
          <div className="pt-4 border-t border-slate-50 flex items-center justify-center space-x-4 opacity-30 grayscale grayscale-100">
            <Save className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">IndexedDB Storage Ready</span>
          </div>
        </div>
      </footer>
      <ApiKeyModal
        isOpen={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
        onSave={() => { }}
      />

      <ModernModal
        isOpen={modalConfig.isOpen}
        type={modalConfig.type}
        title={modalConfig.title}
        message={modalConfig.message}
        onConfirm={modalConfig.onConfirm || (() => setModalConfig(prev => ({ ...prev, isOpen: false })))}
        onCancel={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
      />
    </div >
  );
};

export default App;
