"use client";
import React, { useState, useEffect } from "react";
import Webcam from "react-webcam";
import { motion, AnimatePresence } from "framer-motion";
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
  
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);

  const { webcamRef, startSingleClip, stopSingleClip, resetClips, videoClips, capturePhoto, devices, activeDeviceId, switchCamera } = useSmartWebcam();

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
    <main className="min-h-screen w-full bg-white text-black overflow-hidden flex flex-col selection:bg-yellow-200">
      
      {/* HEADER */}
      <div className="absolute top-4 right-4 z-50">
           <button onClick={() => setShowSettings(!showSettings)} className="p-3 text-black hover:bg-gray-100 rounded-full border-2 border-black shadow-[2px_2px_0px_black] transition-all active:translate-y-1 active:shadow-none"><Settings size={24}/></button>
           {showSettings && (
              <div className="absolute right-0 mt-2 bg-white border-2 border-black p-4 rounded-xl w-56 shadow-[4px_4px_0px_black]">
                  <button onClick={() => window.location.href='/admin'} className="flex items-center gap-2 text-sm p-2 hover:bg-yellow-100 w-full text-left rounded font-bold"><Lock size={16}/> Admin Panel</button>
                  <div className="border-t-2 border-dashed border-gray-300 my-2"></div>
                  <label className="text-xs font-bold block mb-1">Pilih Kamera:</label>
                  <select className="w-full bg-gray-50 text-black p-2 text-xs border-2 border-black rounded" onChange={(e) => switchCamera(e.target.value)} value={activeDeviceId}>
                      {devices.map((d) => (<option key={d.deviceId} value={d.deviceId}>{d.label || 'Camera'}</option>))}
                  </select>
              </div>
           )}
      </div>

      {/* --- STEP 1: HOME --- */}
      {step === 'home' && (
        <div className="flex-1 flex flex-col items-center justify-center relative bg-[url('https://www.transparenttextures.com/patterns/graphy.png')]">
            <div className="relative z-10 mb-8">
                <img 
                    src="/logo sebooth.png" 
                    alt="Sebooth Logo" 
                    className="w-48 h-auto transform scale-100 drop-shadow-[5px_5px_0px_rgba(0,0,0,0.5)]" 
                />
            </div>
            
            <h1 className="text-6xl font-bold mb-8 tracking-tight text-center drop-shadow-sm">PHOTOBOOTH<br/><span className="text-4xl font-normal italic text-gray-500">Capture the Fun!</span></h1>
            
            <motion.button 
                whileHover={{ scale: 1.05 }} 
                whileTap={{ scale: 0.95 }} 
                onClick={() => setStep('frame-select')} 
                className="bg-[#FFE15D] text-black px-12 py-4 rounded-full font-bold text-3xl flex items-center gap-4 border-4 border-black shadow-[6px_6px_0px_black] hover:shadow-[4px_4px_0px_black] active:translate-y-1 active:shadow-none transition-all"
            >
                MULAI <Play fill="black" size={32}/>
            </motion.button>
        </div>
      )}

      {/* --- STEP 2: FRAME SELECTION --- */}
      {step === 'frame-select' && (
        <div className="flex-1 flex flex-col p-4 md:p-6 relative bg-white bg-[url('https://www.transparenttextures.com/patterns/graphy.png')] overflow-hidden">
            <h1 className="text-center text-4xl font-bold mb-4 tracking-wider border-b-4 border-black inline-block mx-auto pb-2 px-8 border-dashed">PILIH GAYAMU</h1>
            
            <div className="flex-1 flex gap-8 items-center justify-center w-full max-w-7xl mx-auto min-h-0 h-[65vh]">
                {/* PREVIEW KIRI */}
                <div className="h-[75vh] aspect-[1/3] flex items-center justify-center">
                    <div className="border-black p-3 shadow-[8px_8px_0px_rgba(0,0,0,0.2)] w-full h-full flex flex-col relative transform rotate-[-2deg]">
                        <div className="flex-1 bg-gray-100 rounded border-3 border-dashed border-gray-300">
                             {selectedFrame && (
                                <div className="absolute inset-0 w-full h-full">
                                    {selectedFrame.layout.map((pos, i) => (
                                        <div key={i} style={{ }}>
                                        </div>
                                    ))}
                                    <img src={selectedFrame.imageUrl} className="absolute inset-0 w-full h-full object-cover z-20 pointer-events-none" />
                                </div>
                             )}
                        </div>
                    </div>
                </div>

                {/* PILIHAN KANAN */}
                <div className="flex flex-col gap-6 w-1/2 h-[75vh] justify-center">
                    <div className="w-full bg-white border-4 border-black rounded-[2rem] p-6 relative flex flex-col shadow-[8px_8px_0px_black] h-[400px]">
                        <div className="absolute -top-5 left-8 bg-[#FF6B6B] text-white border-4 border-black px-6 py-2 font-bold text-xl tracking-widest rounded-full z-10 transform -rotate-2">KOLEKSI</div>
                        
                        <div className="grid grid-cols-3 gap-4 mt-6 overflow-y-auto custom-scrollbar p-2">
                            {frames.map((frame) => (
                                <motion.button key={frame.id} whileHover={{ scale: 1.05 }} onClick={() => setSelectedFrame(frame)} 
                                    className={`aspect-[1/3] rounded-xl relative overflow-hidden border-4 transition-all ${selectedFrame?.id === frame.id ? 'border-[#4ECDC4] shadow-[0_0_0_4px_#4ECDC4]' : 'border-gray-200 hover:border-gray-400'}`}>
                                    <img src={frame.imageUrl} className="w-full h-full object-cover" />
                                    {selectedFrame?.id === frame.id && (<div className="absolute inset-0 bg-[#4ECDC4]/40 flex items-center justify-center"><Check className="text-white drop-shadow-md stroke-[4px]" size={40}/></div>)}
                                </motion.button>
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-end mt-2">
                        <button onClick={handleStartCapture} disabled={!selectedFrame} className="bg-[#4ECDC4] text-white border-4 border-black px-12 py-4 rounded-full font-bold text-2xl flex items-center gap-3 shadow-[6px_6px_0px_black] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_black] active:translate-y-1 active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed w-full justify-center">
                            LANJUT FOTO <ArrowRight size={32}/>
                        </button>
                    </div>
                </div>
            </div>
            
            <div className="fixed bottom-8 left-8">
                 <button onClick={() => setStep('home')} className="bg-white text-black px-6 py-3 rounded-full font-bold flex items-center gap-2 border-4 border-black shadow-[4px_4px_0px_black] hover:bg-gray-100 transition-all"><ChevronLeft size={24}/> KEMBALI</button>
            </div>
        </div>
      )}

      {/* --- STEP 3: CAPTURE --- */}
      {step === 'capture' && (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-900 relative">
            
            {/* HASIL PREVIEW 3 DETIK */}
            <AnimatePresence>
                {capturedPreview && (
                    <motion.div initial={{ opacity: 0, rotate: -10, scale: 0.5 }} animate={{ opacity: 1, rotate: 0, scale: 1 }} exit={{ opacity: 0, y: 100 }} className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-8">
                        <h2 className="text-[#FFE15D] text-6xl font-bold mb-6 animate-bounce tracking-wider [-webkit-text-stroke:2px_white] drop-shadow-[4px_4px_0px_white]">NICE SHOT! 📸</h2>
                        <img src={capturedPreview} className="h-[60vh] aspect-video object-contain border-8 border-white rounded-xl shadow-2xl transform scale-x-[-1] rotate-2" />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* !!! COUNTDOWN BESAR DIHAPUS DARI SINI !!! */}

            {/* SIDEBAR TIMELINE DENGAN COUNTDOWN */}
            <div className="absolute right-0 top-0 bottom-0 w-48 bg-white/30 border-l-4 border-black/40 flex flex-col gap-4 p-4 overflow-y-auto z-40">
                <h3 className="text-center font-bold text-xl border-b-2 border-black pb-2">TIMELINE</h3>
                
                {photos.map((p, i) => {
                    // Logic: Apakah ini giliran foto ini DAN countdown sedang berjalan?
                    const isCountingDown = i === currentIndex && countdown !== null && countdown > 0;
                    
                    return (
                        <div key={i} className={`relative w-full aspect-video bg-gray-200 border-4 rounded-lg overflow-hidden shrink-0 flex items-center justify-center ${i === currentIndex ? 'border-[#4ECDC4] shadow-[4px_4px_0px_black]' : 'border-black'}`}>
                            {p ? (
                                <img src={p} className="w-full h-full object-cover scale-x-[-1]" />
                            ) : isCountingDown ? (
                                // Tampilkan Countdown di sini
                                <span className="text-[#FF6B6B] font-black text-6xl animate-pulse">{countdown}</span>
                            ) : (
                                // Tampilkan Nomor Urut biasa
                                <span className="text-gray-400 font-bold text-2xl">{i+1}</span>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* WEBCAM AREA */}
            <div className="relative w-full h-full bg-black">
                <Webcam ref={webcamRef} audio={false} videoConstraints={{ deviceId: activeDeviceId, width: 1920, height: 1080 }} className="w-full h-full object-cover transform scale-x-[-1] opacity-90" />
                
                <AnimatePresence>
                    {/* TOMBOL SHUTTER */}
                    {!isSessionActive && !isWaitingNext && !capturedPreview && (
                        <div className="absolute inset-x-0 bottom-12 flex justify-center z-40">
                            <button onClick={startSession} className="bg-white/50 text-black px-8 py-4 rounded-full font-bold text-4xl flex items-center gap-4 animate-bounce border-4 border-black shadow-[0_8px_0px_rgba(0,0,0,0.5)] active:translate-y-2 active:shadow-none transition-all">
                                <Camera size={48}/> AMBIL FOTO
                            </button>
                        </div>
                    )}

                    {/* OVERLAY LANJUT */}
                    {isWaitingNext && !capturedPreview && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center z-40 pointer-events-none animate-in zoom-in duration-300">
                            <div className="text-white text-6xl font-bold mb-5 tracking-widest animate-pulse [-webkit-text-stroke:3px_white] drop-shadow-[4px_4px_0px_black]">
                                FOTO {currentIndex + 1} SELESAI!
                            </div>
                            <button onClick={nextPose} className="pointer-events-auto bg-[#FFE15D]/40 text-black px-12 py-6 rounded-[3rem] font-bold text-5xl flex items-center gap-6 hover:scale-105 transition-transform border-2 border-black/50">
                                {currentIndex < (selectedFrame?.photoCount || 3) - 1 ? (
                                    <>LANJUT POSE {currentIndex + 2} <ArrowRight size={40}/></>
                                ) : (
                                    <>LIHAT HASIL <Check size={40}/></>
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
        <div className="h-screen w-full bg-white">
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