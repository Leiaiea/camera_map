import { useEffect, useRef, useState } from 'react';
import { captureFrameToFile, closeCameraStream, openCameraStream } from '../../services/media/mediaService';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onClose: () => void;
  /** 权限拒绝或不支持时调用，交由调用方回退到相册选择 */
  onUnavailable: (message: string) => void;
  /** true：嵌入拍照区展示（无自身关闭按钮/覆盖层定位）；false 或省略：全屏覆盖层 */
  inline?: boolean;
}

/**
 * 实时相机取景。打开后置摄像头预览，拍照后把当前帧交给 onCapture，
 * 取消或卸载时统一释放摄像头轨道。inline 模式下填满父容器，交出关闭按钮的展示权。
 */
export function CameraCapture({ onCapture, onClose, onUnavailable, inline = false }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | undefined>(undefined);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    openCameraStream()
      .then((stream) => {
        if (cancelled) {
          closeCameraStream(stream);
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setIsReady(true);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : '相机启动失败，请从相册选择照片';
        setError(message);
        onUnavailable(message);
      });
    return () => {
      cancelled = true;
      closeCameraStream(streamRef.current);
      streamRef.current = undefined;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const takePhoto = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      const file = await captureFrameToFile(video);
      onCapture(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : '拍照失败，请重试');
    }
  };

  if (error) {
    if (inline) return <div className="camera-capture-error">{error}</div>;
    return null;
  }

  return (
    <div className={inline ? 'camera-capture-inline' : 'camera-capture-overlay'}>
      <video ref={videoRef} className="camera-capture-video" autoPlay playsInline muted />
      {!inline && <button className="camera-capture-close" onClick={onClose} aria-label="关闭相机">×</button>}
      <div className="camera-capture-actions">
        <button className="camera-capture-shutter" onClick={takePhoto} disabled={!isReady} aria-label="拍照" />
      </div>
    </div>
  );
}
