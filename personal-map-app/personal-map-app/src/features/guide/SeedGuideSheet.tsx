import { useEffect, useRef, type CSSProperties } from 'react';
import { SEED_GUIDE_ITEMS, type SeedGuideItem } from './seedGuideData';
import './SeedGuideSheet.css';

interface SeedGuideSheetProps {
  completedSeedIds: ReadonlySet<string>;
  onClose: () => void;
  onSelectSeed: (seed: SeedGuideItem) => void;
}

export function SeedGuideSheet({ completedSeedIds, onClose, onSelectSeed }: SeedGuideSheetProps) {
  const dragStartY = useRef<number | undefined>(undefined);
  const allDone = completedSeedIds.size === SEED_GUIDE_ITEMS.length;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <section className="seed-guide-backdrop" aria-label="种子引导" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="seed-guide-sheet" role="dialog" aria-modal="true" aria-labelledby="seed-guide-title">
        <div
          className="seed-guide-handle"
          aria-label="向下滑动关闭"
          onPointerDown={(event) => { dragStartY.current = event.clientY; event.currentTarget.setPointerCapture(event.pointerId); }}
          onPointerUp={(event) => {
            if (dragStartY.current !== undefined && event.clientY - dragStartY.current > 56) onClose();
            dragStartY.current = undefined;
          }}
        />
        <header className="seed-guide-head">
          <h1 id="seed-guide-title">{allDone ? '你的地图，已经开始活了。' : '从刚好看见的地方开始'}</h1>
          <p>{allDone ? '颜色会继续从你看见的地方长出来。' : '这几样，你的地图上还没有。'}</p>
        </header>
        <ul className="seed-guide-grid">
          {SEED_GUIDE_ITEMS.map((seed, index) => {
            const isComplete = completedSeedIds.has(seed.id);
            return (
              <li
                key={seed.id}
                className={`seed-guide-card${isComplete ? ' is-revealed' : ''}`}
                style={{ '--seed-color': seed.color, '--rotation': `${seed.rotation}deg`, '--seed-index': index } as CSSProperties}
              >
                <button type="button" aria-label={`${isComplete ? '查看' : '拍下'}${seed.label}`} onClick={() => { if (!isComplete) onSelectSeed(seed); }}>
                  <span className="seed-guide-visual" aria-hidden="true">
                    {isComplete && <span className="seed-guide-sticker" />}
                    <svg className="seed-guide-drawing" viewBox="0 0 112 96" dangerouslySetInnerHTML={{ __html: seed.drawing }} />
                  </span>
                  <span className="seed-guide-label">{seed.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </section>
  );
}
