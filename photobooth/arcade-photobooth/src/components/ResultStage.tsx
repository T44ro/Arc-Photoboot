"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Mail, Film, Image as ImageIcon, Gift, Loader2, Printer, Home, CloudUpload, Palette, RefreshCcw } from 'lucide-react';
import { useGifGenerator } from '@/hooks/useGifGenerator';
import QRCode from 'react-qr-code';
import { v4 as uuidv4 } from 'uuid';

const BASE_URL = "http://192.168.1.8:3000"; 

// --- 1. CONFIG: FILTERS ---
const FILTERS = {
  normal: 'none',
  warm: 'sepia(0.3) contrast(1.1) brightness(1.1)',
  cold: 'hue-rotate(180deg) sepia(0.1) brightness(1.05)',
  mono: 'grayscale(1) contrast(1.2)'
};

const FILTER_LABELS = {
  normal: { label: 'NORMAL', color: '#ffffff' },
  warm: { label: 'WARM', color: '#f59e0b' },
  cold: { label: 'COOL', color: '#06b6d4' },
  mono: { label: 'B&W', color: '#555555' },
};

// --- 2. CONFIG: DIMENSIONS ---
// A. Referensi Admin
const ADMIN_CANVAS_WIDTH = 300;
const ADMIN_CANVAS_HEIGHT = 900;
const ADMIN_PHOTO_WIDTH = 250;
const ADMIN_PHOTO_HEIGHT = 140.625; // 16:9
const ADMIN_GAP = 10;

// B. Hasil Akhir (Scale 4x)
const STRIP_WIDTH = 1200; 
const STRIP_HEIGHT = 3600; 
const RATIO = STRIP_WIDTH / ADMIN_CANVAS_WIDTH; // 4

// C. Elemen Scaled
const PHOTO_BOX_WIDTH = ADMIN_PHOTO_WIDTH * RATIO; // 1000
const PHOTO_BOX_HEIGHT = ADMIN_PHOTO_HEIGHT * RATIO; // 562.5
const GAP_Y = ADMIN_GAP * RATIO; // 40

// D. Preview Screen
const PREVIEW_WIDTH = ADMIN_CANVAS_WIDTH;
const PREVIEW_HEIGHT = ADMIN_CANVAS_HEIGHT;
const GAP_PREVIEW = ADMIN_GAP;

export default function ResultStage({ photos, videoClips, frameConfig, uploadedFrameLayer, onReset, photoAdjustments, onRetakePhoto }: any) {
  const [email, setEmail] = useState('');
  const [activeTab, setActiveTab] = useState<'photo'|'video'|'gif'>('photo');
  const [statusMsg, setStatusMsg] = useState('');
  const [sessionId] = useState(uuidv4());
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showEmailInput, setShowEmailInput] = useState(false);
  
  const [selectedFilter, setSelectedFilter] = useState<keyof typeof FILTERS>('normal');
  const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null);

  const { gifUrl, isGenerating, generateGif } = useGifGenerator(photos);
  const hasProcessed = useRef(false);
  const videoStripRef = useRef<HTMLDivElement>(null);

  const downloadLink = `${BASE_URL}/downloads/${sessionId}`;

  useEffect(() => {
    if (photos.length > 0 && !hasProcessed.current) {
      hasProcessed.current = true;
      generateGif(); 
    }
  }, []);

  useEffect(() => {
      if (gifUrl && !isSaving && statusMsg === '') {
          setTimeout(() => processAndSaveAll(), 1500);
      }
  }, [gifUrl]);

  const getFilterStyle = () => ({ filter: FILTERS[selectedFilter] });

  // Style Preview HTML
  const getContainerStyle = (idx: number) => {
      const totalContentHeight = (ADMIN_PHOTO_HEIGHT * photos.length) + (ADMIN_GAP * (photos.length - 1));
      const startY = (ADMIN_CANVAS_HEIGHT - totalContentHeight) / 2;
      
      const topPos = startY + (idx * (ADMIN_PHOTO_HEIGHT + ADMIN_GAP));
      const leftPos = (ADMIN_CANVAS_WIDTH - ADMIN_PHOTO_WIDTH) / 2;

      const adj = (photoAdjustments && photoAdjustments[idx]) || { x: 0, y: 0, scale: 1, rotation: 0 };
      
      return {
          position: 'absolute' as const,
          top: topPos,
          left: leftPos,
          width: ADMIN_PHOTO_WIDTH,
          height: ADMIN_PHOTO_HEIGHT,
          transform: `translate(${adj.x}px, ${adj.y}px) scale(${adj.scale}) rotate(${adj.rotation || 0}deg)`,
          zIndex: 10
      };
  };

  const getFrameUrl = () => {
      if (typeof uploadedFrameLayer === 'object' && uploadedFrameLayer !== null) return uploadedFrameLayer.url;
      return uploadedFrameLayer;
  };

  // =================================================================================
  // FUNGSI 1: BAKE FOTO STRIP (NO CLIPPING)
  // =================================================================================
  const bakePhotoStripManually = async () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("Canvas Error");

    canvas.width = STRIP_WIDTH;
    canvas.height = STRIP_HEIGHT;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const totalHeightBaking = (PHOTO_BOX_HEIGHT * photos.length) + (GAP_Y * (photos.length - 1));
    const startY = (STRIP_HEIGHT - totalHeightBaking) / 2;
    const startX = (STRIP_WIDTH - PHOTO_BOX_WIDTH) / 2;

    for (let i = 0; i < photos.length; i++) {
        const img = await new Promise<HTMLImageElement>((resolve) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.src = photos[i];
        });

        const adj = (photoAdjustments && photoAdjustments[i]) || { x: 0, y: 0, scale: 1, rotation: 0 };
        
        const centerX = startX + PHOTO_BOX_WIDTH / 2;
        const centerY = startY + (i * (PHOTO_BOX_HEIGHT + GAP_Y)) + PHOTO_BOX_HEIGHT / 2;

        ctx.save();
        
        ctx.filter = FILTERS[selectedFilter];
        ctx.translate(centerX, centerY);
        ctx.translate(adj.x * RATIO, adj.y * RATIO); 
        if (adj.rotation) ctx.rotate((adj.rotation * Math.PI) / 180);
        ctx.scale(-adj.scale, adj.scale); 

        const imgRatio = img.width / img.height; 
        const boxRatio = PHOTO_BOX_WIDTH / PHOTO_BOX_HEIGHT; 
        let drawW, drawH;
        
        if (imgRatio > boxRatio) { drawH = PHOTO_BOX_HEIGHT; drawW = drawH * imgRatio; } 
        else { drawW = PHOTO_BOX_WIDTH; drawH = drawW / imgRatio; }
        
        ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
        ctx.restore(); 
    }

    ctx.filter = 'none';
    const frameUrl = getFrameUrl();
    if (frameUrl) {
         const frameImg = await new Promise<HTMLImageElement>((resolve) => {
             const image = new Image(); image.onload = () => resolve(image); image.src = frameUrl;
         });
         ctx.drawImage(frameImg, 0, 0, STRIP_WIDTH, STRIP_HEIGHT);
    }

    ctx.fillStyle = '#000000';
    ctx.font = 'bold 40px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('KEMIL.CO', STRIP_WIDTH / 2, STRIP_HEIGHT - 60);

    return canvas.toDataURL('image/jpeg', 0.95);
  };


  // =================================================================================
  // FUNGSI 2: GENERATE VIDEO STRIP (GLITCH FIX & 3 DETIK)
  // =================================================================================
  const generateAndSaveVideoStrip = async () => {
    if (!videoClips || videoClips.length === 0 || !videoStripRef.current) return;
    
    return new Promise<void>(async (resolve) => {
        const videoElements = Array.from(videoStripRef.current!.querySelectorAll('video'));
        videoElements.forEach(v => { 
            v.muted = true; 
            v.loop = true;
            v.currentTime = 0; 
            v.play().catch(e => console.error(e)); 
        });
        
        // BUFFER LEBIH LAMA AGAR VIDEO STABIL
        await new Promise(r => setTimeout(r, 3000));

        const canvas = document.createElement('canvas');
        canvas.width = STRIP_WIDTH;
        canvas.height = STRIP_HEIGHT;

        // TEMPEL KE DOM AGAR BROWSER RENDER PRIORITAS TINGGI (FIX GLITCH)
        canvas.style.position = 'fixed';
        canvas.style.left = '-9999px';
        canvas.style.top = '0px';
        document.body.appendChild(canvas);

        const totalHeightVideo = (PHOTO_BOX_HEIGHT * photos.length) + (GAP_Y * (photos.length - 1));
        const startY = (STRIP_HEIGHT - totalHeightVideo) / 2;
        const startX = (STRIP_WIDTH - PHOTO_BOX_WIDTH) / 2;

        let frameImg: HTMLImageElement | null = null;
        const frameUrl = getFrameUrl();
        if (frameUrl) {
            frameImg = await new Promise((res) => {
                const img = new Image(); img.onload = () => res(img); img.src = frameUrl;
            });
        }

        const stream = canvas.captureStream(30); // 30 FPS
        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
        const chunks: Blob[] = [];
        
        recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
        
        recorder.onstop = async () => {
            const blob = new Blob(chunks, { type: 'video/webm' });
            setFinalVideoUrl(URL.createObjectURL(blob)); 
            await saveToLocalDisk(blob, 'final-strip-video.mp4');
            
            // CLEANUP
            videoElements.forEach(v => v.pause());
            if (document.body.contains(canvas)) document.body.removeChild(canvas);
            
            // HENTIKAN LOOP GAMBAR
            if (intervalId.current) clearInterval(intervalId.current);
            resolve();
        };
        
        recorder.start();

        const ctx = canvas.getContext('2d', { alpha: false });
        
        // --- DRAW FUNCTION (DIJALANKAN DENGAN SETINTERVAL AGAR STABIL) ---
        const drawFrame = () => {
            if (recorder.state === 'inactive') return;
            if (ctx) {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, STRIP_WIDTH, STRIP_HEIGHT);

                videoElements.forEach((v, i) => {
                    const adj = (photoAdjustments && photoAdjustments[i]) || { x: 0, y: 0, scale: 1, rotation: 0 };
                    
                    const centerX = startX + PHOTO_BOX_WIDTH / 2;
                    const centerY = startY + (i * (PHOTO_BOX_HEIGHT + GAP_Y)) + PHOTO_BOX_HEIGHT / 2;

                    ctx.save();
                    ctx.filter = FILTERS[selectedFilter];
                    ctx.translate(centerX, centerY);
                    ctx.translate(adj.x * RATIO, adj.y * RATIO);
                    if (adj.rotation) ctx.rotate((adj.rotation * Math.PI) / 180);
                    ctx.scale(adj.scale, adj.scale);

                    const vW = v.videoWidth || 1280;
                    const vH = v.videoHeight || 720;
                    const vidRatio = vW / vH;
                    const boxRatio = PHOTO_BOX_WIDTH / PHOTO_BOX_HEIGHT;
                    let drawW, drawH;

                    if (vidRatio > boxRatio) { drawH = PHOTO_BOX_HEIGHT; drawW = drawH * vidRatio; } 
                    else { drawW = PHOTO_BOX_WIDTH; drawH = drawW / vidRatio; }

                    ctx.drawImage(v, -drawW / 2, -drawH / 2, drawW, drawH);
                    ctx.restore();
                });

                ctx.filter = 'none';
                if (frameImg) {
                    ctx.drawImage(frameImg, 0, 0, STRIP_WIDTH, STRIP_HEIGHT);
                }
                
                ctx.fillStyle = '#000000';
                ctx.font = 'bold 40px monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('KEMIL.CO', STRIP_WIDTH / 2, STRIP_HEIGHT - 60);
            }
        };

        // --- GUNAKAN INTERVAL 33ms (approx 30 FPS) UTK MENGHINDARI GLITCH ---
        const intervalId = { current: setInterval(drawFrame, 33) };
        
        // --- STOP AFTER 3 SECONDS ---
        setTimeout(() => { 
            recorder.stop(); 
            clearInterval(intervalId.current);
        }, 3000);
    });
  };

  // --- SAVE PROCESS ---
  const processAndSaveAll = async () => {
    setIsSaving(true);
    try {
        setStatusMsg('Menyimpan Foto...');
        for (let i = 0; i < photos.length; i++) {
            await saveToLocalDisk(photos[i], `pose-${i+1}.jpg`);
        }

        setStatusMsg('Render Strip...');
        const stripBase64 = await bakePhotoStripManually();
        await saveToLocalDisk(stripBase64, 'final-strip.jpg');

        setStatusMsg('Render Video...');
        await generateAndSaveVideoStrip();

        if (gifUrl) await saveToLocalDisk(gifUrl, 'animation.gif');
        
        setStatusMsg('Selesai!');

    } catch (e) { console.error(e); setStatusMsg('Gagal Proses'); } 
    finally { setIsSaving(false); setTimeout(() => setStatusMsg(''), 3000); }
  };

  const saveToLocalDisk = async (data: string | Blob, filename: string) => {
    try {
      const formData = new FormData();
      formData.append('sessionId', sessionId);
      formData.append('filename', filename);
      if (typeof data === 'string') {
          const res = await fetch(data);
          const blob = await res.blob();
          formData.append('file', blob);
      } else { formData.append('file', data); }
      await fetch('/api/save-photo', { method: 'POST', body: formData });
    } catch (e) { console.error(e); }
  };

  const handleSendEmail = async () => {
    if(!email || !email.includes('@')) return alert("⚠️ Email tidak valid!");
    setIsSending(true);
    setStatusMsg("Mengirim Email...");
    await processAndSaveAll();
    try {
        const res = await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, sessionId }),
        });
        const data = await res.json();
        if (data.success) { alert("✅ Terkirim!"); setEmail(''); } 
        else { alert("❌ Gagal: " + data.error); }
    } catch (e) { alert("❌ Error jaringan."); } 
    finally { setIsSending(false); setStatusMsg(""); }
  };

  const handlePrintManual = () => { window.print(); };

  return (
    <div className="flex h-screen w-full bg-[#0a0a0a] text-white font-mono overflow-hidden">
        
        {/* KIRI: PREVIEW */}
        <div className="w-1/3 h-full flex items-center justify-center bg-[#111] border-r border-gray-800 p-8 relative print:w-full print:h-full print:border-none print:bg-white print:p-0">
            <div className="transform scale-[0.65] origin-center shadow-[0_0_50px_rgba(0,0,0,0.8)] print:hidden">
                {/* PHOTO PREVIEW */}
                {activeTab === 'photo' && (
                  <div className="relative bg-white p-2" style={{ width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT }}>
                      {photos.map((src:string, i:number) => (
                          <div key={i} style={getContainerStyle(i)} className="relative group cursor-pointer" onClick={() => onRetakePhoto(i)}>
                              <img src={src} className="w-full h-full object-cover transform scale-x-[-1]" style={getFilterStyle()} />
                              {!isSaving && (
                                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] font-bold transition-opacity">
                                      <div className="bg-red-500 text-white px-2 py-1 rounded flex items-center gap-1"><RefreshCcw size={10}/> RETAKE</div>
                                  </div>
                              )}
                          </div>
                      ))}
                      {uploadedFrameLayer && (<img src={typeof uploadedFrameLayer === 'object' ? uploadedFrameLayer.url : uploadedFrameLayer} className="absolute inset-0 w-full h-full object-cover z-20 pointer-events-none" />)}
                      <div className="absolute bottom-2 w-full text-center text-black font-bold text-[8px]">KEMIL.CO</div>
                  </div>
                )}

                {/* VIDEO PREVIEW */}
                {activeTab === 'video' && (
                   <div className="relative bg-black flex items-center justify-center border-2 border-white overflow-hidden" style={{ width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT }}>
                       {finalVideoUrl ? (
                           <video 
                               key={finalVideoUrl}
                               src={finalVideoUrl} 
                               autoPlay loop muted 
                               style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                           />
                       ) : (
                           <div className="flex flex-col items-center justify-center text-gray-500 gap-2"><Loader2 className="animate-spin" /><span className="text-xs">Rendering Video...</span></div>
                       )}
                   </div>
                )}

                {/* GIF PREVIEW */}
                {activeTab === 'gif' && (
                   <div className="relative bg-black flex items-center justify-center border-2 border-white" style={{ width: PREVIEW_WIDTH, aspectRatio: '16/9' }}>
                       {gifUrl ? (<img src={gifUrl} className="w-full h-full object-contain" />) : (<div className="text-center text-xs text-gray-500 flex flex-col items-center gap-2"><Loader2 className="animate-spin" /><span>Generating GIF...</span></div>)}
                   </div>
                )}
            </div>

            {/* PRINT AREA */}
            <div id="print-area" className="hidden print:flex flex-col items-center justify-center w-full h-full bg-white fixed inset-0 z-[9999]">
                 <div className="relative bg-white" style={{ width: '100%', maxWidth: '300px' }}>
                    <div className="relative w-full" style={{ height: PREVIEW_HEIGHT }}>
                        {photos.map((src:string, i:number) => (
                            <div key={i} style={getContainerStyle(i)}>
                                <img src={src} className="w-full h-full object-cover transform scale-x-[-1]" style={getFilterStyle()} />
                            </div>
                        ))}
                        {uploadedFrameLayer && (<img src={typeof uploadedFrameLayer === 'object' ? uploadedFrameLayer.url : uploadedFrameLayer} className="absolute inset-0 w-full h-full object-cover z-20 pointer-events-none" />)}
                        <div className="absolute bottom-0 left-0 right-0 text-center font-mono text-black font-bold uppercase tracking-widest text-[10px]">KEMIL.CO</div>
                    </div>
                    <div className="text-center mt-4"><QRCode value={downloadLink} size={50} /></div>
                 </div>
            </div>

            {/* HIDDEN VIDEO REFS */}
            <div className="fixed left-[-9999px] top-0" ref={videoStripRef}>
                <div className="relative w-[720px] bg-white">
                    <div className="grid grid-cols-1 gap-0">
                        {videoClips.map((src:string, i:number) => (
                            <video key={i} src={src} className="w-full aspect-square" muted crossOrigin="anonymous" playsInline />
                        ))}
                    </div>
                </div>
            </div>
        </div>

        {/* KANAN: KONTROL */}
        <div className="w-2/3 h-full flex flex-col p-8 print:hidden">
            <div className="flex justify-between items-center mb-8">
                <div className="flex gap-4">
                    <button onClick={() => setActiveTab('photo')} className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all ${activeTab==='photo' ? 'bg-white text-black scale-110' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}><ImageIcon size={18}/> FOTO</button>
                    <button onClick={() => setActiveTab('video')} className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all ${activeTab==='video' ? 'bg-[--neon-cyan] text-black scale-110' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}><Film size={18}/> VIDEO</button>
                    <button onClick={() => setActiveTab('gif')} className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all ${activeTab==='gif' ? 'bg-[--neon-yellow] text-black scale-110' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}><Gift size={18}/> GIF</button>
                </div>
                <button onClick={() => setShowEmailInput(!showEmailInput)} className={`p-3 rounded-full hover:bg-gray-700 transition-colors ${showEmailInput ? 'bg-[--neon-pink] text-black' : 'bg-gray-800 text-white'}`}><Mail size={20}/></button>
            </div>

            {showEmailInput && (
                <div className="mb-6 p-4 bg-gray-900 rounded-xl border border-gray-700 flex gap-2 animate-in slide-in-from-top-5">
                    <input type="email" placeholder="Masukkan alamat email..." value={email} onChange={e=>setEmail(e.target.value)} className="flex-1 bg-black border border-gray-600 p-3 rounded text-white focus:border-[--neon-cyan] outline-none" />
                    <button onClick={handleSendEmail} className="bg-[--neon-cyan] px-6 font-bold rounded text-black hover:bg-white transition-colors">{isSending ? <Loader2 className="animate-spin"/> : 'KIRIM'}</button>
                </div>
            )}

            {(activeTab === 'photo' || activeTab === 'video') ? (
                <div className="flex-1 grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 overflow-y-auto mb-4">
                    {(Object.keys(FILTERS) as Array<keyof typeof FILTERS>).map((key) => (
                        <button key={key} onClick={() => setSelectedFilter(key)} className={`relative h-full w-full rounded-2xl flex flex-col items-center justify-center gap-2 font-black text-sm tracking-widest transition-all overflow-hidden border-4 ${selectedFilter === key ? 'border-white scale-105 z-10 shadow-[0_0_30px_rgba(255,255,255,0.2)]' : 'border-transparent opacity-60 hover:opacity-100 hover:scale-105'}`} style={{ backgroundColor: '#1a1a1a' }}>
                            <div className="w-16 h-16 rounded-full shadow-inner mb-2" style={{ backgroundColor: FILTER_LABELS[key].color }}></div>
                            <span className="text-white drop-shadow-md">{FILTER_LABELS[key].label}</span>
                        </button>
                    ))}
                </div>
            ) : (<div className="flex-1 flex items-center justify-center text-gray-500 italic">Filter hanya tersedia untuk Foto & Video.</div>)}

            <div className="pt-4 border-t border-gray-800 flex justify-between items-center">
                <button onClick={onReset} className="text-gray-500 hover:text-white flex items-center gap-2 font-bold px-4 py-2 hover:bg-gray-900 rounded-lg transition-colors"><Home size={20}/> MULAI BARU</button>
                <div className="flex gap-3">
                    <button onClick={processAndSaveAll} className="bg-gray-800 text-white px-6 py-4 rounded-xl font-bold text-sm hover:bg-gray-700 transition-colors flex items-center gap-2">{isSaving ? <Loader2 className="animate-spin" size={16}/> : <CloudUpload size={16}/>} SIMPAN</button>
                    <button onClick={handlePrintManual} className="bg-white text-black px-10 py-4 rounded-xl font-black text-xl hover:scale-105 transition-transform flex items-center gap-2 shadow-[0_0_30px_rgba(255,255,255,0.4)]"><Printer size={24}/> CETAK FOTO</button>
                </div>
            </div>

            {isSaving && (<div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center"><CloudUpload size={48} className="text-[--neon-cyan] animate-bounce mb-2"/><p className="text-[--neon-cyan] font-mono animate-pulse">{statusMsg}</p></div>)}
        </div>
    </div>
  );
}