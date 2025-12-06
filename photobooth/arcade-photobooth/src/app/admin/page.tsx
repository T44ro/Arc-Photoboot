"use client";
import React, { useState, useEffect } from 'react';
import { Trash2, Upload, Lock, LogOut, Image as ImageIcon, ArrowLeft } from 'lucide-react';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [frames, setFrames] = useState<{filename: string, url: string}[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetchFrames();
    }
  }, [isAuthenticated]);

  const fetchFrames = async () => {
    const res = await fetch('/api/frames');
    const data = await res.json();
    if (data.success) setFrames(data.frames);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === '1234') { 
      setIsAuthenticated(true);
    } else {
      alert('PIN Salah! (Default: 1234)');
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    await fetch('/api/frames', { method: 'POST', body: formData });

    setIsUploading(false);
    fetchFrames(); 
  };

  const handleDelete = async (filename: string) => {
    if (!confirm('Hapus frame ini?')) return;
    await fetch('/api/frames', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename }),
    });
    fetchFrames();
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 font-mono relative">
        {/* Tombol Kembali ke Home */}
        <button 
            onClick={() => window.location.href = '/'} 
            className="absolute top-6 left-6 text-gray-500 hover:text-white flex gap-2 cursor-pointer z-50"
        >
            <ArrowLeft/> Back to Booth
        </button>

        <form onSubmit={handleLogin} className="bg-gray-900 p-8 rounded-xl border-2 border-[--neon-pink] w-full max-w-sm text-center">
          <Lock className="w-12 h-12 text-[--neon-pink] mx-auto mb-4" />
          <h1 className="text-2xl text-white font-bold mb-6">ADMIN ACCESS</h1>
          <input 
            type="password" 
            placeholder="Enter PIN (1234)" 
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="w-full bg-black border border-gray-700 text-white text-center text-xl p-3 rounded mb-4 focus:border-[--neon-cyan] outline-none"
          />
          <button type="submit" className="w-full bg-[--neon-pink] text-black font-bold py-3 rounded hover:opacity-90 cursor-pointer">UNLOCK</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-10 border-b border-gray-800 pb-4">
          <div>
            <h1 className="text-4xl font-black italic text-[--neon-cyan]">FRAME MANAGER</h1>
            <p className="text-gray-400 mt-1">Upload template frame PNG transparan di sini.</p>
          </div>
          <div className="flex gap-4">
             <button onClick={() => window.location.href = '/'} className="flex items-center gap-2 text-gray-400 hover:text-white cursor-pointer">
                <ArrowLeft size={20}/> Back to Booth
             </button>
             <button onClick={() => setIsAuthenticated(false)} className="flex items-center gap-2 text-red-500 hover:text-white cursor-pointer">
                <LogOut size={20}/> Logout
             </button>
          </div>
        </div>

        <div className="mb-12">
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-600 rounded-2xl hover:border-[--neon-yellow] hover:bg-gray-900 cursor-pointer transition-all">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
               {isUploading ? (
                 <p className="text-[--neon-yellow] animate-pulse font-bold">UPLOADING...</p>
               ) : (
                 <>
                   <Upload className="w-10 h-10 text-gray-400 mb-2" />
                   <p className="text-sm text-gray-400"><span className="font-semibold">Klik untuk upload</span> frame baru (PNG)</p>
                 </>
               )}
            </div>
            <input type="file" className="hidden" accept="image/png" onChange={handleUpload} disabled={isUploading} />
          </label>
        </div>

        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <ImageIcon size={24} className="text-[--neon-pink]"/> AVAILABLE FRAMES ({frames.length})
        </h2>
        
        {frames.length === 0 ? (
            <div className="text-center text-gray-600 py-10">Belum ada frame. Silakan upload.</div>
        ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {frames.map((frame, idx) => (
                <div key={idx} className="group relative bg-gray-900 rounded-lg overflow-hidden border border-gray-700 hover:border-[--neon-cyan] transition-all">
                    {/* Preview Image: Gunakan aspect-1/3 agar sesuai strip */}
                    <div className="w-full aspect-1/3 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] p-2">
                        <img src={frame.url} className="w-full h-full object-contain" alt={frame.filename} />
                    </div>
                    <div className="p-3 bg-gray-800">
                        <p className="text-xs text-gray-400 truncate mb-2" title={frame.filename}>{frame.filename}</p>
                        <button onClick={() => handleDelete(frame.filename)} className="w-full flex items-center justify-center gap-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white py-2 rounded text-xs font-bold transition-colors cursor-pointer"><Trash2 size={14}/> HAPUS</button>
                    </div>
                </div>
            ))}
            </div>
        )}
      </div>
    </div>
  );
}