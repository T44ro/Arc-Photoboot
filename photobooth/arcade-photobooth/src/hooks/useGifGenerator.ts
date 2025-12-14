import { useState, useCallback } from 'react';
import gifshot from 'gifshot';

interface GifOptions {
  interval?: number;
}

export const useGifGenerator = (images: string[]) => {
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fungsi Pembantu: Resize gambar ke 16:9 (Tanpa Crop, Full Image)
  const resizeTo16_9 = (base64Image: string, width: number, height: number): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Image;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          // Gambar full image ke canvas 16:9
          // Karena sumber foto dari webcam sudah 16:9, ini tidak akan gepeng.
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        } else {
          resolve(base64Image); // Fallback
        }
      };
    });
  };

  const generateGif = useCallback(async (options?: GifOptions) => {
    if (!images || images.length === 0 || isGenerating) return;

    console.log("🎬 Memulai proses GIF 16:9...");
    setIsGenerating(true);
    setError(null);
    setGifUrl(null);

    try {
      // 1. Tentukan ukuran target 16:9
      // Kita gunakan 640x360 agar file GIF tidak terlalu berat tapi tetap tajam
      const TARGET_WIDTH = 640*2;
      const TARGET_HEIGHT = 360*2; 

      // 2. Resize semua frame ke 16:9
      const processedImages = await Promise.all(
        images.map(img => resizeTo16_9(img, TARGET_WIDTH, TARGET_HEIGHT))
      );

      // 3. Buat GIF
      gifshot.createGIF({
        images: processedImages,
        gifWidth: TARGET_WIDTH,
        gifHeight: TARGET_HEIGHT,
        interval: options?.interval || 0.4,
        numFrames: images.length,
        frameDuration: 1,
        sampleInterval: 10,
        fontWeight: 'bold',
        fontSize: '16px',
        text: '',
      }, (obj: any) => {
        if (!obj.error) {
          console.log("✅ GIF 16:9 berhasil dibuat!");
          setGifUrl(obj.image);
        } else {
          console.error("❌ Gagal:", obj.errorMsg);
          setError(obj.errorMsg);
        }
        setIsGenerating(false);
      });
    } catch (err) {
      console.error("Error creating GIF:", err);
      setError("Gagal memproses GIF.");
      setIsGenerating(false);
    }
  }, [images, isGenerating]);

  return { gifUrl, isGenerating, error, generateGif };
};