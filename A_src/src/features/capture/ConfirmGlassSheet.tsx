import { useState, type ChangeEvent } from 'react';

export const GAZE_FEELINGS = ['活泼', '安静', '温柔', '热烈', '怅然'] as const;
interface ConfirmGlassSheetProps {
  photo?: string; selectedFeeling?: string; text: string; isRecording: boolean; audioPreviewUrl?: string;
  onFeelingChange: (feeling: string) => void; onTextChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  onToggleRecording: () => void; onRetake: () => void; onSend: () => void;
}

export function ConfirmGlassSheet({ photo, selectedFeeling, text, isRecording, audioPreviewUrl, onFeelingChange, onTextChange, onToggleRecording, onRetake, onSend }: ConfirmGlassSheetProps) {
  const [textExpanded, setTextExpanded] = useState(Boolean(text));
  return <section className="confirm-glass-sheet" aria-label="确认这一刻">
    <div className="glass-sheet-handle" />
    {photo && <img className="confirm-photo-preview" src={photo} alt="刚刚拍下的这一刻" />}
    <div className="confirm-sheet-scroll">
      <h2>这一刻是什么感觉？</h2>
      <div className="memory-chips" role="list" aria-label="选择情绪">{GAZE_FEELINGS.map((feeling) => <button className={`memory-chip ${selectedFeeling === feeling ? 'is-selected' : ''}`} type="button" key={feeling} onClick={() => onFeelingChange(feeling)}>{feeling}</button>)}</div>
      <div className="memory-info-list"><div><span>主体</span><b>正在准备显影</b><button type="button">修改 →</button></div><div><span>位置</span><b>正在确定位置</b><button type="button">调整 →</button></div></div>
      <div className="memory-light-entries">
        {textExpanded ? <label className={text ? 'has-value' : ''}><span>✎</span><textarea autoFocus value={text} onChange={onTextChange} placeholder="写下一句话…" maxLength={240} aria-label="写下一句话" /></label> : <button className="text-entry-trigger" type="button" onClick={() => setTextExpanded(true)}>✎ 写下一句话</button>}
        <button className={`voice-entry ${isRecording ? 'is-recording' : ''}`} type="button" onClick={onToggleRecording}><span>◉</span>{isRecording ? '正在听…' : audioPreviewUrl ? '再留一段声音' : '留一段声音'}</button>
      </div>
      <div className="confirm-sheet-actions"><button className="retake-action" type="button" onClick={onRetake}>重新拍</button><button className="primary-action" type="button" onClick={onSend} disabled={!selectedFeeling}>{selectedFeeling ? '让它落在地图上' : '先选一种感觉'} <span>→</span></button></div>
    </div>
  </section>;
}
