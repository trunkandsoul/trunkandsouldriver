export interface Driver {
  id: string;
  name: string;
  licensePlate: string;
  vehicleType?: 'taxi' | 'van'; // New field
  totalCheckIns: number;
  lastCheckIn: string; // ISO Date string
  history: CheckInRecord[];
}

export interface CheckInRecord {
  id: string;
  timestamp: string;
  note?: string;
}

export interface RewardStatus {
  checkIns: number;
  progress: number; // 0 to 10
  rewardsEarned: number;
  remainingForNextReward: number;
}

export enum AppView {
  HOME = 'HOME',
  CHECK_IN = 'CHECK_IN',
  CONFIRM_CHECK_IN = 'CONFIRM_CHECK_IN',
  CONFIRM_REGISTER = 'CONFIRM_REGISTER',
  STATUS = 'STATUS',
  ADMIN = 'ADMIN'
}