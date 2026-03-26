import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import ErrorBoundary from './ErrorBoundary';
import App3D from './App3D';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App3D />
    </ErrorBoundary>
  </React.StrictMode>
);