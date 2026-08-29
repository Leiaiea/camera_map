import type { CapturedAudio, CaptureDraft, Moment } from '../../models/moment';
// @ts-expect-error mobile-sticker-kit is synchronized as a framework-free JavaScript module.
import { StickerKit } from '../../../mobile-sticker-kit/sticker-kit.js';

const stickerKit = new StickerKit({ endpoint: import.meta.env.VITE_CUTOUT_ENDPOINT || 'http://127.0.0.1:8787/api/cutout' });
const stickerTasks = new Map<string, { controller: AbortController; promise: Promise<string | undefined> }>();

export interface AudioRecorder {
  stop: () => Promise<CapturedAudio>;
  cancel: () => void;
}

function cameraError(error: unknown): Error {
  if (error instanceof DOMException && (error.name === 'NotAllowedError' || error.name === 'SecurityError')) {
    return new Error('相机权限被拒绝，请从相册选择照片');
  }
  if (error instanceof DOMException && error.name === 'NotFoundError') return new Error('没有检测到可用的相机，请从相册选择照片');
  return error instanceof Error ? error : new Error('相机启动失败，请从相册选择照片');
}

/** 打开后置摄像头实时预览流；权限拒绝或不支持时抛出可读错误，交由调用方回退到相册选择。 */
export async function openCameraStream(facingMode: 'environment' | 'user' = 'environment'): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('当前浏览器不支持拍照，请从相册选择照片');
  }
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: { facingMode },
      audio: false,
    });
  } catch (error) {
    throw cameraError(error);
  }
}

export function closeCameraStream(stream?: MediaStream): void {
  stream?.getTracks().forEach((track) => track.stop());
}

/** 从相机预览的当前帧截取一张照片文件，用于沿用现有 CaptureDraft 照片链路。 */
export function captureFrameToFile(video: HTMLVideoElement): Promise<File> {
  return new Promise((resolve, reject) => {
    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) {
      reject(new Error('相机画面尚未准备好，请重试'));
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('拍照失败，请重试'));
      return;
    }
    ctx.drawImage(video, 0, 0, width, height);
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('拍照失败，请重试'));
        return;
      }
      resolve(new File([blob], `capture-${Date.now()}.jpg`, { type: blob.type || 'image/jpeg' }));
    }, 'image/jpeg', 0.92);
  });
}

const AUDIO_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
];

function recordingError(error: unknown): Error {
  if (error instanceof DOMException && (error.name === 'NotAllowedError' || error.name === 'SecurityError')) {
    return new Error('麦克风权限被拒绝，请在浏览器设置中允许后重试');
  }
  if (error instanceof DOMException && error.name === 'NotFoundError') return new Error('没有检测到可用的麦克风');
  return error instanceof Error ? error : new Error('录音启动失败，请稍后重试');
}

export async function startAudioRecording(): Promise<AudioRecorder> {
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    throw new Error('当前浏览器不支持录音');
  }
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (error) {
    throw recordingError(error);
  }
  const chunks: BlobPart[] = [];
  const mimeType = AUDIO_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const startedAt = performance.now();
  recorder.ondataavailable = (event) => {
    if (event.data.size) chunks.push(event.data);
  };
  recorder.start(250);

  const closeTracks = () => stream.getTracks().forEach((track) => track.stop());
  return {
    stop: () => new Promise((resolve, reject) => {
      recorder.onstop = () => {
        closeTracks();
        const blob = new Blob(chunks, { type: recorder.mimeType || mimeType || 'audio/webm' });
        if (!blob.size) {
          reject(new Error('没有录到有效音频，请重新录制'));
          return;
        }
        resolve({ blob, mimeType: blob.type, durationMs: Math.max(1, Math.round(performance.now() - startedAt)) });
      };
      recorder.onerror = () => reject(new Error('录音数据生成失败，请重新录制'));
      recorder.requestData();
      recorder.stop();
    }),
    cancel: () => {
      if (recorder.state !== 'inactive') recorder.stop();
      closeTracks();
    },
  };
}

export function fileToObjectUrl(file: File): string {
  return URL.createObjectURL(file);
}

/** 调用本地抠图 API，并在浏览器侧合成透明白边贴纸 PNG。 */
export async function makeStickerPhoto(file: File, signal?: AbortSignal): Promise<string> {
  const sticker = await stickerKit.make(file, {}, signal);
  return URL.createObjectURL(sticker);
}

/** 贴纸在互动进行时继续制作；任务仅由 CaptureDraft id 关联，不扩散到业务数据结构。 */
export function startStickerPhotoTask(draftId: string, file: File): void {
  discardStickerPhotoTask(draftId);
  const controller = new AbortController();
  const promise = makeStickerPhoto(file, controller.signal).catch(() => undefined);
  stickerTasks.set(draftId, { controller, promise });
}

/** Moment 创建时取得对应贴纸；失败、取消或尚未开始时统一返回 undefined 以回退原图。 */
export async function takeStickerPhotoTask(draftId: string): Promise<string | undefined> {
  const task = stickerTasks.get(draftId);
  if (!task) return undefined;
  try {
    return await task.promise;
  } finally {
    stickerTasks.delete(draftId);
  }
}

export function discardStickerPhotoTask(draftId: string): void {
  const task = stickerTasks.get(draftId);
  task?.controller.abort();
  stickerTasks.delete(draftId);
}

export function releaseObjectUrl(url?: string): void {
  if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
}

export function releaseDraftResources(draft?: CaptureDraft): void {
  releaseObjectUrl(draft?.photo);
  releaseObjectUrl(draft?.stickerPhoto);
  releaseObjectUrl(draft?.livePhotoVideo);
}

export function releaseMomentResources(moment?: Moment): void {
  releaseObjectUrl(moment?.photo);
  releaseObjectUrl(moment?.stickerPhoto);
  releaseObjectUrl(moment?.livePhotoVideo);
}

export function normalizeRecordedAudioDuration(audio: HTMLAudioElement): void {
  if (Number.isFinite(audio.duration) && audio.duration > 0) return;
  const reset = () => {
    audio.removeEventListener('timeupdate', reset);
    audio.currentTime = 0;
  };
  audio.addEventListener('timeupdate', reset);
  audio.currentTime = Number.MAX_SAFE_INTEGER;
}
