const fs = require('fs');

// --- 1. PERBAIKAN MASCOT (Fix Runtime Error: Spring Animation) ---
// Masalah: Framer motion 'spring' tidak bisa handle array [0, -20, 0]
// Solusi: Ganti transisi menjadi 'easeInOut' standard.
const mascotCode = `"use client";
import { motion } from "framer-motion";

type MascotStatus = "idle" | "countdown" | "processing" | "result";

interface MascotProps {
  status: MascotStatus;
}

export default function Mascot({ status }: MascotProps) {
  const variants = {
    idle: {
      y: [0, -15, 0],
      rotate: [0, 2, -2, 0],
      transition: { duration: 2, repeat: Infinity, ease: "easeInOut" },
    },
    countdown: {
      scale: [1, 1.2, 1],
      y: [0, 0, 0],
      transition: { duration: 0.5, repeat: Infinity },
    },
    processing: {
      rotate: 360,
      transition: { duration: 1, repeat: Infinity, ease: "linear" },
    },
    result: {
      y: [0, -20, 0],
      scale: [1, 1.1, 1],
      // FIX: Menghapus type: 'spring' dan mengganti dengan durasi standard
      transition: { duration: 0.8, ease: "easeInOut", repeat: Infinity, repeatType: "reverse" },
    },
  };

  const getExpression = () => {
    switch (status) {
      case "idle": return "👾";
      case "countdown": return "😲";
      case "processing": return "🤔";
      case "result": return "🤩";
      default: return "👾";
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        key={status}
        className="absolute -top-16 bg-white text-black px-4 py-2 rounded-xl border-4 border-black font-bold whitespace-nowrap z-10"
        style={{ boxShadow: "4px 4px 0px var(--neon-pink)" }}
      >
        {status === "idle" && "Ayo Foto!"}
        {status === "countdown" && "Siap-siap!"}
        {status === "processing" && "Sebentar..."}
        {status === "result" && "Keren Abis!"}
      </motion.div>

      <motion.div
        variants={variants}
        animate={status}
        className="text-[8rem] filter drop-shadow-[0_0_15px_rgba(0,255,255,0.5)] cursor-pointer"
      >
        {getExpression()}
      </motion.div>
      
      <div className="w-24 h-4 bg-black/30 rounded-[50%] blur-sm -mt-2.5" />
    </div>
  );
}
`;

// --- 2. PERBAIKAN REVIEW STAGE (Fix Console Error: Empty Src) ---
// Masalah: <img src=""> menyebabkan error.
// Solusi: Cek jika src ada, baru render img. Jika tidak, render placeholder.
const reviewCode = `"use client";
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
              <img src={src} className="w-full h-40 object-cover transform scale-x-[-1]" alt={\`Foto \${idx+1}\`} />
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
`;

// --- 3. PERBAIKAN RESULT STAGE (Fix Console Error: Empty Src) ---
// Masalah: Sama, <img src=""> error.
// Solusi: Filter data kosong sebelum render atau gunakan conditional rendering.
const resultCode = `"use client";
import { useState } from 'react';
import RetroButton from './RetroButton';
import { Mail, Film, Image as ImageIcon, Gift } from 'lucide-react';

export default function ResultStage({ photos, videoUrl, frameConfig }: any) {
  const [email, setEmail] = useState('');
  const [activeTab, setActiveTab] = useState<'photo'|'video'|'gif'>('photo');

  const handleSend = () => {
    if(!email) return alert("⚠️ Masukkan email dulu!");
    alert(\`📨 Sedang mengirim ke \${email}:\\n1. Layout Foto (Jpg)\\n2. Video BTS (Webm)\\n3. Animasi GIF\`);
  };

  return (
    <div className="flex flex-col h-full gap-4 w-full">
      {/* Tab Navigation */}
      <div className="flex justify-center gap-2 p-1 bg-gray-900 rounded-lg border border-gray-800">
        <button onClick={() => setActiveTab('photo')} className={\`flex-1 py-2 px-4 rounded flex justify-center items-center gap-2 text-sm font-bold transition-colors \${activeTab==='photo'?'bg-[--neon-pink] text-black':'text-gray-400 hover:text-white'}\`}><ImageIcon size={16}/> FOTO</button>
        <button onClick={() => setActiveTab('video')} className={\`flex-1 py-2 px-4 rounded flex justify-center items-center gap-2 text-sm font-bold transition-colors \${activeTab==='video'?'bg-[--neon-cyan] text-black':'text-gray-400 hover:text-white'}\`}><Film size={16}/> VIDEO</button>
        <button onClick={() => setActiveTab('gif')} className={\`flex-1 py-2 px-4 rounded flex justify-center items-center gap-2 text-sm font-bold transition-colors \${activeTab==='gif'?'bg-[--neon-yellow] text-black':'text-gray-400 hover:text-white'}\`}><Gift size={16}/> GIF</button>
      </div>

      {/* Preview Area */}
      <div className="flex-1 bg-black border-2 border-dashed border-gray-700 rounded-xl overflow-hidden flex items-center justify-center p-4 relative">
        
        {/* TAB PHOTO: Grid Layout */}
        {activeTab === 'photo' && (
          <div className={\`bg-white p-4 shadow-xl transform scale-90 origin-center\`}>
             <div className={\`grid \${frameConfig.gridClass} w-full gap-2\`}>
                {photos.map((src:string, i:number) => (
                  // FIX: Cek src sebelum render
                  src ? <img key={i} src={src} className="w-full h-full object-cover filter contrast-110 transform scale-x-[-1]" alt="result" /> : null
                ))}
             </div>
             <div className="mt-4 text-center font-mono text-xs text-black tracking-widest uppercase border-t-2 border-black pt-2">
               Kemil.co Photobooth
             </div>
          </div>
        )}

        {/* TAB VIDEO: Player */}
        {activeTab === 'video' && (
           videoUrl ? 
           <video src={videoUrl} controls autoPlay loop className="max-h-full max-w-full rounded border border-gray-500" /> 
           : <p className="text-gray-500 animate-pulse">Memproses Video...</p>
        )}

        {/* TAB GIF: Simulation */}
        {activeTab === 'gif' && (
          <div className="text-center">
             <div className="relative w-64 h-64 mx-auto border-4 border-white bg-gray-800 rounded-lg overflow-hidden">
               {photos.map((src:string, i:number) => (
                 // FIX: Cek src sebelum render
                 src ? <img key={i} src={src} className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1] animate-pulse" style={{animationDuration: '1.5s', animationDelay: \`\${i*0.3}s\`}} alt="gif-frame" /> : null
               ))}
             </div>
             <p className="text-xs text-[--neon-yellow] mt-4 font-mono">PREVIEW GIF ANIMATION</p>
          </div>
        )}
      </div>

      {/* Footer: Email Form */}
      <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex flex-col gap-3">
        <label className="text-xs text-gray-400 uppercase tracking-wider font-bold">Kirim Softfile ke Email:</label>
        <div className="flex gap-2">
          <input 
            type="email" 
            placeholder="nama@email.com" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 p-3 bg-black border border-gray-600 rounded text-white focus:border-[--neon-cyan] outline-none font-mono"
          />
          <RetroButton onClick={handleSend} color="pink">
             <Mail size={20} />
          </RetroButton>
        </div>
      </div>
    </div>
  );
}
`;

// EKSEKUSI PENULISAN FILE
try {
  fs.writeFileSync('src/components/Mascot.tsx', mascotCode);
  fs.writeFileSync('src/components/ReviewStage.tsx', reviewCode);
  fs.writeFileSync('src/components/ResultStage.tsx', resultCode);
  console.log('✅ Semua ERROR berhasil diperbaiki! (Mascot Animation & Empty Image Src)');
} catch (err) {
  console.error('❌ Gagal menulis file:', err);
}