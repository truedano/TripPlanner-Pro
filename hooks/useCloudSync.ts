
import React, { useState, useEffect, useRef } from 'react';
import { TripData, Step, GoogleUserProfile } from '../types';
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
    const [cloudUser, setCloudUser] = useState<GoogleUserProfile | null>(null);
    const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const tripsRef = useRef<TripData[]>(trips);

    useEffect(() => {
        tripsRef.current = trips;
    }, [trips]);

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
                        console.error('Cloud Init Error (Token/Profile):', e);
                        setCloudStatus('disconnected');
                    }
                } else {
                    setCloudStatus('disconnected');
                }
            } catch (err) {
                console.error('Cloud Init Error (Services):', err);
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
            // Parallel download
            const downloads = await Promise.all(driveFiles.map(async (file: any) => {
                const content = await downloadFileContent(file.id);
                return { file, content };
            }));

            const localTrips = await db.trips.toArray();
            let updatedTrips = [...localTrips];
            let listChanged = false;

            // Process updates/adds
            for (const { file, content } of downloads) {
                if (!content) continue;
                const remoteTrip = content;
                const tripId = file.appProperties?.tripId;
                if (!tripId) continue;

                const localMatchIndex = updatedTrips.findIndex(t => t.id === tripId);

                if (localMatchIndex === -1) {
                    await db.trips.add(remoteTrip);
                    updatedTrips.push(remoteTrip);
                    listChanged = true;
                } else {
                    const localTrip = updatedTrips[localMatchIndex];
                    if ((remoteTrip.lastModified || 0) > (localTrip.lastModified || 0)) {
                        await db.trips.put(remoteTrip);
                        updatedTrips[localMatchIndex] = remoteTrip;
                        listChanged = true;
                    }
                }
            }

            // Handle deletions from cloud (parity sync)
            const tripsToKeep: TripData[] = [];

            // Safety Guard: Avoid mass deletion if API returns empty list unexpectedly (prevent data loss)
            if (driveFiles.length === 0 && localTrips.length > 0) {
                console.warn('SafeGuard: Drive returned 0 files while local has data. Skipping parity deletion.');
                tripsToKeep.push(...updatedTrips);
            } else {
                const driveTripIds = new Set(driveFiles.map((f: any) => f.appProperties?.tripId).filter(Boolean));

                for (const trip of updatedTrips) {
                    if (trip.lastSyncedAt && !driveTripIds.has(trip.id)) {
                        console.log(`Parity sync: Removing local trip ${trip.name} as it was deleted from cloud.`);
                        await db.trips.delete(trip.id);
                        if (activeTripId === trip.id) setActiveTripId(null);
                        listChanged = true;
                    } else {
                        tripsToKeep.push(trip);
                    }
                }
            }

            if (listChanged) {
                setTrips(tripsToKeep);
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

            const currentTrips = tripsRef.current;
            const unSyncedTrips = currentTrips.filter(t => !t.lastSyncedAt || t.lastModified > (t.lastSyncedAt || 0));

            if (unSyncedTrips.length === 0) {
                await syncAllFromCloud();
                return;
            }

            console.log(`Background Sync: ${unSyncedTrips.length} trips pending.`);

            const results = await Promise.all(unSyncedTrips.map(async (trip) => {
                try {
                    const syncTime = await saveTripToDrive(trip, true);
                    await db.trips.update(trip.id, { lastSyncedAt: syncTime });
                    return { id: trip.id, syncTime };
                } catch (e) {
                    console.warn('Background sync failed for', trip.name);
                    return null;
                }
            }));

            const successful = results.filter((r): r is { id: string, syncTime: number } => r !== null);

            if (successful.length > 0) {
                setTrips(prev => prev.map(t => {
                    const match = successful.find(s => s.id === t.id);
                    return match ? { ...t, lastSyncedAt: match.syncTime } : t;
                }));
            }
        };

        const interval = setInterval(backgroundSync, 30000);
        return () => clearInterval(interval);
    }, [cloudStatus, step]);

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
