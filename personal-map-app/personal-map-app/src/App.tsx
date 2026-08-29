import { useCallback, useState } from 'react';
import { MapPage } from './pages/MapPage';
import { CapturePage } from './pages/CapturePage';
import { TransitionPage } from './pages/TransitionPage';
import { useRecordFlow } from './features/record/useRecordFlow';
import { SeedGuideSheet } from './features/guide/SeedGuideSheet';
import type { SeedGuideItem } from './features/guide/seedGuideData';
import { MapToCaptureTransition } from './features/transition/MapToCaptureTransition';
import type { CaptureDraft } from './models/moment';

export default function App() {
  const flow = useRecordFlow();
  const [completedSeedIds, setCompletedSeedIds] = useState<Set<string>>(() => new Set(['cat'])); // TEMP: 预览种子完成态，demo 前删除。
  const [captureResetRequest, setCaptureResetRequest] = useState<number>();
  const [isPreparingCapture, setIsPreparingCapture] = useState(false);
  const [isTearMounted, setIsTearMounted] = useState(false);
  const [tearPhase, setTearPhase] = useState<'opening' | 'opened' | 'developed' | 'exiting'>('opening');
  const [developedPhotoUrl, setDevelopedPhotoUrl] = useState<string>();
  const arriving = flow.state.stage === 'arriving' && flow.interaction
    ? { moment: flow.state.moment, interaction: flow.interaction }
    : undefined;
  const markSeedRecorded = useCallback((seedId: string) => {
    setCompletedSeedIds((current) => new Set(current).add(seedId));
  }, []);
  const prepareCapture = useCallback(() => {
    setIsPreparingCapture(true);
    setCaptureResetRequest((request) => (request ?? 0) + 1);
  }, []);
  const handleSeedSelect = useCallback((seed: SeedGuideItem) => {
    // TODO: 在确认拍摄/保存成功的产品时机确定后，调用 markSeedRecorded(seed.id)。
    void seed;
    prepareCapture();
  }, [prepareCapture]);
  const handleCaptureResetComplete = useCallback(() => {
    setIsPreparingCapture(false);
    setDevelopedPhotoUrl(undefined);
    setTearPhase('opening');
    setIsTearMounted(true);
    flow.startCapture();
  }, [flow.startCapture]);
  const handleCaptureConfirm = useCallback((draft: CaptureDraft) => {
    setTearPhase('exiting');
    flow.confirmCapture(draft);
  }, [flow.confirmCapture]);
  const handlePhotoCaptured = useCallback((photoUrl: string) => {
    setDevelopedPhotoUrl(photoUrl);
    window.requestAnimationFrame(() => setTearPhase('developed'));
  }, []);
  const handleCaptureCancel = useCallback(() => {
    setIsTearMounted(false);
    setDevelopedPhotoUrl(undefined);
    flow.cancel();
  }, [flow.cancel]);
  return (
    <>
      <MapPage
        onAdd={flow.openGuide}
        onCapture={prepareCapture}
        arriving={arriving}
        onArrivalComplete={flow.completeArrival}
        isActive={!['capturing', 'transitioning', 'saving', 'error'].includes(flow.state.stage)}
        captureResetRequest={captureResetRequest}
        onCaptureResetComplete={handleCaptureResetComplete}
      />
      {flow.state.stage === 'guide' && !isPreparingCapture && <SeedGuideSheet completedSeedIds={completedSeedIds} onClose={flow.cancel} onSelectSeed={handleSeedSelect} />}
      {flow.state.stage === 'capturing' && <CapturePage initialDraft={flow.state.draft} onConfirm={handleCaptureConfirm} onCancel={handleCaptureCancel} onPhotoCaptured={handlePhotoCaptured} />}
      {isTearMounted && <MapToCaptureTransition phase={tearPhase} photoUrl={developedPhotoUrl} onOpened={() => setTearPhase('opened')} onExited={() => setIsTearMounted(false)} />}
      {(flow.state.stage === 'transitioning' || flow.state.stage === 'saving' || flow.state.stage === 'error') && flow.interaction && (
        <TransitionPage
          draft={flow.state.draft}
          interaction={flow.interaction}
          isSaving={flow.state.stage === 'saving'}
          error={flow.state.stage === 'error' ? flow.state.message : undefined}
          onContinue={flow.continueInteraction}
          onRerecord={flow.rerecord}
          onCancel={flow.cancel}
        />
      )}
    </>
  );
}
