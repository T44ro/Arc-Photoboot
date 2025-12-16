import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
  try {
    const { email, sessionId } = await req.json();

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', sessionId);
    
    if (!fs.existsSync(uploadDir)) {
      return NextResponse.json({ success: false, error: 'File belum siap. Coba sesaat lagi.' }, { status: 404 });
    }

    const files = fs.readdirSync(uploadDir);
    
    // UPDATE: Menambahkan ekstensi video (webm, mp4) ke dalam filter
    const attachments = files
      .filter(file => /\.(png|jpg|jpeg|gif|webm|mp4)$/i.test(file))
      .map(file => ({
        filename: file,
        path: path.join(uploadDir, file)
      }));

    if (attachments.length === 0) {
      return NextResponse.json({ success: false, error: 'Tidak ada file untuk dikirim.' }, { status: 404 });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'seboothin@gmail.com', 
        pass: 'wlxm gyhn mymz qiac'  
      },
    });

    await transporter.sendMail({
      from: '"Se-Booth" <no-reply@photobooth.com>',
      to: email,
      subject: '📸 Hasil Foto & Video Se-Booth',
      html: `
        <h3>Halo!</h3>
        <p>Terima kasih sudah seru-seruan di Se-Booth.</p>
        <p>Kami melampirkan <b>${attachments.length} file</b> kenangan kamu (Foto, GIF, dan Video Live).</p>
        <br/>
        <p><i>Salam,<br/>Admin Booth</i></p>
      `,
      attachments: attachments,
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('❌ Gagal kirim email:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}