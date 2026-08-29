import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { captureFrameToFile, closeCameraStream, openCameraStream } from '../../services/media/mediaService';

export interface CameraCaptureHandle { takePhoto: () => Promise<void>; }

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onClose: () => void;
  onUnavailable: (message: string) => void;
  inline?: boolean;
  facingMode?: 'environment' | 'user';
  showControls?: boolean;
  onReady?: () => void;
}

export const CameraCapture = forwardRef<CameraCaptureHandle, CameraCaptureProps>(function CameraCapture(
  { onCapture, onClose, onUnavailable, inline = false, facingMode = 'environment', showControls = true, onReady },
  ref,
) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream>();
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    openCameraStream(facingMode).then((stream) => {
      if (cancelled) { closeCameraStream(stream); return; }
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setIsReady(true);
      onReady?.();
    }).catch((err: unknown) => {
      if (cancelled) return;
      const message = err instanceof Error ? err.message : '相机启动失败，请从相册选择照片';
      setError(message);
      onUnavailable(message);
    });
    return () => { cancelled = true; closeCameraStream(streamRef.current); streamRef.current = undefined; };
  }, [facingMode, onReady, onUnavailable]);

  const takePhoto = async () => {
    const video = videoRef.current;
    if (!video || !isReady) return;
    try { onCapture(await captureFrameToFile(video)); }
    catch (err) { setError(err instanceof Error ? err.message : '拍摄失败，请重试'); }
  };

  useImperativeHandle(ref, () => ({ takePhoto }), [isReady]);

  if (error) return inline ? <div className="camera-capture-error">{error}</div> : null;
  return (
    <div className={inline ? 'camera-capture-inline' : 'camera-capture-overlay'}>
      <video ref={videoRef} className="camera-capture-video" autoPlay playsInline muted />
      {!inline && <button className="camera-capture-close" onClick={onClose} aria-label="关闭相机">×</button>}
      {showControls && <div className="camera-capture-actions"><button className="camera-capture-shutter" onClick={takePhoto} disabled={!isReady} aria-label="拍照" /></div>}
    </div>
  );
});
