interface GazeMarkProps { x: number; y: number; visible?: boolean; isCapturing?: boolean; }

export function GazeMark({ x, y, visible = true, isCapturing = false }: GazeMarkProps) {
  return <span className={`gaze-mark ${visible ? 'is-visible' : ''} ${isCapturing ? 'is-closing' : ''}`} style={{ left: `${x}%`, top: `${y}%` }} aria-hidden="true"><i /><i /><i /></span>;
}
