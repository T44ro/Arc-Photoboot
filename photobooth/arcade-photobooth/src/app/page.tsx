"use client";
import React, { useState, useEffect } from "react";
import Webcam from "react-webcam";
import { motion, AnimatePresence } from "framer-motion";
import Mascot from "@/components/Mascot";
import ResultStage from "@/components/ResultStage"; 
import { useSmartWebcam } from "@/hooks/useSmartWebcam";
import { Settings, Camera, Lock, Play, ArrowRight, ChevronLeft, Check } from 'lucide-react';

interface FrameData {
  id: string;
  name: string;
  imageUrl: string;
  photoCount: 3 | 4;
  layout: any[]; 
}

export default function ArcadePhotobooth() {
  const [step, setStep] = useState<'home' | 'frame-select' | 'capture' | 'result'>('home');
  const [frames, setFrames] = useState<FrameData[]>([]);
  const [selectedFrame, setSelectedFrame] = useState<FrameData | null>(null);
  
  const [photos, setPhotos] = useState<string[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0); 
  const [showSettings, setShowSettings] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isWaitingNext, setIsWaitingNext] = useState(false);
  const [isRetaking, setIsRetaking] = useState(false);
  
  // STATE PREVIEW 3 DETIK
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);

  const { webcamRef, startSingleClip, stopSingleClip, resetClips, videoClips, capturePhoto, devices, activeDeviceId, switchCamera } = useSmartWebcam();

  // Load Frames
  useEffect(() => {
    const savedFrames = localStorage.getItem('MY_FRAMES');
    if (savedFrames) {
        const parsed: FrameData[] = JSON.parse(savedFrames);
        setFrames(parsed);
        if (parsed.length > 0) setSelectedFrame(parsed[0]);
    }
  }, []);

  const handleStartCapture = () => {
      if (!selectedFrame) return;
      setPhotos(Array(selectedFrame.photoCount).fill('')); 
      resetClips();
      setStep('capture');
      setIsSessionActive(false); 
      setIsWaitingNext(false);
      setIsRetaking(false);
      setCurrentIndex(0);
  };

  const startSession = () => { setIsSessionActive(true); startCountdown(0); };
  
  const nextPose = () => { 
      setIsWaitingNext(false);
      setCapturedPreview(null); 
      const nextIdx = photos.findIndex(p => p === '');
      
      if (nextIdx !== -1) {
          setCurrentIndex(nextIdx);
          startCountdown(nextIdx);
      } else {
          setStep('result');
      }
  };

  const handleSingleRetake = (index: number) => {
      setCurrentIndex(index);
      setIsRetaking(true);
      setIsSessionActive(true);
      setIsWaitingNext(false);
      setStep('capture');
      startCountdown(index);
  };

  const startCountdown = (index: number) => {
    setCurrentIndex(index);
    setCountdown(3);
    setIsSessionActive(true);
    startSingleClip(); 
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

  const handleCapture = (index: number) => {
    const shot = capturePhoto();
    stopSingleClip(index);
    
    if (shot) {
        setPhotos(prev => {
            const newPhotos = [...prev];
            newPhotos[index] = shot;
            return newPhotos;
        });
        
        setCapturedPreview(shot);
        setCountdown(null);
        setIsSessionActive(false); 

        setTimeout(() => {
            setCapturedPreview(null); 

            if (isRetaking) {
                setIsRetaking(false);
                setStep('result');
            } else {
                setIsWaitingNext(true);
            }
        }, 3000);
    }
  };

  return (
    <main className="min-h-screen w-full bg-[#0a0a0a] text-white font-mono overflow-hidden flex flex-col">
      {/* HEADER SETTINGS */}
      <div className="absolute top-4 right-4 z-50">
           <button onClick={() => setShowSettings(!showSettings)} className="p-2 text-gray-600 hover:text-white transition-colors"><Settings size={20}/></button>
           {showSettings && (
              <div className="absolute right-0 mt-2 bg-gray-900 border border-gray-700 p-2 rounded w-48 shadow-xl">
                  <button onClick={() => window.location.href='/admin'} className="flex items-center gap-2 text-xs p-2 hover:bg-gray-800 w-full text-left mb-2 rounded"><Lock size={12}/> Frame Creator (Admin)</button>
                  <select className="w-full bg-black text-white p-1 text-[10px] border border-gray-700 rounded mt-2" onChange={(e) => switchCamera(e.target.value)} value={activeDeviceId}>
                      {devices.map((d) => (<option key={d.deviceId} value={d.deviceId}>{d.label || 'Camera'}</option>))}
                  </select>
              </div>
           )}
      </div>

      {/* --- STEP 1: HOME --- */}
      {step === 'home' && (
        <div className="flex-1 flex flex-col items-center justify-center relative">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-[#0a0a0a] to-[#0a0a0a]" />
            <div className="relative z-10 mb-8 transform scale-150"><Mascot status="idle" /></div>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setStep('frame-select')} className="relative z-10 bg-white text-black px-12 py-4 rounded-full font-black text-2xl flex items-center gap-3 shadow-[0_0_40px_rgba(255,255,255,0.4)] transition-all">
                MULAI <Play fill="black" size={24}/>
            </motion.button>
        </div>
      )}

      {/* --- STEP 2: FRAME SELECTION --- */}
      {step === 'frame-select' && (
        <div className="flex-1 flex flex-col p-4 md:p-6 relative bg-[#0a0a0a] overflow-hidden">
            <h1 className="text-center text-3xl font-black mb-4 text-white tracking-widest shrink-0">PILIH BINGKAI</h1>
            <div className="flex-1 flex gap-8 items-center justify-center w-full max-w-7xl mx-auto min-h-0 h-[65vh]">
                <div className="h-[75vh] aspect-[1/3] flex items-center justify-center">
                    <div className="bg-[#111] border-4 border-gray-800 p-2 rounded-2xl shadow-2xl w-full h-full flex flex-col relative">
                        <div className="flex-1 bg-white relative overflow-hidden rounded shadow-inner">
                             {selectedFrame && (
                                <div className="absolute inset-0 w-full h-full">
                                    {selectedFrame.layout.map((pos, i) => (
                                        <div key={i} style={{ 
                                            position: 'absolute',
                                            top: `${(i * 25 + 10)}%`, left: '10%', right: '10%', height: '15%',
                                            background: '#ddd', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}>
                                            <span className="text-gray-400 font-bold text-xl">{i+1}</span>
                                        </div>
                                    ))}
                                    <img src={selectedFrame.imageUrl} className="absolute inset-0 w-full h-full object-cover z-20 pointer-events-none" />
                                </div>
                             )}
                        </div>
                    </div>
                </div>
                <div className="flex flex-col gap-6 w-1/2 h-[75vh] justify-center">
                    <div className="w-full bg-[#111] border border-gray-800 rounded-[1.5rem] p-6 relative flex flex-col shadow-2xl h-[400px]">
                        <div className="absolute -top-3 left-6 bg-[#0a0a0a] px-4 text-gray-400 font-bold text-xs tracking-widest border border-gray-800 rounded-full z-10">KOLEKSI BINGKAI</div>
                        {frames.length === 0 ? (
                            <div className="flex-1 flex items-center justify-center text-gray-500 text-center px-8">Belum ada bingkai. Buka /admin</div>
                        ) : (
                            <div className="grid grid-cols-3 gap-4 mt-4 overflow-y-auto custom-scrollbar p-2">
                                {frames.map((frame) => (
                                    <motion.button key={frame.id} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setSelectedFrame(frame)} className={`aspect-[1/3] rounded-xl relative overflow-hidden border-2 transition-all ${selectedFrame?.id === frame.id ? 'border-[--neon-cyan] ring-2 ring-[--neon-cyan]/50' : 'border-gray-800 opacity-60 hover:opacity-100'}`}>
                                        <img src={frame.imageUrl} className="w-full h-full object-cover" />
                                        {selectedFrame?.id === frame.id && (<div className="absolute inset-0 bg-[--neon-cyan]/20 flex items-center justify-center"><Check className="text-white drop-shadow-md" size={32}/></div>)}
                                    </motion.button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="flex justify-end mt-2">
                        <button onClick={handleStartCapture} disabled={!selectedFrame} className="bg-white text-black px-12 py-4 rounded-full font-black text-xl flex items-center gap-3 shadow-[0_0_40px_rgba(255,255,255,0.4)] hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed w-full justify-center">MULAI FOTO <ArrowRight size={24}/></button>
                    </div>
                </div>
            </div>
            <div className="fixed bottom-8 left-8"><button onClick={() => setStep('home')} className="bg-[#1a1a1a] text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 hover:bg-[#2a2a2a] transition-all border border-gray-800 text-sm"><ChevronLeft size={18}/> KEMBALI</button></div>
        </div>
      )}

      {/* --- STEP 3: CAPTURE --- */}
      {step === 'capture' && (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-black relative">
            
            {/* 1. PREVIEW HASIL 3 DETIK */}
            <AnimatePresence>
                {capturedPreview && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.8 }} 
                        animate={{ opacity: 1, scale: 1 }} 
                        exit={{ opacity: 0 }} 
                        className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-8"
                    >
                        <h2 className="text-[--neon-yellow] text-5xl font-black mb-6 animate-bounce tracking-wider drop-shadow-[0_0_20px_rgba(250,204,21,0.5)]">KEREN! 😎</h2>
                        <img src={capturedPreview} className="h-[70vh] aspect-video object-contain border-8 border-white rounded-xl shadow-[0_0_50px_rgba(255,255,255,0.2)] transform scale-x-[-1]" />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 2. COUNTDOWN OVERLAY */}
            <AnimatePresence>
                {isSessionActive && countdown !== null && countdown > 0 && (
                    <motion.div 
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1.5, opacity: 1 }}
                        exit={{ scale: 2, opacity: 0 }}
                        key={countdown}
                        className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
                    >
                        <div className="text-[15rem] font-black text-white drop-shadow-[0_0_30px_rgba(0,0,0,0.8)] stroke-black tracking-tighter">
                            {countdown}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* SIDEBAR TIMELINE */}
            <div className="absolute right-0 top-0 bottom-0 w-48 bg-black/80 border-l border-gray-800 flex flex-col gap-4 p-4 overflow-y-auto z-40 backdrop-blur-md">
                {photos.map((p, i) => (
                    <div key={i} className={`relative w-full aspect-video bg-gray-900 border-2 rounded-lg overflow-hidden shrink-0 flex items-center justify-center ${i === currentIndex ? 'border-[--neon-cyan] shadow-[0_0_15px_var(--neon-cyan)]' : 'border-gray-700 opacity-60'}`}>
                        {p ? <img src={p} className="w-full h-full object-cover scale-x-[-1]" /> : <span className="text-gray-600 font-bold">{i+1}</span>}
                    </div>
                ))}
            </div>

            {/* WEBCAM & CONTROLS */}
            <div className="relative w-full h-full">
                <Webcam ref={webcamRef} audio={false} videoConstraints={{ deviceId: activeDeviceId, width: 1920, height: 1080 }} className="w-full h-full object-cover transform scale-x-[-1]" />
                
                <AnimatePresence>
                    {/* TOMBOL MULAI */}
                    {!isSessionActive && !isWaitingNext && !capturedPreview && (
                        <div className="absolute inset-x-0 bottom-16 flex justify-center z-40">
                            <button onClick={startSession} className="bg-white text-black px-16 py-6 rounded-full font-black text-3xl flex items-center gap-4 animate-bounce hover:scale-105 transition-transform shadow-[0_0_50px_rgba(255,255,255,0.5)]">
                                <Camera size={40}/> MULAI FOTO
                            </button>
                        </div>
                    )}

                    {/* OVERLAY LANJUT POSE (TRANSPARAN + STROKE TEXT) */}
                    {isWaitingNext && !capturedPreview && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center z-40 pointer-events-none animate-in fade-in duration-300">
                            
                            {/* TEKS DENGAN STROKE HITAM */}
                            <div className="text-white text-6xl font-black mb-8 tracking-widest animate-pulse [-webkit-text-stroke:3px_black] drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)]">
                                FOTO {currentIndex + 1} SELESAI!
                            </div>
                            
                            {/* TOMBOL DENGAN POINTER EVENTS AUTO AGAR BISA DIKLIK */}
                            <button onClick={nextPose} className="pointer-events-auto bg-[--neon-yellow] text-black px-24 py-10 rounded-3xl font-black text-5xl flex items-center gap-6 hover:scale-110 transition-transform shadow-[0_0_60px_rgba(250,204,21,0.8)] border-4 border-white [-webkit-text-stroke:1px_white]">
                                {currentIndex < (selectedFrame?.photoCount || 3) - 1 ? (
                                    <>LANJUT POSE {currentIndex + 2} <ArrowRight size={56}/></>
                                ) : (
                                    <>LIHAT HASIL <ArrowRight size={56}/></>
                                )}
                            </button>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
      )}

      {/* --- STEP 4: RESULT --- */}
      {step === 'result' && selectedFrame && (
        <div className="h-screen w-full bg-[#0a0a0a]">
            <ResultStage 
                photos={photos} 
                videoClips={videoClips} 
                photoAdjustments={selectedFrame.layout} 
                uploadedFrameLayer={selectedFrame.imageUrl} 
                onReset={() => setStep('home')}
                onRetakePhoto={handleSingleRetake}
            />
        </div>
      )}
    </main>
  );
}