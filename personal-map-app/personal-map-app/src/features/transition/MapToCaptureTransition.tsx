import { useEffect, useRef, type CSSProperties } from 'react';
import './MapToCaptureTransition.css';

type TransitionPhase = 'opening' | 'opened' | 'developed' | 'exiting';

interface MapToCaptureTransitionProps {
  mapSnapshotUrl?: string;
  photoUrl?: string;
  phase: TransitionPhase;
  onOpened?: () => void;
  onExited?: () => void;
}

type Point = [number, number];
type TearMode = 'A' | 'B' | 'C';

function createLine(): Point[] {
  let points: Point[] = [[0, 0], [1, 0]];
  let range = 0.008;
  for (let pass = 0; pass < 2; pass += 1) {
    const next: Point[] = [points[0]];
    for (let index = 0; index < points.length - 1; index += 1) {
      const start = points[index];
      const end = points[index + 1];
      next.push([(start[0] + end[0]) / 2, (start[1] + end[1]) / 2 + (Math.random() - 0.5) * range], end);
    }
    points = next;
    range *= 0.3;
  }
  return points.map((point, index) => index && index < points.length - 1
    ? [point[0], Math.max(-0.012, Math.min(0.012, (points[index - 1][1] + point[1] + points[index + 1][1]) / 3))]
    : point);
}

function polygon(points: Point[]) {
  return `polygon(${points.map((point) => `${point[0].toFixed(2)}px ${point[1].toFixed(2)}px`).join(',')})`;
}

function svgPath(points: Point[]) {
  return `M ${points.map((point) => point.join(' ')).join(' L ')}`;
}

export function MapToCaptureTransition({ mapSnapshotUrl = '/map-snapshot.png', photoUrl, phase, onOpened, onExited }: MapToCaptureTransitionProps) {
  const topPaperRef = useRef<HTMLDivElement>(null);
  const bottomPaperRef = useRef<HTMLDivElement>(null);
  const edgeRef = useRef<SVGSVGElement>(null);
  const edgeTopRef = useRef<SVGPathElement>(null);
  const edgeBottomRef = useRef<SVGPathElement>(null);
  const shadowTopRef = useRef<SVGPathElement>(null);
  const shadowBottomRef = useRef<SVGPathElement>(null);
  const stageRef = useRef<HTMLElement>(null);
  const lineRef = useRef(createLine());
  const noiseRef = useRef(lineRef.current.map(() => (Math.random() - 0.5) * 0.01));
  const revealRef = useRef(1);
  const modeRef = useRef<TearMode>('A');
  const onOpenedRef = useRef(onOpened);
  const onExitedRef = useRef(onExited);
  onOpenedRef.current = onOpened;
  onExitedRef.current = onExited;

  const draw = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const middle = height * 0.5;
    const gap = height * 0.22;
    const seam = lineRef.current.map((point) => [point[0] * width, middle + point[1] * height] as Point);
    const upper = seam.map((point, index) => {
      const amount = Math.max(0, Math.min(1, (revealRef.current - lineRef.current[index][0] + 0.22) / 0.22));
      return [point[0], point[1] - (gap - noiseRef.current[index] * height) * amount] as Point;
    });
    const lower = seam.map((point, index) => {
      const amount = Math.max(0, Math.min(1, (revealRef.current - lineRef.current[index][0] + 0.22) / 0.22));
      return [point[0], point[1] + (gap - noiseRef.current[index] * height) * amount] as Point;
    });
    const states: Record<TearMode, [Point[], Point[]]> = {
      A: [[[0, 0], [width, 0], ...seam.slice().reverse()], [...seam, [width, height], [0, height]]],
      B: [[[0, 0], [width, 0], ...upper.slice().reverse()], [...lower, [width, height], [0, height]]],
      C: [[[0, 0], [width, 0], ...seam.slice().reverse().map((point) => [point[0], -0.6 * height] as Point)], [...seam.map((point) => [point[0], 1.6 * height] as Point), [width, height], [0, height]]],
    };
    const [top, bottom] = states[modeRef.current];
    if (topPaperRef.current) topPaperRef.current.style.clipPath = polygon(top);
    if (bottomPaperRef.current) bottomPaperRef.current.style.clipPath = polygon(bottom);
    edgeRef.current?.setAttribute('viewBox', `0 0 ${width} ${height}`);
    const edge = svgPath(upper);
    const lowerEdge = svgPath(lower);
    edgeTopRef.current?.setAttribute('d', edge);
    shadowTopRef.current?.setAttribute('d', edge);
    edgeBottomRef.current?.setAttribute('d', lowerEdge);
    shadowBottomRef.current?.setAttribute('d', lowerEdge);
  };

  useEffect(() => {
    draw();
    window.addEventListener('resize', draw);
    return () => window.removeEventListener('resize', draw);
  }, []);

  useEffect(() => {
    let animationFrame = 0;
    let exitTimer = 0;
    let tensionTimer = 0;
    const restorePaperTransitions = () => {
      if (topPaperRef.current) topPaperRef.current.style.transition = '';
      if (bottomPaperRef.current) bottomPaperRef.current.style.transition = '';
    };
    if (phase === 'opening') {
      modeRef.current = 'B';
      revealRef.current = 0;
      if (topPaperRef.current) topPaperRef.current.style.transition = 'none';
      if (bottomPaperRef.current) bottomPaperRef.current.style.transition = 'none';
      draw();
      const startedAt = performance.now();
      const frame = (now: number) => {
        const progress = Math.min(1, (now - startedAt) / 620);
        revealRef.current = 1 - (1 - progress) ** 3;
        draw();
        if (progress < 1) animationFrame = window.requestAnimationFrame(frame);
        else {
          revealRef.current = 1;
          draw();
          restorePaperTransitions();
          onOpenedRef.current?.();
        }
      };
      animationFrame = window.requestAnimationFrame(frame);
    } else if (phase === 'opened') {
      modeRef.current = 'B';
      revealRef.current = 1;
      draw();
    } else if (phase === 'developed') {
      stageRef.current?.classList.add('is-tensing');
      tensionTimer = window.setTimeout(() => {
        stageRef.current?.classList.remove('is-tensing');
        modeRef.current = 'C';
        revealRef.current = 1;
        draw();
      }, 100);
    } else {
      stageRef.current?.classList.add('is-tensing');
      tensionTimer = window.setTimeout(() => {
        stageRef.current?.classList.remove('is-tensing');
        modeRef.current = 'C';
        revealRef.current = 1;
        draw();
        exitTimer = window.setTimeout(() => onExitedRef.current?.(), 960);
      }, 100);
    }
    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(tensionTimer);
      window.clearTimeout(exitTimer);
      stageRef.current?.classList.remove('is-tensing');
      restorePaperTransitions();
    };
  }, [phase]);

  return (
    <section ref={stageRef} className={`map-to-capture-transition is-${phase}`} style={{ '--map-snapshot': `url("${mapSnapshotUrl}")` } as CSSProperties} aria-hidden="true">
      <svg width="0" height="0"><filter id="fiber"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="17" result="noise" /><feDisplacementMap in="SourceGraphic" in2="noise" scale="1.8" /></filter><filter id="soft-shadow"><feGaussianBlur stdDeviation="2.2" /></filter></svg>
      <div ref={topPaperRef} className="map-to-capture-paper top" />
      <div ref={bottomPaperRef} className="map-to-capture-paper bottom" />
      {photoUrl && <><div className="map-to-capture-photo-mist" /><section className="map-to-capture-photo-frame"><img src={photoUrl} alt="已拍摄照片" /></section></>}
      <svg ref={edgeRef} className="map-to-capture-edge" preserveAspectRatio="none">
        <path ref={shadowTopRef} className="shadow" /><path ref={shadowBottomRef} className="shadow" />
        <path ref={edgeTopRef} className="fiber" /><path ref={edgeBottomRef} className="fiber" />
      </svg>
    </section>
  );
}
