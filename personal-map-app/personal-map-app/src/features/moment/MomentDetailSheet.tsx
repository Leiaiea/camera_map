import { useEffect, useState } from 'react';
import { interactionImageOf, type Moment } from '../../models/moment';
import { BorderedStickerImage } from '../sticker/BorderedStickerImage';
import { normalizeRecordedAudioDuration } from '../../services/media/mediaService';
import { formatBlurredCoordinate } from '../../services/location/blur';
import './MomentDetailSheet.css';

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
  const placeInfo = [moment.city, moment.district].filter(Boolean).join(' · ') || moment.placeName;
  return (
    <div className="moment-detail-backdrop" onClick={onClose} role="presentation">
      <section className="moment-detail-sheet" onClick={(event) => event.stopPropagation()} aria-label="Moment 详情">
        <div className="moment-detail-handle" />
        <header className="moment-detail-head"><h2>{placeInfo}</h2></header>
        {moment.photo && (
          moment.isExample
            ? <img className="moment-detail-photo" src={interactionImageOf(moment)} alt="示例 Moment 图片" />
            : <BorderedStickerImage className="moment-detail-photo" stickerId={moment.id} sourceUrl={interactionImageOf(moment)} alt="Moment 贴纸" />
        )}
        {moment.livePhotoVideo && <video className="moment-video" src={moment.livePhotoVideo} controls playsInline />}
        {audioUrl && <div className="moment-detail-audio"><audio src={audioUrl} controls preload="metadata" onLoadedMetadata={(event) => normalizeRecordedAudioDuration(event.currentTarget)} /></div>}
        {moment.text && <p className="moment-text">{moment.text}</p>}
        <dl className="moment-detail-facts">
          <div><dd>{formatTime(moment.createdAt)}</dd></div>
          <div>
            <dd>
              {formatBlurredCoordinate(moment.blurredLatitude)}, {formatBlurredCoordinate(moment.blurredLongitude)}
              <small>约 {moment.blurRadiusMeters} 米范围内</small>
            </dd>
          </div>
        </dl>
        {!moment.isExample && <button className="moment-detail-delete" onClick={onDelete}>删除这个 Moment</button>}
        {moment.isExample && <p className="moment-detail-example-note">这是无记录状态下的示范内容，不会保存到你的记录中。</p>}
      </section>
    </div>
  );
}
