/**
 * MigrationNotification.jsx
 * Notification modal shown when v1 save is migrated to v2
 * Informs player about retroactive points granted
 */

import React from 'react';
import './MigrationNotification.css';

const MigrationNotification = ({ data, onClose }) => {
  if (!data) return null;

  return (
    <div className="migration-overlay" onClick={onClose}>
      <div className="migration-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="migration-header">
          <h1>🎉 Character System Unlocked!</h1>
          <button className="migration-close" onClick={onClose}>
            ×
          </button>
        </div>

        {/* Content */}
        <div className="migration-content">
          <div className="migration-welcome">
            <p>
              Welcome to the new <strong>Character System</strong>! Your save has been upgraded with powerful new features.
            </p>
          </div>

          {/* Points Granted */}
          <div className="migration-points">
            <div className="migration-points-card">
              <div className="points-icon">⚡</div>
              <div className="points-details">
                <div className="points-label">Attribute Points</div>
                <div className="points-value">{data.attributePoints}</div>
                <div className="points-info">
                  Based on your Level {data.level} character
                </div>
              </div>
            </div>

            <div className="migration-points-card skill-points">
              <div className="points-icon">🌟</div>
              <div className="points-details">
                <div className="points-label">Skill Points</div>
                <div className="points-value">{data.skillPoints}</div>
                <div className="points-info">
                  Ready to unlock powerful abilities
                </div>
              </div>
            </div>
          </div>

          {/* What's New */}
          <div className="migration-features">
            <h3>What's New:</h3>
            <ul>
              <li>
                <strong>6 Attributes</strong> - Leadership, Construction, Exploration, Combat, Magic, Endurance
              </li>
              <li>
                <strong>Derived Stats</strong> - Your stats now scale with attributes
              </li>
              <li>
                <strong>Skill Trees</strong> - Unlock powerful passive and active abilities (coming soon)
              </li>
              <li>
                <strong>Build Diversity</strong> - Create unique character builds
              </li>
            </ul>
          </div>

          {/* Call to Action */}
          <div className="migration-cta">
            <button className="migration-button" onClick={onClose}>
              Open Character Sheet (C)
            </button>
            <p className="migration-hint">
              Press <kbd>C</kbd> anytime to open the Character Sheet and allocate your points!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MigrationNotification;
