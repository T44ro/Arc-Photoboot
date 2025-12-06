import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as Blob | null;
    const filename = formData.get('filename') as string;
    const sessionId = formData.get('sessionId') as string;

    if (!file || !filename || !sessionId) {
      return NextResponse.json({ success: false, error: 'Data incomplete' }, { status: 400 });
    }

    // 1. Tentukan Folder
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', sessionId);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // 2. Konversi Blob ke Buffer dan Tulis File
    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = path.join(uploadDir, filename);
    
    fs.writeFileSync(filePath, buffer);

    console.log(`💾 Saved: ${filename} (${(buffer.length / 1024).toFixed(2)} KB)`);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("❌ Save Error:", error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}