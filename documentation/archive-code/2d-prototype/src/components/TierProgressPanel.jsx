/**
 * TierProgressPanel.jsx - Tier progression UI
 *
 * Displays:
 * - Current tier and next tier
 * - Building requirements progress
 * - Resource requirements progress
 * - Advance button (enabled when requirements met)
 */

import React from 'react';
import './TierProgressPanel.css';

const TierProgressPanel = ({ tierProgress, onAdvance, onClose }) => {
  if (!tierProgress) {
    return null;
  }

  const {
    currentTier,
    nextTier,
    maxTierReached,
    canAdvance,
    progress
  } = tierProgress;

  // Tier display names
  const tierNames = {
    SURVIVAL: 'Survival',
    PERMANENT: 'Permanent Settlement',
    TOWN: 'Town',
    CASTLE: 'Castle'
  };

  // Tier colors
  const tierColors = {
    SURVIVAL: '#9e9e9e',
    PERMANENT: '#4caf50',
    TOWN: '#2196f3',
    CASTLE: '#9c27b0'
  };

  const handleAdvance = () => {
    if (canAdvance && nextTier) {
      onAdvance(nextTier);
    }
  };

  return (
    <div className="tier-progress-panel">
      <div className="panel-header">
        <h3>Tier Progression</h3>
        <button className="close-button" onClick={onClose}>✕</button>
      </div>

      <div className="panel-content">
        {/* Current Tier */}
        <div className="tier-section">
          <div className="tier-display">
            <span className="tier-label">Current Tier:</span>
            <span
              className="tier-badge"
              style={{ backgroundColor: tierColors[currentTier] || '#757575' }}
            >
              {tierNames[currentTier] || currentTier}
            </span>
          </div>
        </div>

        {maxTierReached ? (
          /* Max Tier Reached */
          <div className="max-tier-message">
            <h4>🏆 Maximum Tier Reached!</h4>
            <p>You have reached the highest tier available.</p>
            <p>Congratulations on building a mighty {tierNames[currentTier]}!</p>
          </div>
        ) : (
          /* Progression Section */
          <>
            {/* Next Tier */}
            <div className="tier-section">
              <div className="tier-display">
                <span className="tier-label">Next Tier:</span>
                <span
                  className="tier-badge tier-badge-next"
                  style={{ backgroundColor: tierColors[nextTier] || '#757575' }}
                >
                  {tierNames[nextTier] || nextTier}
                </span>
              </div>
            </div>

            {progress && (
              <>
                {/* Building Requirements */}
                {progress.buildingProgress && Object.keys(progress.buildingProgress).length > 0 && (
                  <div className="requirements-section">
                    <h4>Building Requirements</h4>
                    <div className="requirements-list">
                      {Object.entries(progress.buildingProgress).map(([type, count]) => {
                        // Get required count from progress.missingRequirements or assume met if not mentioned
                        const requirement = progress.missingRequirements.find(msg =>
                          msg.includes(type)
                        );

                        // Parse required count from message like "1× HOUSE (have 0/1)"
                        let required = count; // Default to current count if met
                        if (requirement) {
                          const match = requirement.match(/\(have \d+\/(\d+)\)/);
                          if (match) {
                            required = parseInt(match[1]);
                          }
                        }

                        const isMet = count >= required;

                        return (
                          <div key={type} className={`requirement-item ${isMet ? 'met' : 'unmet'}`}>
                            <span className="requirement-name">{type}:</span>
                            <span className="requirement-progress">
                              {count} / {required}
                            </span>
                            <span className="requirement-status">
                              {isMet ? '✓' : '❌'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Resource Requirements */}
                {progress.resourceProgress && (
                  <div className="requirements-section">
                    <h4>Resource Requirements</h4>
                    <div className="requirements-list">
                      {Object.entries(progress.resourceProgress).map(([resource, data]) => {
                        if (data.required === 0) return null; // Skip if not required

                        const isMet = data.available >= data.required;
                        const percentage = Math.min((data.available / data.required) * 100, 100);

                        return (
                          <div key={resource} className="requirement-item-with-bar">
                            <div className="requirement-header">
                              <span className="requirement-name">{resource}:</span>
                              <span className="requirement-progress">
                                {data.available} / {data.required}
                              </span>
                              <span className="requirement-status">
                                {isMet ? '✓' : '❌'}
                              </span>
                            </div>
                            <div className="progress-bar-container">
                              <div
                                className="progress-bar-fill"
                                style={{
                                  width: `${percentage}%`,
                                  backgroundColor: isMet ? '#4caf50' : '#ff9800'
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Status Message */}
                <div className="status-section">
                  {canAdvance ? (
                    <div className="status-ready">
                      ✓ Ready to advance to {tierNames[nextTier]}!
                    </div>
                  ) : (
                    <div className="status-not-ready">
                      {progress.reason || 'Requirements not met'}
                    </div>
                  )}
                </div>

                {/* Advance Button */}
                <div className="action-section">
                  <button
                    className={`advance-button ${canAdvance ? '' : 'disabled'}`}
                    onClick={handleAdvance}
                    disabled={!canAdvance}
                  >
                    {canAdvance ? (
                      <>🚀 Advance to {tierNames[nextTier]}</>
                    ) : (
                      <>🔒 Requirements Not Met</>
                    )}
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TierProgressPanel;
