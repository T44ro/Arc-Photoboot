import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const uploadDir = path.join(process.cwd(), 'public', 'frames');

// Pastikan folder public/frames ada
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

export async function GET() {
  try {
    const files = fs.readdirSync(uploadDir);
    // Filter hanya file gambar
    const frameFiles = files.filter(file => /\.(png|jpe?g)$/i.test(file));
    
    const frames = frameFiles.map(file => ({
      filename: file,
      url: `/frames/${file}`
    }));

    return NextResponse.json({ success: true, frames });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Gagal load frames' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    // Sanitasi nama file
    const safeName = file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
    const filePath = path.join(uploadDir, safeName);

    fs.writeFileSync(filePath, buffer);

    return NextResponse.json({ success: true, url: `/frames/${safeName}` });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Upload failed' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { filename } = await req.json();
    const filePath = path.join(uploadDir, filename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ success: false, error: 'File not found' }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Delete failed' }, { status: 500 });
  }
}

export type FrameConfig = {
  name: string;
  photoCount: number;
  gridClass: string;
  previewId: string;
}

export const FRAMES: FrameConfig[] = [
  // FIX: Gunakan 'aspect-square' agar sel foto selalu kotak
  { name: 'Classic 3-Strip', photoCount: 3, gridClass: 'grid grid-rows-3 gap-2 h-full [&>*]:aspect-square', previewId: 'strip-3' },
  { name: '4-Pose Grid', photoCount: 4, gridClass: 'grid grid-cols-2 grid-rows-2 gap-2 h-full [&>*]:aspect-square', previewId: 'grid-4' },
  { name: '6-Shot Collage', photoCount: 6, gridClass: 'grid grid-cols-2 grid-rows-3 gap-2 h-full [&>*]:aspect-square', previewId: 'grid-6' },
];