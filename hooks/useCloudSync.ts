
import React, { useState, useEffect, useRef } from 'react';
import { TripData, Step } from '../types';
import { db } from '../db';
import { ModalType } from '../components/ModernModal';
import {
    saveTripToDrive, isGoogleSyncEnabled, initGoogleServices, getAccessToken,
    getCloudConnection, loginGoogle, logoutGoogle, getDriveProfile,
    listAllTripsFromDrive, downloadFileContent, deleteTripFromDrive
} from '../utils/googleDrive';

export const useCloudSync = (
    trips: TripData[],
    setTrips: React.Dispatch<React.SetStateAction<TripData[]>>,
    activeTripId: string | null,
    setActiveTripId: React.Dispatch<React.SetStateAction<string | null>>,
    step: Step,
    showAlert: (title: string, message: string, type?: ModalType) => void
) => {
    const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
    const [cloudStatus, setCloudStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
    const [cloudUser, setCloudUser] = useState<any>(null);
    const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Initialization: Check connection status and initial sync
    useEffect(() => {
        const initCloud = async () => {
            if (!isGoogleSyncEnabled()) return;
            setCloudStatus('connecting');
            try {
                const success = await initGoogleServices();
                if (success) {
                    try {
                        const token = await getAccessToken(true);
                        window.gapi.client.setToken({ access_token: token });
                        if (getCloudConnection() === 'connected') {
                            setCloudStatus('connected');
                            const profile = await getDriveProfile();
                            if (profile) setCloudUser(profile);
                            await syncAllFromCloud();
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const syncAllFromCloud = async () => {
        if (getCloudConnection() !== 'connected') return;
        setSyncStatus('syncing');
        try {
            const driveFiles = await listAllTripsFromDrive();
            const localTrips = await db.trips.toArray();

            for (const file of driveFiles) {
                const tripId = file.appProperties?.tripId;
                if (!tripId) continue;

                const remoteTrip = await downloadFileContent(file.id);
                if (!remoteTrip) continue;

                const localMatch = localTrips.find(t => t.id === tripId);

                if (!localMatch) {
                    await db.trips.add(remoteTrip);
                    setTrips(prev => [...prev.filter(t => t.id !== tripId), remoteTrip]);
                } else if ((remoteTrip.lastModified || 0) > (localMatch.lastModified || 0)) {
                    await db.trips.put(remoteTrip);
                    setTrips(prev => prev.map(t => t.id === tripId ? remoteTrip : t));
                }
            }

            // Handle deletions from cloud (parity sync)
            const driveTripIds = driveFiles.map(f => f.appProperties?.tripId).filter(Boolean);
            for (const localTrip of localTrips) {
                if (localTrip.lastSyncedAt && !driveTripIds.includes(localTrip.id)) {
                    console.log(`Parity sync: Removing local trip ${localTrip.name} as it was deleted from cloud.`);
                    await db.trips.delete(localTrip.id);
                    setTrips(prev => prev.filter(t => t.id !== localTrip.id));
                    if (activeTripId === localTrip.id) setActiveTripId(null);
                }
            }

            setSyncStatus('synced');
            setTimeout(() => setSyncStatus('idle'), 3000);
        } catch (e) {
            console.error('Full Sync Failed:', e);
            setSyncStatus('error');
        }
    };

    // Background Sync
    useEffect(() => {
        const backgroundSync = async () => {
            if (cloudStatus !== 'connected' || step !== Step.DASHBOARD) return;

            const unSyncedTrips = trips.filter(t => !t.lastSyncedAt || t.lastModified > t.lastSyncedAt);
            if (unSyncedTrips.length === 0) {
                await syncAllFromCloud();
                return;
            }

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
    }, [cloudStatus, trips, step, setTrips]);

    const handleConnectCloud = async () => {
        setCloudStatus('connecting');
        try {
            await initGoogleServices();
            await loginGoogle();
            setCloudStatus('connected');
            const profile = await getDriveProfile();
            if (profile) setCloudUser(profile);
            await syncAllFromCloud();
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

    const scheduleAutoSync = (updatedTrip: TripData) => {
        if (cloudStatus === 'connected') {
            if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
            setSyncStatus('syncing');

            syncTimeoutRef.current = setTimeout(async () => {
                try {
                    const syncTime = await saveTripToDrive(updatedTrip, true);
                    await db.trips.update(updatedTrip.id, { lastSyncedAt: syncTime });
                    setTrips(prev => prev.map(t => t.id === updatedTrip.id ? { ...t, lastSyncedAt: syncTime } : t));
                    setSyncStatus('synced');
                    setTimeout(() => setSyncStatus('idle'), 3000);
                } catch (err) {
                    console.error('Auto-sync failed:', err);
                    setSyncStatus('error');
                }
            }, 3000);
        }
    };

    const handleDeleteFromCloud = async (id: string) => {
        if (cloudStatus === 'connected') {
            await deleteTripFromDrive(id);
        }
    }

    return {
        cloudStatus,
        syncStatus,
        cloudUser,
        handleConnectCloud,
        handleLogoutCloud,
        syncAllFromCloud,
        scheduleAutoSync,
        handleDeleteFromCloud
    };
};
