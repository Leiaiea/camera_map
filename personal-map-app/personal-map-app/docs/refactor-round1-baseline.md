# Interaction refactor round 1 baseline

Recorded before the control-flow refactor on 2026-08-27.

## Shared product flow

- Map → guide → capture → transition → save/location → arrival → persistent sticker → detail.
- Capture supports photo, Live Photo video, audio and text.
- Interaction choice is stored in `CaptureDraft.interactionType`.
- During arrival, the persistent sticker exists but is hidden; it becomes visible when arrival completes.
- `npm run build` passes.

## Paper plane

- Initial action: `折成纸飞机`.
- Transition states/copy: unfold → fold corners → fold wings → center fold → ready.
- Ready at 2700 ms; action becomes `飞往地图`.
- Arrival class: `plane-arriving`; final copy starts at 4420 ms.
- Product returns to the persistent map at 5200 ms.

## Flower bud

- Initial action: `合成花苞`.
- Transition: petals close and form a bud.
- Ready at 2100 ms; action becomes `种进地图`.
- Arrival class: `flower-planting`; final copy starts at 2800 ms.
- Product returns to the persistent map at 3600 ms.

## Retro film

- Initial action: `按下快门`.
- Transition: flash → film develops → film rolls up.
- Ready at 2500 ms; action becomes `滚向地图`.
- Arrival class: `film-rolling`; final copy starts at 3650 ms.
- Product returns to the persistent map at 4400 ms.

## Current responsibility boundary

- `App.tsx` owns page, draft and arrival state.
- Each Interaction currently owns generic back/cancel controls, saving feedback and the commit callback.
- This is the behavior and timing baseline for round 1; CSS and keyframes must remain unchanged.
