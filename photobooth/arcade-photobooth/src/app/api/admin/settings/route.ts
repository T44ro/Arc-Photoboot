import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// File JSON akan disimpan di public folder agar mudah dibaca/debug
const settingsFile = path.join(process.cwd(), 'public', 'frame-settings.json');

// Helper: Baca Settings
const getSettings = () => {
  if (!fs.existsSync(settingsFile)) return {};
  try {
    const fileContent = fs.readFileSync(settingsFile, 'utf-8');
    return JSON.parse(fileContent);
  } catch (e) {
    return {};
  }
};

export async function GET() {
  const settings = getSettings();
  return NextResponse.json({ success: true, settings });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { frameId, settings } = body; 

    const currentSettings = getSettings();
    // Update setting untuk frame tertentu
    currentSettings[frameId] = settings;

    fs.writeFileSync(settingsFile, JSON.stringify(currentSettings, null, 2));

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Gagal simpan setting' }, { status: 500 });
  }
}