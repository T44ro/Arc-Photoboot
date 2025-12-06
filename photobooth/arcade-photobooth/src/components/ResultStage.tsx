"use client";
import React, { useState, useEffect, useRef } from 'react';
import RetroButton from './RetroButton';
import { Mail, Film, Image as ImageIcon, Gift, Loader2, Printer, Home, CloudUpload, CheckCircle, Download } from 'lucide-react';
import { useGifGenerator } from '@/hooks/useGifGenerator';
import QRCode from 'react-qr-code';
import { v4 as uuidv4 } from 'uuid';
import html2canvas from 'html2canvas';

const BASE_URL = "http://192.168.1.8:3000"; // Ganti dengan IP Laptop Anda

export default function ResultStage({ photos, videoClips, frameConfig, uploadedFrameLayer, onReset }: any) {
  const [email, setEmail] = useState('');
  const [activeTab, setActiveTab] = useState<'photo'|'video'|'gif'>('photo');
  const [statusMsg, setStatusMsg] = useState('');
  const [sessionId] = useState(uuidv4());
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [driveLink, setDriveLink] = useState('');

  const { gifUrl, isGenerating, generateGif } = useGifGenerator(photos);
  const hasProcessed = useRef(false);
  
  // Refs untuk proses "Baking"
  const photoStripRef = useRef<HTMLDivElement>(null); 
  const videoStripRef = useRef<HTMLDivElement>(null);

  const downloadLink = driveLink || `${BASE_URL}/downloads/${sessionId}`;

  // 1. Trigger Awal
  useEffect(() => {
    if (photos.length > 0 && !hasProcessed.current) {
      hasProcessed.current = true;
      generateGif(); 
    }
  }, []);

  // 2. Trigger Simpan setelah GIF siap
  useEffect(() => {
      if (gifUrl && !isSaving && statusMsg === '') {
          setTimeout(() => processAndSaveAll(), 1000);
      }
  }, [gifUrl]);

  // --- CORE LOGIC: PROSES & SIMPAN ---
  const processAndSaveAll = async () => {
    setIsSaving(true);
    
    try {
        // A. SIMPAN FOTO SATU PER SATU
        setStatusMsg('Menyimpan Foto...');
        for (let i = 0; i < photos.length; i++) {
            await saveToLocalDisk(photos[i], `pose-${i+1}.jpg`);
        }

        // B. GENERATE & SIMPAN FOTO STRIP (JPG)
        setStatusMsg('Membuat Strip Foto...');
        if (photoStripRef.current) {
            const canvas = await html2canvas(photoStripRef.current, {
                scale: 2, 
                useCORS: true, 
                backgroundColor: null 
            });
            const stripBase64 = canvas.toDataURL('image/jpeg', 0.95);
            await saveToLocalDisk(stripBase64, 'final-strip.jpg');
        }

        // C. GENERATE & SIMPAN VIDEO STRIP (MP4)
        setStatusMsg('Merender Video Strip...');
        await generateAndSaveVideoStrip();

        // D. SIMPAN GIF
        if (gifUrl) {
            await saveToLocalDisk(gifUrl, 'animation.gif');
        }

        // E. UPLOAD KE CLOUD (Google Drive)
        setStatusMsg('Upload ke Cloud...');
        const driveRes = await fetch('/api/upload-drive', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId }),
        });
        
        const driveData = await driveRes.json();
        
        if (driveData.success && driveData.driveLink) {
            setDriveLink(driveData.driveLink);
            setStatusMsg('Siap Dicetak!');
        } else {
            setStatusMsg('Tersimpan Lokal.');
        }

    } catch (e) {
        console.error("Error process:", e);
        setStatusMsg('Gagal Proses');
    } finally {
        setIsSaving(false);
        setTimeout(() => setStatusMsg(''), 2000);
    }
  };

  // --- LOGIC REKAM VIDEO STRIP DARI ELEMENT HTML ---
  const generateAndSaveVideoStrip = async () => {
    if (!videoClips || videoClips.length === 0 || !videoStripRef.current) return;

    return new Promise<void>(async (resolve) => {
        const element = videoStripRef.current;
        
        // Play semua video di dalam ref
        const videos = element.querySelectorAll('video');
        videos.forEach(v => v.play());
        await new Promise(r => setTimeout(r, 500));

        // Setup Canvas untuk menggambar
        const canvas = document.createElement('canvas');
        const width = 720;
        const height = width * photos.length; 
        canvas.width = width;
        canvas.height = height;

        // Pre-load videos elements
        const videoElements = await Promise.all(videoClips.map((src: string) => {
            return new Promise<HTMLVideoElement>((res) => {
                const vid = document.createElement('video');
                vid.src = src;
                vid.crossOrigin = "anonymous";
                vid.muted = true;
                vid.onloadeddata = () => res(vid);
                vid.load();
                vid.play();
            });
        }));

        const stream = canvas.captureStream(30);
        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
        const chunks: Blob[] = [];
        
        recorder.ondataavailable = (e) => chunks.push(e.data);
        
        recorder.onstop = async () => {
            const blob = new Blob(chunks, { type: 'video/webm' });
            // LANGSUNG KIRIM BLOB
            await saveToLocalDisk(blob, 'final-strip-video.mp4');
            resolve();
        };

        recorder.start();

        const ctx = canvas.getContext('2d');
        const draw = () => {
            if (recorder.state === 'inactive') return;
            
            if(ctx) {
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, width, height);

                videoElements.forEach((v, i) => {
                    ctx.save();
                    ctx.translate(width, 0);
                    ctx.scale(-1, 1);
                    ctx.drawImage(v, 0, i * width, width, width);
                    ctx.restore();
                });
            }
            requestAnimationFrame(draw);
        };
        draw();

        // Rekam 4 detik
        setTimeout(() => {
            recorder.stop();
        }, 4000);
    });
  };

  // --- FUNGSI SAVE BARU (HANDLE FORM DATA) ---
  const saveToLocalDisk = async (data: string | Blob, filename: string) => {
    try {
      const formData = new FormData();
      formData.append('sessionId', sessionId);
      formData.append('filename', filename);

      // Jika input string (Base64), convert ke Blob dulu
      if (typeof data === 'string') {
          const res = await fetch(data);
          const blob = await res.blob();
          formData.append('file', blob);
      } else {
          // Jika input sudah Blob (Video), langsung append
          formData.append('file', data);
      }

      const res = await fetch('/api/save-photo', {
        method: 'POST',
        body: formData, // Kirim sebagai Multipart
      });
      
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      
    } catch (e) { 
      console.error(`Gagal menyimpan ${filename}:`, e); 
    }
  };

  const handleSendEmail = async () => {
    if(!email || !email.includes('@')) return alert("⚠️ Masukkan email valid!");
    if (isSaving) return alert("⏳ Tunggu sebentar, sedang memproses data...");

    setIsSending(true);
    setStatusMsg("Mengirim Email...");

    try {
        const res = await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, sessionId }),
        });
        const data = await res.json();
        if (data.success) {
            alert("✅ Email Terkirim!");
            setEmail('');
        } else {
            alert("❌ Gagal: " + data.error);
        }
    } catch (e) {
        alert("❌ Error jaringan.");
    } finally {
        setIsSending(false);
        setStatusMsg("");
    }
  };

  const handlePrintManual = () => {
      setStatusMsg('Mencetak...');
      setTimeout(() => { window.print(); setStatusMsg(''); }, 1000);
  }

  // Styles helpers
  const getFrameUrl = () => {
      if (typeof uploadedFrameLayer === 'object' && uploadedFrameLayer !== null) return uploadedFrameLayer.url;
      return uploadedFrameLayer;
  };

  const getPhotoStyle = () => {
      if (typeof uploadedFrameLayer === 'object' && uploadedFrameLayer?.settings) {
          const { x, y, scale } = uploadedFrameLayer.settings;
          return { transform: `scaleX(-1) translate(${x * -1}px, ${y}px) scale(${scale})` };
      }
      return { transform: 'scaleX(-1)' };
  };

  return (
    <div className="flex flex-col h-full gap-4 w-full">
      
      {/* --- HIDDEN CANVAS: FOTO STRIP (BAKING) --- */}
      <div className="fixed left-[-9999px] top-0">
          <div ref={photoStripRef} className="relative w-[600px] h-auto bg-white p-4">
             <div className="grid grid-cols-1 w-full h-auto gap-4">
                {photos.map((src:string, i:number) => (
                <div key={i} className="relative w-full aspect-square overflow-hidden border-2 border-black">
                    <img src={src} className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1] filter contrast-110" style={getPhotoStyle()} />
                </div>
                ))}
             </div>
             {uploadedFrameLayer && (
                <img src={getFrameUrl()} className="absolute inset-0 w-full h-full object-cover z-20" />
             )}
             <div className="text-center font-mono text-black font-bold uppercase tracking-widest text-[16px] mt-4 pt-2 border-t-4 border-black">
               Kemil.co
             </div>
          </div>
      </div>

      {/* --- REF DUMMY UNTUK VIDEO STRIP --- */}
      <div className="fixed left-[-9999px] top-0" ref={videoStripRef}>
          {/* Digunakan untuk merekam layout video */}
          <div className="relative w-[720px] bg-white">
             <div className="grid grid-cols-1 w-full gap-0">
                {videoClips.map((src:string, i:number) => (
                  <video key={i} src={src} className="w-full aspect-square object-cover" muted crossOrigin="anonymous" />
                ))}
             </div>
          </div>
      </div>

      {/* --- PRINT LAYOUT (FISIK) --- */}
      <div id="print-area" className="hidden">
         <div className="relative w-full h-full max-w-[33vh] aspect-[1/3] p-4 box-border border border-gray-200 mx-auto">
            <div className={`grid ${frameConfig.gridClass} w-full h-full`}>
                {photos.map((src:string, i:number) => (
                <div key={i} className="relative w-full h-full overflow-hidden border-2 border-black">
                    <img src={src} className="absolute inset-0 w-full h-full object-cover filter contrast-125" style={getPhotoStyle()} />
                </div>
                ))}
            </div>
            {uploadedFrameLayer && (
                <img src={getFrameUrl()} className="absolute inset-0 w-full h-full object-cover z-20 pointer-events-none" />
            )}
         </div>
         <div className="flex flex-col items-center justify-center w-full mt-4 shrink-0 gap-2">
             {driveLink ? (
                 <>
                    <QRCode value={driveLink} size={50} />
                    <div className="text-[6px] font-mono text-center mt-1">SCAN UNTUK DOWNLOAD</div>
                 </>
             ) : (
                 <div className="text-[8px] italic">Processing Cloud...</div>
             )}
             <div className="font-mono text-black font-bold uppercase tracking-widest text-[8px]">
              Kemil.co • {new Date().toLocaleDateString()}
            </div>
         </div>
      </div>

      {/* STATUS OVERLAY */}
      {statusMsg && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-black/80 text-white px-6 py-2 rounded-full flex items-center gap-2 border border-[--neon-cyan] animate-pulse">
              {statusMsg.includes('Cloud') ? <CloudUpload size={16}/> : <Loader2 size={16} className="animate-spin"/>} 
              <span className="text-xs font-mono">{statusMsg}</span>
          </div>
      )}

      {/* TABS */}
      <div className="flex justify-center gap-2 p-1 bg-gray-900 rounded-lg border border-gray-800 shrink-0 print:hidden">
        <button onClick={() => setActiveTab('photo')} className={`flex-1 py-2 px-4 rounded flex justify-center items-center gap-2 text-[10px] md:text-sm font-bold transition-colors ${activeTab==='photo'?'bg-[--neon-pink] text-black':'text-gray-400 hover:text-white'}`}><ImageIcon size={14}/> FOTO</button>
        <button onClick={() => setActiveTab('video')} className={`flex-1 py-2 px-4 rounded flex justify-center items-center gap-2 text-[10px] md:text-sm font-bold transition-colors ${activeTab==='video'?'bg-[--neon-cyan] text-black':'text-gray-400 hover:text-white'}`}><Film size={14}/> LIVE</button>
        <button onClick={() => setActiveTab('gif')} className={`flex-1 py-2 px-4 rounded flex justify-center items-center gap-2 text-[10px] md:text-sm font-bold transition-colors ${activeTab==='gif'?'bg-[--neon-yellow] text-black':'text-gray-400 hover:text-white'}`}><Gift size={14}/> GIF</button>
      </div>

      {/* PREVIEW AREA */}
      <div className="flex-1 bg-black border-2 border-dashed border-gray-700 rounded-xl overflow-hidden flex items-center justify-center p-2 relative print:hidden">
        {activeTab === 'photo' && (
          <div className="h-full aspect-[1/3] bg-white p-2 shadow-xl flex flex-col relative group">
             <div className="relative flex-1 w-full h-full">
                 <div className="grid grid-cols-1 w-full h-full gap-2">
                    {photos.map((src:string, i:number) => (
                      <div key={i} className="relative w-full aspect-square overflow-hidden">
                        <img src={src} className="absolute inset-0 w-full h-full object-cover filter contrast-110" style={getPhotoStyle()} />
                      </div>
                    ))}
                 </div>
                 {uploadedFrameLayer && (
                    <img src={getFrameUrl()} className="absolute inset-0 w-full h-full object-cover z-20 pointer-events-none" />
                 )}
             </div>
             <div className="mt-2 text-center font-mono text-[8px] text-black tracking-widest uppercase border-t border-black pt-1 shrink-0">Kemil.co</div>
          </div>
        )}
        {activeTab === 'video' && (
           <div className="h-full aspect-[1/3] bg-black p-2 shadow-[0_0_30px_var(--neon-cyan)] border-4 border-[--neon-cyan] flex flex-col">
             <div className="grid grid-cols-1 w-full flex-1 gap-2">
                {[...Array(frameConfig.photoCount)].map((_, i) => (
                  <div key={i} className="relative w-full aspect-square bg-gray-800 overflow-hidden border border-gray-700">
                    {videoClips && videoClips[i] ? (
                      <video src={videoClips[i]} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1]" />
                    ) : (
                      photos[i] ? <img src={photos[i]} className="absolute inset-0 w-full h-full object-cover opacity-50 grayscale" /> : null
                    )}
                  </div>
                ))}
             </div>
          </div>
        )}
        {activeTab === 'gif' && (
          <div className="text-center flex flex-col items-center justify-center w-full h-full p-4">
             {isGenerating && <Loader2 size={48} className="animate-spin mb-4 text-[--neon-yellow]" />}
             {!isGenerating && gifUrl && (
                 <div className="flex flex-col items-center h-full justify-center">
                    <div className="relative h-full max-h-full aspect-square border-4 border-white bg-gray-800 rounded-lg overflow-hidden shadow-[0_0_30px_var(--neon-yellow)] p-1">
                        <img src={gifUrl} alt="GIF" className="w-full h-full object-contain" />
                    </div>
                 </div>
             )}
          </div>
        )}
        {isSaving && (
             <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center">
                 <CloudUpload size={48} className="text-[--neon-cyan] animate-bounce mb-2"/>
                 <p className="text-[--neon-cyan] font-mono animate-pulse">{statusMsg}</p>
             </div>
         )}
      </div>

      {/* FOOTER */}
      <div className="bg-gray-800 p-3 rounded-xl flex flex-col gap-2 shrink-0 print:hidden">
        <div className="flex gap-2 items-center">
           <RetroButton onClick={onReset} color="yellow">
               <div className="flex items-center gap-1"><Home size={18}/> <span className="text-xs hidden md:inline">Selesai</span></div>
           </RetroButton>
           <RetroButton onClick={handlePrintManual} color="cyan"><Printer size={18}/></RetroButton>
           <div className="flex flex-1 gap-2">
               <input type="email" placeholder="Email..." value={email} onChange={(e) => setEmail(e.target.value)} className="flex-1 p-2 bg-black border border-gray-600 rounded text-white font-mono text-sm" disabled={isSending || isSaving}/>
               <RetroButton onClick={handleSendEmail} color="pink" disabled={isSending || isSaving}>
                  {isSending ? <Loader2 size={18} className="animate-spin"/> : <Mail size={18}/>}
               </RetroButton>
           </div>
        </div>
      </div>
    </div>
  );
}