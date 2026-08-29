import { useEffect, useRef, useState } from 'react';
import { emptyCaptureDraft, hasCaptureContent, type CaptureDraft } from '../../models/moment';
import { discardStickerPhotoTask, fileToObjectUrl, releaseDraftResources, releaseObjectUrl, stageStickerPhotoTask, startAudioRecording, startStickerPhotoTask, type AudioRecorder } from '../../services/media/mediaService';
import { useStickerGeneration } from '../stickerGeneration/StickerGenerationProvider';

export function useCaptureDraft(initialDraft?: CaptureDraft) {
  const { stickerGenerationEnabled } = useStickerGeneration();
  const [draft, setDraft] = useState<CaptureDraft>(() => initialDraft ?? emptyCaptureDraft());
  const [isRecording, setIsRecording] = useState(false);
  const [recordingError, setRecordingError] = useState<string>();
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | undefined>(() => initialDraft?.audio ? URL.createObjectURL(initialDraft.audio.blob) : undefined);
  const audioPreviewRef = useRef<string | undefined>(audioPreviewUrl);
  const recorder = useRef<AudioRecorder | undefined>(undefined);
  const draftRef = useRef(draft);
  const handedOff = useRef(false);

  useEffect(() => { draftRef.current = draft; }, [draft]);

  /**
   * 相机回调和「确认内容」可在同一轮事件中连续发生。
   * 因此在提交 React state 前先同步更新交接 ref，避免把上一帧草稿交给互动页。
   */
  const replaceDraft = (updater: (current: CaptureDraft) => CaptureDraft) => {
    const next = updater(draftRef.current);
    draftRef.current = next;
    setDraft(next);
  };

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
    replaceDraft((current) => {
      releaseObjectUrl(current[field]);
      return { ...current, [field]: url };
    });
  };

  const setPhoto = (file?: File) => {
    if (!file) return;
    const originalPhoto = fileToObjectUrl(file);
    stageStickerPhotoTask(draftRef.current.id, file);
    replaceDraft((current) => {
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
        replaceDraft((current) => ({ ...current, audio }));
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
    replaceDraft(() => emptyCaptureDraft(draftRef.current.interactionType));
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
    // remove.bg 在后台启动；互动页永远使用原图，不等待抠图结果。
    if (current.photo && stickerGenerationEnabled) startStickerPhotoTask(current.id);
    else discardStickerPhotoTask(current.id);
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
    setText: (text: string) => replaceDraft((current) => ({ ...current, text })),
    setPhoto,
    setLivePhotoVideo: (file?: File) => useFile('livePhotoVideo', file),
    setInteractionType: (interactionType: string) => replaceDraft((current) => ({ ...current, interactionType })),
    toggleRecording,
    reset,
    confirm,
  };
}
