// Copy ini jika perlu, atau pahami saja strukturnya
export interface PhotoLayout {
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

export interface FrameConfig {
  id: string;           // Unik, misal: 'frame-neon-3'
  name: string;         // Nama frame, misal: 'Neon Vibe'
  imageUrl: string;     // URL gambar PNG frame
  photoCount: 3 | 4;    // Jenis strip
  layout: PhotoLayout[]; // Array koordinat untuk setiap foto di frame ini
}