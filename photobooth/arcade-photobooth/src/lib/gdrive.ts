import { google } from 'googleapis';
import path from 'path';
import fs from 'fs';

// Lokasi key file (pastikan file gdrive-key.json ada di root project)
const KEY_FILE_PATH = path.join(process.cwd(), 'gdrive-key.json');

// ID Folder Induk di Google Drive Anda (Ambil dari URL folder Google Drive)
// Contoh URL: drive.google.com/drive/folders/12345abcde... -> ID nya adalah "12345abcde..."
const PARENT_FOLDER_ID = '1a-NnQjUba_G60Orhh5h_GPZAY8bfyBh0'; 

const auth = new google.auth.GoogleAuth({
  keyFile: KEY_FILE_PATH,
  scopes: ['https://www.googleapis.com/auth/drive'],
});

const drive = google.drive({ version: 'v3', auth });

// 1. Buat Folder Baru per Sesi
export async function createSessionFolder(folderName: string) {
  try {
    const fileMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [PARENT_FOLDER_ID],
    };
    
    const response = await drive.files.create({
      requestBody: fileMetadata,
      fields: 'id, webViewLink',
    });

    return {
      id: response.data.id,
      link: response.data.webViewLink // Ini link untuk QR Code!
    };
  } catch (error) {
    console.error("Gagal buat folder GDrive:", error);
    throw error;
  }
}

// 2. Upload File ke Folder Tertentu
export async function uploadToDrive(fileName: string, filePath: string, folderId: string, mimeType: string) {
  try {
    const fileMetadata = {
      name: fileName,
      parents: [folderId],
    };
    const media = {
      mimeType: mimeType,
      body: fs.createReadStream(filePath),
    };
    
    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id',
    });
    
    return response.data.id;
  } catch (error) {
    console.error(`Gagal upload ${fileName}:`, error);
    throw error;
  }
}