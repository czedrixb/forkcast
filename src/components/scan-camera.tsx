"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

type CameraState = "idle" | "requesting" | "streaming" | "denied" | "error";

export function ScanCamera({ onSelect }: { onSelect: (file: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraState, setCameraState] = useState<CameraState>("idle");

  useEffect(() => () => stopStream(), []);

  function stopStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  async function openCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      // No live-camera support — fall back to letting the OS handle it via the file picker.
      inputRef.current?.setAttribute("capture", "environment");
      inputRef.current?.click();
      return;
    }

    setCameraOpen(true);
    setCameraState("requesting");
    try {
      // Prompts for camera permission if not yet granted; resolves straight to
      // the stream (no prompt) when permission was already granted.
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraState("streaming");
    } catch (err) {
      setCameraState(err instanceof DOMException && err.name === "NotAllowedError" ? "denied" : "error");
    }
  }

  function closeCamera() {
    stopStream();
    setCameraOpen(false);
    setCameraState("idle");
  }

  function capturePhoto() {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        onSelect(new File([blob], "camera-capture.jpg", { type: "image/jpeg" }));
        closeCamera();
      },
      "image/jpeg",
      0.92,
    );
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onSelect(file);
    e.target.value = "";
  }

  return (
    <div className="flex flex-col items-center gap-6 rounded-[28px] border-2 border-dashed border-border bg-surface-2 px-8 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-ink/15">
        <Camera className="h-7 w-7 text-accent-ink" />
      </div>
      <div>
        <p className="font-display text-lg font-semibold">Scan your food</p>
        <p className="mt-1 text-sm text-muted">Snap a photo or upload one from your library</p>
      </div>

      <input
        ref={inputRef}
        id="scan-file-input"
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="sr-only"
      />

      <div className="flex w-full flex-col gap-3">
        <Button type="button" size="lg" className="w-full" onClick={openCamera}>
          <Camera className="h-4 w-4" /> Take a photo
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full"
          onClick={() => {
            inputRef.current?.removeAttribute("capture");
            inputRef.current?.click();
          }}
        >
          <Upload className="h-4 w-4" /> Upload from library
        </Button>
      </div>

      <Dialog open={cameraOpen} onOpenChange={(open) => !open && closeCamera()}>
        <DialogContent className="max-w-sm p-4">
          <DialogTitle className="sr-only">Camera</DialogTitle>
          <div className="relative aspect-square overflow-hidden rounded-2xl bg-black">
            {cameraState === "requesting" && (
              <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-white">
                Waiting for camera permission…
              </p>
            )}
            {cameraState === "denied" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center text-sm text-white">
                <p>Camera access was denied. Allow camera permission in your browser settings to take a photo.</p>
                <Button type="button" size="sm" variant="outline" onClick={openCamera}>
                  Try again
                </Button>
              </div>
            )}
            {cameraState === "error" && (
              <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-white">
                Couldn&apos;t access the camera. Try uploading a photo instead.
              </p>
            )}
            <video
              ref={videoRef}
              playsInline
              muted
              className={cameraState === "streaming" ? "h-full w-full object-cover" : "hidden"}
            />
          </div>

          {cameraState === "streaming" && (
            <div className="mt-4 flex gap-3">
              <Button type="button" variant="outline" size="lg" onClick={closeCamera}>
                Cancel
              </Button>
              <Button type="button" size="lg" className="flex-1" onClick={capturePhoto}>
                Capture
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
