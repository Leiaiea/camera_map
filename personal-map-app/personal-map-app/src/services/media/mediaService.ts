import type { CapturedAudio, CaptureDraft, Moment } from '../../models/moment';

const REMOVE_BG_KEY: string | undefined = import.meta.env.VITE_REMOVEBG_KEY;
const REMOVE_BG_ENDPOINT = import.meta.env.DEV ? '/removebg/v1.0/removebg' : 'https://api.remove.bg/v1.0/removebg';
const REMOVE_BG_TIMEOUT_MS = 30_000;
// 开发环境默认不消耗 remove.bg 额度。准备真实验收时才在 .env 显式设为 false。
const USE_REMOVE_BG_MOCK = import.meta.env.DEV && import.meta.env.VITE_REMOVEBG_MOCK !== 'false';
const MOCK_REMOVE_BG_DELAY_MS = 10_000;

type StickerTaskStatus = 'pending' | 'succeeded' | 'failed';

export interface StickerPhotoTask {
  promise: Promise<string | undefined>;
  status: StickerTaskStatus;
  stickerPhoto?: string;
}

interface ActiveStickerPhotoTask extends StickerPhotoTask {
  controller: AbortController;
}

const stagedStickerSources = new Map<string, File>();
const stickerTasks = new Map<string, ActiveStickerPhotoTask>();

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
export async function openCameraStream(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('当前浏览器不支持拍照，请从相册选择照片');
  }
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
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

/**
 * 将原图压缩为 remove.bg 请求副本。原图的 Object URL 不会被替换或修改。
 */
async function createRemoveBgSource(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1024 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    throw new Error('无法创建照片预处理画布');
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('照片预处理失败')), 'image/jpeg', 0.8);
  });
}

async function requestRemoveBg(source: Blob, signal: AbortSignal): Promise<Blob> {
  if (!REMOVE_BG_KEY) throw new Error('未配置 VITE_REMOVEBG_KEY');
  const form = new FormData();
  form.append('image_file', source, 'sticker-source.jpg');
  form.append('size', 'preview');
  form.append('format', 'png');
  form.append('crop', 'true');
  form.append('crop_margin', '10%');
  const response = await fetch(REMOVE_BG_ENDPOINT, {
    method: 'POST',
    headers: { 'X-Api-Key': REMOVE_BG_KEY },
    body: form,
    signal,
  });
  if (!response.ok) throw new Error(`remove.bg 请求失败（${response.status}）`);
  return response.blob();
}

function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('图片输出失败')), 'image/png');
  });
}

/**
 * 开发 mock 生成透明背景的“抠图”结果；边框统一由显示层负责，
 * 因此 mock 与真实 API 都会得到同一份边框视觉。
 */
async function createMockRemoveBgResult(source: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(source);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    throw new Error('无法创建模拟抠图画布');
  }
  context.save();
  context.beginPath();
  context.ellipse(bitmap.width / 2, bitmap.height / 2, bitmap.width * 0.34, bitmap.height * 0.43, -0.1, 0, Math.PI * 2);
  context.clip();
  context.drawImage(bitmap, 0, 0);
  context.restore();
  bitmap.close();
  return canvasToPng(canvas);
}

async function makeStickerPhoto(file: File, signal: AbortSignal): Promise<string> {
  const source = await createRemoveBgSource(file);
  let cutout: Blob | undefined;
  if (USE_REMOVE_BG_MOCK) {
    await new Promise<void>((resolve, reject) => {
      const timeoutId = window.setTimeout(resolve, MOCK_REMOVE_BG_DELAY_MS);
      signal.addEventListener('abort', () => {
        window.clearTimeout(timeoutId);
        reject(new DOMException('模拟 remove.bg 请求已取消', 'AbortError'));
      }, { once: true });
    });
    cutout = await createMockRemoveBgResult(source);
  } else {
    let lastError: unknown;
    // 最多一次重试，避免耗尽免费额度；总超时由外层 AbortController 统一控制。
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        cutout = await requestRemoveBg(source, signal);
        break;
      } catch (error) {
        lastError = error;
        if (signal.aborted || attempt === 1) break;
      }
    }
    if (!cutout) throw lastError instanceof Error ? lastError : new Error('remove.bg 抠图失败');
  }
  if (!cutout) throw new Error('remove.bg 未返回抠图结果');
  return URL.createObjectURL(cutout);
}

/** 拍照时仅暂存原始 File；确认内容后才真正消耗 remove.bg 额度。 */
export function stageStickerPhotoTask(draftId: string, file: File): void {
  discardStickerPhotoTask(draftId);
  stagedStickerSources.set(draftId, file);
}

/** 确认内容时启动后台抠图。该 Promise 不应阻塞互动页或 Moment 保存。 */
export function startStickerPhotoTask(draftId: string): StickerPhotoTask | undefined {
  const existing = stickerTasks.get(draftId);
  if (existing) return existing;
  const file = stagedStickerSources.get(draftId);
  stagedStickerSources.delete(draftId);
  if (!file) return undefined;

  const controller = new AbortController();
  const task = {} as ActiveStickerPhotoTask;
  task.controller = controller;
  task.status = 'pending';
  const timeoutId = window.setTimeout(() => controller.abort(), REMOVE_BG_TIMEOUT_MS);
  task.promise = makeStickerPhoto(file, controller.signal)
    .then((stickerPhoto) => {
      task.status = 'succeeded';
      task.stickerPhoto = stickerPhoto;
      return stickerPhoto;
    })
    .catch((error: unknown) => {
      task.status = 'failed';
      if (import.meta.env.DEV) console.warn('[remove.bg] 抠图已放弃，将使用原图贴纸。', error);
      return undefined;
    })
    .finally(() => window.clearTimeout(timeoutId));
  stickerTasks.set(draftId, task);
  return task;
}

/** 提供给保存流程读取：若尚未完成，调用方可先保存原图并订阅 promise 回写。 */
export function getStickerPhotoTask(draftId: string): StickerPhotoTask | undefined {
  return stickerTasks.get(draftId);
}

export function discardStickerPhotoTask(draftId: string): void {
  stagedStickerSources.delete(draftId);
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
