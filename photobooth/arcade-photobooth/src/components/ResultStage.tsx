"use client";
import React, { useState, useEffect, useRef } from 'react';
import RetroButton from './RetroButton';
import { Mail, Film, Image as ImageIcon, Gift, Loader2, Printer, Home, CloudUpload, CheckCircle, Download } from 'lucide-react';
import { useGifGenerator } from '@/hooks/useGifGenerator';
import QRCode from 'react-qr-code';
import { v4 as uuidv4 } from 'uuid';

const BASE_URL = "http://192.168.1.8:3000"; 

// --- UPGRADE KUALITAS: RESOLUSI TINGGI UNTUK HASIL AKHIR ---
const STRIP_WIDTH = 1200; // Lebar High Res
const PHOTO_BOX_SIZE = 1000; 
const GAP = 40; 
const PADDING_Y = 100; 
const FOOTER_HEIGHT = 120; 

export default function ResultStage({ photos, videoClips, frameConfig, uploadedFrameLayer, onReset, photoAdjustments }: any) {
  const [email, setEmail] = useState('');
  const [activeTab, setActiveTab] = useState<'photo'|'video'|'gif'>('photo');
  const [statusMsg, setStatusMsg] = useState('');
  const [sessionId] = useState(uuidv4());
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [driveLink, setDriveLink] = useState('');

  const { gifUrl, isGenerating, generateGif } = useGifGenerator(photos);
  const hasProcessed = useRef(false);
  const videoStripRef = useRef<HTMLDivElement>(null);

  const downloadLink = driveLink || `${BASE_URL}/downloads/${sessionId}`;

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

  // Style Helper untuk Preview (Layar Tablet) - SAMA DENGAN EDITOR
  const PHOTO_SIZE_PREVIEW = 250;
  const GAP_PREVIEW = 10;
  const getContainerStyle = (idx: number) => {
      const topPos = idx * (PHOTO_SIZE_PREVIEW + GAP_PREVIEW);
      const adj = photoAdjustments?.[idx] || { x: 0, y: 0, scale: 1, rotation: 0 };
      return {
          position: 'absolute' as const,
          top: topPos, left: 0, width: PHOTO_SIZE_PREVIEW, height: PHOTO_SIZE_PREVIEW,
          transform: `translate(${adj.x}px, ${adj.y}px) scale(${adj.scale}) rotate(${adj.rotation || 0}deg)`,
          overflow: 'visible'
      };
  };

  const getFrameUrl = () => {
      if (typeof uploadedFrameLayer === 'object' && uploadedFrameLayer !== null) return uploadedFrameLayer.url;
      return uploadedFrameLayer;
  };

  // --- 1. GENERATE FOTO STRIP HIGH RES (FIXED LOGIC) ---
  const bakePhotoStripManually = async () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("Gagal membuat canvas");

    const totalHeight = PADDING_Y + (PHOTO_BOX_SIZE * photos.length) + (GAP * (photos.length - 1)) + PADDING_Y + FOOTER_HEIGHT;
    canvas.width = STRIP_WIDTH;
    canvas.height = totalHeight;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Scaling Factor dari Preview (250px) ke Final (1000px)
    const ratio = PHOTO_BOX_SIZE / PHOTO_SIZE_PREVIEW; // 4x

    for (let i = 0; i < photos.length; i++) {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = reject;
            image.src = photos[i];
        });

        const adj = photoAdjustments?.[i] || { x: 0, y: 0, scale: 1 };
        
        const targetX = (STRIP_WIDTH - PHOTO_BOX_SIZE) / 2;
        const targetY = PADDING_Y + i * (PHOTO_BOX_SIZE + GAP);

        ctx.save();
        ctx.beginPath();
        // Area Potong (Clipping)
        ctx.rect(targetX, targetY, PHOTO_BOX_SIZE, PHOTO_BOX_SIZE);
        ctx.clip(); 

        // Pindahkan origin ke tengah kotak
        ctx.translate(targetX + PHOTO_BOX_SIZE / 2, targetY + PHOTO_BOX_SIZE / 2);
        
        // Terapkan Transformasi (X dan Y dikali ratio agar sama dengan preview)
        ctx.scale(-adj.scale, adj.scale); // Mirror & Zoom
        ctx.translate(-adj.x * ratio, adj.y * ratio); // PENTING: Geseran dikali ratio
        if (adj.rotation) ctx.rotate((adj.rotation * Math.PI) / 180);

        // Gambar Foto (Centered)
        // Draw image centered at 0,0 (relative to new origin)
        // Menggunakan aspect ratio asli foto agar tidak gepeng
        const imgRatio = img.width / img.height;
        // Kita ingin "cover" kotak 1000x1000.
        // Jika img lebar > tinggi, tinggi dipaskan ke 1000, lebar menyesuaikan
        let drawW, drawH;
        if (imgRatio > 1) { // Landscape
             drawH = PHOTO_BOX_SIZE;
             drawW = drawH * imgRatio;
        } else { // Portrait / Square
             drawW = PHOTO_BOX_SIZE;
             drawH = drawW / imgRatio;
        }
        
        // Gambar centered
        ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
        
        ctx.restore(); 
    }

    const frameUrl = getFrameUrl();
    if (frameUrl) {
         const frameImg = await new Promise<HTMLImageElement>((resolve) => {
             const image = new Image();
             image.onload = () => resolve(image);
             image.src = frameUrl;
         });
         ctx.drawImage(frameImg, 0, 0, STRIP_WIDTH, totalHeight);
    }

    ctx.fillStyle = '#000000';
    ctx.font = 'bold 40px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('KEMIL.CO', STRIP_WIDTH / 2, totalHeight - (FOOTER_HEIGHT/2));

    return canvas.toDataURL('image/jpeg', 0.95);
  };

  const processAndSaveAll = async () => {
    setIsSaving(true);
    try {
        // A. SIMPAN FOTO SATU PER SATU
        setStatusMsg('Menyimpan Foto...');
        for (let i = 0; i < photos.length; i++) {
            await saveToLocalDisk(photos[i], `pose-${i+1}.jpg`);
        }

        // B. GENERATE FOTO STRIP
        setStatusMsg('Render High-Res Strip...');
        const stripBase64 = await bakePhotoStripManually();
        await saveToLocalDisk(stripBase64, 'final-strip.jpg');
        
        // C. GENERATE VIDEO STRIP
        setStatusMsg('Render Video...');
        await generateAndSaveVideoStrip();

        // D. SIMPAN GIF
        if (gifUrl) await saveToLocalDisk(gifUrl, 'animation.gif');

        // --- BAGIAN INI DIMATIKAN SEMENTARA (COMMENTED OUT) ---
        
        /* // E. UPLOAD CLOUD
        setStatusMsg('Upload Cloud...');
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
        */

        // --- PENGGANTI SEMENTARA: LANGSUNG SELESAI ---
        console.log("Upload Drive dimatikan sementara.");
        setStatusMsg('Siap Dicetak (Lokal)!');
        // ----------------------------------------------

    } catch (e) {
        console.error("Error process:", e);
        setStatusMsg('Gagal Proses: ' + e);
    } finally {
        setIsSaving(false);
        // Hapus pesan status
        setTimeout(() => setStatusMsg(''), 2000);
    }
  };

  // --- 2. GENERATE VIDEO STRIP ---
  const generateAndSaveVideoStrip = async () => {
    if (!videoClips || videoClips.length === 0 || !videoStripRef.current) return;
    return new Promise<void>(async (resolve) => {
        const element = videoStripRef.current;
        const videos = element.querySelectorAll('video');
        videos.forEach(v => v.play());
        await new Promise(r => setTimeout(r, 500));

        const canvas = document.createElement('canvas');
        const width = 720; 
        const height = width * photos.length; 
        canvas.width = width;
        canvas.height = height;

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
                    
                    const vW = v.videoWidth;
                    const vH = v.videoHeight;
                    const cropSize = Math.min(vW, vH);
                    const sx = (vW - cropSize) / 2;
                    const sy = (vH - cropSize) / 2;

                    ctx.drawImage(v, sx, sy, cropSize, cropSize, 0, i * width, width, width);
                    ctx.restore();
                });
            }
            requestAnimationFrame(draw);
        };
        draw();
        setTimeout(() => { recorder.stop(); }, 4000);
    });
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
      } else {
          formData.append('file', data);
      }
      await fetch('/api/save-photo', { method: 'POST', body: formData });
    } catch (e) { console.error(e); }
  };

  const handleSendEmail = async () => {
    if(!email || !email.includes('@')) return alert("⚠️ Masukkan email valid!");
    setIsSending(true);
    setStatusMsg("Mengirim Email...");
    try {
        const res = await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, sessionId }),
        });
        const data = await res.json();
        if (data.success) { alert("✅ Email Terkirim!"); setEmail(''); } 
        else { alert("❌ Gagal: " + data.error); }
    } catch (e) { alert("❌ Error jaringan."); } 
    finally { setIsSending(false); setStatusMsg(""); }
  };

  const handlePrintManual = () => {
      setStatusMsg('Mencetak...');
      setTimeout(() => { window.print(); setStatusMsg(''); }, 1000);
  }

  return (
    <div className="flex flex-col h-full gap-4 w-full">
      
      {/* VIDEO STRIP REF (HIDDEN) */}
      <div className="fixed left-[-9999px] top-0" ref={videoStripRef}>
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
         <div className="relative mx-auto bg-white p-4 box-border border border-gray-200" style={{ width: '300px', height: 'auto', minHeight: '900px' }}>
            <div className="relative w-full" style={{ height: (PHOTO_SIZE_PREVIEW + GAP_PREVIEW) * photos.length + 50 }}>
                {photos.map((src:string, i:number) => (
                    <div key={i} style={getContainerStyle(i)}>
                        {/* Object cover penting */}
                        <img src={src} className="w-full h-full object-cover transform scale-x-[-1]" />
                    </div>
                ))}
                {uploadedFrameLayer && (
                    <img src={getFrameUrl()} className="absolute inset-0 w-full h-full object-cover z-20 pointer-events-none" />
                )}
                 <div className="absolute bottom-0 left-0 right-0 text-center font-mono text-black font-bold uppercase tracking-widest text-[10px]">Kemil.co</div>
            </div>
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

      {/* STATUS */}
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

      {/* PREVIEW AREA (LAYAR) */}
      <div className="flex-1 bg-black border-2 border-dashed border-gray-700 rounded-xl overflow-hidden flex items-center justify-center p-2 relative print:hidden">
        {activeTab === 'photo' && (
          // Wrapper Scale agar preview muat di layar laptop
          <div className="transform scale-[0.6] md:scale-[0.7] origin-center transition-all">
              <div className="relative bg-white shadow-2xl" style={{ width: PHOTO_SIZE_PREVIEW, height: (PHOTO_SIZE_PREVIEW + GAP_PREVIEW) * photos.length, overflow: 'visible' }}>
                 {photos.map((src:string, i:number) => (
                    <div key={i} style={getContainerStyle(i)}>
                        {/* Object cover penting */}
                        <img src={src} className="w-full h-full object-cover transform scale-x-[-1]" />
                    </div>
                 ))}
                 {uploadedFrameLayer && (
                    <img src={getFrameUrl()} className="absolute inset-0 w-full h-full object-cover z-20 pointer-events-none" />
                 )}
                 <div className="absolute bottom-2 left-0 right-0 text-center font-mono text-black font-bold uppercase tracking-widest text-[8px]">Kemil.co</div>
              </div>
          </div>
        )}
        {/* VIDEO & GIF PREVIEW */}
        {activeTab === 'video' && (
           <div className="h-full aspect-[1/3] bg-black p-2 shadow-[0_0_30px_var(--neon-cyan)] border-4 border-[--neon-cyan] flex flex-col">
             <div className="grid grid-cols-1 w-full flex-1 gap-0">
                {videoClips.map((src:string, i:number) => (
                  <div key={i} className="relative w-full aspect-square bg-gray-800 overflow-hidden border border-gray-700">
                    {src ? <video src={src} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1]" /> : null}
                  </div>
                ))}
             </div>
          </div>
        )}
        {activeTab === 'gif' && (
          <div className="text-center flex flex-col items-center justify-center w-full h-full p-4">
             {gifUrl && <img src={gifUrl} className="max-h-full max-w-full object-contain" />}
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