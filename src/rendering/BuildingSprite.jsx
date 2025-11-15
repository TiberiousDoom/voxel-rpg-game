/**
 * BuildingSprite.jsx - React component for rendering building sprites
 *
 * This component renders a single building with all visual effects including:
 * - State-based coloring
 * - Texture overlays
 * - Shadows
 * - Health/progress bars
 * - Hover/selection effects
 *
 * Part of WF3: Building Rendering & Visual Effects
 */

import React from 'react';
import PropTypes from 'prop-types';
import {
  getBuildingIcon,
  getBuildingColor,
  getShadowEffect,
  generateShadowCSS
} from '../assets/building-icons.js';
import './BuildingSprite.css';

/**
 * BuildingSprite Component
 * Renders a building with visual effects
 */
function BuildingSprite({
  building,
  isHovered = false,
  isSelected = false,
  onClick = null,
  onMouseEnter = null,
  onMouseLeave = null,
  showHealthBar = true,
  showProgressBar = true,
  showWorkerCount = true,
  size = 40
}) {
  if (!building) return null;

  const state = building.state || 'COMPLETE';
  const icon = getBuildingIcon(building.type);
  const color = getBuildingColor(building.type, state);
  const shadow = getShadowEffect(building.type);

  const health = building.health || 100;
  const maxHealth = building.maxHealth || 100;
  const healthPercent = health / maxHealth;

  const constructionProgress = building.constructionProgress || 0;
  const constructionTime = building.constructionTime || 100;
  const progressPercent = Math.min(constructionProgress / constructionTime, 1);

  const workerCount = building.workerCount || 0;

  const isUnderConstruction = state === 'UNDER_CONSTRUCTION' || state === 'BUILDING';
  const isDamaged = state === 'DAMAGED' || healthPercent < 1;
  const isDestroyed = state === 'DESTROYED';

  // Build CSS classes
  const classes = [
    'building-sprite',
    `building-sprite--${state.toLowerCase()}`,
    `building-sprite--${icon.size}`,
    isHovered && 'building-sprite--hovered',
    isSelected && 'building-sprite--selected'
  ].filter(Boolean).join(' ');

  // Build inline styles
  const spriteStyle = {
    width: `${size}px`,
    height: `${size}px`,
    backgroundColor: color,
    boxShadow: generateShadowCSS(shadow)
  };

  return (
    <div
      className={classes}
      style={spriteStyle}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      data-building-id={building.id}
      data-building-type={building.type}
    >
      {/* Texture overlay */}
      <div className="building-sprite__overlay" data-state={state} />

      {/* Building icon/emoji */}
      <div className="building-sprite__icon">
        <span className="building-sprite__emoji">
          {icon.emoji}
        </span>
      </div>

      {/* Construction progress bar */}
      {showProgressBar && isUnderConstruction && (
        <div className="building-sprite__progress-bar">
          <div className="building-sprite__progress-bar-bg" />
          <div
            className="building-sprite__progress-bar-fill"
            style={{ width: `${progressPercent * 100}%` }}
          />
        </div>
      )}

      {/* Health bar */}
      {showHealthBar && isDamaged && !isDestroyed && (
        <div className="building-sprite__health-bar">
          <div className="building-sprite__health-bar-bg" />
          <div
            className={`building-sprite__health-bar-fill ${
              healthPercent > 0.5
                ? 'building-sprite__health-bar-fill--healthy'
                : healthPercent > 0.25
                  ? 'building-sprite__health-bar-fill--warning'
                  : 'building-sprite__health-bar-fill--critical'
            }`}
            style={{ width: `${healthPercent * 100}%` }}
          />
        </div>
      )}

      {/* Worker count indicator */}
      {showWorkerCount && workerCount > 0 && state === 'COMPLETE' && (
        <div className="building-sprite__worker-indicator">
          <span className="building-sprite__worker-count">{workerCount}</span>
        </div>
      )}

      {/* Hover effect */}
      {isHovered && <div className="building-sprite__hover-effect" />}

      {/* Selection effect */}
      {isSelected && <div className="building-sprite__selection-ring" />}
    </div>
  );
}

BuildingSprite.propTypes = {
  building: PropTypes.shape({
    id: PropTypes.string,
    type: PropTypes.string.isRequired,
    state: PropTypes.string,
    health: PropTypes.number,
    maxHealth: PropTypes.number,
    constructionProgress: PropTypes.number,
    constructionTime: PropTypes.number,
    workerCount: PropTypes.number
  }).isRequired,
  isHovered: PropTypes.bool,
  isSelected: PropTypes.bool,
  onClick: PropTypes.func,
  onMouseEnter: PropTypes.func,
  onMouseLeave: PropTypes.func,
  showHealthBar: PropTypes.bool,
  showProgressBar: PropTypes.bool,
  showWorkerCount: PropTypes.bool,
  size: PropTypes.number
};

export default BuildingSprite;
