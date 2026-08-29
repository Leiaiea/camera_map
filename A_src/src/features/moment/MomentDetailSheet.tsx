import { useEffect, useState } from 'react';
import type { Moment } from '../../models/moment';
import { normalizeRecordedAudioDuration } from '../../services/media/mediaService';
import { formatBlurredCoordinate } from '../../services/location/blur';

interface MomentDetailSheetProps {
  moment: Moment;
  onClose: () => void;
  onDelete: () => void;
}

const formatTime = (value: string) => new Intl.DateTimeFormat('zh-CN', {
  month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
}).format(new Date(value));

export function MomentDetailSheet({ moment, onClose, onDelete }: MomentDetailSheetProps) {
  const [audioUrl, setAudioUrl] = useState<string>();
  useEffect(() => {
    if (!moment.audio) { setAudioUrl(undefined); return; }
    const url = URL.createObjectURL(moment.audio);
    setAudioUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [moment.audio]);
  const duration = moment.audioDurationMs ? `${Math.floor(moment.audioDurationMs / 60000)}:${String(Math.round(moment.audioDurationMs / 1000) % 60).padStart(2, '0')}` : undefined;
  return (
    <div className="sheet-backdrop" onClick={onClose} role="presentation">
      <section className="moment-sheet" onClick={(event) => event.stopPropagation()} aria-label="Moment 详情">
        <div className="sheet-handle" />
        <header><h2>{moment.placeName}</h2><button onClick={onClose} aria-label="关闭详情">×</button></header>
        {moment.photo && <img className="moment-detail-photo" src={moment.photo} alt="Moment 照片" />}
        {moment.livePhotoVideo && <video className="moment-video" src={moment.livePhotoVideo} controls playsInline />}
        {audioUrl && <div className="moment-audio-wrap"><audio className="moment-audio" src={audioUrl} controls preload="metadata" onLoadedMetadata={(event) => normalizeRecordedAudioDuration(event.currentTarget)} />{duration && <span>录音 {duration}</span>}</div>}
        {moment.text && <p className="moment-text">{moment.text}</p>}
        <dl className="moment-meta">
          <div><dt>时间</dt><dd>{formatTime(moment.createdAt)}</dd></div>
          <div><dt>地点</dt><dd>{[moment.city, moment.district].filter(Boolean).join(' · ')}</dd></div>
          <div>
            <dt>模糊位置</dt>
            <dd>
              {formatBlurredCoordinate(moment.blurredLatitude)}, {formatBlurredCoordinate(moment.blurredLongitude)}
              <small>约 {moment.blurRadiusMeters} 米范围内</small>
            </dd>
          </div>
        </dl>
        {!moment.isExample && <button className="delete-button" onClick={onDelete}>删除这个 Moment</button>}
        {moment.isExample && <p className="example-note">这是无记录状态下的示范内容，不会保存到你的记录中。</p>}
      </section>
    </div>
  );
}
