import type { CaptureDraft } from '../models/moment';
import type { InteractionDefinition } from '../interactions/types';

interface TransitionPageProps {
  draft: CaptureDraft;
  interaction: InteractionDefinition;
  isSaving: boolean;
  error?: string;
  onContinue: () => void;
  onRerecord: () => void;
  onCancel: () => void;
}

export function TransitionPage({ draft, interaction, isSaving, error, onContinue, onRerecord, onCancel }: TransitionPageProps) {
  const Transition = interaction.Transition;
  return (
    <main className="page transition-page">
      <Transition draft={draft} onContinue={onContinue} />
      <header className={interaction.chrome.transitionTopbarClass}>
        <button className="round-button" disabled={isSaving} onClick={onRerecord} aria-label="返回重新记录">←</button>
        <span>{interaction.chrome.transitionLabel}</span>
        <button className="round-button" disabled={isSaving} onClick={onCancel} aria-label="取消记录">···</button>
      </header>
      {isSaving && <div className="record-saving-overlay"><span>正在定位并保存…</span></div>}
      {error && <div className="record-error-overlay"><section><p>{error}</p><div><button onClick={onCancel}>取消</button><button onClick={onContinue}>重新保存</button></div></section></div>}
    </main>
  );
}
