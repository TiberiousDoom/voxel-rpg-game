/**
 * TerrainToolsPanel.jsx - Terrain modification tool selection UI
 *
 * Phase 4: Terrain Job System
 *
 * Allows player to:
 * - Select terrain modification tool (flatten, raise, lower, smooth)
 * - Set job priority
 * - Cancel selection
 *
 * Usage:
 *   <TerrainToolsPanel
 *     activeTool={activeTool}
 *     priority={priority}
 *     onToolSelect={handleToolSelect}
 *     onPriorityChange={handlePriorityChange}
 *   />
 */

import React from 'react';
import './TerrainToolsPanel.css';

const TerrainToolsPanel = ({
  activeTool,
  priority = 5,
  onToolSelect,
  onPriorityChange,
  isSelecting = false,
  selectionInfo = null
}) => {
  return (
    <div className="terrain-tools-panel">
      <div className="panel-header">
        <h3>⛏️ Terrain Tools</h3>
        {isSelecting && (
          <span className="selection-indicator">Selecting...</span>
        )}
      </div>

      <div className="tool-buttons">
        <button
          className={`tool-button ${activeTool === 'flatten' ? 'active' : ''}`}
          onClick={() => onToolSelect('flatten')}
          title="Flatten terrain to average height"
        >
          <span className="tool-icon">🏗️</span>
          <span className="tool-name">Flatten</span>
        </button>

        <button
          className={`tool-button ${activeTool === 'raise' ? 'active' : ''}`}
          onClick={() => onToolSelect('raise')}
          title="Raise terrain by 1 level"
        >
          <span className="tool-icon">⬆️</span>
          <span className="tool-name">Raise</span>
        </button>

        <button
          className={`tool-button ${activeTool === 'lower' ? 'active' : ''}`}
          onClick={() => onToolSelect('lower')}
          title="Lower terrain by 1 level"
        >
          <span className="tool-icon">⬇️</span>
          <span className="tool-name">Lower</span>
        </button>

        <button
          className={`tool-button ${activeTool === 'smooth' ? 'active' : ''}`}
          onClick={() => onToolSelect('smooth')}
          title="Smooth terrain irregularities"
        >
          <span className="tool-icon">〰️</span>
          <span className="tool-name">Smooth</span>
        </button>
      </div>

      {activeTool && (
        <>
          <div className="priority-selector">
            <label htmlFor="job-priority">Priority:</label>
            <select
              id="job-priority"
              value={priority}
              onChange={(e) => onPriorityChange(parseInt(e.target.value))}
            >
              <option value="1">Low (1)</option>
              <option value="5">Normal (5)</option>
              <option value="8">High (8)</option>
              <option value="10">Urgent (10)</option>
            </select>
          </div>

          {selectionInfo && (
            <div className="selection-info">
              <div className="info-row">
                <span className="info-label">Area:</span>
                <span className="info-value">
                  {selectionInfo.width} × {selectionInfo.depth} tiles
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">Tiles:</span>
                <span className="info-value">{selectionInfo.tiles}</span>
              </div>
              {selectionInfo.estimatedTime && (
                <div className="info-row">
                  <span className="info-label">Est. Time:</span>
                  <span className="info-value">{selectionInfo.estimatedTime}</span>
                </div>
              )}
            </div>
          )}

          <div className="tool-instructions">
            <p>
              <strong>Click and drag</strong> on terrain to select area.
            </p>
            <p>
              Release to create job.
            </p>
          </div>

          <button
            className="cancel-button"
            onClick={() => onToolSelect(null)}
          >
            ❌ Cancel Tool
          </button>
        </>
      )}

      {!activeTool && (
        <div className="tool-info">
          <p>Select a tool to modify terrain.</p>
          <p className="help-text">
            Jobs will be assigned to available workers automatically.
          </p>
        </div>
      )}
    </div>
  );
};

export default TerrainToolsPanel;
