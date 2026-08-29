import { useCallback, useMemo, useReducer, useRef } from 'react';
import type { CaptureDraft, Moment } from '../../models/moment';
import { getInteraction } from '../../interactions/registry';
import { discardStickerPhotoTask, releaseDraftResources } from '../../services/media/mediaService';
import { useMoments } from '../moment/MomentProvider';

export type RecordFlowState =
  | { stage: 'idle' }
  | { stage: 'guide' }
  | { stage: 'capturing'; draft?: CaptureDraft }
  | { stage: 'transitioning'; draft: CaptureDraft }
  | { stage: 'saving'; draft: CaptureDraft }
  | { stage: 'arriving'; moment: Moment }
  | { stage: 'completed'; momentId: string }
  | { stage: 'error'; draft: CaptureDraft; message: string };

type RecordFlowAction =
  | { type: 'OPEN_GUIDE' }
  | { type: 'START_CAPTURE' }
  | { type: 'CONFIRM_CAPTURE'; draft: CaptureDraft }
  | { type: 'RERECORD'; draft: CaptureDraft }
  | { type: 'START_SAVE'; draft: CaptureDraft }
  | { type: 'SAVE_SUCCEEDED'; moment: Moment }
  | { type: 'SAVE_FAILED'; draft: CaptureDraft; message: string }
  | { type: 'ARRIVAL_COMPLETED'; momentId: string }
  | { type: 'CANCEL' };

function reducer(state: RecordFlowState, action: RecordFlowAction): RecordFlowState {
  switch (action.type) {
    case 'OPEN_GUIDE': return { stage: 'guide' };
    case 'START_CAPTURE': return { stage: 'capturing' };
    case 'CONFIRM_CAPTURE': return state.stage === 'capturing' ? { stage: 'transitioning', draft: action.draft } : state;
    case 'RERECORD': return { stage: 'capturing', draft: action.draft };
    case 'START_SAVE': return state.stage === 'transitioning' || state.stage === 'error' ? { stage: 'saving', draft: action.draft } : state;
    case 'SAVE_SUCCEEDED': return state.stage === 'saving' ? { stage: 'arriving', moment: action.moment } : state;
    case 'SAVE_FAILED': return { stage: 'error', draft: action.draft, message: action.message };
    case 'ARRIVAL_COMPLETED': return state.stage === 'arriving' ? { stage: 'completed', momentId: action.momentId } : state;
    case 'CANCEL': return { stage: 'idle' };
  }
}

function draftFrom(state: RecordFlowState): CaptureDraft | undefined {
  return 'draft' in state ? state.draft : undefined;
}

export function useRecordFlow() {
  const [state, dispatch] = useReducer(reducer, { stage: 'idle' });
  const stateRef = useRef(state);
  stateRef.current = state;
  const saveInFlight = useRef(false);
  const { createMoment, selectMoment } = useMoments();

  const openGuide = useCallback(() => {
    selectMoment();
    dispatch({ type: 'OPEN_GUIDE' });
  }, [selectMoment]);

  const startCapture = useCallback(() => dispatch({ type: 'START_CAPTURE' }), []);
  const confirmCapture = useCallback((draft: CaptureDraft) => dispatch({ type: 'CONFIRM_CAPTURE', draft }), []);
  // TODO: 种子引导的完成标记将在确认拍摄/保存成功的产品时机确定后，由 App 的内存状态接入。

  const rerecord = useCallback(() => {
    const draft = draftFrom(stateRef.current);
    if (draft) dispatch({ type: 'RERECORD', draft });
  }, []);

  const cancel = useCallback(() => {
    if (stateRef.current.stage === 'saving') return;
    const draft = draftFrom(stateRef.current);
    if (draft) discardStickerPhotoTask(draft.id);
    releaseDraftResources(draft);
    dispatch({ type: 'CANCEL' });
  }, []);

  const continueInteraction = useCallback(async () => {
    const current = stateRef.current;
    if ((current.stage !== 'transitioning' && current.stage !== 'error') || saveInFlight.current) return;
    const draft = current.draft;
    saveInFlight.current = true;
    dispatch({ type: 'START_SAVE', draft });
    try {
      const moment = await createMoment(draft);
      dispatch({ type: 'SAVE_SUCCEEDED', moment });
    } catch (error) {
      dispatch({ type: 'SAVE_FAILED', draft, message: error instanceof Error ? error.message : 'Moment 保存失败，请重试' });
    } finally {
      saveInFlight.current = false;
    }
  }, [createMoment]);

  const completeArrival = useCallback(() => {
    const current = stateRef.current;
    if (current.stage !== 'arriving') return;
    // 不在这里自动打开详情：到达动画结束后应该先看到贴纸落在地图上，
    // 点击贴纸再看详情。
    dispatch({ type: 'ARRIVAL_COMPLETED', momentId: current.moment.id });
  }, []);

  const interaction = useMemo(() => {
    if (state.stage === 'arriving') return getInteraction(state.moment.interactionType);
    const draft = draftFrom(state);
    return draft ? getInteraction(draft.interactionType) : undefined;
  }, [state]);

  return { state, interaction, openGuide, startCapture, confirmCapture, rerecord, cancel, continueInteraction, completeArrival };
}
