import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { MomentProvider } from './features/moment/MomentProvider';
import './styles/tokens.css';
import './styles/global.css';
import './styles/app.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MomentProvider><App /></MomentProvider>
  </StrictMode>,
);
