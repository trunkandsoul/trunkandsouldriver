import React, { useState, useEffect, useMemo } from 'react';
import Layout from './components/Layout';
import DriverCard from './components/DriverCard';
import { AppView, Driver } from './types';
import { fetchDrivers, fetchDriverById, syncDriverCheckIn, createNewDriver, getSettings, saveSettings } from './services/storage';
import { generateWelcomeMessage } from './services/gemini';

// Helper to format Date for datetime-local input
const getLocalDateTimeForInput = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
};

const getVehicleIcon = (type?: 'taxi' | 'van') => {
  if (type === 'taxi') return '🚕';
  if (type === 'van') return '🚐';
  return '';
};

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.HOME);
  
  // Data State
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [currentDriver, setCurrentDriver] = useState<Driver | null>(null);
  
  // App State
  const [loading, setLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState<string>('');
  
  // Check-in State
  const [pendingDriver, setPendingDriver] = useState<Driver | null>(null);
  const [checkInDateTime, setCheckInDateTime] = useState<string>('');
  const [checkInVehicleType, setCheckInVehicleType] = useState<'taxi' | 'van'>('van');
  
  // Registration State
  const [registerName, setRegisterName] = useState('');
  const [registerPlate, setRegisterPlate] = useState('');
  const [registerVehicleType, setRegisterVehicleType] = useState<'taxi' | 'van'>('van');

  // Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  
  // Settings State
  const [scriptUrl, setScriptUrl] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  // Load drivers on mount
  useEffect(() => {
    loadDrivers();
    const settings = getSettings();
    setScriptUrl(settings.googleScriptUrl);
  }, []);

  const loadDrivers = async () => {
    setLoading(true);
    try {
        const data = await fetchDrivers();
        setDrivers(data);
    } catch (e) {
        console.error("Failed to load drivers", e);
    }
    setLoading(false);
  };

  const filteredDrivers = useMemo(() => {
    if (!searchTerm) return [];
    const lowerTerm = searchTerm.toLowerCase();
    return drivers.filter(d => 
      d.id.toLowerCase().includes(lowerTerm) ||
      d.name.toLowerCase().includes(lowerTerm) ||
      d.licensePlate.toLowerCase().includes(lowerTerm)
    );
  }, [searchTerm, drivers]);

  const handleLookup = async (id: string) => {
    setLoading(true);
    const driver = await fetchDriverById(id);
    if (driver) {
        setCurrentDriver(driver);
        setView(AppView.STATUS);
        setSearchTerm('');
        setShowDropdown(false);
    } else {
        alert("Driver ID not found.");
    }
    setLoading(false);
  };

  const initiateCheckIn = (driver: Driver) => {
    setPendingDriver(driver);
    setCheckInDateTime(getLocalDateTimeForInput());
    setCheckInVehicleType(driver.vehicleType || 'van');
    setSearchTerm('');
    setShowDropdown(false);
    setView(AppView.CONFIRM_CHECK_IN);
  };

  const processCheckIn = async () => {
    if (!pendingDriver) return;
    setLoading(true);
    
    const updated = await syncDriverCheckIn(pendingDriver.id, checkInDateTime, checkInVehicleType);
    
    if (updated) {
        // Refresh full list
        await loadDrivers();
        
        setCurrentDriver(updated);
        setPendingDriver(null);
        
        const message = await generateWelcomeMessage(updated.name, updated.totalCheckIns);
        setAiMessage(message);
        
        setView(AppView.STATUS);
    } else {
        alert("Error processing check-in.");
    }
    setLoading(false);
  };

  const initiateRegister = () => {
    if (!registerName || !registerPlate) {
        alert("Please fill in all fields");
        return;
    }
    setView(AppView.CONFIRM_REGISTER);
  };

  const finalizeRegister = async () => {
    setLoading(true);
    const newDriver = await createNewDriver(registerName, registerPlate, registerVehicleType);
    await loadDrivers();
    setCurrentDriver(newDriver);
    setView(AppView.STATUS); // Go to status page. Can add check-in button there if needed.
    
    // Reset form
    setRegisterName('');
    setRegisterPlate('');
    setRegisterVehicleType('van');
    setLoading(false);
  };

  const handleSaveSettings = () => {
    saveSettings({ googleScriptUrl: scriptUrl });
    setShowSettings(false);
    alert("Settings saved. Attempting to refresh data...");
    loadDrivers();
  };

  const handleExportCSV = () => {
    const rows = [
      ['ID', 'Name', 'License Plate', 'Vehicle Type', 'Total Trips', 'Last Check-In']
    ];
    
    drivers.forEach(d => {
        rows.push([
            d.id,
            `"${d.name}"`,
            `"${d.licensePlate}"`,
            d.vehicleType || 'van',
            d.totalCheckIns.toString(),
            d.lastCheckIn
        ]);
    });

    const csvContent = "\uFEFF" + rows.map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `trunk_soul_drivers_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // --- Views ---

  const renderHome = () => (
    <div className="grid gap-6">
      <div className="bg-white p-8 rounded-2xl shadow-xl shadow-blue-900/5 border border-slate-100 text-center space-y-8">
        <div>
           <h2 className="text-3xl font-bold text-blue-950 mb-2">Welcome</h2>
           <p className="text-slate-500 font-light">Trunk & Soul Logistics Portal</p>
        </div>
        
        <div className="space-y-4">
          <button 
            onClick={() => setView(AppView.CHECK_IN)}
            className="w-full py-5 bg-blue-900 hover:bg-blue-800 text-white rounded-xl shadow-lg shadow-blue-200 transition-all font-semibold text-lg flex items-center justify-center gap-3"
          >
            <span className="text-2xl">📝</span> Staff Check-In
          </button>
          
          <button 
            onClick={() => setView(AppView.ADMIN)}
            className="w-full py-5 bg-white border border-slate-200 text-blue-900 rounded-xl hover:bg-slate-50 transition-all font-semibold text-lg flex items-center justify-center gap-3 shadow-sm"
          >
            <span className="text-2xl">🔍</span> Check My Status
          </button>
        </div>
      </div>

      {/* Simplified Footer */}
      <div className="text-center space-y-2 mt-4">
        <div className="flex justify-center items-center gap-2">
            <span className="h-1 w-1 bg-slate-300 rounded-full"></span>
            <span className="h-1 w-1 bg-slate-300 rounded-full"></span>
            <span className="h-1 w-1 bg-slate-300 rounded-full"></span>
        </div>
        <p className="text-xs text-slate-400 mt-4">Powered by Google Gemini</p>
      </div>
    </div>
  );

  const renderCheckIn = () => (
    <div className="space-y-6" onClick={() => setShowDropdown(false)}>
       <div className="flex items-center gap-2 mb-2">
         <button onClick={() => setView(AppView.HOME)} className="text-slate-400 hover:text-blue-900">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
         </button>
         <h2 className="text-xl font-bold text-blue-900">Staff Check-In</h2>
       </div>

       {/* Admin Controls (Always Visible for Staff) */}
       <div className="bg-slate-800 p-3 rounded-lg flex gap-2 animate-fade-in mb-4">
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="relative flex-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 py-2 rounded flex items-center justify-center gap-2 transition-colors"
          >
             ⚙️ Settings
             {!scriptUrl && <span className="absolute top-1 right-1 h-2 w-2 bg-amber-500 rounded-full"></span>}
          </button>
          <button 
            onClick={handleExportCSV} 
            className="flex-1 text-xs bg-green-700 hover:bg-green-600 text-white py-2 rounded flex items-center justify-center gap-2 transition-colors"
          >
             📄 Export CSV
          </button>
       </div>

       {/* Settings Panel */}
       {showSettings && (
         <div className="bg-white p-4 rounded-xl border-2 border-slate-200 shadow-lg animate-fade-in mb-4">
            <h4 className="font-bold text-slate-700 mb-2 text-sm">Database Configuration</h4>
            <p className="text-xs text-slate-500 mb-3">Paste your Google Apps Script Web App URL below to enable cloud sync.</p>
            <input 
              type="text" 
              value={scriptUrl}
              onChange={(e) => setScriptUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/..."
              className="w-full text-xs border border-slate-300 rounded px-3 py-3 mb-2 font-mono"
            />
            <button onClick={handleSaveSettings} className="w-full bg-blue-900 text-white text-xs px-4 py-3 rounded font-bold">
              Save & Connect
            </button>
         </div>
       )}

       {/* Search */}
       <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative z-20">
          <label className="block text-sm font-semibold text-slate-600 mb-3">Find Existing Driver</label>
          <div className="relative">
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              onClick={(e) => e.stopPropagation()}
              placeholder="Enter ID, Name or Plate..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
            />
            {showDropdown && searchTerm && (
                <div className="absolute w-full mt-2 bg-white border border-slate-100 rounded-xl shadow-xl max-h-60 overflow-y-auto z-30 ring-1 ring-slate-900/5">
                    {filteredDrivers.length === 0 ? (
                        <div className="p-4 text-slate-400 text-sm text-center italic">No drivers found</div>
                    ) : (
                        filteredDrivers.map(d => (
                            <div 
                                key={d.id}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    initiateCheckIn(d);
                                }}
                                className="p-4 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0 transition-colors"
                            >
                                <div className="flex justify-between items-center mb-1">
                                    <span className="font-bold text-blue-900 text-sm">{d.name}</span>
                                    <span className="text-lg bg-white rounded-full p-1 shadow-sm">{getVehicleIcon(d.vehicleType)}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                     <span className="text-slate-500 font-mono tracking-wide">{d.id}</span>
                                     <span className="text-slate-400">{d.licensePlate}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
          </div>
       </div>

       {/* Divider */}
       <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink-0 mx-4 text-slate-300 text-[10px] font-bold tracking-widest uppercase">Or Register New</span>
            <div className="flex-grow border-t border-slate-200"></div>
       </div>

       {/* Register */}
       <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Driver Name</label>
            <input 
              type="text" 
              value={registerName}
              onChange={(e) => setRegisterName(e.target.value)}
              placeholder="e.g. Somchai Jaidee"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-blue-400 focus:bg-white transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">License Plate</label>
            <input 
              type="text" 
              value={registerPlate}
              onChange={(e) => setRegisterPlate(e.target.value)}
              placeholder="e.g. Chiang Mai 8899"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-blue-400 focus:bg-white transition-all"
            />
          </div>
          <div>
             <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Vehicle Type</label>
             <div className="grid grid-cols-2 gap-3">
                 <button
                    onClick={() => setRegisterVehicleType('taxi')}
                    className={`py-3 rounded-lg border text-sm font-semibold transition-all ${registerVehicleType === 'taxi' ? 'bg-sky-50 border-sky-400 text-sky-700' : 'bg-slate-50 border-slate-200 text-slate-400'}`}
                 >
                    🚕 Taxi
                 </button>
                 <button
                    onClick={() => setRegisterVehicleType('van')}
                    className={`py-3 rounded-lg border text-sm font-semibold transition-all ${registerVehicleType === 'van' ? 'bg-sky-50 border-sky-400 text-sky-700' : 'bg-slate-50 border-slate-200 text-slate-400'}`}
                 >
                    🚐 Van
                 </button>
             </div>
          </div>
          <button 
            onClick={initiateRegister}
            disabled={loading}
            className="w-full bg-blue-900 hover:bg-blue-800 text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-900/10 disabled:opacity-50 transition-all mt-2"
          >
            Review & Register
          </button>
       </div>
    </div>
  );

  const renderConfirmRegister = () => (
      <div className="space-y-6">
        <button onClick={() => setView(AppView.CHECK_IN)} className="text-sm text-slate-500 hover:text-blue-900 flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Edit Details
        </button>

        <div className="bg-white rounded-2xl shadow-xl shadow-blue-900/5 overflow-hidden">
             <div className="bg-emerald-600 p-6 text-white text-center">
                <h2 className="text-xl font-bold">New Registration</h2>
                <p className="text-emerald-100 text-sm mt-1">Please confirm driver details</p>
            </div>
            
            <div className="p-6 space-y-6">
                 <div className="flex flex-col items-center justify-center p-4">
                     <div className="bg-slate-50 h-24 w-24 rounded-full flex items-center justify-center text-5xl mb-4 border border-slate-100">
                        {getVehicleIcon(registerVehicleType)}
                     </div>
                     <h3 className="text-2xl font-bold text-slate-800 text-center">{registerName}</h3>
                     <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-sm font-mono mt-2">{registerPlate}</span>
                 </div>

                 <div className="bg-slate-50 p-4 rounded-xl text-center text-xs text-slate-500">
                     <p>A new ID will be automatically generated.</p>
                     <p>Initial Trip Count: 0</p>
                 </div>

                 <button 
                    onClick={finalizeRegister}
                    disabled={loading}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-emerald-200 transition-all"
                >
                    {loading ? 'Creating...' : 'Confirm Registration'}
                </button>
            </div>
        </div>
      </div>
  );

  const renderConfirmCheckIn = () => {
    if (!pendingDriver) return <div>Error: No driver selected</div>;
    return (
      <div className="space-y-6">
        <button onClick={() => setView(AppView.CHECK_IN)} className="text-sm text-slate-500 hover:text-blue-900 flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Cancel
        </button>
        
        <div className="bg-white rounded-2xl shadow-xl shadow-blue-900/5 overflow-hidden">
            <div className="bg-blue-900 p-6 text-white text-center">
                <h2 className="text-xl font-bold">Confirm Trip</h2>
                <p className="text-blue-200 text-sm mt-1">Verify details before recording</p>
            </div>
            
            <div className="p-6 space-y-8">
                {/* Driver Info */}
                <div className="flex items-center gap-5">
                    <div className="bg-sky-50 h-16 w-16 rounded-2xl flex items-center justify-center text-3xl shadow-inner">
                        {getVehicleIcon(pendingDriver.vehicleType) || '🐘'}
                    </div>
                    <div>
                        <p className="font-bold text-xl text-slate-800">{pendingDriver.name}</p>
                        <p className="text-slate-500">{pendingDriver.licensePlate}</p>
                    </div>
                </div>

                {/* Streak Calculation */}
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 p-5 rounded-xl flex justify-between items-center">
                    <div>
                        <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Total Trips</p>
                        <p className="text-sm text-amber-800/60 mt-0.5">Adding +1 today</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-3xl font-bold text-slate-300">{pendingDriver.totalCheckIns}</span>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-amber-400">
                             <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                        <span className="text-4xl font-bold text-amber-500">{pendingDriver.totalCheckIns + 1}</span>
                    </div>
                </div>

                {/* Vehicle Type Selection */}
                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Vehicle Type</label>
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => setCheckInVehicleType('taxi')}
                            className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${
                                checkInVehicleType === 'taxi' 
                                ? 'border-sky-500 bg-sky-50 text-sky-700 font-bold shadow-sm' 
                                : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200'
                            }`}
                        >
                            <span className="text-2xl">🚕</span> 
                            <span className="text-sm">Taxi</span>
                        </button>
                        <button
                            onClick={() => setCheckInVehicleType('van')}
                            className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${
                                checkInVehicleType === 'van' 
                                ? 'border-sky-500 bg-sky-50 text-sky-700 font-bold shadow-sm' 
                                : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200'
                            }`}
                        >
                            <span className="text-2xl">🚐</span> 
                            <span className="text-sm">Van</span>
                        </button>
                    </div>
                </div>

                {/* Date Time Picker */}
                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Date & Time</label>
                    <input 
                        type="datetime-local" 
                        value={checkInDateTime}
                        onChange={(e) => setCheckInDateTime(e.target.value)}
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-slate-700 focus:border-blue-400 focus:bg-white outline-none transition-all"
                    />
                </div>

                <button 
                    onClick={processCheckIn}
                    disabled={loading}
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-green-200 transition-all flex justify-center items-center gap-2"
                >
                    {loading ? 'Saving...' : 'Confirm Check-In'}
                </button>
            </div>
        </div>
      </div>
    );
  };

  const renderStatus = () => {
    if (!currentDriver) return <div>No driver loaded</div>;
    return (
      <div className="space-y-6">
        <button onClick={() => {
            setAiMessage('');
            setView(AppView.HOME);
        }} className="text-sm text-slate-500 hover:text-blue-900 flex items-center gap-1">
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Home
        </button>
        
        {aiMessage && (
            <div className="bg-gradient-to-r from-blue-900 to-indigo-900 p-[2px] rounded-2xl shadow-xl animate-fade-in-up">
                <div className="bg-white rounded-[14px] p-5 text-center">
                    <p className="text-indigo-600 font-bold text-xs uppercase tracking-widest mb-2">✨ Message from Trunk & Soul</p>
                    <p className="text-slate-800 text-lg font-light leading-relaxed">"{aiMessage}"</p>
                </div>
            </div>
        )}

        <DriverCard driver={currentDriver} />
        
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <span className="bg-blue-100 text-blue-600 p-1 rounded">📅</span> Recent History
            </h4>
            <div className="max-h-60 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {currentDriver.history.length === 0 && <p className="text-sm text-slate-400 italic">No history recorded yet.</p>}
                {currentDriver.history.map((record, idx) => (
                    <div key={record.id} className="flex justify-between items-center text-sm p-3 bg-slate-50 rounded-lg">
                        <div className="flex flex-col">
                            <span className="font-semibold text-slate-700">{new Date(record.timestamp).toLocaleDateString(undefined, {weekday: 'short', day: 'numeric', month: 'short'})}</span>
                            <span className="text-xs text-slate-400">Trip #{currentDriver.history.length - idx}</span>
                        </div>
                        <span className="font-mono text-slate-600 bg-white px-2 py-1 rounded border border-slate-100">
                            {new Date(record.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                    </div>
                ))}
            </div>
        </div>
      </div>
    );
  };

  const renderAdmin = () => (
      <div className="space-y-6" onClick={() => setShowDropdown(false)}>
           <div className="flex items-center gap-2 mb-2">
             <button onClick={() => setView(AppView.HOME)} className="text-slate-400 hover:text-blue-900">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
             </button>
             <h2 className="text-xl font-bold text-blue-900">Check Status</h2>
           </div>
           
           {/* Lookup Field */}
           <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative z-20">
                <label className="block text-sm font-semibold text-slate-600 mb-3">Lookup Driver</label>
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="Search by ID or Name..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
                />
                {showDropdown && searchTerm && (
                    <div className="absolute w-full mt-2 bg-white border border-slate-100 rounded-xl shadow-xl max-h-60 overflow-y-auto z-30 ring-1 ring-slate-900/5">
                        {drivers.filter(d => 
                          d.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          d.licensePlate.toLowerCase().includes(searchTerm.toLowerCase())
                        ).map(d => (
                            <div 
                                key={d.id}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleLookup(d.id);
                                }}
                                className="p-4 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0 transition-colors"
                            >
                                <div className="flex justify-between items-center">
                                    <span className="font-bold text-blue-900 text-sm">[{d.id}] {d.name}</span>
                                    <span className="text-lg">{getVehicleIcon(d.vehicleType)}</span>
                                </div>
                                <p className="text-xs text-slate-500 mt-1">{d.licensePlate}</p>
                            </div>
                        ))}
                    </div>
                )}
           </div>

          {/* Directory List */}
          <div className="mt-8">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 px-1">Registered Drivers</h3>
            <div className="space-y-3">
                {drivers.map(d => (
                    <div 
                        key={d.id} 
                        onClick={() => {
                            setCurrentDriver(d);
                            setView(AppView.STATUS);
                        }}
                        className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex justify-between items-center cursor-pointer hover:border-blue-300 transition-all group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="bg-slate-50 h-10 w-10 rounded-full flex items-center justify-center text-lg group-hover:bg-blue-50 transition-colors">
                                {getVehicleIcon(d.vehicleType)}
                            </div>
                            <div>
                                <p className="font-bold text-blue-900 text-sm">
                                    {d.name}
                                </p>
                                <p className="text-xs text-slate-400">{d.licensePlate}</p>
                            </div>
                        </div>
                        <div className="text-right">
                             <span className="bg-sky-50 text-sky-700 text-xs px-3 py-1 rounded-full font-bold border border-sky-100">{d.totalCheckIns} Trips</span>
                        </div>
                    </div>
                ))}
            </div>
          </div>
      </div>
  );

  return (
    <Layout currentView={view} setView={setView}>
      {view === AppView.HOME && renderHome()}
      {view === AppView.CHECK_IN && renderCheckIn()}
      {view === AppView.CONFIRM_CHECK_IN && renderConfirmCheckIn()}
      {view === AppView.CONFIRM_REGISTER && renderConfirmRegister()}
      {view === AppView.STATUS && renderStatus()}
      {view === AppView.ADMIN && renderAdmin()}
    </Layout>
  );
};

export default App;