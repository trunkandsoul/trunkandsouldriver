import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface ScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

const Scanner: React.FC<ScannerProps> = ({ onScan, onClose }) => {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    // Small timeout to ensure DOM is ready
    const timer = setTimeout(() => {
        const scanner = new Html5QrcodeScanner(
            "reader",
            { fps: 10, qrbox: { width: 250, height: 250 } },
            /* verbose= */ false
        );
        scannerRef.current = scanner;

        scanner.render(
            (decodedText) => {
                scanner.clear();
                onScan(decodedText);
            },
            (errorMessage) => {
                // parse error, ignore it.
            }
        );
    }, 100);

    return () => {
        clearTimeout(timer);
        if (scannerRef.current) {
            scannerRef.current.clear().catch(error => console.error("Failed to clear scanner", error));
        }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-[60] bg-black bg-opacity-90 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-xl p-4 w-full max-w-sm relative">
        <button 
            onClick={onClose}
            className="absolute -top-10 right-0 text-white font-bold p-2"
        >
            Close X
        </button>
        <h3 className="text-center font-bold text-blue-900 mb-4">Scan Driver QR</h3>
        <div id="reader" className="w-full h-64 bg-slate-200 rounded-lg overflow-hidden"></div>
        <p className="text-center text-xs text-gray-500 mt-4">Point camera at QR code</p>
      </div>
    </div>
  );
};

export default Scanner;