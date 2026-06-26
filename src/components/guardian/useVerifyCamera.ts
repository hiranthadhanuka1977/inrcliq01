"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useVerifyCamera(facingMode: "environment" | "user" = "environment") {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [error, setError] = useState("");

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setIsLive(false);
  }, []);

  const startCamera = useCallback(async () => {
    setError("");
    stopCamera();

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera access is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsLive(true);
    } catch {
      setError("Please allow camera access to continue verification.");
      setIsLive(false);
    }
  }, [facingMode, stopCamera]);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  return { videoRef, isLive, error, startCamera, stopCamera };
}

export function useCaptureProgress(durationMs: number) {
  const [active, setActive] = useState(false);
  const [progress, setProgress] = useState(0);

  const start = useCallback(() => {
    setActive(true);
    setProgress(0);
    requestAnimationFrame(() => setProgress(100));
  }, []);

  const reset = useCallback(() => {
    setActive(false);
    setProgress(0);
  }, []);

  return { active, progress, start, reset, durationMs };
}
