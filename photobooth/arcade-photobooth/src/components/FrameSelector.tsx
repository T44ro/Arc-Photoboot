"use client";
import { useRef, useState, useEffect } from 'react';
import { FRAMES } from '@/lib/frames';
import { motion } from 'framer-motion';
import { Upload, Trash2, CheckCircle, Image as ImageIcon, Layout } from 'lucide-react';
import RetroButton from './RetroButton';

export default function FrameSelector({ onSelect, uploadedFrameLayer, setUploadedFrameLayer }: any) {
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State untuk menyimpan daftar frame dari Admin
  const [adminFrames, setAdminFrames] = useState<{filename: string, url: string}[]>([]);
  const [loadingFrames, setLoadingFrames] = useState(true);

  // 1. Fetch Frame dari API saat komponen muncul
  useEffect(() => {
    const fetchFrames = async () => {
      try {
        const res = await fetch('/api/frames');
        const data = await res.json();
        if (data.success) {
          setAdminFrames(data.frames);
        }
      } catch (err) {
        console.error("Gagal load frames", err);
      } finally {
        setLoadingFrames(false);
      }
    };
    fetchFrames();
  }, []);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'image/png') {
        alert('⚠️ Harap upload file PNG transparan!');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedFrameLayer(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Fungsi saat user memilih template admin
  const selectTemplate = (url: string) => {
    setUploadedFrameLayer(url);
  };

  return (
    <div className="text-center space-y-8 w-full max-w-6xl">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold text-[--neon-cyan] drop-shadow-md">SETUP PHOTOBOOTH</h2>
        <p className="text-gray-400 text-sm">Pilih frame template atau upload sendiri</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start justify-center h-[60vh]">
        
        {/* KOLOM KIRI: PILIHAN FRAME (TEMPLATE + UPLOAD) */}
        <div className="flex-1 w-full h-full flex flex-col bg-gray-800/50 p-4 rounded-2xl border-2 border-gray-600">
            <h3 className="text-[--neon-yellow] font-bold mb-4 flex items-center justify-center gap-2 sticky top-0 bg-gray-900/80 p-2 rounded backdrop-blur-sm z-10">
                <ImageIcon size={20}/> PILIH FRAME
            </h3>

            {/* Scrollable Area */}
            <div className="overflow-y-auto custom-scrollbar flex-1 pr-2">
                
                {/* 1. Tombol Upload Manual */}
                <div className="mb-6 p-4 border border-dashed border-gray-500 rounded-xl hover:border-[--neon-yellow] transition-colors">
                    <p className="text-xs text-gray-400 mb-2">Punya desain sendiri?</p>
                    <input type="file" ref={fileInputRef} accept="image/png" className="hidden" onChange={handleUpload}/>
                    <RetroButton color="yellow" onClick={triggerFileInput}>
                        <div className="flex items-center gap-2">
                           <Upload size={16}/> <span className="text-xs">UPLOAD FILE</span>
                        </div>
                    </RetroButton>
                </div>

                {/* 2. Daftar Template Admin */}
                <div className="grid grid-cols-3 gap-3">
                    {loadingFrames ? (
                        <p className="text-gray-500 text-xs col-span-3">Loading templates...</p>
                    ) : (
                        adminFrames.map((frame, idx) => (
                            <div 
                                key={idx}
                                onClick={() => selectTemplate(frame.url)}
                                className={`
                                    relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all aspect-1/3 bg-gray-700
                                    ${uploadedFrameLayer === frame.url ? 'border-[--neon-pink] ring-2 ring-[--neon-pink]' : 'border-transparent hover:border-white'}
                                `}
                            >
                                <img src={frame.url} className="w-full h-full object-contain" alt="Template" />
                                {uploadedFrameLayer === frame.url && (
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                        <CheckCircle className="text-[--neon-pink]" size={24} />
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Tombol Hapus Frame (Jika ada yang terpilih) */}
            {uploadedFrameLayer && (
                <div className="mt-4 pt-4 border-t border-gray-700">
                     <RetroButton color="pink" onClick={() => setUploadedFrameLayer(null)}>
                        <div className="flex items-center gap-2">
                            <Trash2 size={16}/> <span className="text-xs">HAPUS FRAME</span>
                        </div>
                    </RetroButton>
                </div>
            )}
        </div>

        {/* KOLOM KANAN: PREVIEW LAYOUT */}
        <div className="flex-2 w-full h-full flex flex-col items-center justify-center">
            <h3 className="text-[--neon-cyan] font-bold mb-8 flex gap-2 items-center"><Layout size={20}/> PREVIEW LAYOUT</h3>
            
            <div className="flex flex-wrap justify-center gap-8">
                {FRAMES.map((frame) => (
                <motion.div 
                    key={frame.id}
                    whileHover={{ scale: 1.05 }}
                    className="flex flex-col items-center cursor-pointer group"
                    onClick={() => onSelect(frame)}
                >
                    {/* VISUALISASI STRIP 5x15cm (1:3) */}
                    <div className={`
                        w-24 h-72 bg-gray-800 border-4 border-white/20 rounded-sm relative overflow-hidden 
                        group-hover:border-[--neon-pink] transition-all shadow-[0_0_20px_rgba(0,0,0,0.5)]
                        flex flex-col
                        ${frame.photoCount === 3 ? 'p-3 gap-3' : 'p-2 gap-2'}
                    `}>
                        {/* Slot Foto */}
                        {[...Array(frame.photoCount)].map((_, i) => (
                            <div key={i} className="bg-white/10 w-full flex-1 border border-white/5" />
                        ))}
                        
                        {/* Overlay Frame Preview */}
                        {uploadedFrameLayer && (
                            <img src={uploadedFrameLayer} className="absolute inset-0 w-full h-full object-cover z-10" alt="Overlay" />
                        )}
                    </div>
                    
                    <p className="font-mono text-sm text-white mt-4 group-hover:text-[--neon-pink] font-bold tracking-widest">{frame.label}</p>
                    <p className="text-[10px] text-gray-500">Klik untuk mulai</p>
                </motion.div>
                ))}
            </div>
        </div>

      </div>
    </div>
  );
}