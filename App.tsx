
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TripDashboard } from './components/TripDashboard';
import { Step1Setup } from './components/Step1Setup';
import { Step2Editor } from './components/Step2Editor';
import { Step3Summary } from './components/Step3Summary';
import { TripData, Step } from './types';
import { Calendar, MapPin, CheckCircle, ChevronLeft, ChevronRight, Save, Plus, Trash2, Heart, Loader2, Settings, Cloud, CloudOff, CloudCheck } from 'lucide-react';
import { ApiKeyModal } from './components/ApiKeyModal';
import { ModernModal, ModalType } from './components/ModernModal';
import { db } from './db';
import { saveTripToDrive, isGoogleSyncEnabled, initGoogleServices, getAccessToken, getCloudConnection, loginGoogle, logoutGoogle, getDriveProfile } from './utils/googleDrive';

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

  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [cloudStatus, setCloudStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [cloudUser, setCloudUser] = useState<any>(null);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 初始化 Cloud 狀態
  useEffect(() => {
    const initCloud = async () => {
      if (!isGoogleSyncEnabled()) return;
      setCloudStatus('connecting');
      try {
        const success = await initGoogleServices();
        if (success) {
          try {
            await getAccessToken(true); // Silent check
            if (getCloudConnection() === 'connected') {
              setCloudStatus('connected');
              const profile = await getDriveProfile();
              if (profile) setCloudUser(profile);
            } else {
              setCloudStatus('disconnected');
            }
          } catch (e) {
            setCloudStatus('disconnected');
          }
        }
      } catch (err) {
        setCloudStatus('disconnected');
      }
    };
    initCloud();
  }, []);

  // 全域後台同步任務：每 30 秒檢查是否有未備份的行程
  useEffect(() => {
    const backgroundSync = async () => {
      if (cloudStatus !== 'connected' || step !== Step.DASHBOARD) return;

      const unSyncedTrips = trips.filter(t => !t.lastSyncedAt || t.lastModified > t.lastSyncedAt);
      if (unSyncedTrips.length === 0) return;

      console.log(`Background Sync: ${unSyncedTrips.length} trips pending.`);
      for (const trip of unSyncedTrips) {
        try {
          const syncTime = await saveTripToDrive(trip, true);
          await db.trips.update(trip.id, { lastSyncedAt: syncTime });
          setTrips(prev => prev.map(t => t.id === trip.id ? { ...t, lastSyncedAt: syncTime } : t));
        } catch (e) {
          console.warn('Background sync failed for', trip.name);
        }
      }
    };

    const interval = setInterval(backgroundSync, 30000);
    return () => clearInterval(interval);
  }, [cloudStatus, trips, step]);

  // Modal State
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: ModalType;
    onConfirm?: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'confirm'
  });

  const showAlert = (title: string, message: string, type: ModalType = 'confirm', onConfirm?: () => void) => {
    setModalConfig({ isOpen: true, title, message, type, onConfirm });
  };

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
      const trip = trips.find(t => t.id === activeTripId);
      if (trip) {
        if (trip.days.length > 0) setStep(Step.PLANNING);
        else setStep(Step.SETUP);
      }
    } else {
      localStorage.removeItem(ACTIVE_TRIP_ID_KEY);
      setStep(Step.DASHBOARD);
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
    showAlert('刪除行程', '確定要永久刪除此行程嗎？此操作無法還原。', 'alert', async () => {
      await db.trips.delete(id);
      setTrips(prev => prev.filter(t => t.id !== id));
      if (activeTripId === id) setActiveTripId(null);
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
    if (cloudStatus === 'connected') {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      setSyncStatus('syncing');

      syncTimeoutRef.current = setTimeout(async () => {
        try {
          const syncTime = await saveTripToDrive(updatedTrip, true);
          await db.trips.update(activeTripId, { lastSyncedAt: syncTime });
          setTrips(prev => prev.map(t => t.id === activeTripId ? { ...t, lastSyncedAt: syncTime } : t));
          setSyncStatus('synced');
          setTimeout(() => setSyncStatus('idle'), 3000);
        } catch (err) {
          console.error('Auto-sync failed:', err);
          setSyncStatus('error');
        }
      }, 3000);
    }
  };

  const handleImportTrips = async (importedTrips: TripData[]) => {
    await db.trips.bulkAdd(importedTrips);
    setTrips(prev => [...prev, ...importedTrips]);
  };

  const handleConnectCloud = async () => {
    setCloudStatus('connecting');
    try {
      await initGoogleServices();
      await loginGoogle();
      setCloudStatus('connected');
      const profile = await getDriveProfile();
      if (profile) setCloudUser(profile);
      showAlert('同步連線成功', '現在您的行程會自動備份至 Google Drive。', 'success');
    } catch (e: any) {
      console.error('Cloud connection failed', e);
      setCloudStatus('disconnected');
      if (e.error !== 'popup_closed_by_user') {
        showAlert('連線失敗', '無法連接至 Google Drive，請檢查網路或 API 設定。', 'alert');
      }
    }
  };

  const handleLogoutCloud = () => {
    logoutGoogle();
    setCloudStatus('disconnected');
    setCloudUser(null);
    showAlert('已斷開連線', '已停止雲端自動同步。', 'confirm');
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
    <div className="min-h-screen bg-[#FDFDFD] text-slate-900 font-sans selection:bg-rose-100 selection:text-rose-900">
      <header className="fixed top-0 left-0 right-0 h-24 bg-white/80 backdrop-blur-xl z-[100] border-b border-slate-50 px-6 md:px-12 flex items-center justify-between">
        <div className="flex items-center space-x-12">
          <button
            onClick={() => {
              setActiveTripId(null);
              setStep(Step.DASHBOARD);
            }}
            className="flex flex-col items-start group"
          >
            <h1 className="text-2xl font-serif font-black italic tracking-tighter group-hover:text-blue-600 transition-colors">TripPlanner<span className="text-blue-600">.</span>Pro</h1>
            <span className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-300 group-hover:text-blue-200 transition-colors">By truedano</span>
          </button>

          {step !== Step.DASHBOARD && (
            <div className="hidden md:flex items-center space-x-8">
              {navSteps.map(s => {
                const isActive = step === s.id;
                const isPast = step > s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => {
                      if (s.id < step) setStep(s.id);
                      if (s.id > step) nextStep();
                    }}
                    className="flex flex-col items-center group touch-none"
                  >
                    <div className={`h-1.5 rounded-full transition-all duration-500 mb-1.5 ${isActive ? 'w-8 bg-blue-600' : isPast ? 'w-8 bg-slate-400' : 'w-4 bg-slate-100'}`} />
                    <span className={`text-[10px] font-black uppercase tracking-tighter transition-colors ${isActive ? 'text-blue-600' : isPast ? 'text-slate-400' : 'text-slate-200'}`}>
                      {s.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-3">
          {step !== Step.DASHBOARD && activeTrip && cloudStatus === 'connected' && (
            <div className="flex items-center mr-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100 transition-all">
              {syncStatus === 'syncing' && (
                <>
                  <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin mr-2" />
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">同步中</span>
                </>
              )}
              {syncStatus === 'synced' && (
                <>
                  <CloudCheck className="w-3.5 h-3.5 text-emerald-500 mr-2" />
                  <span className="text-[10px] font-black text-emerald-600 uppercase tracking-tighter">已雲端備份</span>
                </>
              )}
              {syncStatus === 'idle' && (
                <>
                  <Cloud className="w-3.5 h-3.5 text-slate-300 mr-2" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">雲端已連線</span>
                </>
              )}
              {syncStatus === 'error' && (
                <>
                  <CloudOff className="w-3.5 h-3.5 text-rose-500 mr-2" />
                  <span className="text-[10px] font-black text-rose-600 uppercase tracking-tighter">同步失敗</span>
                </>
              )}
            </div>
          )}

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
                  setSyncStatus('idle');
                }}
                className="px-5 py-2.5 text-xs font-black text-slate-600 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-all uppercase tracking-widest"
              >
                關閉
              </button>
            </div>
          )}

          <button
            onClick={() => setShowApiKeyModal(true)}
            className="p-2.5 bg-slate-50 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-2xl transition-all border border-slate-100 ml-2"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="pt-32 px-6 md:px-12 max-w-[1400px] mx-auto pb-24">
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
        onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
        onConfirm={() => {
          modalConfig.onConfirm?.();
          setModalConfig(prev => ({ ...prev, isOpen: false }));
        }}
      />
    </div>
  );
};

export default App;
