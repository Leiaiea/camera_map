import type { CSSProperties } from 'react';

interface DevelopmentWindowProps {
  x: number;
  y: number;
  isCapturing?: boolean;
}

export function DevelopmentWindow({ x, y, isCapturing = false }: DevelopmentWindowProps) {
  return <div className={`development-window ${isCapturing ? 'is-capturing' : ''}`} style={{ '--window-x': `${x}%`, '--window-y': `${y}%` } as CSSProperties} aria-hidden="true" />;
}
