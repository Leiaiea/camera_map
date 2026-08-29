import { interactions } from '../interactions/registry';

interface InteractionPickerSheetProps {
  selectedType: string;
  onSelect: (type: string) => void;
  onClose: () => void;
}

export function InteractionPickerSheet({ selectedType, onSelect, onClose }: InteractionPickerSheetProps) {
  return (
    <div className="picker-backdrop" role="presentation" onClick={onClose}>
      <section className="interaction-picker" aria-label="选择互动方式" onClick={(event) => event.stopPropagation()}>
        <div className="sheet-handle" />
        <header><h2>选择互动方式</h2><button onClick={onClose} aria-label="关闭互动选择">×</button></header>
        <div className="interaction-options">
          {interactions.map((interaction) => (
            <button className={selectedType === interaction.type ? 'is-selected' : ''} key={interaction.type} onClick={() => onSelect(interaction.type)}>
              <i style={{ background: interaction.accent }}>{interaction.icon}</i>
              <span><b>{interaction.name}</b><small>{interaction.description}</small></span>
              <em>{selectedType === interaction.type ? '✓' : '→'}</em>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
