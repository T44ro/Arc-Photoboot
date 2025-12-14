import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Arahkan ke folder public/frames
    const framesDir = path.join(process.cwd(), 'public', 'frames');

    // Buat folder jika belum ada
    if (!fs.existsSync(framesDir)) {
      fs.mkdirSync(framesDir, { recursive: true });
    }

    // Baca file
    const files = fs.readdirSync(framesDir);

    // Filter hanya file gambar (PNG/JPG)
    const frameFiles = files
      .filter(file => /\.(png|jpg|jpeg)$/i.test(file))
      .map(file => `/frames/${file}`); // Return path relative public

    return NextResponse.json({ success: true, frames: frameFiles });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Gagal memuat frame' }, { status: 500 });
  }
}