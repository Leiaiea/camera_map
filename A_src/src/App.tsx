import { MapPage } from './pages/MapPage';
import { GuidePage } from './pages/GuidePage';
import { CapturePage } from './pages/CapturePage';
import { TransitionPage } from './pages/TransitionPage';
import { useRecordFlow } from './features/record/useRecordFlow';

export default function App() {
  const flow = useRecordFlow();

  if (flow.state.stage === 'guide') return <GuidePage onStart={flow.startCapture} onCancel={flow.cancel} />;
  if (flow.state.stage === 'capturing') return <CapturePage initialDraft={flow.state.draft} onConfirm={flow.confirmCapture} onCancel={flow.cancel} />;
  if ((flow.state.stage === 'transitioning' || flow.state.stage === 'saving' || flow.state.stage === 'error') && flow.interaction) {
    return (
      <TransitionPage
        draft={flow.state.draft}
        interaction={flow.interaction}
        isSaving={flow.state.stage === 'saving'}
        error={flow.state.stage === 'error' ? flow.state.message : undefined}
        onContinue={flow.continueInteraction}
        onRerecord={flow.rerecord}
        onCancel={flow.cancel}
      />
    );
  }

  const arriving = flow.state.stage === 'arriving' && flow.interaction
    ? { moment: flow.state.moment, interaction: flow.interaction }
    : undefined;
  return (
    <MapPage
      onAdd={flow.openGuide}
      arriving={arriving}
      onArrivalComplete={flow.completeArrival}
    />
  );
}
