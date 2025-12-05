import { Driver, CheckInRecord } from '../types';

const STORAGE_KEY = 'trunk_soul_drivers_v1';

// In a real implementation, you would replace these LocalStorage calls
// with fetch() calls to your Google Apps Script Web App URL.

const SEED_DRIVERS: Driver[] = [
  {
    id: "TS-8899",
    name: "Somchai Jaidee",
    licensePlate: "Chiang Mai 8899",
    vehicleType: 'taxi',
    totalCheckIns: 8,
    lastCheckIn: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    history: Array.from({ length: 8 }).map((_, i) => ({
      id: `mock-1-${i}`,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * (8 - i)).toISOString(),
      note: "Standard Pickup"
    }))
  },
  {
    id: "TS-1122",
    name: "Sarah Connors",
    licensePlate: "Bangkok 1122",
    vehicleType: 'van',
    totalCheckIns: 10, // Just hit reward
    lastCheckIn: new Date().toISOString(),
    history: Array.from({ length: 10 }).map((_, i) => ({
      id: `mock-2-${i}`,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48 * (10 - i)).toISOString(),
      note: "VIP Group"
    }))
  }
];

export const getAllDrivers = (): Driver[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (data) {
    return JSON.parse(data);
  }
  
  // Seed data if storage is empty
  localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_DRIVERS));
  return SEED_DRIVERS;
};

export const getDriverById = (id: string): Driver | undefined => {
  const drivers = getAllDrivers();
  return drivers.find(d => d.id === id);
};

export const saveDriver = (driver: Driver): void => {
  const drivers = getAllDrivers();
  const index = drivers.findIndex(d => d.id === driver.id);
  
  if (index >= 0) {
    drivers[index] = driver;
  } else {
    drivers.push(driver);
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(drivers));
};

export const addCheckIn = (
  driverId: string, 
  customTimestamp?: string, 
  vehicleType?: 'taxi' | 'van',
  note?: string
): Driver | null => {
  const driver = getDriverById(driverId);
  if (!driver) return null;

  // Use custom timestamp if provided, otherwise current time
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
    // Update vehicle type if provided, otherwise keep existing
    vehicleType: vehicleType || driver.vehicleType, 
    history: [newRecord, ...driver.history]
  };

  saveDriver(updatedDriver);
  return updatedDriver;
};

export const createDriver = (name: string, licensePlate: string): Driver => {
  const newDriver: Driver = {
    id: crypto.randomUUID().slice(0, 8).toUpperCase(), // Short distinct ID
    name,
    licensePlate,
    vehicleType: 'van', // Default
    totalCheckIns: 0,
    lastCheckIn: new Date().toISOString(),
    history: []
  };
  saveDriver(newDriver);
  return newDriver;
};

// Helper to calculate reward status
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