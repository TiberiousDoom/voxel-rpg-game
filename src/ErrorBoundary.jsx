/**
 * ErrorBoundary.jsx - Catches and displays React errors
 * Prevents white screen when errors occur
 */

import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('React Error Boundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            width: '100vw',
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f5f5f5',
            color: '#333',
            fontFamily: 'monospace',
            padding: '20px',
            overflowY: 'auto'
          }}
        >
          <h1 style={{ color: 'red', marginBottom: '20px' }}>⚠️ Game Error</h1>
          <div
            style={{
              maxWidth: '600px',
              background: 'white',
              border: '2px solid red',
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '20px',
              overflowX: 'auto'
            }}
          >
            <h3>Error Message:</h3>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {this.state.error?.message || 'Unknown error'}
            </pre>
            <h3>Stack Trace:</h3>
            <pre
              style={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontSize: '12px',
                color: '#666'
              }}
            >
              {this.state.error?.stack || 'No stack trace available'}
            </pre>
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              fontSize: '16px',
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Reload Game
          </button>
          <p style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
            Check browser console (F12) for more details
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
