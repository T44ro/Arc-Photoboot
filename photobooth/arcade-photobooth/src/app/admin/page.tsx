"use client";
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Save, Lock, LogOut, Image as ImageIcon, Hand, Eye, EyeOff } from 'lucide-react';

// --- DEFINISI LAYOUT AGAR SINKRON DENGAN HALAMAN DEPAN ---
const STRIP_LAYOUTS = [
  { id: 'strip-3', label: '3 POSE STRIP (16:9)', photoCount: 3 },
  { id: 'strip-4', label: '4 POSE STRIP (16:9)', photoCount: 4 },
];

const DUMMY_PHOTOS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=500&q=80",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=500&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=500&q=80",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=500&q=80",
];

// --- KONSTANTA DIMENSI (RASIO 16:9 DALAM STRIP 1:3) ---
const CANVAS_WIDTH = 300; 
const CANVAS_HEIGHT = 900; // Rasio 1:3

const PHOTO_WIDTH = 250; 
const PHOTO_HEIGHT = 141; // 16:9 Landscape (250 * 9/16)
const GAP = 10;

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  
  // Default ke Layout 3 Pose
  const [selectedLayout, setSelectedLayout] = useState(STRIP_LAYOUTS[0]);
  const [uploadedFrameLayer, setUploadedFrameLayer] = useState<string | null>(null);
  const [frameOpacity, setFrameOpacity] = useState(0.8);
  
  const [adjustments, setAdjustments] = useState<any[]>(
    Array(3).fill({ x: 0, y: 0, scale: 1, rotation: 0 })
  );
  
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === '1234') setIsAuthenticated(true);
    else alert('PIN Salah!');
  };

  // Load Settings saat layout berubah
  useEffect(() => {
    if (isAuthenticated) fetchSettings();
  }, [isAuthenticated, selectedLayout.id]);

  const fetchSettings = async () => {
    try {
        const res = await fetch('/api/admin/settings');
        const data = await res.json();
        // Cek ID yang benar (strip-3 / strip-4)
        if (data.success && data.settings && Array.isArray(data.settings[selectedLayout.id])) {
            setAdjustments(data.settings[selectedLayout.id]);
        } else {
            resetAdjustments();
        }
    } catch (e) { resetAdjustments(); }
  };

  const resetAdjustments = () => {
      setAdjustments(Array(selectedLayout.photoCount).fill({ x: 0, y: 0, scale: 1, rotation: 0 }));
  };

  const saveSettings = async () => {
      try {
          await fetch('/api/admin/settings', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              // Simpan dengan ID yang benar agar bisa dibaca di halaman depan
              body: JSON.stringify({ frameId: selectedLayout.id, settings: adjustments }),
          });
          alert(`✅ Setting tersimpan untuk ${selectedLayout.label}!`);
      } catch (e) { alert("❌ Gagal menyimpan."); }
  };

  // --- HANDLER POSISI ---
  const handleAdjChange = (key: string, value: number) => {
      if (!Array.isArray(adjustments)) return;
      const newAdjs = [...adjustments];
      if (!newAdjs[selectedIdx]) newAdjs[selectedIdx] = { x: 0, y: 0, scale: 1, rotation: 0 };
      newAdjs[selectedIdx] = { ...newAdjs[selectedIdx], [key]: value };
      setAdjustments(newAdjs);
  };

  const handleWheel = (e: React.WheelEvent, index: number) => {
      e.preventDefault(); e.stopPropagation();
      if (selectedIdx !== index) setSelectedIdx(index);
      const current = (adjustments && adjustments[index]) || { x: 0, y: 0, scale: 1 };
      let newScale = current.scale - (e.deltaY * 0.001);
      newScale = Math.min(Math.max(newScale, 0.5), 3.0);
      handleAdjChange('scale', newScale);
  };

  const handlePointerDown = (e: React.PointerEvent, index: number) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      setSelectedIdx(index);
      setIsDragging(true);
      dragStartPos.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent, index: number) => {
      if (!isDragging || selectedIdx !== index) return;
      if (!Array.isArray(adjustments)) return;
      e.preventDefault();
      const dx = e.clientX - dragStartPos.current.x;
      const dy = e.clientY - dragStartPos.current.y;
      const current = adjustments[index] || { x: 0, y: 0, scale: 1 };
      const newAdjs = [...adjustments];
      newAdjs[index] = { ...current, x: current.x + dx, y: current.y + dy };
      setAdjustments(newAdjs);
      dragStartPos.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: React.PointerEvent) => {
      setIsDragging(false);
      e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const getContainerStyle = (idx: number) => {
      // Hitung posisi vertikal default (Center Gravity Logic)
      // Ini memastikan foto berada di tengah-tengah strip 1:3 secara vertikal
      const totalContentHeight = (PHOTO_HEIGHT * selectedLayout.photoCount) + (GAP * (selectedLayout.photoCount - 1));
      const startY = (CANVAS_HEIGHT - totalContentHeight) / 2;
      
      const defaultTop = startY + (idx * (PHOTO_HEIGHT + GAP));
      const defaultLeft = (CANVAS_WIDTH - PHOTO_WIDTH) / 2; // Center Horizontal

      const adj = (adjustments && adjustments[idx]) || { x: 0, y: 0, scale: 1, rotation: 0 };
      
      return {
          position: 'absolute' as const,
          top: defaultTop, 
          left: defaultLeft,
          width: PHOTO_WIDTH,     // LEBAR 250px
          height: PHOTO_HEIGHT,   // TINGGI 141px (16:9)
          zIndex: selectedIdx === idx ? 20 : 10,
          transform: `translate(${adj.x}px, ${adj.y}px) scale(${adj.scale}) rotate(${adj.rotation || 0}deg)`,
          border: selectedIdx === idx ? '3px solid var(--neon-pink)' : '1px dashed #444',
          boxShadow: selectedIdx === idx ? '0 0 20px var(--neon-pink)' : 'none',
          cursor: isDragging ? 'grabbing' : 'grab', 
          overflow: 'visible',
          touchAction: 'none'
      };
  };

  const handleFrameUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            setUploadedFrameLayer(reader.result as string);
            setFrameOpacity(0.8);
        };
        reader.readAsDataURL(file);
    }
  };

  if (!isAuthenticated) return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-gray-900 p-8 rounded-xl border border-white text-center">
          <Lock className="mx-auto mb-4 text-[--neon-pink]"/>
          <input type="password" placeholder="PIN (1234)" value={pin} onChange={(e) => setPin(e.target.value)} className="w-full p-2 mb-4 text-black rounded text-center" />
          <button type="submit" className="bg-white text-black font-bold py-2 px-4 rounded w-full">LOGIN</button>
        </form>
      </div>
  );

  const currentAdj = (adjustments && adjustments[selectedIdx]) || { x: 0, y: 0, scale: 1 };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4 font-sans flex flex-col h-screen overflow-hidden">
      <div className="flex justify-between items-center mb-4 shrink-0 border-b border-gray-800 pb-2">
          <div>
            <h1 className="text-xl font-bold text-[--neon-cyan]">ADMIN CONFIGURATOR</h1>
            <p className="text-[10px] text-gray-400">Atur posisi untuk {selectedLayout.label}.</p>
          </div>
          <div className="flex gap-2">
             <button onClick={() => window.location.href = '/'} className="bg-gray-800 px-3 py-1 rounded text-xs hover:bg-gray-700">Back Home</button>
             <button onClick={() => setIsAuthenticated(false)} className="bg-red-900 px-3 py-1 rounded text-xs hover:bg-red-800">Logout</button>
          </div>
      </div>

      <div className="flex flex-1 gap-4 overflow-hidden flex-col md:flex-row">
          
          {/* EDITOR CANVAS */}
          <div className="flex-1 bg-black/40 rounded-xl border border-gray-800 relative flex justify-center items-start overflow-auto p-8 custom-scrollbar">
              
              {/* WRAPPER FIXED SIZE 300x900 (1:3 Strip) */}
              <div className="transform scale-[0.7] origin-top shadow-2xl border-2 border-dashed border-gray-700 bg-white" 
                   style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT, position: 'relative', overflow: 'hidden' }}>
                    
                    {/* DUMMY PHOTOS (Landscape 16:9) */}
                    {Array.from({ length: selectedLayout.photoCount }).map((_, i) => (
                        <div key={i} onWheel={(e) => handleWheel(e, i)} onPointerDown={(e) => handlePointerDown(e, i)} onPointerMove={(e) => handlePointerMove(e, i)} onPointerUp={handlePointerUp} style={getContainerStyle(i)}>
                            <img src={DUMMY_PHOTOS[i % DUMMY_PHOTOS.length]} className="w-full h-full object-cover pointer-events-none transform scale-x-[-1] opacity-80" />
                            <div className="absolute top-1 left-1 bg-black/70 text-white text-[8px] px-1 rounded pointer-events-none">#{i+1}</div>
                        </div>
                    ))}
                    
                    {/* FRAME OVERLAY */}
                    {uploadedFrameLayer && (
                        <img 
                            src={uploadedFrameLayer} 
                            className="absolute inset-0 w-full h-full object-cover pointer-events-none z-30" 
                            style={{ opacity: frameOpacity }} 
                        />
                    )}
              </div>
          </div>

          {/* CONTROLS */}
          <div className="w-full md:w-80 bg-gray-900 p-4 rounded-xl border border-gray-700 flex flex-col gap-4 overflow-y-auto max-h-[40vh] md:max-h-full">
              
              {/* FRAME SETTINGS */}
              <div className="bg-black/50 p-3 rounded border border-gray-600 space-y-3">
                  <label className="text-[10px] font-bold text-gray-400 block flex justify-between">OVERLAY HELPER <span className="text-[--neon-cyan]">{Math.round(frameOpacity * 100)}%</span></label>
                  <label className="flex items-center gap-2 w-full p-2 border border-dashed border-gray-600 rounded cursor-pointer hover:bg-gray-800 transition-colors bg-black">
                      <ImageIcon size={14} className="text-[--neon-pink]"/>
                      <span className="text-[10px] text-gray-300">Upload PNG Frame...</span>
                      <input type="file" className="hidden" accept="image/png" onChange={handleFrameUpload} />
                  </label>
                  {uploadedFrameLayer && (
                      <div className="flex items-center gap-2">
                          <EyeOff size={12} className="text-gray-500"/>
                          <input type="range" min="0" max="1" step="0.1" value={frameOpacity} onChange={(e) => setFrameOpacity(parseFloat(e.target.value))} className="w-full accent-white h-1 bg-gray-700 rounded cursor-pointer" />
                          <Eye size={12} className="text-white"/>
                      </div>
                  )}
              </div>

              {/* PHOTO CONTROLS */}
              <div className="space-y-3 flex-1">
                  <div className="flex justify-between items-center border-b border-gray-700 pb-1">
                      <h3 className="text-[--neon-yellow] font-bold text-xs">EDIT FOTO #{selectedIdx+1}</h3>
                      <button onClick={() => handleAdjChange('rotation', 0) || handleAdjChange('x', 0) || handleAdjChange('y', 0) || handleAdjChange('scale', 1)} className="text-[9px] bg-red-900 px-2 py-0.5 rounded text-red-200">RESET</button>
                  </div>
                  <div><label className="text-xs text-gray-400 flex justify-between"><span>Zoom</span> <span>{currentAdj.scale.toFixed(2)}x</span></label><input type="range" min="0.5" max="3" step="0.05" value={currentAdj.scale} onChange={(e) => handleAdjChange('scale', parseFloat(e.target.value))} className="w-full accent-[--neon-yellow] h-2 bg-black rounded cursor-pointer" /></div>
                  <div><label className="text-xs text-gray-400 flex justify-between"><span>Rotasi</span> <span>{currentAdj.rotation}°</span></label><input type="range" min="-180" max="180" step="1" value={currentAdj.rotation} onChange={(e) => handleAdjChange('rotation', parseInt(e.target.value))} className="w-full accent-green-500 h-2 bg-black rounded cursor-pointer" /></div>
                  <div className="grid grid-cols-2 gap-2">
                      <div><label className="text-[10px] text-gray-400">Posisi X</label><input type="number" value={Math.round(currentAdj.x)} onChange={(e) => handleAdjChange('x', parseInt(e.target.value))} className="w-full bg-black border border-gray-600 rounded px-2 py-1 text-xs text-right" /></div>
                      <div><label className="text-[10px] text-gray-400">Posisi Y</label><input type="number" value={Math.round(currentAdj.y)} onChange={(e) => handleAdjChange('y', parseInt(e.target.value))} className="w-full bg-black border border-gray-600 rounded px-2 py-1 text-xs text-right" /></div>
                  </div>
              </div>

              {/* LAYOUT SELECTOR */}
              <div className="pt-4 border-t border-gray-700 shrink-0">
                  <label className="text-[10px] font-bold text-gray-400 mb-2 block">PILIH LAYOUT UNTUK DIEDIT</label>
                  <div className="flex gap-2 mb-4 overflow-x-auto custom-scrollbar pb-2">
                      {STRIP_LAYOUTS.map(l => (
                          <button key={l.id} onClick={() => { setSelectedLayout(l); resetAdjustments(); }} className={`px-4 py-2 border rounded text-xs font-bold whitespace-nowrap ${selectedLayout.id === l.id ? 'bg-[--neon-cyan] text-black border-white' : 'bg-black text-gray-400 border-gray-600'}`}>
                              {l.label}
                          </button>
                      ))}
                  </div>
                  <button onClick={saveSettings} className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded flex justify-center items-center gap-2 shadow-lg hover:shadow-green-500/20 transition-all"><Save size={18}/> SIMPAN PERUBAHAN</button>
              </div>
          </div>
      </div>
    </div>
  );
}