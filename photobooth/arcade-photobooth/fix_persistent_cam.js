const fs = require('fs');

const pageCode = `"use client";
import React, { useState } from "react";
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

  const handleFrameSelect = (frame: FrameConfig) => {
    setSelectedFrame(frame);
    setPhotos(Array(frame.photoCount).fill('')); 
    setStep('capture');
    startRecording(); 
    startCountdown(0, frame);
  };

  const startCountdown = (index: number, activeFrame?: FrameConfig) => {
    setCurrentIndex(index);
    setCountdown(3);
    const currentFrameConfig = activeFrame || selectedFrame;
    
    let timer = 3;
    const interval = setInterval(() => {
      timer--;
      setCountdown(timer);
      if (timer === 0) {
        clearInterval(interval);
        handleCapture(index, currentFrameConfig);
      }
    }, 1000);
  };

  const handleCapture = (index: number, currentFrame: FrameConfig) => {
    const shot = capturePhoto();
    
    if (shot) {
      setPhotos(prev => {
        const newPhotos = [...prev];
        newPhotos[index] = shot;
        return newPhotos;
      });
    } else {
      console.warn("⚠️ Kamera skip frame, melanjutkan...");
    }

    // LOGIKA NAVIGASI
    if (retakeIndex !== null) {
      setRetakeIndex(null);
      setTimeout(() => setStep('review'), 500); 
    } 
    else if (index < currentFrame.photoCount - 1) {
      setTimeout(() => startCountdown(index + 1, currentFrame), 1500); 
    } 
    else {
      stopRecording(); 
      setTimeout(() => setStep('review'), 1000);
    }
  };

  const handleRetake = (index: number) => {
    setRetakeIndex(index);
    setStep('capture');
    startCountdown(index);
  };

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

        {/* KANAN: Main Stage */}
        <div className="flex-2 order-1 md:order-2 bg-[#1a1a2e] border-8 border-black rounded-[3rem] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5),inset_0_0_20px_black] flex flex-col relative ring-4 ring-gray-800">
          
          <div className="absolute inset-0 bg-linear-to-tr from-white/5 to-transparent pointer-events-none z-50 rounded-[2.5rem]" />

          {/* --- FIX: WEBCAM PERSISTENT (SELALU RENDER, CUMA DI-HIDE) --- */}
          {/* Ini menjamin stream tidak putus saat ganti halaman */}
          <div className={\`absolute inset-0 z-0 bg-black \${step === 'capture' ? 'opacity-100' : 'opacity-0 pointer-events-none'}\`}>
             <Webcam
               ref={webcamRef}
               audio={false}
               screenshotFormat="image/jpeg"
               videoConstraints={{ facingMode: "user", width: 1280, height: 720 }}
               className="w-full h-full object-cover transform scale-x-[-1]"
             />
          </div>

          {/* OVERLAY: COUNTDOWN & FLASH (Hanya Muncul saat Capture) */}
          {step === 'capture' && (
             <>
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
               {countdown === 0 && (
                  <motion.div 
                    initial={{ opacity: 1 }} 
                    animate={{ opacity: 0 }} 
                    transition={{ duration: 0.5 }} 
                    className="absolute inset-0 bg-white z-50 pointer-events-none" 
                  />
               )}
             </>
          )}

          {/* STAGE: CONTENT LAYERS (Z-INDEX > 0) */}
          <div className="relative z-10 w-full h-full flex flex-col">
          
            {step === 'home' && (
              <div className="flex-1 flex flex-col items-center justify-center gap-6 bg-gray-900/90 backdrop-blur-md">
                <div className="animate-bounce">
                  <RetroButton onClick={() => setStep('frame-select')} color="pink">START GAME</RetroButton>
                </div>
              </div>
            )}

            {step === 'frame-select' && (
              <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto custom-scrollbar bg-gray-900/90 backdrop-blur-md">
                <FrameSelector onSelect={handleFrameSelect} />
              </div>
            )}

            {step === 'review' && (
              <div className="flex-1 bg-gray-900/95 backdrop-blur-md">
                <ReviewStage 
                  photos={photos} 
                  onRetake={handleRetake} 
                  onConfirm={() => setStep('result')} 
                />
              </div>
            )}

            {step === 'result' && (
              <div className="h-full p-6 overflow-y-auto custom-scrollbar bg-gray-900">
                <ResultStage photos={photos} videoUrl={videoUrl} frameConfig={selectedFrame} />
              </div>
            )}
          </div>

        </div>
      </div>
    </main>
  );
}
`;

fs.writeFileSync('src/app/page.tsx', pageCode);
console.log('✅ FIXED: Webcam sekarang Persistent (Anti-Putus Stream)!');