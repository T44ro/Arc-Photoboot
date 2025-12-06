"use client";
import RetroButton from './RetroButton';
import { RefreshCcw, Check } from 'lucide-react';

export default function ReviewStage({ photos, onRetake, onConfirm }: any) {
  return (
    <div className="w-full h-full flex flex-col p-4">
      <h3 className="text-center text-[--neon-yellow] mb-6 text-xl font-bold">Review Hasil Foto</h3>
      
      <div className="flex-1 grid grid-cols-2 gap-4 overflow-y-auto pr-2 custom-scrollbar">
        {photos.map((src: string, idx: number) => (
          <div key={idx} className="relative group rounded-lg overflow-hidden border-2 border-gray-700 hover:border-[--neon-pink] transition-all bg-gray-900">
            {/* FIX: Hanya render IMG jika src tidak kosong */}
            {src ? (
              <img src={src} className="w-full h-40 object-cover transform scale-x-[-1]" alt={`Foto ${idx+1}`} />
            ) : (
              <div className="w-full h-40 flex items-center justify-center text-gray-600 text-xs animate-pulse">
                Empty Slot
              </div>
            )}
            
            {/* Overlay saat Hover */}
            {src && (
              <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-2 transition-opacity duration-300">
                 <span className="text-white font-mono text-xs">Foto #{idx + 1}</span>
                 <button 
                   onClick={() => onRetake(idx)}
                   className="bg-[--neon-pink] text-black px-4 py-2 rounded-full font-bold text-xs flex items-center hover:scale-105 transition-transform"
                 >
                   <RefreshCcw size={14} className="mr-1" /> RETAKE
                 </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-center pt-4 border-t border-gray-800">
        <RetroButton onClick={onConfirm} color="cyan">
           <div className="flex items-center gap-2">Lanjut Edit <Check size={20}/></div>
        </RetroButton>
      </div>
    </div>
  );
}
