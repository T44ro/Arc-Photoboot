export type FrameConfig = {
  id: string;
  label: string;
  photoCount: number;
  gridClass: string; // Class Tailwind untuk grid (misal: 'grid-cols-1 grid-rows-3')
  aspect: string;   // Aspect ratio container utama (misal: '1/3')
};

export const FRAMES: FrameConfig[] = [
  { 
      id: 'strip-3-v', 
      label: '3-Strip Vertical', 
      photoCount: 3, 
      gridClass: 'grid-cols-1 grid-rows-3 gap-1', 
      aspect: '1/3' 
  },
  { 
      id: 'strip-4-v', 
      label: '4-Strip Vertical', 
      photoCount: 4, 
      gridClass: 'grid-cols-1 grid-rows-4 gap-1', 
      aspect: '1/3' 
  },
];