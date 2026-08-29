interface GazeFrameProps {
  isCapturing?: boolean;
}

export function GazeFrame({ isCapturing = false }: GazeFrameProps) {
  return (
    <div className={`gaze-frame ${isCapturing ? 'is-capturing' : ''}`} aria-hidden="true">
      <i className="gaze-corner gaze-corner-tl" />
      <i className="gaze-corner gaze-corner-tr" />
      <i className="gaze-corner gaze-corner-bl" />
      <i className="gaze-corner gaze-corner-br" />
      <i className="gaze-point" />
    </div>
  );
}
