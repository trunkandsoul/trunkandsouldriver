import React from 'react';
import { Driver } from '../types';
import { calculateReward } from '../services/storage';
import QRCode from "react-qr-code";

interface DriverCardProps {
  driver: Driver;
  showQr?: boolean;
}

const DriverCard: React.FC<DriverCardProps> = ({ driver, showQr = false }) => {
  const { progress, rewardsEarned, remaining } = calculateReward(driver.totalCheckIns);
  const percentage = (progress / 10) * 100;

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-sky-100 overflow-hidden">
      <div className="bg-sky-500 p-4 text-white">
        <h2 className="text-2xl font-bold">{driver.name}</h2>
        <p className="opacity-90">{driver.licensePlate}</p>
      </div>
      
      <div className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                <p className="text-xs text-slate-500 uppercase font-semibold">Total Trips</p>
                <p className="text-2xl font-bold text-blue-900">{driver.totalCheckIns}</p>
            </div>
            <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 text-center">
                <p className="text-xs text-amber-600 uppercase font-semibold">Rewards Earned</p>
                <p className="text-2xl font-bold text-amber-600">{rewardsEarned}</p>
                <p className="text-[10px] text-amber-500">(Total: {rewardsEarned * 1000}฿)</p>
            </div>
        </div>

        {/* Progress Section */}
        <div>
            <div className="flex justify-between items-end mb-2">
                <span className="text-sm font-medium text-slate-600">Current Streak</span>
                <span className="text-sm font-bold text-sky-600">{progress} / 10</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden">
                <div 
                    className="bg-gradient-to-r from-sky-400 to-blue-600 h-4 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
            <p className="text-center text-sm text-slate-500 mt-2">
                {remaining === 0 
                    ? <span className="text-green-600 font-bold animate-pulse">🎉 Reward Unlocked! Contact Admin.</span> 
                    : `${remaining} more trips for next 1,000฿ reward`
                }
            </p>
        </div>

        {/* QR Code Section */}
        {showQr && (
            <div className="flex flex-col items-center pt-4 border-t border-slate-100">
                <p className="text-xs text-slate-400 mb-2">Driver ID: {driver.id}</p>
                <div className="p-2 bg-white border-2 border-dashed border-sky-200 rounded-lg">
                    <QRCode 
                        value={driver.id} 
                        size={120} 
                        level="H" 
                        fgColor="#0f172a"
                    />
                </div>
                <p className="text-xs text-slate-400 mt-2">Scan to check status</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default DriverCard;