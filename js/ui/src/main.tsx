import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter/wght.css';
import '@fontsource-variable/fraunces/opsz.css';
import '@fontsource-variable/jetbrains-mono/wght.css';
import './index.css';
import { Site } from './site/Site';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Site />
  </StrictMode>,
);
