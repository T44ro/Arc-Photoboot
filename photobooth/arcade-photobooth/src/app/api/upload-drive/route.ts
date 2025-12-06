import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { createSessionFolder, uploadToDrive } from '@/lib/gdrive';

export async function POST(req: Request) {
  try {
    const { sessionId } = await req.json();
    
    // Tentukan folder lokal tempat foto disimpan
    const localDir = path.join(process.cwd(), 'public', 'uploads', sessionId);

    // Cek apakah folder lokal ada
    if (!fs.existsSync(localDir)) {
      return NextResponse.json({ success: false, error: 'Local files not found' }, { status: 404 });
    }

    // 1. Buat Folder Baru di Google Drive
    // Nama folder: Session-TANGGAL-JAM
    const timeString = new Date().toLocaleString('id-ID').replace(/[\/\,:\s]/g, '-');
    const folderName = `Session-${timeString}`;
    
    console.log(`☁️ Membuat folder GDrive: ${folderName}...`);
    const driveFolder = await createSessionFolder(folderName);
    
    if (!driveFolder.id) throw new Error("Gagal mendapatkan ID Folder Drive");

    // 2. Baca semua file di folder lokal
    const files = fs.readdirSync(localDir);
    
    console.log(`⬆️ Mengupload ${files.length} file ke Drive...`);

    // 3. Upload setiap file secara paralel
    const uploadPromises = files.map(file => {
      const filePath = path.join(localDir, file);
      
      // Deteksi tipe file sederhana
      let mimeType = 'application/octet-stream';
      if (file.endsWith('.jpg')) mimeType = 'image/jpeg';
      if (file.endsWith('.png')) mimeType = 'image/png';
      if (file.endsWith('.gif')) mimeType = 'image/gif';
      if (file.endsWith('.webm')) mimeType = 'video/webm';

      return uploadToDrive(file, filePath, driveFolder.id!, mimeType);
    });

    await Promise.all(uploadPromises);
    console.log("✅ Upload GDrive Selesai!");

    // 4. Return Link Folder Drive ke Frontend
    return NextResponse.json({ 
      success: true, 
      driveLink: driveFolder.link 
    });

  } catch (error: any) {
    console.error("❌ GDrive Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}