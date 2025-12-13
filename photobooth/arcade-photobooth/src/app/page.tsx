"use client";
import React, { useState, useEffect } from "react";
import Webcam from "react-webcam";
import { motion, AnimatePresence } from "framer-motion";
import Mascot from "@/components/Mascot";
import RetroButton from "@/components/RetroButton";
import FrameSelector from "@/components/FrameSelector";
import ReviewStage from "@/components/ReviewStage";
import ResultStage from "@/components/ResultStage";
import { FRAMES, FrameConfig } from "@/lib/frames";
import { useSmartWebcam } from "@/hooks/useSmartWebcam";
import { Settings, Camera, Lock, Play, ArrowRight } from 'lucide-react';

type Step = 'home' | 'frame-select' | 'capture' | 'review' | 'result';

export type Adjustment = { x: number; y: number; scale: number; rotation: number };

export default function ArcadePhotobooth() {
  const [step, setStep] = useState<Step>('home');
  const [selectedFrame, setSelectedFrame] = useState<FrameConfig>(FRAMES[0]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoAdjustments, setPhotoAdjustments] = useState<Adjustment[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0); 
  const [retakeIndex, setRetakeIndex] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [uploadedFrameLayer, setUploadedFrameLayer] = useState<string | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isWaitingNext, setIsWaitingNext] = useState(false);

  const { webcamRef, startSingleClip, stopSingleClip, resetClips, videoClips, capturePhoto, devices, activeDeviceId, switchCamera } = useSmartWebcam();

  useEffect(() => {
    setPhotoAdjustments(
        Array(selectedFrame.photoCount).fill({ x: 0, y: 0, scale: 1, rotation: 0 })
    );
  }, [selectedFrame.photoCount, photos.length]);

  const handleResetSession = () => {
    setStep('home');
    setPhotos([]);
    resetClips();
    setUploadedFrameLayer(null);
    setIsSessionActive(false);
    setIsWaitingNext(false);
    setCountdown(null);
    setCurrentIndex(0);
    setPhotoAdjustments(Array(selectedFrame.photoCount).fill({ x: 0, y: 0, scale: 1, rotation: 0 }));
  };

  const handleFrameSelect = (frame: FrameConfig) => {
    setSelectedFrame(frame);
    setPhotos(Array(frame.photoCount).fill(''));
    resetClips();
    setStep('capture');
    setIsSessionActive(false); 
    setIsWaitingNext(false);
  };

  const startSession = () => { setIsSessionActive(true); startCountdown(0); };
  const nextPose = () => { setIsWaitingNext(false); startCountdown(currentIndex + 1); };

  const startCountdown = (index: number, activeFrame?: FrameConfig) => {
    setCurrentIndex(index);
    setCountdown(3);
    startSingleClip(); 
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
    stopSingleClip(index);
    if (shot) {
      setPhotos(prev => { const newPhotos = [...prev]; newPhotos[index] = shot; return newPhotos; });
    }
    if (retakeIndex !== null) {
      setRetakeIndex(null);
      setTimeout(() => setStep('review'), 500); 
    } 
    else if (index < currentFrame.photoCount - 1) { setIsWaitingNext(true); } 
    else { setTimeout(() => setStep('review'), 1000); }
  };

  const handleRetake = (index: number) => {
    setRetakeIndex(index);
    setStep('capture');
    setIsSessionActive(true);
    startCountdown(index);
  };

  const updateAdjustment = (index: number, newAdj: Adjustment) => {
      setPhotoAdjustments(prev => {
          const clone = [...prev];
          clone[index] = newAdj;
          return clone;
      });
  };

  const handleSwapPhotos = (indexA: number, indexB: number) => {
    const newPhotos = [...photos];
    const temp = newPhotos[indexA];
    newPhotos[indexA] = newPhotos[indexB];
    newPhotos[indexB] = temp;
    setPhotos(newPhotos);
    const newAdjs = [...photoAdjustments];
    newAdjs[indexA] = { x: 0, y: 0, scale: 1, rotation: 0 };
    newAdjs[indexB] = { x: 0, y: 0, scale: 1, rotation: 0 };
    setPhotoAdjustments(newAdjs);
  };

  const getMascotState = () => {
    if (step === 'home') return 'idle';
    if (step === 'capture' && !isSessionActive) return 'idle';
    if (step === 'capture' && isWaitingNext) return 'idle'; 
    if (step === 'capture' && countdown === 0) return 'processing';
    if (step === 'capture') return 'countdown';
    if (step === 'review') return 'processing';
    if (step === 'result') return 'result';
    return 'idle';
  };

  return (
    // FIX LAYOUT: Gunakan min-h-screen dan overflow-y-auto agar bisa di-scroll jika di-zoom
    <main className="min-h-screen w-full flex flex-col items-center justify-center relative font-sans overflow-y-auto overflow-x-hidden p-4 md:p-8 bg-black">
      <div className="absolute inset-0 cyber-grid -z-20 opacity-50 fixed" />
      <div className="absolute inset-0 bg-linear-to-t from-black via-transparent to-black -z-10 fixed" />

      {/* HEADER */}
      <div className="absolute top-6 left-6 z-[50] flex items-center gap-4">
        {step === 'home' && (
             <button onClick={() => window.location.href = '/admin'} className="flex items-center justify-center p-3 bg-gray-900 border border-gray-700 rounded-full text-gray-400 hover:text-white hover:bg-[--neon-pink] shadow-lg cursor-pointer"><Lock size={20}/></button>
        )}
        <h1 className="text-3xl font-black italic text-transparent bg-clip-text bg-linear-to-r from-[--neon-cyan] to-[--neon-pink] drop-shadow-[2px_2px_0px_#000] ml-2 hidden md:block">ARCADE BOOTH</h1>
      </div>

      {/* SETTINGS */}
      {step === 'home' && (
        <div className="absolute top-6 right-6 z-[100]">
          <button onClick={() => setShowSettings(!showSettings)} className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 border border-gray-600 text-white shadow-lg cursor-pointer">
            <Settings size={24} className={showSettings ? "animate-spin" : ""} />
          </button>
          {showSettings && (
            <div className="absolute right-0 mt-2 w-64 bg-black border-2 border-[--neon-cyan] rounded-xl p-4 shadow-[0_0_20px_var(--neon-cyan)] z-50">
               <h3 className="text-[--neon-cyan] font-bold mb-2 flex items-center gap-2"><Camera size={16}/> Select Source</h3>
               <select className="w-full bg-gray-900 text-white p-2 rounded border border-gray-700 text-xs cursor-pointer" onChange={(e) => switchCamera(e.target.value)} value={activeDeviceId}>
                 {devices.map((device) => (<option key={device.deviceId} value={device.deviceId}>{device.label || `Camera ${device.deviceId.slice(0,5)}...`}</option>))}
               </select>
            </div>
          )}
        </div>
      )}

      {/* MAIN CONTAINER: Gunakan min-h agar fleksibel */}
      <div className="z-10 w-full max-w-7xl flex flex-col md:flex-row gap-6 min-h-[85vh] py-16 md:py-0">
        
        {/* KOLOM KIRI (Mascot) */}
        <div className="flex-1 flex flex-col items-center justify-center order-2 md:order-1 relative shrink-0">
          <Mascot status={getMascotState()} />
          <div className="mt-4 text-center w-full min-h-[100px] flex flex-col items-center justify-center">
             <AnimatePresence mode="wait">
                {step === 'capture' && isSessionActive && !isWaitingNext && countdown !== null && countdown > 0 ? (
                    <motion.div key="cnt" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} className="flex flex-col items-center">
                        <span className="text-8xl md:text-9xl font-black text-[--neon-yellow] drop-shadow-[4px_4px_0px_#000] font-mono leading-none">{countdown}</span>
                        <p className="text-[--neon-cyan] font-bold text-xl mt-2 animate-pulse">POSE #{currentIndex + 1}</p>
                    </motion.div>
                ) : (
                    <motion.div key="text" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        {step === 'home' && <p className="text-gray-400 font-mono">Touch Screen to Start!</p>}
                        {step === 'frame-select' && <p className="text-[--neon-cyan] font-bold">Setup Frame & Layout</p>}
                        {step === 'capture' && !isSessionActive && (<div className="bg-black/40 p-4 rounded-xl border border-[--neon-yellow]"><p className="text-[--neon-yellow] animate-pulse font-bold text-lg">SIAPKAN GAYAMU!</p><p className="text-xs text-gray-300 mt-1">Tekan tombol Mulai</p></div>)}
                        {step === 'capture' && isWaitingNext && (<div className="bg-black/40 p-4 rounded-xl border border-[--neon-pink]"><p className="text-[--neon-pink] font-bold text-lg animate-pulse">Gaya Berikutnya?</p><p className="text-xs text-gray-300 mt-1">Tekan tombol Lanjut</p></div>)}
                        {step === 'review' && <p className="text-white text-sm text-center">Geser Slider untuk mengatur posisi.<br/>Klik foto untuk memilih.</p>}
                        {step === 'result' && <p className="text-white">Selesai! Ambil foto di printer.</p>}
                    </motion.div>
                )}
             </AnimatePresence>
          </div>
        </div>

        {/* KOLOM KANAN (Stage) */}
        <div className="flex-[2] order-1 md:order-2 bg-[#1a1a2e] border-8 border-black rounded-[2rem] md:rounded-[3rem] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5),inset_0_0_20px_black] flex flex-col relative ring-4 ring-gray-800 min-h-[500px]">
          <div className="absolute inset-0 bg-linear-to-tr from-white/5 to-transparent pointer-events-none z-50 rounded-[2.5rem]" />

          <div className={`absolute inset-0 z-0 bg-black ${step === 'capture' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
             <Webcam ref={webcamRef} audio={false} videoConstraints={{ deviceId: activeDeviceId, width: 1920, height: 1080 }} screenshotFormat="image/jpeg" className="w-full h-full object-cover transform scale-x-[-1]" />
             {uploadedFrameLayer && step === 'capture' && (<img src={uploadedFrameLayer} className="absolute inset-0 w-full h-full object-cover z-30 opacity-50 pointer-events-none" />)}
          </div>

          {step === 'capture' && (
             <>
               {!isSessionActive && (<div className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"><button onClick={startSession} className="bg-[--neon-cyan] text-black font-black text-2xl px-12 py-6 rounded-full border-4 border-white shadow-[0_0_40px_var(--neon-cyan)] hover:scale-110 transition-transform flex items-center gap-4 animate-bounce"><Play fill="black" size={32} /> MULAI POSE</button></div>)}
               {isWaitingNext && (<div className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"><div className="flex flex-col items-center gap-4"><div className="w-32 h-32 border-4 border-white rounded-lg overflow-hidden -rotate-6 shadow-xl mb-4 bg-white"><img src={photos[currentIndex]} className="w-full h-full object-cover transform scale-x-[-1]" /></div><button onClick={nextPose} className="bg-[--neon-pink] text-white font-black text-2xl px-10 py-5 rounded-full border-4 border-white shadow-[0_0_40px_var(--neon-pink)] hover:scale-110 transition-transform flex items-center gap-4">LANJUT POSE {currentIndex + 2} <ArrowRight size={32} /></button></div></div>)}
             </>
          )}
          
          {step === 'capture' && countdown === 0 && (<motion.div initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.5 }} className="absolute inset-0 bg-white z-50 pointer-events-none" />)}

          <div className="relative z-10 w-full h-full flex flex-col">
            {step === 'home' && ( <div className="flex-1 flex flex-col items-center justify-center gap-6 bg-gray-900/90 backdrop-blur-md"><div className="animate-bounce"><RetroButton onClick={() => setStep('frame-select')} color="pink">START GAME</RetroButton></div></div> )}
            {step === 'frame-select' && ( <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto custom-scrollbar bg-gray-900/90 backdrop-blur-md"><FrameSelector onSelect={handleFrameSelect} uploadedFrameLayer={uploadedFrameLayer} setUploadedFrameLayer={setUploadedFrameLayer} /></div> )}

            {step === 'review' && (
              <div className="flex-1 bg-gray-900/95 backdrop-blur-md">
                <ReviewStage 
                    photos={photos} 
                    onRetake={handleRetake} 
                    onConfirm={() => setStep('result')}
                    frameConfig={selectedFrame}
                    uploadedFrameLayer={uploadedFrameLayer}
                    setUploadedFrameLayer={setUploadedFrameLayer}
                    photoAdjustments={photoAdjustments}
                    onUpdateAdjustment={updateAdjustment}
                    onSelectFrame={setSelectedFrame} 
                    onSwapPhotos={handleSwapPhotos}
                />
              </div>
            )}

            {step === 'result' && (
              <div className="h-full p-6 overflow-y-auto custom-scrollbar bg-gray-900">
                <ResultStage 
                    photos={photos} 
                    videoClips={videoClips} 
                    frameConfig={selectedFrame}
                    uploadedFrameLayer={uploadedFrameLayer}
                    onReset={handleResetSession}
                    photoAdjustments={photoAdjustments} 
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}