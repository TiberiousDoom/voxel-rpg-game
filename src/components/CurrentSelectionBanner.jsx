/**
 * CurrentSelectionBanner.jsx - Sticky banner showing current building selection
 *
 * Features:
 * - Sticky positioning at top
 * - Compact layout
 * - Clear cancel button
 * - Shows hint text
 */

import React from 'react';
import './CurrentSelectionBanner.css';

function CurrentSelectionBanner({
  selectedBuildingType = null,
  buildingName = '',
  buildingIcon = '🏗️',
  onCancel = () => {}
}) {
  if (!selectedBuildingType) {
    return null;
  }

  return (
    <div className="current-selection-banner">
      <div className="banner-content">
        <div className="building-info">
          <span className="building-icon">{buildingIcon}</span>
          <span className="building-label">
            Placing: <strong>{buildingName}</strong>
          </span>
        </div>
        <button
          className="cancel-button"
          onClick={onCancel}
          title="Cancel selection"
          aria-label="Cancel selection"
        >
          ✕
        </button>
      </div>
      <p className="banner-hint">Click on the map to place</p>
    </div>
  );
}

export default CurrentSelectionBanner;
