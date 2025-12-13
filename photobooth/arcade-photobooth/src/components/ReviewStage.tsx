"use client";
import React, { useState } from 'react';
import RetroButton from './RetroButton';
import { RefreshCcw, Check, ZoomIn, Move, Image as ImageIcon, ArrowLeftRight } from 'lucide-react';
import { FRAMES } from '@/lib/frames';

export default function ReviewStage({ 
    photos, onRetake, onConfirm, 
    frameConfig, uploadedFrameLayer, setUploadedFrameLayer,
    photoAdjustments, onUpdateAdjustment, onSelectFrame, onSwapPhotos 
}: any) {
  
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [showFrameSelector, setShowFrameSelector] = useState(false);
  const [isSwapMode, setIsSwapMode] = useState(false);

  const currentAdj = photoAdjustments[selectedIdx] || { x: 0, y: 0, scale: 1, rotation: 0 };

  const handleAdjChange = (key: string, value: number) => {
      const newAdj = { ...currentAdj, [key]: value };
      onUpdateAdjustment(selectedIdx, newAdj);
  };

  const handlePhotoClick = (index: number) => {
      if (isSwapMode) {
          if (selectedIdx !== index) {
              onSwapPhotos(selectedIdx, index);
              setIsSwapMode(false);
          }
      } else {
          setSelectedIdx(index);
      }
  };

  const PHOTO_SIZE = 250;
  const GAP = 10;
  
  const getContainerStyle = (idx: number) => {
      const topPos = idx * (PHOTO_SIZE + GAP);
      const adj = photoAdjustments[idx] || { x: 0, y: 0, scale: 1, rotation: 0 };
      return {
          position: 'absolute' as const,
          top: topPos,
          left: 0,
          width: PHOTO_SIZE,
          height: PHOTO_SIZE,
          zIndex: selectedIdx === idx ? 20 : 10,
          transform: `translate(${adj.x}px, ${adj.y}px) scale(${adj.scale}) rotate(${adj.rotation}deg)`,
          border: selectedIdx === idx ? '3px solid var(--neon-pink)' : 'none',
          boxShadow: selectedIdx === idx ? '0 0 15px var(--neon-pink)' : 'none',
          cursor: isSwapMode ? 'crosshair' : 'move',
      };
  };

  return (
    <div className="flex flex-col h-full w-full p-4 gap-4">
      {/* HEADER */}
      <div className="flex justify-between items-center bg-black/50 p-2 rounded-lg border border-gray-700 shrink-0">
          <h2 className="text-[--neon-cyan] font-bold text-sm">FREEFORM EDITOR</h2>
          <button onClick={() => setShowFrameSelector(!showFrameSelector)} className="text-xs bg-gray-800 px-3 py-2 rounded hover:bg-gray-700 border border-gray-600 flex items-center gap-1 transition-colors"><ImageIcon size={14}/> GANTI FRAME</button>
      </div>

      {showFrameSelector && (
          <div className="absolute z-50 top-16 left-4 right-4 bg-gray-900 border-2 border-[--neon-yellow] p-4 rounded-xl shadow-2xl grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="col-span-full text-xs text-gray-400 mb-1">Pilih Frame (Jumlah foto: {photos.length})</div>
              {FRAMES.filter(f => f.photoCount === photos.length).map(f => (
                  <button key={f.id} onClick={() => { onSelectFrame(f); setShowFrameSelector(false); }} className={`p-3 border rounded-lg text-xs font-bold ${frameConfig.id === f.id ? 'bg-[--neon-cyan] text-black border-white' : 'bg-black text-gray-300 border-gray-600'}`}>{f.label}</button>
              ))}
              <div className="col-span-full mt-2 pt-2 border-t border-gray-700">
                  <input type="file" accept="image/png" className="text-xs text-gray-400" onChange={(e) => { if(e.target.files?.[0]) { const reader = new FileReader(); reader.onloadend = () => setUploadedFrameLayer(reader.result); reader.readAsDataURL(e.target.files[0]); setShowFrameSelector(false); } }} />
              </div>
              <button onClick={() => setShowFrameSelector(false)} className="col-span-full mt-2 text-xs text-red-400 hover:text-white underline">Tutup</button>
          </div>
      )}

      <div className="flex flex-1 gap-4 overflow-hidden flex-col md:flex-row">
          {/* CANVAS EDITOR */}
          <div className="flex-1 flex justify-center bg-black/40 rounded-xl border border-gray-700 p-8 overflow-auto custom-scrollbar relative min-h-[300px]">
              <div className="relative bg-white shadow-2xl transition-all origin-top" style={{ width: PHOTO_SIZE, height: (PHOTO_SIZE + GAP) * photos.length, overflow: 'visible' }}>
                 {photos.map((src:string, i:number) => (
                    <div key={i} onClick={() => handlePhotoClick(i)} style={getContainerStyle(i)} className="transition-transform duration-75">
                        <img src={src} className="w-full h-full object-cover transform scale-x-[-1]" style={{ pointerEvents: 'none' }}/>
                        {selectedIdx === i && (<div className="absolute top-1 left-1 bg-[--neon-pink] text-black text-[8px] font-bold px-1 rounded z-50">{isSwapMode ? "TARGET?" : `FOTO ${i+1}`}</div>)}
                    </div>
                 ))}
                 {uploadedFrameLayer && (<img src={typeof uploadedFrameLayer === 'object' ? uploadedFrameLayer.url : uploadedFrameLayer} className="absolute inset-0 w-full h-full object-cover z-30 pointer-events-none" />)}
              </div>
          </div>

          {/* PANEL KANAN: CONTROLS (SCROLLABLE) */}
          <div className="w-full md:w-1/3 bg-gray-800 p-4 rounded-xl border border-gray-600 flex flex-col gap-4 overflow-y-auto max-h-[40vh] md:max-h-full">
              <div className="text-center border-b border-gray-600 pb-2 shrink-0">
                  <p className="text-[--neon-yellow] font-bold text-lg">EDIT FOTO #{selectedIdx + 1}</p>
                  <p className="text-[10px] text-gray-400">Geser slider / Tukar posisi</p>
              </div>

              <button onClick={() => setIsSwapMode(!isSwapMode)} className={`w-full py-2 rounded font-bold text-xs flex items-center justify-center gap-2 transition-all shrink-0 ${isSwapMode ? 'bg-yellow-500 text-black animate-pulse' : 'bg-gray-700 text-white hover:bg-gray-600'}`}>
                  <ArrowLeftRight size={14}/> {isSwapMode ? "PILIH TARGET..." : "TUKAR POSISI"}
              </button>

              <div className="space-y-5 flex-1 pr-1">
                  <div>
                      <div className="flex justify-between text-xs mb-1 font-bold text-gray-300"><span>Zoom</span> <span>{currentAdj.scale.toFixed(2)}x</span></div>
                      <input type="range" min="0.5" max="3" step="0.05" value={currentAdj.scale} onChange={(e) => handleAdjChange('scale', parseFloat(e.target.value))} className="w-full accent-[--neon-yellow] h-2 bg-gray-900 rounded-lg cursor-pointer" />
                  </div>
                  <div>
                      <div className="flex justify-between text-xs mb-1 font-bold text-gray-300"><span>X (Horizontal)</span> <span>{currentAdj.x}</span></div>
                      <input type="range" min="-500" max="500" value={currentAdj.x} onChange={(e) => handleAdjChange('x', parseInt(e.target.value))} className="w-full accent-[--neon-pink] h-2 bg-gray-900 rounded-lg cursor-pointer" />
                  </div>
                  <div>
                      <div className="flex justify-between text-xs mb-1 font-bold text-gray-300"><span>Y (Vertical)</span> <span>{currentAdj.y}</span></div>
                      <input type="range" min="-800" max="800" value={currentAdj.y} onChange={(e) => handleAdjChange('y', parseInt(e.target.value))} className="w-full accent-[--neon-cyan] h-2 bg-gray-900 rounded-lg cursor-pointer" />
                  </div>
                  <button onClick={() => onUpdateAdjustment(selectedIdx, { x: 0, y: 0, scale: 1, rotation: 0 })} className="w-full mt-2 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 rounded text-gray-300 border border-gray-600">Reset Posisi</button>
              </div>

              <div className="flex flex-col gap-2 mt-auto pt-4 border-t border-gray-600 shrink-0">
                  <RetroButton color="cyan" onClick={() => onRetake(selectedIdx)}><div className="flex items-center justify-center gap-2"><RefreshCcw size={16}/> <span className="text-xs">FOTO ULANG</span></div></RetroButton>
                  <RetroButton color="pink" onClick={onConfirm}><div className="flex items-center justify-center gap-2"><Check size={20}/> <span>SELESAI & CETAK</span></div></RetroButton>
              </div>
          </div>
      </div>
    </div>
  );
}