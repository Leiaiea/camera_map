import { useRef, useState, type MouseEvent } from 'react';
import { CameraCapture, type CameraCaptureHandle } from '../features/capture/CameraCapture';
import { ConfirmGlassSheet } from '../features/capture/ConfirmGlassSheet';
import { CreativeTransitionStage, type CreativeTransitionPayload } from '../features/capture/CreativeTransitionStage';
import { DevelopmentWindow } from '../features/capture/DevelopmentWindow';
import { GazeMark } from '../features/capture/GazeMark';
import { useCaptureDraft } from '../features/capture/useCaptureDraft';
import { FALLBACK_INTERACTION_IMAGE, type CaptureDraft } from '../models/moment';
import './capturePage.css';
import './gazeAttention.css';

interface CapturePageProps { initialDraft?: CaptureDraft; onConfirm: (draft: CaptureDraft) => void; onCancel: () => void }

export function CapturePage({ initialDraft, onConfirm, onCancel }: CapturePageProps) {
  const capture = useCaptureDraft(initialDraft);
  const cameraRef = useRef<CameraCaptureHandle>(null);
  const fallbackPhotoInput = useRef<HTMLInputElement>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string>();
  const [photoTaken, setPhotoTaken] = useState(() => Boolean(capture.draft.photo && capture.draft.photo !== FALLBACK_INTERACTION_IMAGE));
  const [selectedFeeling, setSelectedFeeling] = useState<string>();
  const [isCapturing, setIsCapturing] = useState(false);
  const [transitionPayload, setTransitionPayload] = useState<CreativeTransitionPayload>();
  const [gazePoint, setGazePoint] = useState({ x: 50, y: 43 });
  const [gazeVisible, setGazeVisible] = useState(false);

  const handlePreviewClick = (event: MouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest('button, label, input, textarea, .confirm-glass-sheet')) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const rawX = ((event.clientX - rect.left) / rect.width) * 100;
    const rawY = ((event.clientY - rect.top) / rect.height) * 100;
    setGazePoint({ x: Math.min(78, Math.max(22, rawX)), y: Math.min(58, Math.max(25, rawY)) });
    setGazeVisible(true);
  };

  const handleCameraCapture = (file: File) => { capture.setPhoto(file); setPhotoTaken(true); setIsCapturing(false); };
  const handleAlbumPick = (file?: File) => { if (!file) return; capture.setPhoto(file); setPhotoTaken(true); setCameraError(undefined); };
  const handleReset = () => { capture.reset(); setPhotoTaken(false); setSelectedFeeling(undefined); setTransitionPayload(undefined); setCameraError(undefined); };
  const handleSend = async () => {
    if (!selectedFeeling) return;
    const draft = await capture.confirm();
    if (!draft) return;
    // TODO: 接入真实抠图边界、照片主色与地图目标坐标；当前使用明确的占位数据。
    setTransitionPayload({ recordId: draft.id, transitionId: `default-${Date.now()}`, cutoutPath: draft.stickerPhoto || draft.photo || '', subjectBounds: { x: 0.2, y: 0.2, width: 0.6, height: 0.6 }, dominantColor: 'rgba(255,255,255,.72)', targetLatGcj02: draft.location?.latitude ?? 0, targetLngGcj02: draft.location?.longitude ?? 0 });
  };
  const completeTransition = () => { const draft = capture.draft; setTransitionPayload(undefined); onConfirm(draft); };

  return <main className={`page gaze-page ${transitionPayload ? 'is-sending' : ''}`}>
    <section className="camera-preview" aria-label="相机预览" onClick={handlePreviewClick}>
      {photoTaken ? <img className="camera-preview-image" src={capture.draft.photo} alt="已拍摄的这一刻" /> : cameraError ? <div className="camera-fallback"><p>{cameraError}</p><button type="button" onClick={() => fallbackPhotoInput.current?.click()}>从相册选择</button></div> : <CameraCapture ref={cameraRef} inline showControls={false} facingMode={facingMode} onCapture={handleCameraCapture} onClose={onCancel} onUnavailable={setCameraError} />}
      <div className="camera-preview-shade" />
      <header className="gaze-topbar">
        <button className="glass-icon-button" type="button" onClick={onCancel} aria-label="关闭">×</button>
        <div className="glass-pill">把注意到的东西放进来</div>
        <button className="glass-icon-button" type="button" onClick={() => setFacingMode((mode) => mode === 'environment' ? 'user' : 'environment')} aria-label="翻转镜头">↻</button>
      </header>
      {!photoTaken && !cameraError && <><DevelopmentWindow x={gazePoint.x} y={gazePoint.y} isCapturing={isCapturing} /><GazeMark key={`${gazePoint.x}-${gazePoint.y}`} x={gazePoint.x} y={gazePoint.y} visible={gazeVisible} isCapturing={isCapturing} /><p className="gaze-copy">把你注意到的东西放进来</p></>}
      <input ref={fallbackPhotoInput} className="sr-only" type="file" accept="image/*" onChange={(event) => handleAlbumPick(event.target.files?.[0])} />
      {!photoTaken && <div className="gaze-bottom-controls"><label className="glass-icon-button album-button" aria-label="从相册选择">▧<input className="sr-only" type="file" accept="image/*" onChange={(event) => handleAlbumPick(event.target.files?.[0])} /></label><button className={`gaze-shutter ${isCapturing ? 'is-capturing' : ''}`} type="button" onClick={() => { setIsCapturing(true); void cameraRef.current?.takePhoto(); }} aria-label="拍照"><i /></button><span className="gaze-bottom-spacer" /></div>}
    </section>
    {photoTaken && <ConfirmGlassSheet photo={capture.draft.photo} selectedFeeling={selectedFeeling} text={capture.draft.text} isRecording={capture.isRecording} audioPreviewUrl={capture.audioPreviewUrl} onFeelingChange={setSelectedFeeling} onTextChange={(event) => capture.setText(event.target.value)} onToggleRecording={capture.toggleRecording} onRetake={handleReset} onSend={handleSend} />}
    {transitionPayload && <CreativeTransitionStage payload={transitionPayload} photo={capture.draft.photo} onComplete={completeTransition} />}
  </main>;
}
