export type FrameConfig = {
  id: string;
  label: string;
  photoCount: number;
  gridClass: string;
};

export const FRAMES: FrameConfig[] = [
  { 
    id: 'strip-3', 
    label: 'Classic Strip (3)', 
    photoCount: 3, 
    // Grid 1 Kolom, Gap agak besar biar estetik
    gridClass: 'grid-cols-1 gap-4 py-4 px-2' 
  },
  { 
    id: 'strip-4', 
    label: 'Compact Strip (4)', 
    photoCount: 4, 
    // Grid 1 Kolom, Gap lebih rapat
    gridClass: 'grid-cols-1 gap-2 py-4 px-2' 
  },
];