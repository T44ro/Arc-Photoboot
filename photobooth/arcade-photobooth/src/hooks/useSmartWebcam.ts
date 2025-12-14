import { useRef, useState, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';

export const useSmartWebcam = () => {
  const webcamRef = useRef<Webcam>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  
  const [videoClips, setVideoClips] = useState<string[]>([]);
  const chunksRef = useRef<Blob[]>([]);
  
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState<string | undefined>(undefined);

  useEffect(() => {
    const handleDevices = (mediaDevices: MediaDeviceInfo[]) => {
      const videoDevices = mediaDevices.filter(({ kind }) => kind === "videoinput");
      setDevices(videoDevices);
    };
    navigator.mediaDevices.enumerateDevices().then(handleDevices);
  }, []);

  const switchCamera = (deviceId: string) => {
    setActiveDeviceId(deviceId);
  };

  const resetClips = useCallback(() => {
    setVideoClips([]);
    chunksRef.current = [];
  }, []);

  const startSingleClip = useCallback(() => {
    chunksRef.current = []; 
    if (webcamRef.current && webcamRef.current.stream) {
      try {
        const recorder = new MediaRecorder(webcamRef.current.stream);
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            chunksRef.current.push(event.data);
          }
        };

        // --- FIX: HAPUS PARAMETER WAKTU (Penyebab Error NotSupportedError) ---
        recorder.start(); 
        // ---------------------------------------------------------------------
        
        console.log("🎬 Clip Recording Started...");
      } catch (e) {
        console.error("❌ Gagal merekam klip:", e);
      }
    }
  }, [webcamRef]);

  const stopSingleClip = useCallback((index: number) => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === 'recording') {
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        if (blob.size > 0) {
          const url = URL.createObjectURL(blob);
          setVideoClips(prev => {
            const newClips = [...prev];
            newClips[index] = url;
            return newClips;
          });
        }
      };
      recorder.stop();
    }
  }, []);

  const capturePhoto = useCallback(() => {
    return webcamRef.current?.getScreenshot();
  }, [webcamRef]);

  return { 
    webcamRef, startSingleClip, stopSingleClip, resetClips, videoClips, capturePhoto, devices, activeDeviceId, switchCamera
  };
};