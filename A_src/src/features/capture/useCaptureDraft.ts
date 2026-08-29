import { useEffect, useRef, useState } from 'react';
import { emptyCaptureDraft, hasCaptureContent, type CaptureDraft } from '../../models/moment';
import { discardStickerPhotoTask, fileToObjectUrl, releaseDraftResources, releaseObjectUrl, startAudioRecording, startStickerPhotoTask, type AudioRecorder } from '../../services/media/mediaService';

export function useCaptureDraft(initialDraft?: CaptureDraft) {
  const [draft, setDraft] = useState<CaptureDraft>(() => initialDraft ?? emptyCaptureDraft());
  const [isRecording, setIsRecording] = useState(false);
  const [recordingError, setRecordingError] = useState<string>();
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | undefined>(() => initialDraft?.audio ? URL.createObjectURL(initialDraft.audio.blob) : undefined);
  const audioPreviewRef = useRef<string | undefined>(audioPreviewUrl);
  const recorder = useRef<AudioRecorder | undefined>(undefined);
  const draftRef = useRef(draft);
  const handedOff = useRef(false);

  useEffect(() => { draftRef.current = draft; }, [draft]);

  useEffect(() => () => {
    recorder.current?.cancel();
    releaseObjectUrl(audioPreviewRef.current);
    if (!handedOff.current) {
      discardStickerPhotoTask(draftRef.current.id);
      releaseDraftResources(draftRef.current);
    }
  }, []);

  const useFile = (field: 'photo' | 'livePhotoVideo', file?: File) => {
    if (!file) return;
    const url = fileToObjectUrl(file);
    setDraft((current) => {
      releaseObjectUrl(current[field]);
      return { ...current, [field]: url };
    });
  };

  const setPhoto = (file?: File) => {
    if (!file) return;
    const originalPhoto = fileToObjectUrl(file);
    startStickerPhotoTask(draftRef.current.id, file);
    setDraft((current) => {
      releaseObjectUrl(current.photo);
      releaseObjectUrl(current.stickerPhoto);
      return { ...current, photo: originalPhoto, stickerPhoto: undefined };
    });
  };

  const toggleRecording = async () => {
    setRecordingError(undefined);
    if (recorder.current) {
      try {
        const audio = await recorder.current.stop();
        releaseObjectUrl(audioPreviewRef.current);
        const nextPreviewUrl = URL.createObjectURL(audio.blob);
        audioPreviewRef.current = nextPreviewUrl;
        setAudioPreviewUrl(nextPreviewUrl);
        setDraft((current) => ({ ...current, audio }));
      } catch (error) {
        setRecordingError(error instanceof Error ? error.message : '录音保存失败，请重新录制');
      } finally {
        recorder.current = undefined;
        setIsRecording(false);
      }
      return;
    }
    try {
      recorder.current = await startAudioRecording();
      setIsRecording(true);
    } catch (error) {
      setRecordingError(error instanceof Error ? error.message : '无法开始录音');
    }
  };

  const reset = () => {
    discardStickerPhotoTask(draftRef.current.id);
    recorder.current?.cancel();
    recorder.current = undefined;
    setIsRecording(false);
    setRecordingError(undefined);
    releaseObjectUrl(audioPreviewRef.current);
    audioPreviewRef.current = undefined;
    setAudioPreviewUrl(undefined);
    releaseDraftResources(draftRef.current);
    setDraft(emptyCaptureDraft(draftRef.current.interactionType));
  };

  /** 定位与逆地理编码在互动完成、保存 Moment 的那一刻进行。 */
  const confirm = async (): Promise<CaptureDraft | undefined> => {
    // 录音中先停下来，避免录音数据丢失
    if (recorder.current) await toggleRecording();
    const current = draftRef.current;
    if (!hasCaptureContent(current)) {
      setRecordingError('请先拍照、录音或写下一点文字');
      return undefined;
    }
    handedOff.current = true;
    return current;
  };

  return {
    draft,
    isRecording,
    recordingError,
    audioPreviewUrl,
    isLocating: false,
    canConfirm: hasCaptureContent(draft),
    setText: (text: string) => setDraft((current) => ({ ...current, text })),
    setPhoto,
    setLivePhotoVideo: (file?: File) => useFile('livePhotoVideo', file),
    setInteractionType: (interactionType: string) => setDraft((current) => ({ ...current, interactionType })),
    toggleRecording,
    reset,
    confirm,
  };
}
