"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Save, Lock, Plus, Trash2, Image as ImageIcon, MousePointer2, Home, CheckCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

// --- KONSTANTA ---
const CANVAS_WIDTH = 300;
const CANVAS_HEIGHT = 900;
const PHOTO_WIDTH = 250;
const PHOTO_HEIGHT = 140.625; // 16:9
const RATIO = 4; 

interface PhotoLayout {
  x: number; y: number; scale: number; rotation: number;
}

interface FrameData {
  id: string;
  name: string;
  imageUrl: string; 
  photoCount: 3 | 4;
  layout: PhotoLayout[];
}

const DUMMY_PHOTO = "https://images.unsplash.com/photo-1595435934249-fd96360c7378?auto=format&fit=crop&w=500&q=80";

export default function AdminPage() {
  const [frames, setFrames] = useState<FrameData[]>([]);
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null);
  const [selectedIdx, setSelectedIdx] = useState(0); 
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const [showSaveNotif, setShowSaveNotif] = useState(false);

  // --- 1. LOAD DATA ---
  useEffect(() => {
    const savedFrames = localStorage.getItem('MY_FRAMES');
    if (savedFrames) {
      const parsed = JSON.parse(savedFrames);
      setFrames(parsed);
      if (parsed.length > 0) setSelectedFrameId(parsed[0].id);
    }
  }, []);

  const activeFrame = frames.find(f => f.id === selectedFrameId);

  // --- 2. HANDLERS ---
  const handleAddNewFrame = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
        const newFrame: FrameData = {
            id: uuidv4(),
            name: `Frame Baru ${frames.length + 1}`,
            imageUrl: reader.result as string,
            photoCount: 3, 
            layout: Array(3).fill({ x: 0, y: 0, scale: 1, rotation: 0 })
        };
        const updatedFrames = [...frames, newFrame];
        setFrames(updatedFrames);
        setSelectedFrameId(newFrame.id);
        saveToStorage(updatedFrames);
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteFrame = (id: string) => {
      if(!confirm("Hapus frame ini?")) return;
      const updated = frames.filter(f => f.id !== id);
      setFrames(updated);
      if (selectedFrameId === id) setSelectedFrameId(updated[0]?.id || null);
      saveToStorage(updated);
  };

  const saveToStorage = (data: FrameData[]) => {
      localStorage.setItem('MY_FRAMES', JSON.stringify(data));
  };

  const handleManualSave = () => {
      saveToStorage(frames);
      setShowSaveNotif(true);
      setTimeout(() => setShowSaveNotif(false), 2000);
  };

  const handleUpdateLayout = (key: keyof PhotoLayout, value: number) => {
      if (!activeFrame) return;
      const newLayouts = [...activeFrame.layout];
      newLayouts[selectedIdx] = { ...newLayouts[selectedIdx], [key]: value };
      const updatedFrame = { ...activeFrame, layout: newLayouts };
      updateFrameInList(updatedFrame);
  };

  const handleUpdatePhotoCount = (count: 3 | 4) => {
      if (!activeFrame) return;
      const newLayout = Array(count).fill({ x: 0, y: 0, scale: 1, rotation: 0 });
      const updatedFrame = { ...activeFrame, photoCount: count, layout: newLayout };
      updateFrameInList(updatedFrame);
      setSelectedIdx(0);
  };

  const updateFrameInList = (updatedFrame: FrameData) => {
      const newFrames = frames.map(f => f.id === updatedFrame.id ? updatedFrame : f);
      setFrames(newFrames);
  };

  const handlePointerDown = (e: React.PointerEvent, index: number) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      setSelectedIdx(index);
      setIsDragging(true);
      dragStartPos.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent, index: number) => {
      if (!isDragging || selectedIdx !== index || !activeFrame) return;
      const dx = e.clientX - dragStartPos.current.x;
      const dy = e.clientY - dragStartPos.current.y;
      
      const currentLayout = activeFrame.layout[index];
      handleUpdateLayout('x', currentLayout.x + dx);
      handleUpdateLayout('y', currentLayout.y + dy);
      
      dragStartPos.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: React.PointerEvent) => {
      setIsDragging(false);
      e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const getBoxStyle = (idx: number) => {
      if (!activeFrame) return {};
      const totalH = (PHOTO_HEIGHT * activeFrame.photoCount) + (10 * (activeFrame.photoCount - 1));
      const startY = (CANVAS_HEIGHT - totalH) / 2;
      const defaultTop = startY + (idx * (PHOTO_HEIGHT + 10));
      const defaultLeft = (CANVAS_WIDTH - PHOTO_WIDTH) / 2;

      const adj = activeFrame.layout[idx];

      return {
          position: 'absolute' as const,
          top: defaultTop,
          left: defaultLeft,
          width: PHOTO_WIDTH,
          height: PHOTO_HEIGHT,
          transform: `translate(${adj.x}px, ${adj.y}px) scale(${adj.scale}) rotate(${adj.rotation}deg)`,
          zIndex: selectedIdx === idx ? 20 : 10,
          border: selectedIdx === idx ? '2px solid cyan' : '1px dashed #555',
          cursor: isDragging ? 'grabbing' : 'grab',
          touchAction: 'none'
      };
  };

  return (
    <div className="flex h-screen bg-[#111] text-white font-mono overflow-hidden">
        
        {/* HEADER */}
        <div className="absolute top-0 left-0 right-0 h-16 border-b border-gray-800 bg-black flex items-center justify-between px-6 z-50">
            <div className="flex items-center gap-4">
                <button onClick={() => window.location.href='/'} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors bg-gray-900 px-4 py-2 rounded-lg border border-gray-800 hover:bg-gray-800">
                    <Home size={18} />
                    <span className="text-sm font-bold">KEMBALI KE HOME</span>
                </button>
            </div>
            <div className="text-[--neon-cyan] font-bold tracking-widest">FRAME EDITOR</div>
            <div className="w-32"></div>
        </div>

        {/* NOTIFIKASI SAVE */}
        {showSaveNotif && (
            <div className="absolute top-20 right-6 bg-green-600 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce z-[100]">
                <CheckCircle size={24}/>
                <span className="font-bold">Konfigurasi Tersimpan!</span>
            </div>
        )}

        {/* CONTENT */}
        <div className="flex flex-1 pt-16 w-full">
            {/* KIRI: LIST */}
            <div className="w-64 border-r border-gray-800 flex flex-col bg-black">
                <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                    {frames.map(f => (
                        <div key={f.id} onClick={() => setSelectedFrameId(f.id)} className={`p-2 rounded cursor-pointer flex items-center gap-2 border transition-all ${selectedFrameId === f.id ? 'bg-gray-900 border-[--neon-cyan]' : 'border-transparent hover:bg-gray-900'}`}>
                            <img src={f.imageUrl} className="w-8 h-24 object-cover bg-white rounded" />
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold truncate">{f.name}</p>
                                <p className="text-[10px] text-gray-500">{f.photoCount} Pose</p>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteFrame(f.id); }} className="text-gray-600 hover:text-red-500"><Trash2 size={14}/></button>
                        </div>
                    ))}
                </div>
                <div className="p-4 border-t border-gray-800">
                    <label className="flex items-center justify-center gap-2 w-full bg-white text-black py-2 rounded font-bold cursor-pointer hover:bg-gray-200">
                        <Plus size={16}/> TAMBAH FRAME
                        <input type="file" className="hidden" accept="image/png" onChange={handleAddNewFrame} />
                    </label>
                </div>
            </div>

            {/* TENGAH: CANVAS */}
            <div className="flex-1 bg-[#0a0a0a] flex items-center justify-center relative overflow-hidden">
                {activeFrame ? (
                    <div className="relative shadow-2xl border-2 border-gray-800 bg-white" style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT, transform: 'scale(0.75)' }}>
                        {activeFrame.layout.map((_, i) => (
                            <div key={i} onPointerDown={(e) => handlePointerDown(e, i)} onPointerMove={(e) => handlePointerMove(e, i)} onPointerUp={handlePointerUp} style={getBoxStyle(i)}>
                                <img src={DUMMY_PHOTO} className="w-full h-full object-cover opacity-80 pointer-events-none" />
                                <div className="absolute top-0 left-0 bg-black/50 text-white text-[10px] px-1">#{i+1}</div>
                            </div>
                        ))}
                        <img src={activeFrame.imageUrl} className="absolute inset-0 w-full h-full object-cover z-30 pointer-events-none" />
                    </div>
                ) : (
                    <div className="text-gray-500">Pilih atau Tambah Frame</div>
                )}
            </div>

            {/* KANAN: CONFIG */}
            {activeFrame && (
                <div className="w-72 border-l border-gray-800 bg-black p-4 flex flex-col gap-6 overflow-y-auto">
                    <div>
                        <label className="text-[10px] text-gray-500 block mb-1">NAMA FRAME</label>
                        <input type="text" value={activeFrame.name} onChange={(e) => updateFrameInList({...activeFrame, name: e.target.value})} className="w-full bg-gray-900 border border-gray-700 p-2 rounded text-sm text-white" />
                    </div>

                    <div>
                        <label className="text-[10px] text-gray-500 block mb-2">JUMLAH POSE</label>
                        <div className="flex gap-2">
                            {[3, 4].map(num => (
                                <button key={num} onClick={() => handleUpdatePhotoCount(num as 3|4)} className={`flex-1 py-2 rounded text-sm font-bold border ${activeFrame.photoCount === num ? 'bg-[--neon-cyan] text-black border-[--neon-cyan]' : 'bg-transparent text-gray-500 border-gray-700'}`}>
                                    {num} POSE
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="p-3 bg-gray-900 rounded border border-gray-700">
                        <p className="text-[10px] font-bold text-[--neon-yellow] mb-3 flex items-center gap-2"><MousePointer2 size={12}/> EDIT FOTO #{selectedIdx + 1}</p>
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between text-[10px] text-gray-400 mb-1"><span>Scale</span><span>{activeFrame.layout[selectedIdx].scale.toFixed(2)}x</span></div>
                                <input type="range" min="0.5" max="2" step="0.05" value={activeFrame.layout[selectedIdx].scale} onChange={(e) => handleUpdateLayout('scale', parseFloat(e.target.value))} className="w-full accent-[--neon-yellow] h-1 bg-gray-700 rounded appearance-none" />
                            </div>
                            <div>
                                <div className="flex justify-between text-[10px] text-gray-400 mb-1"><span>Rotasi</span><span>{activeFrame.layout[selectedIdx].rotation}°</span></div>
                                <input type="range" min="-45" max="45" step="1" value={activeFrame.layout[selectedIdx].rotation} onChange={(e) => handleUpdateLayout('rotation', parseInt(e.target.value))} className="w-full accent-green-500 h-1 bg-gray-700 rounded appearance-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div><label className="text-[10px] text-gray-500">Posisi X</label><input type="number" value={Math.round(activeFrame.layout[selectedIdx].x)} onChange={(e) => handleUpdateLayout('x', parseInt(e.target.value))} className="w-full bg-black border border-gray-700 rounded px-2 py-1 text-xs" /></div>
                                <div><label className="text-[10px] text-gray-500">Posisi Y</label><input type="number" value={Math.round(activeFrame.layout[selectedIdx].y)} onChange={(e) => handleUpdateLayout('y', parseInt(e.target.value))} className="w-full bg-black border border-gray-700 rounded px-2 py-1 text-xs" /></div>
                            </div>
                            <button onClick={() => { handleUpdateLayout('x',0); handleUpdateLayout('y',0); handleUpdateLayout('scale',1); handleUpdateLayout('rotation',0); }} className="w-full text-[10px] bg-gray-800 py-1 rounded text-gray-400 hover:bg-gray-700">RESET POSISI</button>
                        </div>
                    </div>

                    <div className="mt-auto">
                        <button onClick={handleManualSave} className="w-full bg-green-600 text-white py-3 rounded font-bold flex items-center justify-center gap-2 hover:bg-green-500 transition-all"><Save size={18}/> SIMPAN KONFIGURASI</button>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
}