import React, { useState, useEffect, useMemo } from 'react';
import Layout from './components/Layout';
import DriverCard from './components/DriverCard';
import { AppView, Driver } from './types';
import { getDriverById, addCheckIn, createDriver, getAllDrivers } from './services/storage';
import { generateWelcomeMessage } from './services/gemini';

// Helper to format Date for datetime-local input (YYYY-MM-DDThh:mm)
const getLocalDateTimeForInput = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
};

// Helper for vehicle icon
const getVehicleIcon = (type?: 'taxi' | 'van') => {
  if (type === 'taxi') return '🚕';
  if (type === 'van') return '🚐';
  return '';
};

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.HOME);
  const [currentDriver, setCurrentDriver] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState<string>('');
  
  // Check-in Process State
  const [pendingDriver, setPendingDriver] = useState<Driver | null>(null);
  const [checkInDateTime, setCheckInDateTime] = useState<string>('');
  const [checkInVehicleType, setCheckInVehicleType] = useState<'taxi' | 'van'>('van');
  
  // Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  
  // Form States for Registration
  const [newName, setNewName] = useState('');
  const [newPlate, setNewPlate] = useState('');

  // Filtered Drivers for Search
  const filteredDrivers = useMemo(() => {
    if (!searchTerm) return [];
    const lowerTerm = searchTerm.toLowerCase();
    return getAllDrivers().filter(d => 
      d.id.toLowerCase().includes(lowerTerm) ||
      d.name.toLowerCase().includes(lowerTerm) ||
      d.licensePlate.toLowerCase().includes(lowerTerm)
    );
  }, [searchTerm]);

  // Handle Driver Lookup (Admin/Direct)
  const handleLookup = (id: string) => {
    setLoading(true);
    // Simulate delay for feel
    setTimeout(() => {
        const driver = getDriverById(id);
        if (driver) {
            setCurrentDriver(driver);
            setView(AppView.STATUS);
            setSearchTerm('');
            setShowDropdown(false);
        } else {
            alert("Driver ID not found.");
        }
        setLoading(false);
    }, 300);
  };

  // Step 1: Initiate Check In (Find Driver -> Go to Confirm)
  const initiateCheckIn = (driver: Driver) => {
    setLoading(true);
    setPendingDriver(driver);
    setCheckInDateTime(getLocalDateTimeForInput());
    setCheckInVehicleType(driver.vehicleType || 'van'); // Default to existing or Van
    setSearchTerm(''); // Clear search
    setShowDropdown(false);
    setView(AppView.CONFIRM_CHECK_IN);
    setLoading(false);
  };

  // Step 2: Finalize Check In (Save to Storage)
  const processCheckIn = async () => {
    if (!pendingDriver) return;
    
    setLoading(true);
    
    // Save with the selected date/time and vehicle type
    const updated = addCheckIn(pendingDriver.id, checkInDateTime, checkInVehicleType);
    
    if (updated) {
        setCurrentDriver(updated);
        setPendingDriver(null);
        
        // Call Gemini for message
        const message = await generateWelcomeMessage(updated.name, updated.totalCheckIns);
        setAiMessage(message);
        
        setView(AppView.STATUS);
    } else {
        alert("Error processing check-in.");
    }
    setLoading(false);
  };

  const handleRegister = () => {
    if (!newName || !newPlate) {
        alert("Please fill in all fields");
        return;
    }
    const newDriver = createDriver(newName, newPlate);
    setCurrentDriver(newDriver);
    setView(AppView.STATUS);
    setNewName('');
    setNewPlate('');
  };

  const handleExportCSV = () => {
    const drivers = getAllDrivers();
    // Create CSV Rows
    const rows = [
      ['ID', 'Name', 'License Plate', 'Vehicle Type', 'Total Trips', 'Last Check-In']
    ];
    
    drivers.forEach(d => {
        rows.push([
            d.id,
            `"${d.name}"`, // Quote strings to handle potential commas
            `"${d.licensePlate}"`,
            d.vehicleType || 'van',
            d.totalCheckIns.toString(),
            d.lastCheckIn
        ]);
    });

    // Join with commas and newlines
    // Add BOM for Excel compatibility with Thai characters
    const csvContent = "\uFEFF" + rows.map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `trunk_soul_drivers_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Views Configuration
  const renderHome = () => (
    <div className="grid gap-6">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center space-y-6">
        <h2 className="text-2xl font-bold text-blue-900">Welcome</h2>
        <p className="text-slate-500">Select an option to proceed</p>
        
        <button 
          onClick={() => setView(AppView.CHECK_IN)}
          className="w-full py-4 bg-sky-500 hover:bg-sky-600 text-white rounded-xl shadow-lg shadow-sky-200 transition-all font-semibold text-lg flex items-center justify-center gap-2"
        >
          <span>📋</span> Staff Check-In
        </button>
        
        <button 
          onClick={() => setView(AppView.ADMIN)}
          className="w-full py-4 bg-white border-2 border-blue-900 text-blue-900 rounded-xl hover:bg-blue-50 transition-all font-semibold text-lg flex items-center justify-center gap-2"
        >
          <span>🔍</span> Check Status / Admin
        </button>
      </div>

      <div className="text-center">
        <p className="text-xs text-slate-400">Powered by Google Gemini</p>
      </div>
    </div>
  );

  const renderCheckIn = () => (
    <div className="space-y-6" onClick={() => setShowDropdown(false)}>
       <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-blue-900">Staff Check-In</h2>
       </div>

       {/* Smart Search Input */}
       <div className="bg-white p-6 rounded-2xl shadow-sm relative z-20">
          <label className="block text-sm font-medium text-slate-700 mb-2">Find Driver (ID, Name, Plate)</label>
          <div className="relative">
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              onClick={(e) => e.stopPropagation()} // Prevent closing when clicking input
              placeholder="Type to search..."
              className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-sky-500 outline-none"
            />
            {/* Search Dropdown */}
            {showDropdown && searchTerm && (
                <div className="absolute w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto z-30">
                    {filteredDrivers.length === 0 ? (
                        <div className="p-3 text-slate-400 text-sm text-center">No drivers found</div>
                    ) : (
                        filteredDrivers.map(d => (
                            <div 
                                key={d.id}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    initiateCheckIn(d);
                                }}
                                className="p-3 hover:bg-sky-50 cursor-pointer border-b border-slate-50 last:border-0"
                            >
                                <div className="flex justify-between items-center">
                                    <span className="font-bold text-blue-900">[{d.id}] {d.name}</span>
                                    <span className="text-lg">{getVehicleIcon(d.vehicleType)}</span>
                                </div>
                                <p className="text-xs text-slate-500">{d.licensePlate}</p>
                            </div>
                        ))
                    )}
                </div>
            )}
          </div>
       </div>

       <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink-0 mx-4 text-slate-400 text-xs">OR NEW DRIVER</span>
            <div className="flex-grow border-t border-slate-200"></div>
       </div>

       {/* Register New */}
       <div className="bg-white p-6 rounded-2xl shadow-sm space-y-4">
          <h3 className="font-semibold text-slate-800">Register New Driver</h3>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name</label>
            <input 
              type="text" 
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-4 py-2 outline-none focus:border-sky-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">License Plate</label>
            <input 
              type="text" 
              value={newPlate}
              onChange={(e) => setNewPlate(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-4 py-2 outline-none focus:border-sky-500"
            />
          </div>
          <button 
            onClick={handleRegister}
            className="w-full bg-blue-900 text-white py-3 rounded-xl font-semibold shadow-lg shadow-blue-900/20"
          >
            Create Driver
          </button>
       </div>
    </div>
  );

  const renderConfirmCheckIn = () => {
    if (!pendingDriver) return <div>Error: No driver selected</div>;
    return (
      <div className="space-y-6">
        <button onClick={() => setView(AppView.CHECK_IN)} className="text-sm text-slate-500 hover:text-blue-900">← Back</button>
        
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-blue-900 p-4 text-white text-center">
                <h2 className="text-xl font-bold">Confirm Check-In</h2>
                <p className="text-blue-200 text-sm">Please review details</p>
            </div>
            
            <div className="p-6 space-y-6">
                {/* Driver Info */}
                <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
                    <div className="bg-sky-100 p-3 rounded-full text-2xl">
                        {getVehicleIcon(pendingDriver.vehicleType) || '🐘'}
                    </div>
                    <div>
                        <p className="font-bold text-lg text-slate-800">{pendingDriver.name}</p>
                        <p className="text-slate-500 text-sm">{pendingDriver.licensePlate}</p>
                        <p className="text-xs text-slate-400 mt-1">ID: {pendingDriver.id}</p>
                    </div>
                </div>

                {/* Streak Calculation */}
                <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex justify-between items-center">
                    <div>
                        <p className="text-xs font-bold text-amber-600 uppercase">Current Streak</p>
                        <p className="text-sm text-amber-700">Before this trip</p>
                    </div>
                    <div className="text-right">
                        <span className="text-3xl font-bold text-slate-400">{pendingDriver.totalCheckIns}</span>
                        <span className="text-2xl mx-2 text-slate-300">➜</span>
                        <span className="text-3xl font-bold text-green-600">{pendingDriver.totalCheckIns + 1}</span>
                    </div>
                </div>

                {/* Vehicle Type Selection */}
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Vehicle Type</label>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => setCheckInVehicleType('taxi')}
                            className={`p-3 rounded-xl border-2 flex items-center justify-center gap-2 transition-all ${
                                checkInVehicleType === 'taxi' 
                                ? 'border-sky-500 bg-sky-50 text-sky-700 font-bold' 
                                : 'border-slate-200 text-slate-500 hover:border-slate-300'
                            }`}
                        >
                            <span className="text-xl">🚕</span> Taxi
                        </button>
                        <button
                            onClick={() => setCheckInVehicleType('van')}
                            className={`p-3 rounded-xl border-2 flex items-center justify-center gap-2 transition-all ${
                                checkInVehicleType === 'van' 
                                ? 'border-sky-500 bg-sky-50 text-sky-700 font-bold' 
                                : 'border-slate-200 text-slate-500 hover:border-slate-300'
                            }`}
                        >
                            <span className="text-xl">🚐</span> Van
                        </button>
                    </div>
                </div>

                {/* Date Time Picker */}
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Check-In Time</label>
                    <input 
                        type="datetime-local" 
                        value={checkInDateTime}
                        onChange={(e) => setCheckInDateTime(e.target.value)}
                        className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-lg focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none"
                    />
                </div>

                <button 
                    onClick={processCheckIn}
                    disabled={loading}
                    className="w-full bg-green-500 hover:bg-green-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-green-200 transition-all flex justify-center items-center gap-2"
                >
                    {loading ? 'Processing...' : 'Confirm Check-In'}
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
        }} className="text-sm text-slate-500 hover:text-blue-900">← Back to Menu</button>
        
        {aiMessage && (
            <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-[1px] rounded-xl shadow-lg animate-fade-in-up">
                <div className="bg-white rounded-[11px] p-4 text-center">
                    <p className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-pink-600 font-bold text-sm mb-1">✨ Message from Trunk & Soul AI</p>
                    <p className="text-slate-800 italic">"{aiMessage}"</p>
                </div>
            </div>
        )}

        <DriverCard driver={currentDriver} />
        
        <div className="bg-sky-50 p-4 rounded-xl border border-sky-100">
            <h4 className="font-bold text-sky-800 mb-2">Check-in History</h4>
            <div className="max-h-48 overflow-y-auto space-y-2">
                {currentDriver.history.length === 0 && <p className="text-xs text-slate-400">No history yet.</p>}
                {currentDriver.history.map((record) => (
                    <div key={record.id} className="flex justify-between text-sm text-slate-600 border-b border-sky-100 pb-2 last:border-0">
                        <span>{new Date(record.timestamp).toLocaleDateString()}</span>
                        <span>{new Date(record.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                ))}
            </div>
        </div>
      </div>
    );
  };

  const renderAdmin = () => (
      <div className="space-y-6" onClick={() => setShowDropdown(false)}>
           <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-blue-900">Driver Lookup</h2>
              <button 
                onClick={handleExportCSV} 
                className="text-sm bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-sm transition-colors"
              >
                 📄 Export CSV
              </button>
           </div>
           
           {/* Admin Search */}
           <div className="relative z-20">
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="Search ID, Name, Plate..."
                  className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-sky-500 outline-none"
                />
                {showDropdown && searchTerm && (
                    <div className="absolute w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto z-30">
                        {filteredDrivers.length === 0 ? (
                            <div className="p-3 text-slate-400 text-sm text-center">No drivers found</div>
                        ) : (
                            filteredDrivers.map(d => (
                                <div 
                                    key={d.id}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleLookup(d.id);
                                    }}
                                    className="p-3 hover:bg-sky-50 cursor-pointer border-b border-slate-50 last:border-0"
                                >
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold text-blue-900">[{d.id}] {d.name}</span>
                                        <span className="text-lg">{getVehicleIcon(d.vehicleType)}</span>
                                    </div>
                                    <p className="text-xs text-slate-500">{d.licensePlate}</p>
                                </div>
                            ))
                        )}
                    </div>
                )}
           </div>

          <div className="mt-8">
            <h3 className="text-sm font-bold text-slate-400 uppercase mb-4">All Drivers ({getAllDrivers().length})</h3>
            <div className="space-y-2">
                {getAllDrivers().map(d => (
                    <div 
                        key={d.id} 
                        onClick={() => {
                            setCurrentDriver(d);
                            setView(AppView.STATUS);
                        }}
                        className="bg-white p-3 rounded-lg shadow-sm border border-slate-100 flex justify-between items-center cursor-pointer hover:border-sky-300"
                    >
                        <div>
                            <p className="font-semibold text-blue-900">
                                {d.name} <span className="text-sm">{getVehicleIcon(d.vehicleType)}</span>
                            </p>
                            <p className="text-xs text-slate-500">{d.licensePlate}</p>
                        </div>
                        <div className="text-right">
                             <span className="bg-sky-100 text-sky-700 text-xs px-2 py-1 rounded-full font-bold">{d.totalCheckIns} Trips</span>
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
      {view === AppView.STATUS && renderStatus()}
      {view === AppView.ADMIN && renderAdmin()}
    </Layout>
  );
};

export default App;