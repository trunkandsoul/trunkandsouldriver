import { Driver, CheckInRecord } from '../types';

const STORAGE_KEY = 'trunk_soul_drivers_v1';
const SETTINGS_KEY = 'trunk_soul_settings_v1';

// --- Local Storage Helpers (Fallback) ---

const SEED_DRIVERS: Driver[] = [
  {
    id: "TS-001",
    name: "Somsak (Demo)",
    licensePlate: "Chiang Mai 101",
    vehicleType: 'van',
    totalCheckIns: 2,
    lastCheckIn: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    history: [
      { id: 'h1', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(), note: 'Trip 1' },
      { id: 'h2', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), note: 'Trip 2' }
    ]
  },
  {
    id: "TS-002",
    name: "Arun (Demo)",
    licensePlate: "Chiang Mai 888",
    vehicleType: 'taxi',
    totalCheckIns: 9,
    lastCheckIn: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    history: Array.from({ length: 9 }).map((_, i) => ({
      id: `h-arun-${i}`,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * (10 - i)).toISOString(),
      note: "Regular Trip"
    }))
  },
  {
    id: "TS-003",
    name: "Nop (Demo)",
    licensePlate: "Bangkok 999",
    vehicleType: 'van',
    totalCheckIns: 10,
    lastCheckIn: new Date().toISOString(),
    history: Array.from({ length: 10 }).map((_, i) => ({
      id: `h-nop-${i}`,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * (12 - i)).toISOString(),
      note: "VIP Trip"
    }))
  }
];

const getLocalDrivers = (): Driver[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (data) return JSON.parse(data);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_DRIVERS));
  return SEED_DRIVERS;
};

const saveLocalDriver = (driver: Driver): void => {
  const drivers = getLocalDrivers();
  const index = drivers.findIndex(d => d.id === driver.id);
  if (index >= 0) drivers[index] = driver;
  else drivers.push(driver);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(drivers));
};

// --- Settings Management ---

export interface AppSettings {
  googleScriptUrl: string;
}

export const getSettings = (): AppSettings => {
  const saved = localStorage.getItem(SETTINGS_KEY);
  return saved ? JSON.parse(saved) : { googleScriptUrl: '' };
};

export const saveSettings = (settings: AppSettings) => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

// --- Async Data Operations ---

export const fetchDrivers = async (): Promise<Driver[]> => {
  const settings = getSettings();
  
  // 1. Try Google Sheet if Configured
  if (settings.googleScriptUrl) {
    try {
      const response = await fetch(`${settings.googleScriptUrl}?action=getDrivers`);
      const json = await response.json();
      if (json.status === 'success') {
        // Optional: Update local cache
        localStorage.setItem(STORAGE_KEY, JSON.stringify(json.data));
        return json.data;
      }
    } catch (error) {
      console.error("Failed to fetch from Google Sheet:", error);
      // Fallthrough to local storage on error
    }
  }

  // 2. Fallback to Local Storage
  return getLocalDrivers();
};

export const fetchDriverById = async (id: string): Promise<Driver | undefined> => {
  const drivers = await fetchDrivers();
  return drivers.find(d => d.id === id);
};

export const syncDriverCheckIn = async (
  driverId: string, 
  customTimestamp?: string, 
  vehicleType?: 'taxi' | 'van',
  note?: string
): Promise<Driver | null> => {
  // 1. Get current state (optimistic)
  const drivers = await fetchDrivers();
  const driver = drivers.find(d => d.id === driverId);
  if (!driver) return null;

  // 2. Prepare Update
  const timestamp = customTimestamp 
    ? new Date(customTimestamp).toISOString() 
    : new Date().toISOString();

  const newRecord: CheckInRecord = {
    id: Date.now().toString(),
    timestamp: timestamp,
    note
  };

  const updatedDriver: Driver = {
    ...driver,
    totalCheckIns: driver.totalCheckIns + 1,
    lastCheckIn: timestamp,
    vehicleType: vehicleType || driver.vehicleType,
    history: [newRecord, ...driver.history]
  };

  // 3. Save Locally first (Optimistic UI)
  saveLocalDriver(updatedDriver);

  // 4. Sync to Cloud
  const settings = getSettings();
  if (settings.googleScriptUrl) {
    try {
      // Use no-cors or text/plain to avoid CORS preflight issues with simple GAS Web Apps
      await fetch(settings.googleScriptUrl, {
        method: 'POST',
        mode: 'no-cors', 
        headers: {
          'Content-Type': 'text/plain', 
        },
        body: JSON.stringify({
          action: 'updateDriver',
          driver: updatedDriver
        })
      });
    } catch (e) {
      console.error("Cloud Sync Error", e);
      alert("Saved locally, but failed to sync to Google Sheet. Please check internet connection.");
    }
  }

  return updatedDriver;
};

export const createNewDriver = async (name: string, licensePlate: string, vehicleType: 'taxi' | 'van'): Promise<Driver> => {
  const newDriver: Driver = {
    id: crypto.randomUUID().slice(0, 8).toUpperCase(),
    name,
    licensePlate,
    vehicleType,
    totalCheckIns: 0,
    lastCheckIn: new Date().toISOString(),
    history: []
  };

  saveLocalDriver(newDriver);

  const settings = getSettings();
  if (settings.googleScriptUrl) {
    try {
        await fetch(settings.googleScriptUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
              action: 'createDriver',
              driver: newDriver
            })
          });
    } catch (e) {
        console.error("Cloud Sync Error", e);
    }
  }

  return newDriver;
};

// Helper to calculate reward status (Pure utility, no storage access)
export const calculateReward = (totalCheckIns: number) => {
  const REWARD_THRESHOLD = 10;
  const rewardsEarned = Math.floor(totalCheckIns / REWARD_THRESHOLD);
  const progress = totalCheckIns % REWARD_THRESHOLD;
  const remaining = REWARD_THRESHOLD - progress;

  return {
    rewardsEarned,
    progress,
    remaining,
    isRewardMoment: progress === 0 && totalCheckIns > 0
  };
};