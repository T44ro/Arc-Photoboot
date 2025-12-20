"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Mail, Film, Image as ImageIcon, Gift, Loader2, Printer, Home, CloudUpload, RefreshCcw, Check } from 'lucide-react';
import { useGifGenerator } from '@/hooks/useGifGenerator';
// import QRCode from 'react-qr-code'; 
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
  warm: { label: '#f59e0b', color: '#f59e0b' },
  cold: { label: '#06b6d4', color: '#06b6d4' },
  mono: { label: 'B&W', color: '#555555' },
};

// --- 2. CONFIG: DIMENSIONS ---
const ADMIN_CANVAS_WIDTH = 300;
const ADMIN_CANVAS_HEIGHT = 900;
const ADMIN_PHOTO_WIDTH = 250;
const ADMIN_PHOTO_HEIGHT = 140.625; 
const ADMIN_GAP = 10;

const STRIP_WIDTH = 1200; 
const STRIP_HEIGHT = 3600; 
const RATIO = STRIP_WIDTH / ADMIN_CANVAS_WIDTH; // 4

const PHOTO_BOX_WIDTH = ADMIN_PHOTO_WIDTH * RATIO; 
const PHOTO_BOX_HEIGHT = ADMIN_PHOTO_HEIGHT * RATIO; 
const GAP_Y = ADMIN_GAP * RATIO; 

const PREVIEW_WIDTH = ADMIN_CANVAS_WIDTH;
const PREVIEW_HEIGHT = ADMIN_CANVAS_HEIGHT;

export default function ResultStage({ photos, videoClips, frameConfig, uploadedFrameLayer, onReset, photoAdjustments, onRetakePhoto }: any) {
  const [email, setEmail] = useState('');
  const [activeTab, setActiveTab] = useState<'photo'|'video'|'gif'>('photo');
  const [statusMsg, setStatusMsg] = useState('');
  const [sessionId] = useState(uuidv4());
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  const [selectedFilter, setSelectedFilter] = useState<keyof typeof FILTERS>('normal');
  const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null);
  const [finalStripUrl, setFinalStripUrl] = useState<string | null>(null);

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

  // --- BAKE PHOTO STRIP ---
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
    ctx.font = 'bold 40px sans-serif'; 
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SE-BOOTH', STRIP_WIDTH / 2, STRIP_HEIGHT - 60);

    return canvas.toDataURL('image/jpeg', 0.95);
  };

  // --- GENERATE VIDEO STRIP ---
  const generateAndSaveVideoStrip = async () => {
    if (!videoClips || videoClips.length === 0 || !videoStripRef.current) return;
    
    return new Promise<void>(async (resolve) => {
        const videoElements = Array.from(videoStripRef.current!.querySelectorAll('video'));
        videoElements.forEach(v => { 
            v.muted = true; 
            v.loop = true;
            v.currentTime = 0; 
            v.play().catch(e => {
                if (e.name !== 'AbortError') console.error(e);
            }); 
        });
        
        await new Promise(r => setTimeout(r, 3000));

        const canvas = document.createElement('canvas');
        canvas.width = STRIP_WIDTH;
        canvas.height = STRIP_HEIGHT;
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

        const stream = canvas.captureStream(30); 
        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
        const chunks: Blob[] = [];
        
        recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
        
        recorder.onstop = async () => {
            const blob = new Blob(chunks, { type: 'video/webm' });
            setFinalVideoUrl(URL.createObjectURL(blob)); 
            await saveToLocalDisk(blob, 'final-strip-video.mp4');
            
            videoElements.forEach(v => v.pause());
            if (document.body.contains(canvas)) document.body.removeChild(canvas);
            
            if (intervalId.current) clearInterval(intervalId.current);
            resolve();
        };
        
        recorder.start();

        const ctx = canvas.getContext('2d', { alpha: false });
        
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
                ctx.font = 'bold 40px sans-serif'; 
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('SE-BOOTH', STRIP_WIDTH / 2, STRIP_HEIGHT - 60);
            }
        };

        const intervalId = { current: setInterval(drawFrame, 33) };
        
        setTimeout(() => { 
            recorder.stop(); 
            clearInterval(intervalId.current);
        }, 3000);
    });
  };

  const processAndSaveAll = async () => {
    setIsSaving(true);
    try {
        setStatusMsg('Menyimpan Foto...');
        for (let i = 0; i < photos.length; i++) {
            await saveToLocalDisk(photos[i], `pose-${i+1}.jpg`);
        }

        setStatusMsg('Render Strip...');
        const stripBase64 = await bakePhotoStripManually();
        setFinalStripUrl(stripBase64);
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

  const handlePrintManual = async () => { 
      if (!finalStripUrl) {
          const strip = await bakePhotoStripManually();
          setFinalStripUrl(strip);
      }
      setTimeout(() => window.print(), 500);
  };

  return (
    <div className="flex h-screen w-full bg-white text-black overflow-hidden">
        
        {/* PRINT STYLES */}
        <style jsx global>{`
            @media print {
                @page { size: 4in 6in; margin: 0; }
                body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; }
                #print-area { display: flex !important; flex-direction: row !important; width: 100vw !important; height: 100vh !important; }
                .print-strip { width: 50% !important; height: 100% !important; object-fit: cover !important; display: block !important; }
            }
        `}</style>

        {/* KIRI: PREVIEW */}
        <div className="w-[45%] h-full flex items-center justify-center bg-gray-50 border-r border-gray-200 p-8 relative print:w-full print:h-full print:border-none print:bg-white print:p-0">
            {/* SCALE DIUBAH JADI 0.9 (90%) */}
            <div className="transform scale-[0.9] origin-center shadow-[0_0_50px_rgba(0,0,0,0.2)] print:hidden">
                {/* PHOTO PREVIEW */}
                {activeTab === 'photo' && (
                  <div className="relative bg-white p-2 border border-gray-300" style={{ width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT }}>
                      {photos.map((src:string, i:number) => (
                          <div key={i} style={getContainerStyle(i)} className="relative group cursor-pointer" onClick={() => onRetakePhoto(i)}>
                              <img src={src} className="w-full h-full object-cover transform scale-x-[-1]" style={getFilterStyle()} />
                              {!isSaving && (
                                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] font-bold transition-opacity">
                                      <div className="bg-red-600 text-white px-2 py-1 rounded flex items-center gap-1"><RefreshCcw size={10}/> RETAKE</div>
                                  </div>
                              )}
                          </div>
                      ))}
                      {uploadedFrameLayer && (<img src={typeof uploadedFrameLayer === 'object' ? uploadedFrameLayer.url : uploadedFrameLayer} className="absolute inset-0 w-full h-full object-cover z-20 pointer-events-none" />)}
                      <div className="absolute bottom-2 w-full text-center text-black font-bold text-[8px] uppercase tracking-widest">SE-BOOTH</div>
                  </div>
                )}

                {/* VIDEO PREVIEW */}
                {activeTab === 'video' && (
                   <div className="relative bg-black flex items-center justify-center border-2 border-gray-300 overflow-hidden" style={{ width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT }}>
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
                   <div className="relative bg-black flex items-center justify-center border-2 border-gray-300" style={{ width: PREVIEW_WIDTH, aspectRatio: '16/9' }}>
                       {gifUrl ? (<img src={gifUrl} className="w-full h-full object-contain" />) : (<div className="text-center text-xs text-gray-500 flex flex-col items-center gap-2"><Loader2 className="animate-spin" /><span>Generating GIF...</span></div>)}
                   </div>
                )}
            </div>

            {/* PRINT AREA */}
            <div id="print-area" className="hidden print:flex w-full h-full bg-white fixed inset-0 z-[9999] p-0 m-0">
                 {finalStripUrl && (
                    <>
                        <img src={finalStripUrl} className="print-strip" alt="Left Strip" />
                        <img src={finalStripUrl} className="print-strip" alt="Right Strip" />
                    </>
                 )}
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
            
            {/* BAGIAN ATAS (HEADER): FILTER (DIPINDAHKAN KE SINI) */}
            <div className="mb-6">
                <div className="flex justify-between items-end mb-2">
                    <h3 className="font-bold text-gray-400 text-xs tracking-widest uppercase">PILIH FILTER</h3>
                </div>
                {(activeTab === 'photo' || activeTab === 'video') ? (
                    <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                        {(Object.keys(FILTERS) as Array<keyof typeof FILTERS>).map((key) => (
                            <button 
                                key={key} 
                                onClick={() => setSelectedFilter(key)} 
                                className={`flex-shrink-0 w-24 h-24 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all border-4 ${selectedFilter === key ? 'border-blue-500 bg-white shadow-lg scale-105' : 'border-gray-200 bg-gray-50 hover:bg-white hover:border-gray-300'}`}
                            >
                                <div className="w-10 h-10 rounded-full shadow-inner mb-1 border border-gray-200" style={{ backgroundColor: FILTER_LABELS[key].color }}></div>
                                <span className={`text-[10px] font-bold uppercase ${selectedFilter === key ? 'text-black' : 'text-gray-500'}`}>{FILTER_LABELS[key].label}</span>
                                {selectedFilter === key && <div className="bg-blue-500 rounded-full p-0.5 text-white"><Check size={10}/></div>}
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="h-24 flex items-center justify-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 text-sm italic">
                        Filter tidak tersedia untuk GIF
                    </div>
                )}
            </div>

            {/* EMAIL INPUT (PERMANEN) */}
            <div className="mb-6 p-4 bg-gray-100 rounded-xl border border-gray-300 flex flex-col gap-2 shadow-sm">
                <div className="flex items-center gap-2 text-gray-500 text-xs font-bold uppercase tracking-widest">
                    <Mail size={14}/> KIRIM HASIL KE EMAIL
                </div>
                <div className="flex gap-2 w-full">
                    <input type="email" placeholder="Masukkan alamat email..." value={email} onChange={e=>setEmail(e.target.value)} className="flex-1 bg-white border border-gray-300 p-3 rounded text-black focus:border-blue-500 outline-none" />
                    <button onClick={handleSendEmail} className="bg-blue-600 px-6 font-bold rounded text-white hover:bg-blue-700 transition-colors">{isSending ? <Loader2 className="animate-spin"/> : 'KIRIM'}</button>
                </div>
            </div>

            {/* BAGIAN TENGAH (CONTENT): MEDIA TOGGLES (DIPINDAHKAN KE SINI & DIBUAT MENCOLOK) */}
            <div className="flex-1 flex flex-col gap-4 justify-center mb-6">
                <div className="flex justify-between items-end">
                    <h3 className="font-bold text-gray-400 text-xs tracking-widest uppercase">PILIH FORMAT HASIL</h3>
                </div>
                <div className="grid grid-cols-3 gap-4 h-full max-h-64">
                    <button onClick={() => setActiveTab('photo')} className={`relative rounded-3xl flex flex-col items-center justify-center gap-4 transition-all border-4 overflow-hidden group ${activeTab==='photo' ? 'bg-black text-white border-black shadow-2xl scale-105 z-10' : 'bg-white text-black border-gray-200 hover:border-gray-400 hover:bg-gray-50'}`}>
                        <div className={`p-4 rounded-full ${activeTab==='photo' ? 'bg-white text-black' : 'bg-gray-200 text-gray-600 group-hover:bg-black group-hover:text-white transition-colors'}`}>
                            <ImageIcon size={32} strokeWidth={2.5}/>
                        </div>
                        <span className="font-black text-xl tracking-widest">FOTO</span>
                    </button>

                    <button onClick={() => setActiveTab('video')} className={`relative rounded-3xl flex flex-col items-center justify-center gap-4 transition-all border-4 overflow-hidden group ${activeTab==='video' ? 'bg-blue-600 text-white border-blue-600 shadow-2xl scale-105 z-10' : 'bg-white text-black border-gray-200 hover:border-blue-400 hover:bg-blue-50'}`}>
                        <div className={`p-4 rounded-full ${activeTab==='video' ? 'bg-white text-blue-600' : 'bg-gray-200 text-gray-600 group-hover:bg-blue-600 group-hover:text-white transition-colors'}`}>
                            <Film size={32} strokeWidth={2.5}/>
                        </div>
                        <span className="font-black text-xl tracking-widest">VIDEO</span>
                    </button>

                    <button onClick={() => setActiveTab('gif')} className={`relative rounded-3xl flex flex-col items-center justify-center gap-4 transition-all border-4 overflow-hidden group ${activeTab==='gif' ? 'bg-yellow-400 text-black border-yellow-400 shadow-2xl scale-105 z-10' : 'bg-white text-black border-gray-200 hover:border-yellow-400 hover:bg-yellow-50'}`}>
                        <div className={`p-4 rounded-full ${activeTab==='gif' ? 'bg-black text-yellow-400' : 'bg-gray-200 text-gray-600 group-hover:bg-yellow-400 group-hover:text-black transition-colors'}`}>
                            <Gift size={32} strokeWidth={2.5}/>
                        </div>
                        <span className="font-black text-xl tracking-widest">GIF</span>
                    </button>
                </div>
            </div>

            {/* FOOTER: ACTION BUTTONS */}
            <div className="pt-4 border-t border-gray-200 flex justify-between items-center">
                <button onClick={onReset} className="bg-yellow-400 text-gray-700 px-15 py-5 rounded-xl font-bold text-sm hover:bg-gray-300 transition-colors flex items-center"><Home size={20}/> MULAI BARU</button>
                <div className="flex gap-3">
                    <button onClick={processAndSaveAll} className="bg-gray-200 text-gray-700 px-6 py-4 rounded-xl font-bold text-sm hover:bg-gray-300 transition-colors flex items-center gap-2">{isSaving ? <Loader2 className="animate-spin" size={16}/> : <CloudUpload size={16}/>} SIMPAN</button>
                    <button onClick={handlePrintManual} className="bg-black text-white px-10 py-4 rounded-xl font-black text-xl hover:scale-105 transition-transform flex items-center gap-2 shadow-[0_0_30px_rgba(0,0,0,0.4)]"><Printer size={24}/> CETAK FOTO</button>
                </div>
            </div>

            {isSaving && (<div className="absolute inset-0 z-50 bg-white/90 flex flex-col items-center justify-center"><CloudUpload size={48} className="text-blue-500 animate-bounce mb-2"/><p className="text-blue-500 animate-pulse">{statusMsg}</p></div>)}
        </div>
    </div>
  );
}
