import { useCaptureDraft } from '../features/capture/useCaptureDraft';
import { CameraCapture } from '../features/capture/CameraCapture';
import { FALLBACK_INTERACTION_IMAGE, type CaptureDraft } from '../models/moment';
import { useEffect, useRef, useState } from 'react';
import { getInteraction } from '../interactions/registry';
import { InteractionPickerSheet } from '../components/InteractionPickerSheet';
import { normalizeRecordedAudioDuration } from '../services/media/mediaService';
import './CapturePage.css';

interface CapturePageProps { initialDraft?: CaptureDraft; onConfirm: (draft: CaptureDraft) => void; onCancel: () => void; onPhotoCaptured?: (photoUrl: string) => void }

export function CapturePage({ initialDraft, onConfirm, onCancel, onPhotoCaptured }: CapturePageProps) {
  const capture = useCaptureDraft(initialDraft);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string>();
  const [photoTaken, setPhotoTaken] = useState(
    () => Boolean(capture.draft.photo && capture.draft.photo !== FALLBACK_INTERACTION_IMAGE),
  );
  const [textEditorOpen, setTextEditorOpen] = useState(false);
  const [pendingText, setPendingText] = useState('');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const fallbackPhotoInput = useRef<HTMLInputElement>(null);
  const notifiedPhotoUrl = useRef<string | undefined>(undefined);
  const interaction = getInteraction(capture.draft.interactionType);

  useEffect(() => {
    if (!capture.isRecording) return;
    const startedAt = Date.now();
    const updateElapsed = () => setRecordingSeconds(Math.floor((Date.now() - startedAt) / 1000));
    updateElapsed();
    const timer = window.setInterval(updateElapsed, 250);
    return () => window.clearInterval(timer);
  }, [capture.isRecording]);

  useEffect(() => {
    const photoUrl = capture.draft.photo;
    if (!photoTaken || !photoUrl || photoUrl === FALLBACK_INTERACTION_IMAGE || photoUrl === notifiedPhotoUrl.current) return;
    notifiedPhotoUrl.current = photoUrl;
    onPhotoCaptured?.(photoUrl);
  }, [capture.draft.photo, onPhotoCaptured, photoTaken]);

  const confirm = async () => {
    const located = await capture.confirm();
    if (located) onConfirm(located);
  };

  const handleCameraCapture = (file: File) => {
    capture.setPhoto(file);
    setPhotoTaken(true);
  };

  const handleCameraUnavailable = (message: string) => {
    setCameraError(message);
  };

  const handleAlbumPick = (file?: File) => {
    if (!file) return;
    capture.setPhoto(file);
    setPhotoTaken(true);
    setCameraError(undefined);
  };

  const openTextEditor = () => {
    setPendingText(capture.draft.text);
    setTextEditorOpen(true);
  };

  const saveText = () => {
    capture.setText(pendingText);
    setTextEditorOpen(false);
  };

  const recordingTime = `${String(Math.floor(recordingSeconds / 60)).padStart(2, '0')}:${String(recordingSeconds % 60).padStart(2, '0')}`;
  const photoReadyToConfirm = photoTaken && capture.canConfirm && !capture.isRecording;

  return (
    <main className={`page capture-page${photoTaken ? ' is-photo-taken' : ''}`}>
      <header className="simple-topbar capture-topbar"><button onClick={onCancel} disabled={capture.isLocating}>×</button><i /><button className="interaction-choice" onClick={() => setPickerOpen(true)}>互动：{interaction.name} ▾</button></header>
      <section className={`capture-preview${photoTaken ? ' is-photo-taken' : ''}`}>
        {photoTaken ? (
          <img src={capture.draft.photo} alt="已拍摄照片" />
        ) : cameraError ? (
          <div className="camera-capture-error">
            <p>{cameraError}</p>
            <button onClick={() => fallbackPhotoInput.current?.click()}>从相册选择</button>
          </div>
        ) : (
          <CameraCapture
            inline
            onCapture={handleCameraCapture}
            onClose={() => {}}
            onUnavailable={handleCameraUnavailable}
          />
        )}
      </section>
      <input className="capture-fallback-input" ref={fallbackPhotoInput} type="file" accept="image/*" onChange={(event) => handleAlbumPick(event.target.files?.[0])} />
      {capture.audioPreviewUrl && <audio className="capture-audio-metadata" src={capture.audioPreviewUrl} preload="metadata" onLoadedMetadata={(event) => normalizeRecordedAudioDuration(event.currentTarget)} />}
      {capture.recordingError && <p className="capture-error">{capture.recordingError}</p>}
      {capture.isRecording && (
        <section className="capture-recording-status" aria-label="正在录音">
          <span className="capture-recording-wave" aria-hidden="true"><i className="capture-recording-dot" /><span className="capture-recording-bars">{Array.from({ length: 12 }, (_, index) => <i key={index} />)}</span></span><b>{recordingTime}</b>
          <button type="button" onClick={capture.toggleRecording} aria-label="停止录音"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="2" /></svg></button>
        </section>
      )}
      {!capture.isRecording &&
        <nav className="capture-actions" aria-label="拍摄工具">
          <div className="capture-bridge" />
          <button className="capture-action capture-audio-action" type="button" onClick={capture.toggleRecording} aria-label={capture.draft.audio ? '重新录音' : '录音'}><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6" /></svg>{capture.draft.audio && <span className="capture-recorded-mark" aria-label="已记录"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6.5 12.5 3.5 3.5 7.5-8" /></svg></span>}</button>
          {photoReadyToConfirm && <button className="capture-confirm-shutter" type="button" onClick={confirm} disabled={capture.isLocating} aria-label={capture.isLocating ? '正在定位' : '确认内容'}><i /></button>}
          <button className="capture-action capture-text-action" type="button" onClick={openTextEditor} aria-label="写文字"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14v11H9l-4 3z" /><path d="M8 9h8M8 12h5" /></svg>{capture.draft.text.trim() && <span className="capture-recorded-mark" aria-label="已记录"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6.5 12.5 3.5 3.5 7.5-8" /></svg></span>}</button>
        </nav>
      }
      {textEditorOpen && <section className="capture-input-sheet" role="dialog" aria-modal="true" aria-label="写下这一刻" onMouseDown={(event) => { if (event.target === event.currentTarget) setTextEditorOpen(false); }}><div className="capture-input-card"><textarea value={pendingText} onChange={(event) => setPendingText(event.target.value)} placeholder="写下这一刻……" maxLength={240} autoFocus /><footer><button type="button" onClick={() => setTextEditorOpen(false)}>取消</button><button type="button" onClick={saveText}>保存</button></footer></div></section>}
      {pickerOpen && <InteractionPickerSheet selectedType={capture.draft.interactionType} onSelect={(type) => { capture.setInteractionType(type); setPickerOpen(false); }} onClose={() => setPickerOpen(false)} />}
    </main>
  );
}
