import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { MomentProvider } from './features/moment/MomentProvider';
import { StickerGenerationProvider } from './features/stickerGeneration/StickerGenerationProvider';
import './styles/tokens.css';
import './styles/global.css';
import './styles/app.css';
import './features/map/groundTint.css';
import './features/map/mapLoading.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StickerGenerationProvider><MomentProvider><App /></MomentProvider></StickerGenerationProvider>
  </StrictMode>,
);
