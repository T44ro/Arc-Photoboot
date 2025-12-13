import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const settingsFile = path.join(process.cwd(), 'public', 'frame-settings.json');

// Helper: Baca Settings
const getSettings = () => {
  if (!fs.existsSync(settingsFile)) return {};
  try {
    return JSON.parse(fs.readFileSync(settingsFile, 'utf-8'));
  } catch {
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
    const { frameId, settings } = body; // settings: { x, y, scale }

    const currentSettings = getSettings();
    currentSettings[frameId] = settings;

    fs.writeFileSync(settingsFile, JSON.stringify(currentSettings, null, 2));

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Gagal simpan' }, { status: 500 });
  }
}