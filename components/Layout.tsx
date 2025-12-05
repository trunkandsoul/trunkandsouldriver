import React from 'react';
import { AppView } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  setView: (view: AppView) => void;
  currentView: AppView;
}

const Layout: React.FC<LayoutProps> = ({ children, setView, currentView }) => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-blue-900 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-md mx-auto px-4 py-4 flex justify-between items-center">
          <div 
            className="cursor-pointer" 
            onClick={() => setView(AppView.HOME)}
          >
            <h1 className="text-xl font-bold tracking-wide">Trunk & Soul</h1>
            <p className="text-xs text-sky-300">Elephant Home Logistics</p>
          </div>
          <nav className="flex space-x-2">
            <button
              onClick={() => setView(AppView.HOME)}
              className={`p-2 rounded-full transition-colors ${currentView === AppView.HOME ? 'bg-sky-500 text-white' : 'text-slate-300 hover:text-white'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-md w-full mx-auto p-4 space-y-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-slate-100 py-6 text-center text-slate-400 text-sm">
        <p>© {new Date().getFullYear()} Trunk & Soul Elephant Home</p>
        <p>trunkandsoul.com</p>
      </footer>
    </div>
  );
};

export default Layout;