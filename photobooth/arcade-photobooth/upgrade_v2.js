const fs = require('fs');
const path = require('path');

// Fungsi pembantu untuk membuat file beserta foldernya jika belum ada
const writeFile = (filePath, content) => {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, content);
  console.log(`✅ Berhasil membuat: ${filePath}`);
};

// --- 1. DEFINISI TIPE & TEMPLATE FRAME (src/lib/frames.ts) ---
const framesCode = `
export type FrameConfig = {
  id: string;
  label: string;
  photoCount: number;
  gridClass: string;
};

export const FRAMES: FrameConfig[] = [
  { id: 'strip-3', label: 'Classic Strip (3)', photoCount: 3, gridClass: 'grid-cols-1 gap-4' },
  { id: 'grid-4', label: 'Box Grid (4)', photoCount: 4, gridClass: 'grid-cols-2 gap-2' },
  { id: 'matrix-6', label: 'Super Matrix (6)', photoCount: 6, gridClass: 'grid-cols-3 gap-2' },
];
`;

// --- 2. HOOK KAMERA PINTAR & VIDEO RECORDER (src/hooks/useSmartWebcam.ts) ---
const hookCode = `
import { useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';

export const useSmartWebcam = () => {
  const webcamRef = useRef<Webcam>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const startRecording = useCallback(() => {
    setRecordedChunks([]);
    if (webcamRef.current && webcamRef.current.stream) {
      try {
        mediaRecorderRef.current = new MediaRecorder(webcamRef.current.stream, {
          mimeType: 'video/webm',
        });
        mediaRecorderRef.current.addEventListener('dataavailable', (event) => {
          if (event.data.size > 0) setRecordedChunks((prev) => [...prev, event.data]);
        });
        mediaRecorderRef.current.start();
        console.log("🎥 Video Recording Started...");
      } catch (e) {
        console.error("Gagal memulai recording (mungkin browser tidak support):", e);
      }
    }
  }, [webcamRef]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      console.log("🛑 Video Recording Stopped.");
    }
  }, []);

  const generateVideo = useCallback(() => {
    if (recordedChunks.length) {
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      return url;
    }
    return null;
  }, [recordedChunks]);

  const capturePhoto = useCallback(() => {
    return webcamRef.current?.getScreenshot();
  }, [webcamRef]);

  return { webcamRef, startRecording, stopRecording, generateVideo, videoUrl, capturePhoto };
};
`;

// --- 3. KOMPONEN UI BARU ---

// 3.1 FRAME SELECTOR
const frameSelectCode = `
"use client";
import { FRAMES, FrameConfig } from '@/lib/frames';
import { motion } from 'framer-motion';

export default function FrameSelector({ onSelect }: { onSelect: (f: FrameConfig) => void }) {
  return (
    <div className="text-center space-y-8 w-full">
      <h2 className="text-3xl font-bold text-[--neon-cyan] drop-shadow-md">Pilih Template Frame</h2>
      <div className="flex flex-wrap justify-center gap-6">
        {FRAMES.map((frame) => (
          <motion.div 
            key={frame.id}
            whileHover={{ scale: 1.05 }}
            className="p-4 border-2 border-white/20 rounded-xl bg-black/50 cursor-pointer hover:border-[--neon-pink] transition-colors"
            onClick={() => onSelect(frame)}
          >
            {/* Visualisasi Grid Miniatur */}
            <div className={\`grid \${frame.gridClass} w-32 h-40 bg-gray-800 mb-4 p-2 gap-1\`}>
               {[...Array(frame.photoCount)].map((_, i) => (
                 <div key={i} className="bg-white/10 rounded-sm w-full h-full border border-white/5" />
               ))}
            </div>
            <p className="font-mono text-sm text-white">{frame.label}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
`;

// 3.2 REVIEW STAGE (Dengan Logic Retake)
const reviewCode = `
"use client";
import RetroButton from './RetroButton';
import { RefreshCcw, Check, ZoomIn } from 'lucide-react';

export default function ReviewStage({ photos, onRetake, onConfirm }: any) {
  return (
    <div className="w-full h-full flex flex-col p-4">
      <h3 className="text-center text-[--neon-yellow] mb-6 text-xl font-bold">Review Hasil Foto</h3>
      
      <div className="flex-1 grid grid-cols-2 gap-4 overflow-y-auto pr-2 custom-scrollbar">
        {photos.map((src: string, idx: number) => (
          <div key={idx} className="relative group rounded-lg overflow-hidden border-2 border-gray-700 hover:border-[--neon-pink] transition-all">
            <img src={src} className="w-full h-40 object-cover transform scale-x-[-1]" />
            
            {/* Overlay saat Hover */}
            <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-2 transition-opacity duration-300">
               <span className="text-white font-mono text-xs">Foto #{idx + 1}</span>
               <button 
                 onClick={() => onRetake(idx)}
                 className="bg-[--neon-pink] text-black px-4 py-2 rounded-full font-bold text-xs flex items-center hover:scale-105 transition-transform"
               >
                 <RefreshCcw size={14} className="mr-1" /> RETAKE
               </button>
            </div>
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

// 3.3 RESULT STAGE (Preview Akhir + Email)
const resultCode = `
"use client";
import { useState } from 'react';
import RetroButton from './RetroButton';
import { Mail, Download, Film, Image as ImageIcon, Gift } from 'lucide-react';

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
                  <img key={i} src={src} className="w-full h-full object-cover filter contrast-110 transform scale-x-[-1]" />
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
                 <img key={i} src={src} className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1] animate-pulse" style={{animationDuration: '1.5s', animationDelay: \`\${i*0.3}s\`}} />
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

// --- 4. MAIN CONTROLLER BARU (src/app/page.tsx) ---
const mainPageCode = `
"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Webcam from "react-webcam";
import Mascot from "@/components/Mascot";
import RetroButton from "@/components/RetroButton";
import FrameSelector from "@/components/FrameSelector";
import ReviewStage from "@/components/ReviewStage";
import ResultStage from "@/components/ResultStage";
import { FRAMES, FrameConfig } from "@/lib/frames";
import { useSmartWebcam } from "@/hooks/useSmartWebcam";

type Step = 'home' | 'frame-select' | 'capture' | 'review' | 'result';

export default function ArcadePhotobooth() {
  const [step, setStep] = useState<Step>('home');
  const [selectedFrame, setSelectedFrame] = useState<FrameConfig>(FRAMES[0]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0); 
  const [retakeIndex, setRetakeIndex] = useState<number | null>(null);

  const { webcamRef, startRecording, stopRecording, generateVideo, videoUrl, capturePhoto } = useSmartWebcam();

  // --- LOGIC FLOW ---

  // 1. Pilih Frame
  const handleFrameSelect = (frame: FrameConfig) => {
    setSelectedFrame(frame);
    setPhotos(Array(frame.photoCount).fill('')); // Siapkan slot kosong
    setStep('capture');
    startRecording(); // Mulai rekam video BTS (Background)
    startCountdown(0);
  };

  // 2. Countdown Engine
  const startCountdown = (index: number) => {
    setCurrentIndex(index);
    setCountdown(3);
    
    let timer = 3;
    const interval = setInterval(() => {
      timer--;
      setCountdown(timer);
      if (timer === 0) {
        clearInterval(interval);
        handleCapture(index);
      }
    }, 1000);
  };

  // 3. Capture Logic
  const handleCapture = (index: number) => {
    const shot = capturePhoto();
    if (shot) {
      setPhotos(prev => {
        const newPhotos = [...prev];
        newPhotos[index] = shot;
        return newPhotos;
      });
      
      // Jika ini adalah RETAKE single photo
      if (retakeIndex !== null) {
        setRetakeIndex(null);
        setTimeout(() => setStep('review'), 500); // Balik ke review
      } 
      // Jika flow normal
      else if (index < selectedFrame.photoCount - 1) {
        setTimeout(() => startCountdown(index + 1), 1500); // Lanjut foto berikutnya
      } 
      // Jika sudah foto terakhir
      else {
        stopRecording(); // Stop video BTS
        generateVideo(); // Generate file video
        setTimeout(() => setStep('review'), 1000);
      }
    }
  };

  // 4. Retake Logic
  const handleRetake = (index: number) => {
    setRetakeIndex(index); // Tandai index yg mau diulang
    setStep('capture');
    startCountdown(index);
  };

  // State Maskot Pintar
  const getMascotState = () => {
    if (step === 'home') return 'idle';
    if (step === 'capture' && countdown === 0) return 'processing';
    if (step === 'capture') return 'countdown';
    if (step === 'review') return 'processing';
    if (step === 'result') return 'result';
    return 'idle';
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center relative font-sans overflow-hidden p-4 md:p-8">
      <div className="absolute inset-0 cyber-grid -z-20 opacity-50" />
      <div className="absolute inset-0 bg-linear-to-t from-black via-transparent to-black -z-10" />

      {/* --- HEADER --- */}
      <div className="absolute top-6 left-6 z-50">
        <h1 className="text-3xl font-black italic text-transparent bg-clip-text bg-linear-to-r from-[--neon-cyan] to-[--neon-pink] drop-shadow-[2px_2px_0px_#000]">
          ARCADE BOOTH
        </h1>
      </div>

      <div className="z-10 w-full max-w-6xl flex flex-col md:flex-row gap-6 h-[85vh]">
        
        {/* KIRI: Mascot & Guide */}
        <div className="flex-1 flex flex-col items-center justify-center order-2 md:order-1 relative">
          <Mascot status={getMascotState()} />
          
          <div className="mt-8 text-center max-w-sm px-4">
             {step === 'home' && <p className="text-gray-400 font-mono">Tekan tombol START untuk memulai sesi foto seru!</p>}
             {step === 'frame-select' && <p className="text-[--neon-cyan] font-bold">Pilih layout favoritmu</p>}
             {step === 'capture' && (
                <div className="bg-black/50 p-4 rounded-xl border border-[--neon-yellow]">
                   <p className="text-[--neon-yellow] text-xl font-bold mb-1">POSE #{currentIndex + 1}</p>
                   <p className="text-xs text-gray-300">Total: {selectedFrame.photoCount} Foto</p>
                </div>
             )}
             {step === 'review' && <p className="text-white">Cek fotomu! Klik gambar untuk <span className="text-[--neon-pink]">RETAKE</span></p>}
          </div>
        </div>

        {/* KANAN: Main Stage (Layar Mesin Dingdong) */}
        <div className="flex-2 order-1 md:order-2 bg-[#1a1a2e] border-8 border-black rounded-[3rem] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5),inset_0_0_20px_black] flex flex-col relative ring-4 ring-gray-800">
          
          {/* Layar Kaca Efek */}
          <div className="absolute inset-0 bg-linear-to-tr from-white/5 to-transparent pointer-events-none z-50 rounded-[2.5rem]" />

          {/* STAGE: HOME */}
          {step === 'home' && (
            <div className="flex-1 flex flex-col items-center justify-center gap-6 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]">
              <div className="animate-bounce">
                <RetroButton onClick={() => setStep('frame-select')} color="pink">START GAME</RetroButton>
              </div>
            </div>
          )}

          {/* STAGE: FRAME SELECT */}
          {step === 'frame-select' && (
            <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto custom-scrollbar">
              <FrameSelector onSelect={handleFrameSelect} />
            </div>
          )}

          {/* STAGE: CAPTURE (WEBCAM) */}
          {step === 'capture' && (
             <div className="relative w-full h-full bg-black flex items-center justify-center">
               <Webcam
                 ref={webcamRef}
                 audio={false}
                 screenshotFormat="image/jpeg"
                 videoConstraints={{ facingMode: "user", width: 1280, height: 720 }}
                 className="w-full h-full object-cover transform scale-x-[-1]"
               />
               
               {/* Countdown Overlay */}
               <AnimatePresence>
               {countdown !== null && countdown > 0 && (
                 <motion.div 
                   key={countdown}
                   initial={{ scale: 0.5, opacity: 0 }}
                   animate={{ scale: 1.5, opacity: 1 }}
                   exit={{ scale: 2, opacity: 0 }}
                   className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[2px] z-20"
                 >
                   <span className="text-[10rem] font-black text-white stroke-black stroke-[4px] drop-shadow-[0_0_30px_var(--neon-pink)]">
                     {countdown}
                   </span>
                 </motion.div>
               )}
               </AnimatePresence>

               {/* Flash Effect */}
               {countdown === 0 && (
                  <div className="absolute inset-0 bg-white z-50 animate-[fadeOut_0.5s_ease-out]" />
               )}
             </div>
          )}

          {/* STAGE: REVIEW */}
          {step === 'review' && (
            <ReviewStage 
              photos={photos} 
              onRetake={handleRetake} 
              onConfirm={() => setStep('result')} 
            />
          )}

          {/* STAGE: RESULT */}
          {step === 'result' && (
            <div className="h-full p-6 overflow-y-auto custom-scrollbar bg-gray-900">
              <ResultStage photos={photos} videoUrl={videoUrl} frameConfig={selectedFrame} />
            </div>
          )}

        </div>
      </div>
    </main>
  );
}
`;

// EKSEKUSI PEMBUATAN FOLDER & FILE
try {
    console.log("🚀 Memulai upgrade sistem...");
    
    // 1. Buat folder utils dan hooks jika belum ada
    writeFile('src/lib/frames.ts', framesCode);
    writeFile('src/hooks/useSmartWebcam.ts', hookCode);
    
    // 2. Buat komponen UI baru
    writeFile('src/components/FrameSelector.tsx', frameSelectCode);
    writeFile('src/components/ReviewStage.tsx', reviewCode);
    writeFile('src/components/ResultStage.tsx', resultCode);
    
    // 3. Update halaman utama
    writeFile('src/app/page.tsx', mainPageCode);
    
    console.log("🎉 UPGRADE SELESAI! Semua fitur baru telah terpasang.");
} catch (error) {
    console.error("❌ Gagal melakukan upgrade:", error);
}