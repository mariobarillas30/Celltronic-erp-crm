import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App, { runVersionMigrationCheck } from './App.tsx';
import './index.css';

// Perform initial version cache check and migration
runVersionMigrationCheck();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
