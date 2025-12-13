"use client";
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Save, Lock, LogOut, Image as ImageIcon, Move, ZoomIn, RotateCw, RefreshCcw, Hand } from 'lucide-react';
import { FRAMES, FrameConfig } from '@/lib/frames';

const DUMMY_PHOTOS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=500&q=80",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=500&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=500&q=80",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=500&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=500&q=80",
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=500&q=80",
];

const PHOTO_SIZE = 250;
const GAP = 10;

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  
  const [selectedFrame, setSelectedFrame] = useState<FrameConfig>(FRAMES[0]);
  const [uploadedFrameLayer, setUploadedFrameLayer] = useState<string | null>(null);
  const [adjustments, setAdjustments] = useState<any[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);

  // State untuk Dragging
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });

  // --- LOGIN LOGIC ---
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === '1234') setIsAuthenticated(true);
    else alert('PIN Salah!');
  };

  // --- LOAD & SAVE SETTINGS ---
  useEffect(() => {
    if (isAuthenticated) fetchSettings();
  }, [isAuthenticated, selectedFrame.id]);

  const fetchSettings = async () => {
    try {
        const res = await fetch('/api/admin/settings');
        const data = await res.json();
        if (data.success && data.settings[selectedFrame.id]) {
            setAdjustments(data.settings[selectedFrame.id]);
        } else {
            resetAdjustments();
        }
    } catch (e) { resetAdjustments(); }
  };

  const resetAdjustments = () => {
      setAdjustments(Array(selectedFrame.photoCount).fill({ x: 0, y: 0, scale: 1, rotation: 0 }));
  };

  const saveSettings = async () => {
      try {
          await fetch('/api/admin/settings', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ frameId: selectedFrame.id, settings: adjustments }),
          });
          alert(`✅ Preset Tersimpan!`);
      } catch (e) { alert("❌ Gagal menyimpan."); }
  };

  // --- INTERACTION HANDLERS (LOGIKA BARU) ---

  // 1. Handle Slider Manual
  const handleAdjChange = (key: string, value: number) => {
      const newAdjs = [...adjustments];
      if (!newAdjs[selectedIdx]) newAdjs[selectedIdx] = { x: 0, y: 0, scale: 1, rotation: 0 };
      newAdjs[selectedIdx] = { ...newAdjs[selectedIdx], [key]: value };
      setAdjustments(newAdjs);
  };

  // 2. Handle Scroll Mouse (Zoom In/Out Langsung di Foto)
  const handleWheel = (e: React.WheelEvent, index: number) => {
      // Mencegah scroll halaman saat kursor di atas foto
      e.preventDefault();
      e.stopPropagation();

      if (selectedIdx !== index) setSelectedIdx(index);

      const current = adjustments[index] || { x: 0, y: 0, scale: 1, rotation: 0 };
      // Scroll Up (Negative Delta) = Zoom In, Scroll Down = Zoom Out
      const zoomSensitivity = 0.001; 
      let newScale = current.scale - (e.deltaY * zoomSensitivity);
      
      // Limit Scale (0.5x - 3.0x)
      newScale = Math.min(Math.max(newScale, 0.5), 3.0);

      const newAdjs = [...adjustments];
      newAdjs[index] = { ...current, scale: newScale };
      setAdjustments(newAdjs);
  };

  // 3. Handle Drag (Geser Foto Langsung)
  const handlePointerDown = (e: React.PointerEvent, index: number) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId); // Tangkap kursor
      setSelectedIdx(index);
      setIsDragging(true);
      // Simpan posisi awal kursor
      dragStartPos.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent, index: number) => {
      if (!isDragging || selectedIdx !== index) return;
      e.preventDefault();

      const dx = e.clientX - dragStartPos.current.x;
      const dy = e.clientY - dragStartPos.current.y;

      const current = adjustments[index] || { x: 0, y: 0, scale: 1 };
      
      // Update posisi (tambahkan delta pergerakan)
      const newAdjs = [...adjustments];
      newAdjs[index] = { 
          ...current, 
          x: current.x + dx, 
          y: current.y + dy // Perhatikan: di CSS transform translate Y positif itu ke bawah
      };
      setAdjustments(newAdjs);

      // Update posisi awal kursor untuk frame berikutnya
      dragStartPos.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: React.PointerEvent) => {
      setIsDragging(false);
      e.currentTarget.releasePointerCapture(e.pointerId);
  };


  const getContainerStyle = (idx: number) => {
      const topPos = idx * (PHOTO_SIZE + GAP);
      const adj = adjustments[idx] || { x: 0, y: 0, scale: 1, rotation: 0 };

      return {
          position: 'absolute' as const,
          top: topPos,
          left: 0,
          width: PHOTO_SIZE,
          height: PHOTO_SIZE,
          zIndex: selectedIdx === idx ? 20 : 10,
          transform: `translate(${adj.x}px, ${adj.y}px) scale(${adj.scale}) rotate(${adj.rotation || 0}deg)`,
          border: selectedIdx === idx ? '3px solid var(--neon-pink)' : '1px dashed #444',
          boxShadow: selectedIdx === idx ? '0 0 20px var(--neon-pink)' : 'none',
          cursor: isDragging ? 'grabbing' : 'grab', // Indikator tangan
          overflow: 'visible',
          touchAction: 'none' // PENTING: Mencegah scroll browser saat drag di layar sentuh
      };
  };

  const handleFrameUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => setUploadedFrameLayer(reader.result as string);
        reader.readAsDataURL(file);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 font-mono relative">
        <button onClick={() => window.location.href = '/'} className="absolute top-6 left-6 text-gray-500 hover:text-white flex gap-2 cursor-pointer z-50">
            <ArrowLeft/> Back
        </button>
        <form onSubmit={handleLogin} className="bg-gray-900 p-8 rounded-xl border-2 border-[--neon-pink] w-full max-w-sm text-center">
          <Lock className="w-12 h-12 text-[--neon-pink] mx-auto mb-4" />
          <h1 className="text-2xl text-white font-bold mb-6">ADMIN CONFIG</h1>
          <input type="password" placeholder="PIN (1234)" value={pin} onChange={(e) => setPin(e.target.value)} className="w-full bg-black border border-gray-700 text-white text-center text-xl p-3 rounded mb-4 focus:border-[--neon-cyan] outline-none" />
          <button type="submit" className="w-full bg-[--neon-pink] text-black font-bold py-3 rounded hover:opacity-90 cursor-pointer">UNLOCK</button>
        </form>
      </div>
    );
  }

  const currentAdj = adjustments[selectedIdx] || { x: 0, y: 0, scale: 1, rotation: 0 };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4 font-sans overflow-hidden flex flex-col">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-800 shrink-0">
          <div>
            <h1 className="text-2xl font-black italic text-[--neon-cyan]">FRAME CONFIGURATOR</h1>
            <p className="text-gray-400 text-xs">Scroll pada foto untuk Zoom. Klik & Geser untuk memindahkan.</p>
          </div>
          <div className="flex gap-3">
             <button onClick={() => window.location.href = '/'} className="px-4 py-2 bg-gray-800 rounded hover:bg-gray-700 flex gap-2 items-center text-xs"><ArrowLeft size={16}/> Back</button>
             <button onClick={() => setIsAuthenticated(false)} className="px-4 py-2 bg-red-900/50 text-red-400 rounded hover:bg-red-900 flex gap-2 items-center text-xs"><LogOut size={16}/> Logout</button>
          </div>
      </div>

      <div className="flex flex-1 gap-6 overflow-hidden flex-col md:flex-row">
          
          {/* PANEL KIRI: CANVAS EDITOR (INTERAKTIF) */}
          <div className="flex-1 bg-black/40 rounded-xl border border-gray-800 p-8 overflow-auto custom-scrollbar relative flex justify-center items-start">
              <div className="relative bg-white shadow-2xl transition-all" style={{ width: PHOTO_SIZE, height: (PHOTO_SIZE + GAP) * selectedFrame.photoCount, overflow: 'visible' }}>
                 {/* DUMMY PHOTOS */}
                 {Array.from({ length: selectedFrame.photoCount }).map((_, i) => (
                    <div 
                        key={i} 
                        // --- EVENT HANDLERS ---
                        onWheel={(e) => handleWheel(e, i)}
                        onPointerDown={(e) => handlePointerDown(e, i)}
                        onPointerMove={(e) => handlePointerMove(e, i)}
                        onPointerUp={handlePointerUp}
                        onPointerLeave={handlePointerUp}
                        // ----------------------
                        style={getContainerStyle(i)}
                    >
                        <img 
                            src={DUMMY_PHOTOS[i % DUMMY_PHOTOS.length]} 
                            className="w-full h-full object-cover transform scale-x-[-1] opacity-80 hover:opacity-100 transition-opacity" 
                            style={{ pointerEvents: 'none' }} // Penting agar drag tidak men-drag elemen img
                        />
                        <div className="absolute top-1 left-1 bg-black/70 text-white text-[10px] px-2 rounded pointer-events-none">
                            {i === selectedIdx ? "EDITING" : `#${i+1}`}
                        </div>
                    </div>
                 ))}
                 {uploadedFrameLayer && (<img src={uploadedFrameLayer} className="absolute inset-0 w-full h-full object-cover z-30 pointer-events-none opacity-60" />)}
              </div>
          </div>

          {/* PANEL KANAN: CONTROLS */}
          <div className="w-full md:w-1/3 bg-gray-900 p-6 rounded-xl border border-gray-700 flex flex-col gap-6 overflow-y-auto">
              
              {/* INSTRUKSI CEPAT */}
              <div className="bg-gray-800 p-3 rounded border border-gray-600 flex gap-3 items-center">
                  <Hand className="text-[--neon-yellow]" size={24} />
                  <div className="text-[10px] text-gray-300">
                      <p><strong>Tips Cepat:</strong></p>
                      <p>• Scroll Mouse di atas foto untuk <strong>ZOOM</strong></p>
                      <p>• Klik & Tahan untuk <strong>GESER</strong></p>
                  </div>
              </div>

              {/* 1. PILIH LAYOUT */}
              <div>
                  <label className="text-xs font-bold text-gray-400 mb-2 block">1. PILIH LAYOUT FRAME</label>
                  <div className="grid grid-cols-2 gap-2">
                      {FRAMES.map(f => (
                          <button key={f.id} onClick={() => { setSelectedFrame(f); resetAdjustments(); }} className={`p-2 border rounded text-xs font-bold transition-all ${selectedFrame.id === f.id ? 'bg-[--neon-cyan] text-black border-white' : 'bg-black text-gray-400 border-gray-600'}`}>{f.label} ({f.photoCount})</button>
                      ))}
                  </div>
              </div>

              {/* 2. UPLOAD FRAME */}
              <div>
                  <label className="text-xs font-bold text-gray-400 mb-2 block">2. UPLOAD CONTOH FRAME</label>
                  <label className="flex items-center gap-2 w-full p-3 border border-dashed border-gray-600 rounded cursor-pointer hover:bg-gray-800 transition-colors">
                      <ImageIcon size={16} className="text-[--neon-pink]"/>
                      <span className="text-xs text-gray-300">Klik untuk upload frame...</span>
                      <input type="file" className="hidden" accept="image/png" onChange={handleFrameUpload} />
                  </label>
              </div>

              <hr className="border-gray-700"/>

              {/* 3. MANUAL SLIDERS */}
              <div className="bg-gray-800 p-4 rounded-lg border border-gray-600">
                  <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-600">
                      <h3 className="text-[--neon-yellow] font-bold">EDIT POSISI #{selectedIdx + 1}</h3>
                      <button onClick={() => handleAdjChange('x', 0) || handleAdjChange('y', 0) || handleAdjChange('scale', 1)} className="text-[10px] bg-gray-700 px-2 py-1 rounded hover:bg-white hover:text-black">RESET</button>
                  </div>
                  <div className="space-y-4">
                      <div>
                          <div className="flex justify-between text-xs mb-1 font-bold text-gray-300"><span>Zoom</span> <span>{currentAdj.scale.toFixed(2)}x</span></div>
                          <input type="range" min="0.5" max="3" step="0.01" value={currentAdj.scale} onChange={(e) => handleAdjChange('scale', parseFloat(e.target.value))} className="w-full accent-[--neon-yellow] h-2 bg-black rounded-lg cursor-pointer" />
                      </div>
                      <div>
                          <div className="flex justify-between text-xs mb-1 font-bold text-gray-300"><span>Geser X</span> <span>{currentAdj.x}px</span></div>
                          <input type="range" min="-500" max="500" value={currentAdj.x} onChange={(e) => handleAdjChange('x', parseInt(e.target.value))} className="w-full accent-[--neon-pink] h-2 bg-black rounded-lg cursor-pointer" />
                      </div>
                      <div>
                          <div className="flex justify-between text-xs mb-1 font-bold text-gray-300"><span>Geser Y</span> <span>{currentAdj.y}px</span></div>
                          <input type="range" min="-500" max="500" value={currentAdj.y} onChange={(e) => handleAdjChange('y', parseInt(e.target.value))} className="w-full accent-[--neon-cyan] h-2 bg-black rounded-lg cursor-pointer" />
                      </div>
                  </div>
              </div>

              <button onClick={saveSettings} className="w-full py-4 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl shadow-[0_0_20px_rgba(0,255,0,0.3)] flex justify-center items-center gap-2 mt-auto">
                  <Save size={24}/> SIMPAN PENGATURAN
              </button>
          </div>
      </div>
    </div>
  );
}