/**
 * GridDisplayToggle.jsx - Toggle between compact and detailed building card display
 *
 * Features:
 * - Switch between compact (2-col) and detailed (1-col) view
 * - Visual indicators for current mode
 * - Smooth transitions
 */

import React from 'react';
import './GridDisplayToggle.css';

function GridDisplayToggle({
  displayMode = 'compact',
  onDisplayModeChange = () => {}
}) {
  const modes = [
    { id: 'compact', icon: '📊', label: 'Compact', tooltip: '2 columns, minimal info' },
    { id: 'detailed', icon: '📋', label: 'Detailed', tooltip: 'Full descriptions' }
  ];

  return (
    <div className="grid-display-toggle">
      <span className="toggle-label">View:</span>
      <div className="toggle-buttons">
        {modes.map(mode => (
          <button
            key={mode.id}
            className={`toggle-button ${displayMode === mode.id ? 'active' : ''}`}
            onClick={() => onDisplayModeChange(mode.id)}
            title={mode.tooltip}
            aria-label={`${mode.label} view`}
          >
            <span className="toggle-icon">{mode.icon}</span>
            <span className="toggle-text">{mode.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default GridDisplayToggle;
