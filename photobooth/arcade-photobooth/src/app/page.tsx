"use client";
import React, { useState, useEffect } from "react";
import Webcam from "react-webcam";
import { motion, AnimatePresence } from "framer-motion";
import Mascot from "@/components/Mascot";
import ResultStage from "@/components/ResultStage"; 
import { useSmartWebcam } from "@/hooks/useSmartWebcam";
import { Settings, Camera, Lock, Play, ArrowRight, ChevronLeft, Upload, XCircle } from 'lucide-react';

const STRIP_CONFIGS = {
    3: { id: 'strip-3', label: '3 POSE STRIP', photoCount: 3, gridClass: 'grid grid-rows-3 grid-cols-1 gap-2' },
    4: { id: 'strip-4', label: '4 POSE STRIP', photoCount: 4, gridClass: 'grid grid-rows-4 grid-cols-1 gap-2' }
};

type Step = 'home' | 'frame-select' | 'capture' | 'result'; 

export default function ArcadePhotobooth() {
  const [step, setStep] = useState<Step>('home');
  const [availableFrames, setAvailableFrames] = useState<string[]>([]);
  const [selectedFrameUrl, setSelectedFrameUrl] = useState<string | null>(null);
  const [poseCount, setPoseCount] = useState<3 | 4>(3);
  const [photos, setPhotos] = useState<string[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0); 
  const [showSettings, setShowSettings] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isWaitingNext, setIsWaitingNext] = useState(false);
  const [isRetaking, setIsRetaking] = useState(false);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [adminSettings, setAdminSettings] = useState<any[]>([]);
  
  // Webcam Constraints
  const { webcamRef, startSingleClip, stopSingleClip, resetClips, videoClips, capturePhoto, devices, activeDeviceId, switchCamera } = useSmartWebcam();

  // 1. Load Frames
  useEffect(() => {
    const loadFrames = async () => {
        try {
            const res = await fetch('/api/frames');
            const data = await res.json();
            if (data.success && data.frames.length > 0) {
                setAvailableFrames(data.frames);
                setSelectedFrameUrl(data.frames[0]);
            }
        } catch (e) { console.error("Gagal load frames", e); }
    };
    loadFrames();
  }, []);

  // 2. Load Admin Settings (FIXED: Berdasarkan PoseCount)
  useEffect(() => {
    const fetchAdminSettings = async () => {
        try {
            const res = await fetch('/api/admin/settings');
            const data = await res.json();
            
            // KUNCI PERBAIKAN: Gunakan ID 'strip-3' atau 'strip-4'
            const frameId = `strip-${poseCount}`; 
            
            if (data.success && data.settings && data.settings[frameId]) {
                console.log("Settings found for:", frameId, data.settings[frameId]);
                setAdminSettings(data.settings[frameId]);
            } else {
                console.log("No settings for:", frameId, "Using default.");
                setAdminSettings(Array(poseCount).fill({ x: 0, y: 0, scale: 1, rotation: 0 }));
            }
        } catch (e) { console.error(e); }
    };
    
    // Panggil saat ganti step atau ganti jumlah pose
    if (step === 'frame-select' || step === 'capture') {
        fetchAdminSettings();
    }
  }, [poseCount, step]); // Dependency diperbaiki

  const handleResetSession = () => {
    setStep('home');
    setPhotos([]);
    resetClips();
    setIsSessionActive(false);
    setIsWaitingNext(false);
    setIsRetaking(false);
    setCapturedPreview(null);
    setCountdown(null);
    setCurrentIndex(0);
  };

  const handleStartCapture = () => {
      setPhotos(Array(poseCount).fill('')); 
      resetClips();
      setStep('capture');
      setIsSessionActive(false); 
      setIsWaitingNext(false);
      setIsRetaking(false);
      setCurrentIndex(0);
  };

  const handleCustomFrameUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            setAvailableFrames(prev => [result, ...prev]);
            setSelectedFrameUrl(result);
        };
        reader.readAsDataURL(file);
    }
  };

  const startSession = () => { setIsSessionActive(true); startCountdown(0); };
  
  const nextPose = () => { 
      setIsWaitingNext(false);
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

        setTimeout(() => {
            setCapturedPreview(null); 
            if (isRetaking) {
                setIsRetaking(false);
                setStep('result'); 
            } else {
                if (index < poseCount - 1) {
                    setIsSessionActive(false); 
                    setIsWaitingNext(true);    
                } else {
                    setIsSessionActive(false);
                    setIsWaitingNext(true);
                }
            }
        }, 3000); 
    }
  };

  const getMascotState = () => {
    if (step === 'home') return 'idle';
    if (step === 'capture' && !isSessionActive) return 'idle';
    if (step === 'capture' && isWaitingNext) return 'idle'; 
    if (step === 'capture' && countdown === 0) return 'processing';
    if (step === 'capture') return 'countdown';
    if (step === 'result') return 'result';
    return 'idle';
  };

  return (
    <main className="min-h-screen w-full bg-[#0a0a0a] text-white font-mono overflow-hidden relative selection:bg-purple-500 selection:text-white flex flex-col">
      {/* HEADER */}
      {step === 'home' && (
        <div className="absolute top-4 right-4 z-50">
             <button onClick={() => setShowSettings(!showSettings)} className="p-2 text-gray-600 hover:text-white transition-colors"><Settings size={20}/></button>
             {showSettings && (
                <div className="absolute right-0 mt-2 bg-gray-900 border border-gray-700 p-2 rounded w-48 shadow-xl">
                    <button onClick={() => window.location.href='/admin'} className="flex items-center gap-2 text-xs p-2 hover:bg-gray-800 w-full text-left mb-2 rounded"><Lock size={12}/> Admin Panel</button>
                    <select className="w-full bg-black text-white p-1 text-[10px] border border-gray-700 rounded" onChange={(e) => switchCamera(e.target.value)} value={activeDeviceId}>
                        {devices.map((d) => (<option key={d.deviceId} value={d.deviceId}>{d.label || 'Camera'}</option>))}
                    </select>
                </div>
             )}
        </div>
      )}

      {/* STEP 1: HOME */}
      {step === 'home' && (
        <div className="flex-1 flex flex-col items-center justify-center relative">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-[#0a0a0a] to-[#0a0a0a]" />
            <div className="relative z-10 mb-8 transform scale-150"><Mascot status="idle" /></div>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setStep('frame-select')} className="relative z-10 bg-white text-black px-12 py-4 rounded-full font-black text-2xl flex items-center gap-3 shadow-[0_0_40px_rgba(255,255,255,0.4)] transition-all">
                MULAI <Play fill="black" size={24}/>
            </motion.button>
        </div>
      )}

      {/* STEP 2: FRAME SELECT */}
      {step === 'frame-select' && (
        <div className="flex-1 flex flex-col p-4 md:p-6 relative bg-[#0a0a0a] overflow-hidden">
            <h1 className="text-center text-3xl font-black mb-4 text-white tracking-[0.2em] drop-shadow-[0_0_10px_rgba(255,255,255,0.5)] shrink-0">PILIH GAYAMU</h1>
            <div className="flex-1 flex gap-8 items-center justify-center w-full max-w-7xl mx-auto min-h-0 h-[65vh]">
                <div className="h-[75vh] aspect-[1/3] flex items-center justify-center">
                    <div className="bg-[#111] border-4 border-gray-800 p-3 rounded-2xl shadow-2xl w-full h-full flex flex-col relative transition-all duration-300">
                        <div className="flex-1 bg-white p-2 flex flex-col gap-1 relative overflow-hidden rounded-md shadow-inner">
                             <div className={`flex-1 ${STRIP_CONFIGS[poseCount].gridClass} w-full h-full`}>
                                 {[...Array(poseCount)].map((_, i) => (
                                     <div key={i} className="bg-gray-300 w-full h-full flex items-center justify-center overflow-hidden border border-gray-400">
                                         <span className="text-4xl font-black text-gray-400">{i+1}</span>
                                     </div>
                                 ))}
                             </div>
                             {selectedFrameUrl && (<img src={selectedFrameUrl} className="absolute inset-0 w-full h-full object-cover z-20 pointer-events-none" />)}
                             <div className="text-center text-[10px] font-bold text-black mt-1 uppercase tracking-widest shrink-0">KEMIL.CO</div>
                        </div>
                        <div className="text-center mt-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">PREVIEW HASIL</div>
                    </div>
                </div>

                <div className="flex flex-col gap-6 w-1/2 h-[75vh] justify-center">
                    <div className="w-full bg-[#111] border border-gray-800 rounded-[1.5rem] p-6 relative flex flex-col shadow-2xl h-[280px]">
                        <div className="absolute -top-3 left-6 bg-[#0a0a0a] px-4 text-gray-400 font-bold text-xs tracking-widest border border-gray-800 rounded-full z-10 flex items-center gap-2">✨ PILIH BINGKAI</div>
                        <div className="absolute top-4 right-4 z-20">
                             <label className="flex items-center gap-2 text-gray-500 hover:text-white cursor-pointer text-[10px] font-bold transition-colors border border-gray-800 px-3 py-1 rounded-full hover:bg-gray-800">
                                <Upload size={12}/> CUSTOM
                                <input type="file" accept="image/png" className="hidden" onChange={handleCustomFrameUpload} />
                             </label>
                        </div>
                        <div className="flex-1 w-full overflow-x-auto overflow-y-hidden custom-scrollbar flex items-center gap-4 px-2 mt-4">
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setSelectedFrameUrl(null)} className={`min-w-[100px] h-[80%] rounded-xl flex flex-col items-center justify-center gap-2 border-2 border-dashed transition-all shrink-0 ${selectedFrameUrl === null ? 'border-red-500 bg-red-900/10 text-red-500' : 'border-gray-800 text-gray-600 hover:border-gray-600 hover:text-white'}`}>
                                <XCircle size={24} /><span className="font-bold text-[10px]">NO FRAME</span>
                            </motion.button>
                            {availableFrames.map((frameUrl, idx) => (
                                <motion.div key={idx} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setSelectedFrameUrl(frameUrl)} className={`min-w-[100px] h-[80%] rounded-xl cursor-pointer relative overflow-hidden flex flex-col bg-gray-900 border-2 shrink-0 ${selectedFrameUrl === frameUrl ? 'border-[--neon-cyan] shadow-[0_0_15px_rgba(6,182,212,0.4)] scale-105' : 'border-gray-800 opacity-60 hover:opacity-100'}`}>
                                    <img src={frameUrl} className="w-full h-full object-cover" alt={`Frame ${idx}`}/>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    <div className="w-full flex items-center gap-4 bg-[#111] border border-gray-800 rounded-[1.5rem] p-4 h-[120px]">
                        <div className="text-gray-500 text-xs font-bold tracking-widest w-24 text-center border-r border-gray-800 pr-4">JUMLAH<br/>FOTO</div>
                        <div className="flex-1 flex gap-4 justify-center">
                            {[3, 4].map((count) => (
                                <motion.button key={count} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setPoseCount(count as 3 | 4)} className={`h-16 px-6 rounded-xl flex items-center justify-center gap-3 border-2 transition-all w-full ${poseCount === count ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.3)]' : 'bg-transparent text-gray-600 border-gray-800 hover:border-gray-600 hover:text-gray-400'}`}>
                                    <Camera size={20} /><span className="font-black text-xl">{count} POSE</span>
                                </motion.button>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end mt-2">
                        <button onClick={handleStartCapture} className="bg-white text-black px-12 py-4 rounded-full font-black text-xl flex items-center gap-3 shadow-[0_0_40px_rgba(255,255,255,0.4)] hover:scale-105 transition-transform animate-pulse w-full justify-center">
                            MULAI FOTO <ArrowRight size={24}/>
                        </button>
                    </div>
                </div>
            </div>
            <div className="fixed bottom-8 left-8">
                 <button onClick={() => setStep('home')} className="bg-[#1a1a1a] text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 hover:bg-[#2a2a2a] transition-all border border-gray-800 text-sm"><ChevronLeft size={18}/> KEMBALI</button>
            </div>
        </div>
      )}

      {/* STEP 3: CAPTURE */}
      {step === 'capture' && (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-black relative">
            <AnimatePresence>
                {capturedPreview && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
                        <div className="relative w-full h-full max-w-5xl p-4 flex flex-col items-center justify-center">
                            <h2 className="text-white text-4xl font-black mb-4 animate-bounce">KEREN! 😎</h2>
                            <img src={capturedPreview} className="h-[70vh] aspect-video object-contain border-4 border-white rounded-xl shadow-2xl transform scale-x-[-1]" />
                            <p className="text-gray-400 mt-4 animate-pulse">Menyiapkan foto berikutnya...</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="absolute right-0 top-0 bottom-0 w-48 bg-black/80 border-l border-gray-800 flex flex-col gap-4 p-4 overflow-y-auto z-50 backdrop-blur-md">
                <p className="text-gray-500 text-xs font-bold text-center tracking-widest mb-2 border-b border-gray-800 pb-2">TIMELINE</p>
                {photos.map((p, i) => (
                    <div key={i} className={`relative w-full aspect-video bg-gray-900 border-2 rounded-lg overflow-hidden shrink-0 flex items-center justify-center ${i === currentIndex ? 'border-[--neon-yellow] shadow-[0_0_15px_var(--neon-yellow)]' : 'border-gray-700 opacity-60'}`}>
                        {p ? (
                            <>
                                <img src={p} className="w-full h-full object-cover transform scale-x-[-1]" />
                                <div className="absolute top-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">{i+1}</div>
                            </>
                        ) : (
                            <>
                                {i === currentIndex && countdown !== null && countdown > 0 ? (
                                    <span className="text-5xl font-black text-[--neon-yellow] animate-pulse drop-shadow-md">{countdown}</span>
                                ) : (
                                    <span className="text-gray-600 font-bold text-xl">{i+1}</span>
                                )}
                            </>
                        )}
                    </div>
                ))}
            </div>

            <div className="relative w-full h-full">
                <Webcam ref={webcamRef} audio={false} videoConstraints={{ deviceId: activeDeviceId, width: 1920, height: 1080 }} className="w-full h-full object-cover transform scale-x-[-1]" />
                <AnimatePresence>
                    {!isSessionActive && !isWaitingNext && (
                        <div className="absolute inset-x-0 bottom-16 flex justify-center z-40">
                            <button onClick={startSession} className="bg-white text-black px-12 py-5 rounded-full font-black text-2xl flex items-center gap-3 shadow-[0_0_40px_rgba(255,255,255,0.5)] hover:scale-105 transition-transform animate-bounce">
                                <Camera size={32}/> MULAI FOTO
                            </button>
                        </div>
                    )}
                    {isWaitingNext && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center z-40 gap-8 pointer-events-none">
                            <div className="text-white text-3xl font-black drop-shadow-lg pointer-events-auto">FOTO {currentIndex + 1} SELESAI!</div>
                            <button onClick={nextPose} className="pointer-events-auto bg-[--neon-cyan] text-black px-12 py-4 rounded-full font-black text-2xl flex items-center gap-3 shadow-[0_0_50px_rgba(6,182,212,0.6)] hover:scale-105 transition-transform">
                                {currentIndex < poseCount - 1 ? (<>LANJUT POSE {currentIndex + 2} <ArrowRight size={32}/></>) : (<>LIHAT HASIL <ArrowRight size={32}/></>)}
                            </button>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
      )}

      {/* STEP 4: RESULT */}
      {step === 'result' && (
        <div className="h-screen w-full bg-[#0a0a0a]">
            <ResultStage 
                photos={photos} 
                videoClips={videoClips} 
                frameConfig={STRIP_CONFIGS[poseCount]} 
                uploadedFrameLayer={selectedFrameUrl} 
                onReset={handleResetSession}
                photoAdjustments={adminSettings}
                onRetakePhoto={handleSingleRetake}
            />
        </div>
      )}
    </main>
  );
}