import { useStickerGeneration } from '../stickerGeneration/StickerGenerationProvider';
import './stickerGenerationDebugToggle.css';

/** TODO: demo 后删除；删除本组件不应删除 stickerGenerationEnabled 状态源。 */
export function StickerGenerationDebugToggle() {
  const { stickerGenerationEnabled, setStickerGenerationEnabled } = useStickerGeneration();
  return (
    <button
      type="button"
      className="sticker-generation-debug-toggle"
      onClick={() => setStickerGenerationEnabled(!stickerGenerationEnabled)}
      aria-pressed={stickerGenerationEnabled}
      aria-label={`测试贴纸生成：${stickerGenerationEnabled ? '开' : '关'}`}
    >
      <small>测试</small>
      <span>贴纸生成：{stickerGenerationEnabled ? '开' : '关'}</span>
    </button>
  );
}
