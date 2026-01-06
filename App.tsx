
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TripDashboard } from './components/TripDashboard';
import { Step1Setup } from './components/Step1Setup';
import { Step2Editor } from './components/Step2Editor';
import { Step3Summary } from './components/Step3Summary';
import { TripData, Step } from './types';
import { Calendar, MapPin, CheckCircle, ChevronLeft, ChevronRight, Save, Plus, Trash2, Heart, Loader2, Settings, Cloud, CloudOff, CloudCheck, X } from 'lucide-react';
import { ApiKeyModal } from './components/ApiKeyModal';
import { ModernModal, ModalType } from './components/ModernModal';
import { db } from './db';
import { saveTripToDrive, isGoogleSyncEnabled, initGoogleServices, getAccessToken, getCloudConnection, loginGoogle, logoutGoogle, getDriveProfile, listAllTripsFromDrive, downloadFileContent, deleteTripFromDrive } from './utils/googleDrive';
import packageJson from './package.json';
import { useCloudSync } from './hooks/useCloudSync';

const TRIPS_STORAGE_KEY_LEGACY = 'trip_planner_all_trips';
const ACTIVE_TRIP_ID_KEY = 'trip_planner_active_id';

const App: React.FC = () => {
  const [trips, setTrips] = useState<TripData[]>([]);
  const [activeTripId, setActiveTripId] = useState<string | null>(() => {
    return localStorage.getItem(ACTIVE_TRIP_ID_KEY) || null;
  });
  const [isLoading, setIsLoading] = useState(true);
  const [step, setStep] = useState<Step>(Step.DASHBOARD);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const lastActiveTripId = useRef<string | null>(null);

  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: ModalType;
    onConfirm?: () => void;
    onCancel?: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'confirm'
  });

  const showAlert = (title: string, message: string, type: ModalType = 'confirm', onConfirm?: () => void, onCancel?: () => void) => {
    setModalConfig({ isOpen: true, title, message, type, onConfirm, onCancel });
  };

  const {
    cloudStatus,
    syncStatus,
    cloudUser,
    handleConnectCloud,
    handleLogoutCloud,
    scheduleAutoSync,
    handleDeleteFromCloud
  } = useCloudSync(trips, setTrips, activeTripId, setActiveTripId, step, showAlert);

  // Legacy loading logic
  useEffect(() => {
    const loadTrips = async () => {
      try {
        const allTrips = await db.trips.toArray();
        if (allTrips.length === 0) {
          const legacy = localStorage.getItem(TRIPS_STORAGE_KEY_LEGACY);
          if (legacy) {
            const parsed = JSON.parse(legacy);
            await db.trips.bulkAdd(parsed);
            setTrips(parsed);
          }
        } else {
          setTrips(allTrips);
        }
      } catch (err) {
        console.error('Failed to load trips:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadTrips();
  }, []);

  useEffect(() => {
    if (activeTripId) {
      localStorage.setItem(ACTIVE_TRIP_ID_KEY, activeTripId);

      // 只有當切換行程時，才根據進度決定預設步驟
      if (activeTripId !== lastActiveTripId.current) {
        const trip = trips.find(t => t.id === activeTripId);

        // 修正：如果目前資料庫還沒載入完成(trips為空)，或是找不到該行程，
        // 則不要更新 lastActiveTripId，等待下一次 trips 更新時再次嘗試導航。
        if (trip) {
          if (Array.isArray(trip.days) && trip.days.length > 0) setStep(Step.PLANNING);
          else setStep(Step.SETUP);

          lastActiveTripId.current = activeTripId; // 只有成功找到行程並設定 Step 後，才更新 Ref
        }
      }
    } else {
      localStorage.removeItem(ACTIVE_TRIP_ID_KEY);
      setStep(Step.DASHBOARD);
      lastActiveTripId.current = null;
    }
  }, [activeTripId, trips]);

  const activeTrip = useMemo(() => trips.find(t => t.id === activeTripId), [trips, activeTripId]);

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
    setTrips(prev => [...prev, newTrip]);
    setActiveTripId(newTrip.id);
  };

  const handleDeleteTrip = (id: string) => {
    const tripToDelete = trips.find(t => t.id === id);
    const tripName = tripToDelete?.name;
    const message = tripName
      ? `確定要永久刪除「${tripName}」嗎？此操作無法還原（包含雲端備份）。`
      : '確定要永久刪除此行程嗎？此操作無法還原（包含雲端備份）。';

    showAlert('刪除行程', message, 'alert', async () => {
      // 1. 本地刪除
      await db.trips.delete(id);
      setTrips(prev => prev.filter(t => t.id !== id));
      if (activeTripId === id) setActiveTripId(null);

      // 2. 雲端同步刪除
      await handleDeleteFromCloud(id);
    });
  };

  const handleUpdateActiveTrip = async (updates: Partial<TripData>) => {
    if (!activeTripId) return;
    const now = Date.now();
    const updatedTrip = { ...activeTrip, ...updates, lastModified: now } as TripData;

    await db.trips.update(activeTripId, { ...updates, lastModified: now });
    setTrips(prev => prev.map(t =>
      t.id === activeTripId ? updatedTrip : t
    ));

    // 自動同步邏輯 (僅同步當前編輯的行程)
    scheduleAutoSync(updatedTrip);
  };

  const handleImportTrips = async (importedTrips: TripData[]) => {
    await db.trips.bulkAdd(importedTrips);
    setTrips(prev => [...prev, ...importedTrips]);
  };

  const nextStep = () => {
    if (step === Step.SETUP && activeTrip) {
      if (!activeTrip.name || !activeTrip.startDate || !activeTrip.endDate) {
        showAlert('遺漏資訊', '請先填寫行程名稱與旅遊日期區間。');
        return;
      }
    }
    setStep(prev => (prev < 3 ? prev + 1 : prev));
  };

  const handleNavStepClick = (targetId: Step) => {
    if (targetId === step) return;

    // 前往更後面的步驟時進行驗證
    if (targetId > step) {
      if (step === Step.SETUP && activeTrip) {
        if (!activeTrip.name || !activeTrip.startDate || !activeTrip.endDate) {
          showAlert('遺漏資訊', '請先填寫行程名稱與旅遊日期區間。');
          return;
        }
        if (!Array.isArray(activeTrip.days) || activeTrip.days.length === 0) {
          showAlert('行程未建立', '請先使用 AI 智慧規劃或手動建立行程框架。');
          return;
        }
      }
      setStep(targetId);
    } else {
      // 回到之前的步驟直接跳轉
      setStep(targetId);
    }
  };

  const prevStep = () => setStep(prev => (prev > 1 ? prev - 1 : prev));

  const navSteps = [
    { id: Step.SETUP, label: '基本設定' },
    { id: Step.PLANNING, label: '行程規劃' },
    { id: Step.SUMMARY, label: '預覽輸出' },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-slate-900 animate-spin mb-4" />
        <p className="text-slate-400 font-bold tracking-widest text-xs uppercase italic">Adventure Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-slate-900 font-sans selection:bg-rose-100 selection:text-rose-900 overflow-x-hidden">
      {/* 🚀 FIXED HEADER: Premium & Minimal */}
      <header className="fixed top-0 left-0 right-0 h-16 md:h-20 bg-white/80 backdrop-blur-xl z-[100] border-b border-slate-50 px-4 md:px-12 flex items-center justify-between">
        <button
          onClick={() => {
            setActiveTripId(null);
            setStep(Step.DASHBOARD);
          }}
          className="flex flex-col items-start group flex-shrink-0"
        >
          <h1 className="text-xl md:text-2xl font-serif font-black italic tracking-tighter group-hover:text-blue-600 transition-colors flex items-baseline">
            TripPlanner<span className="text-blue-600">.</span>Pro
            <span className="ml-2 text-[8px] md:text-[10px] font-sans font-medium italic tracking-normal text-slate-300">v{packageJson.version}</span>
          </h1>
          <span className="hidden sm:inline text-[9px] font-black uppercase tracking-[0.4em] text-slate-300">By truedano</span>
        </button>

        {/* Desktop Navigation (Center) */}
        {step !== Step.DASHBOARD && (
          <div className="hidden md:flex items-center space-x-12">
            {navSteps.map(s => {
              const isActive = step === s.id;
              const isPast = step > s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => handleNavStepClick(s.id)}
                  className="flex flex-col items-center group"
                >
                  <div className={`h-1 rounded-full transition-all duration-500 mb-1.5 ${isActive ? 'w-10 bg-blue-600' : isPast ? 'w-10 bg-slate-400' : 'w-4 bg-slate-100'}`} />
                  <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${isActive ? 'text-blue-600' : isPast ? 'text-slate-400' : 'text-slate-200'}`}>
                    {s.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Right Action Icons (Pure Icons for Mobile) */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {step !== Step.DASHBOARD && activeTrip && cloudStatus === 'connected' && (
            <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
              {syncStatus === 'syncing' ? <Loader2 className="w-4 h-4 text-blue-500 animate-spin" /> :
                syncStatus === 'synced' ? <CloudCheck className="w-4 h-4 text-emerald-500" /> :
                  syncStatus === 'error' ? <CloudOff className="w-4 h-4 text-rose-500" /> :
                    <Cloud className="w-4 h-4 text-slate-300" />}
            </div>
          )}

          {step !== Step.DASHBOARD && (
            <button
              onClick={() => {
                setActiveTripId(null);
                setStep(Step.DASHBOARD);
              }}
              className="p-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <button
            onClick={() => setShowApiKeyModal(true)}
            className="p-2 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-xl border border-slate-100"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* 📱 MOBILE BOTTOM NAV: Ultra-responsive floating bar */}
      {step !== Step.DASHBOARD && (
        <div className="md:hidden fixed bottom-6 left-0 right-0 z-[200] flex justify-center px-4 pointer-events-none">
          <div className="bg-slate-900/95 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.4)] p-2 flex items-center justify-around w-full max-w-sm pointer-events-auto">
            {navSteps.map(s => {
              const isActive = step === s.id;
              const isPast = step > s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => handleNavStepClick(s.id)}
                  className="flex-1 flex flex-col items-center py-2 transition-all active:scale-90"
                >
                  <div className={`h-1 rounded-full transition-all duration-500 mb-1.5 ${isActive ? 'w-8 bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : isPast ? 'w-8 bg-slate-600' : 'w-4 bg-slate-800'}`} />
                  <span className={`text-[10px] font-black uppercase tracking-tighter transition-colors ${isActive ? 'text-white' : isPast ? 'text-slate-400' : 'text-slate-600'}`}>
                    {s.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <main className="pt-24 md:pt-32 px-4 md:px-12 max-w-[1400px] mx-auto pb-32">
        {step === Step.DASHBOARD && (
          <TripDashboard
            trips={trips}
            onSelect={setActiveTripId}
            onDelete={handleDeleteTrip}
            onCreate={handleCreateNewTrip}
            onImport={handleImportTrips}
            showAlert={showAlert}
            cloudStatus={cloudStatus}
            cloudUser={cloudUser}
            onConnectCloud={handleConnectCloud}
            onLogoutCloud={handleLogoutCloud}
          />
        )}
        {step === Step.SETUP && activeTrip && (
          <Step1Setup
            tripData={activeTrip}
            onUpdate={handleUpdateActiveTrip}
            onNext={nextStep}
            showAlert={showAlert}
          />
        )}
        {step === Step.PLANNING && activeTrip && (
          <Step2Editor
            tripData={activeTrip}
            onUpdate={handleUpdateActiveTrip}
            onBack={() => setStep(Step.SETUP)}
            onNext={() => setStep(Step.SUMMARY)}
            showAlert={showAlert}
          />
        )}
        {step === Step.SUMMARY && activeTrip && (
          <Step3Summary
            tripData={activeTrip}
            showAlert={showAlert}
          />
        )}
      </main>

      <ApiKeyModal
        isOpen={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
        onSave={() => { }}
      />

      <ModernModal
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        onClose={() => {
          modalConfig.onCancel?.();
          setModalConfig(prev => ({ ...prev, isOpen: false }));
        }}
        onConfirm={() => {
          const callback = modalConfig.onConfirm;
          setModalConfig(prev => ({ ...prev, isOpen: false }));
          if (callback) {
            // 使用 setTimeout 確保 Modal 已徹底關閉，避免狀態競爭導致 AI 流程中斷
            setTimeout(() => {
              callback();
            }, 100);
          }
        }}
        onCancel={() => {
          modalConfig.onCancel?.();
          setModalConfig(prev => ({ ...prev, isOpen: false }));
        }}
      />
    </div>
  );
};

export default App;
