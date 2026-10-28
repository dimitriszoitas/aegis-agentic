import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@dimitriszoitas/aegis-agentic/reset.css';
import '@dimitriszoitas/aegis-agentic/styles.css';
import '../profile/profile-tokens.css';
import './styles.css';
import { App } from './app';

const root = document.getElementById('root');
if (!root) throw new Error('Relay root is missing.');
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
