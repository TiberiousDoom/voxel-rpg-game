import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import ErrorBoundary from './ErrorBoundary';
import App from './App';
import { initDebugCommands } from './utils/debugCommands.js';

// Initialize debug commands
initDebugCommands();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);