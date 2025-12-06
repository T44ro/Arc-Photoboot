import { useState, useCallback } from 'react';
import gifshot from 'gifshot';

interface GifOptions {
  interval?: number;
}

export const useGifGenerator = (images: string[]) => {
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fungsi Pembantu: Memotong gambar persegi panjang menjadi kotak (Center Crop)
  const cropToSquare = (base64Image: string, size: number): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Image;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          // Logika Center Crop (Object-fit: Cover)
          const aspectRatio = img.width / img.height;
          let sourceWidth = img.width;
          let sourceHeight = img.height;
          let startX = 0;
          let startY = 0;

          if (aspectRatio > 1) {
            // Gambar Landscape: Potong kiri-kanan
            sourceWidth = img.height;
            startX = (img.width - img.height) / 2;
          } else {
            // Gambar Portrait: Potong atas-bawah
            sourceHeight = img.width;
            startY = (img.height - img.width) / 2;
          }

          // Gambar ulang ke canvas kotak
          ctx.drawImage(img, startX, startY, sourceWidth, sourceHeight, 0, 0, size, size);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        } else {
          resolve(base64Image); // Fallback jika gagal
        }
      };
    });
  };

  const generateGif = useCallback(async (options?: GifOptions) => {
    if (!images || images.length === 0 || isGenerating) return;

    console.log("🎬 Memulai proses Smart-Crop GIF...");
    setIsGenerating(true);
    setError(null);
    setGifUrl(null);

    try {
      // 1. Proses Crop semua gambar dulu agar rasio 1:1 sempurna
      const size = 400; // Ukuran target
      const croppedImages = await Promise.all(images.map(img => cropToSquare(img, size)));

      // 2. Buat GIF dari gambar yang sudah dicrop
      gifshot.createGIF({
        images: croppedImages,
        gifWidth: size,
        gifHeight: size,
        interval: options?.interval || 0.4,
        numFrames: images.length,
        frameDuration: 1,
        sampleInterval: 10,
        fontWeight: 'bold',
        fontSize: '16px',
        text: '',
      }, (obj: any) => {
        if (!obj.error) {
          console.log("✅ GIF Center-Crop berhasil!");
          setGifUrl(obj.image);
        } else {
          console.error("❌ Gagal:", obj.errorMsg);
          setError(obj.errorMsg);
        }
        setIsGenerating(false);
      });
    } catch (err) {
      console.error("Error cropping:", err);
      setError("Gagal memproses gambar.");
      setIsGenerating(false);
    }
  }, [images, isGenerating]);

  return { gifUrl, isGenerating, error, generateGif };
};