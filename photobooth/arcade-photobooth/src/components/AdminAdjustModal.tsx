import React, { useState } from 'react';
import { Save, X, Lock, Move, ZoomIn } from 'lucide-react';

export default function AdminAdjustModal({ isOpen, onClose, onSave, photos, frameConfig, currentSettings }: any) {
  const [pin, setPin] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Local state untuk adjustment sementara
  const [settings, setSettings] = useState(currentSettings || { x: 0, y: 0, scale: 1 });

  if (!isOpen) return null;

  // --- LOGIKA LOGIN SEDERHANA ---
  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4">
        <div className="bg-gray-900 p-6 rounded-2xl border border-[--neon-pink] text-center w-full max-w-sm">
          <Lock className="mx-auto text-[--neon-pink] mb-4" size={32}/>
          <h2 className="text-white font-bold mb-4">ADMIN ADJUSTMENT</h2>
          <input 
            type="password" 
            autoFocus
            className="w-full bg-black border border-gray-700 p-3 text-center text-white rounded-lg mb-4 text-xl tracking-widest"
            placeholder="PIN"
            value={pin}
            onChange={(e) => {
                setPin(e.target.value);
                if (e.target.value === '1234') setIsAuthenticated(true); // Auto login jika benar
            }}
          />
          <button onClick={onClose} className="text-gray-500 text-sm hover:text-white">Cancel</button>
        </div>
      </div>
    );
  }

  // --- LOGIKA EDITOR ---
  return (
    <div className="fixed inset-0 z-[9999] bg-black/95 flex flex-col md:flex-row p-4 gap-4">
      
      {/* PANEL KONTROL (KIRI/BAWAH) */}
      <div className="w-full md:w-1/3 bg-gray-900 p-6 rounded-xl border border-gray-700 flex flex-col justify-center order-2 md:order-1">
        <h2 className="text-xl font-bold text-[--neon-cyan] mb-6 flex items-center gap-2">
            <Move size={20}/> ADJUST POSITION
        </h2>

        <div className="space-y-6">
            <div>
                <div className="flex justify-between mb-2">
                    <label className="text-xs font-bold text-[--neon-yellow] flex items-center gap-2"><ZoomIn size={14}/> ZOOM</label>
                    <span className="text-xs font-mono">{settings.scale.toFixed(2)}x</span>
                </div>
                <input 
                    type="range" min="1" max="2" step="0.01" 
                    value={settings.scale} 
                    onChange={e => setSettings({...settings, scale: parseFloat(e.target.value)})} 
                    className="w-full accent-[--neon-yellow] h-2 bg-gray-700 rounded-lg cursor-pointer" 
                />
            </div>

            <div>
                <div className="flex justify-between mb-2">
                    <label className="text-xs font-bold text-[--neon-pink]">POSISI X (KIRI-KANAN)</label>
                    <span className="text-xs font-mono">{settings.x}px</span>
                </div>
                <input 
                    type="range" min="-200" max="200" 
                    value={settings.x} 
                    onChange={e => setSettings({...settings, x: parseInt(e.target.value)})} 
                    className="w-full accent-[--neon-pink] h-2 bg-gray-700 rounded-lg cursor-pointer" 
                />
            </div>

            <div>
                <div className="flex justify-between mb-2">
                    <label className="text-xs font-bold text-[--neon-cyan]">POSISI Y (ATAS-BAWAH)</label>
                    <span className="text-xs font-mono">{settings.y}px</span>
                </div>
                <input 
                    type="range" min="-200" max="200" 
                    value={settings.y} 
                    onChange={e => setSettings({...settings, y: parseInt(e.target.value)})} 
                    className="w-full accent-[--neon-cyan] h-2 bg-gray-700 rounded-lg cursor-pointer" 
                />
            </div>
        </div>

        <div className="mt-8 flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 bg-gray-800 rounded-lg font-bold text-gray-400 hover:bg-gray-700">BATAL</button>
            <button 
                onClick={() => onSave(settings)} 
                className="flex-[2] py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg flex justify-center items-center gap-2"
            >
                <Save size={20}/> TERAPKAN & LANJUT
            </button>
        </div>
      </div>

      {/* PREVIEW AREA (KANAN/ATAS) */}
      <div className="flex-1 flex items-center justify-center bg-gray-800 rounded-xl border border-gray-700 p-4 order-1 md:order-2 overflow-hidden">
         {/* Simulasi Strip */}
         <div className="relative w-[300px] h-auto bg-white p-2 shadow-2xl scale-75 md:scale-100 origin-center transition-all">
            <div className={`grid ${frameConfig.gridClass} w-full h-full gap-2`}>
                {photos.map((src: string, i: number) => (
                    <div key={i} className="relative w-full aspect-square overflow-hidden border border-gray-300 bg-gray-200">
                        <img 
                            src={src} 
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-75"
                            style={{
                                transform: `scaleX(-1) translate(${settings.x * -1}px, ${settings.y}px) scale(${settings.scale})`
                            }}
                        />
                    </div>
                ))}
            </div>
         </div>
      </div>

    </div>
  );
}