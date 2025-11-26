/**
 * ZLevelControls.jsx - Z-level navigation controls for voxel view
 *
 * Provides controls for navigating between Z-levels in the layered
 * voxel view (Dwarf Fortress style). Displays as a floating overlay
 * on the game viewport.
 *
 * Part of Phase 11: UI Components
 */

import React, { useCallback, useEffect } from 'react';
import { ChevronUp, ChevronDown, Layers, Eye, EyeOff } from 'lucide-react';
import './ZLevelControls.css';

/**
 * ZLevelControls component
 * @param {Object} props
 * @param {number} props.currentLevel - Current Z-level being viewed
 * @param {number} props.minLevel - Minimum Z-level (usually 0)
 * @param {number} props.maxLevel - Maximum Z-level
 * @param {Function} props.onLevelChange - Callback when level changes
 * @param {boolean} props.showLevelsBelow - Whether to show levels below current
 * @param {Function} props.onToggleLevelsBelow - Toggle showing levels below
 * @param {number} props.levelsToShow - Number of levels to render below current
 * @param {Function} props.onLevelsToShowChange - Change levels to show
 */
function ZLevelControls({
  currentLevel = 0,
  minLevel = 0,
  maxLevel = 15,
  onLevelChange,
  showLevelsBelow = true,
  onToggleLevelsBelow,
  levelsToShow = 3,
  onLevelsToShowChange,
}) {
  // Navigate up one level
  const goUp = useCallback(() => {
    if (currentLevel < maxLevel && onLevelChange) {
      onLevelChange(currentLevel + 1);
    }
  }, [currentLevel, maxLevel, onLevelChange]);

  // Navigate down one level
  const goDown = useCallback(() => {
    if (currentLevel > minLevel && onLevelChange) {
      onLevelChange(currentLevel - 1);
    }
  }, [currentLevel, minLevel, onLevelChange]);

  // Jump to specific level
  const jumpToLevel = useCallback((level) => {
    if (level >= minLevel && level <= maxLevel && onLevelChange) {
      onLevelChange(level);
    }
  }, [minLevel, maxLevel, onLevelChange]);

  // Keyboard shortcuts for Z-level navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't handle if typing in an input
      if (
        e.target.tagName === 'INPUT' ||
        e.target.tagName === 'TEXTAREA' ||
        e.target.isContentEditable
      ) {
        return;
      }

      // Page Up / . to go up a level
      if (e.key === 'PageUp' || e.key === '.') {
        e.preventDefault();
        goUp();
      }

      // Page Down / , to go down a level
      if (e.key === 'PageDown' || e.key === ',') {
        e.preventDefault();
        goDown();
      }

      // Home to go to surface (max level)
      if (e.key === 'Home') {
        e.preventDefault();
        jumpToLevel(maxLevel);
      }

      // End to go to lowest level
      if (e.key === 'End') {
        e.preventDefault();
        jumpToLevel(minLevel);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goUp, goDown, jumpToLevel, minLevel, maxLevel]);

  const canGoUp = currentLevel < maxLevel;
  const canGoDown = currentLevel > minLevel;

  return (
    <div className="z-level-controls">
      {/* Level Indicator */}
      <div className="z-level-indicator">
        <Layers size={16} />
        <span className="z-level-value">Z: {currentLevel}</span>
      </div>

      {/* Navigation Buttons */}
      <div className="z-level-nav">
        <button
          className="z-level-btn z-level-up"
          onClick={goUp}
          disabled={!canGoUp}
          title="Go up one level (PageUp or .)"
          aria-label="Go up one Z-level"
        >
          <ChevronUp size={18} />
        </button>

        <button
          className="z-level-btn z-level-down"
          onClick={goDown}
          disabled={!canGoDown}
          title="Go down one level (PageDown or ,)"
          aria-label="Go down one Z-level"
        >
          <ChevronDown size={18} />
        </button>
      </div>

      {/* Level Slider (for quick navigation) */}
      <div className="z-level-slider-container">
        <input
          type="range"
          className="z-level-slider"
          min={minLevel}
          max={maxLevel}
          value={currentLevel}
          onChange={(e) => onLevelChange?.(parseInt(e.target.value, 10))}
          orient="vertical"
          title={`Z-Level: ${currentLevel}`}
          aria-label="Z-level slider"
        />
        <div className="z-level-marks">
          <span className="z-mark z-mark-top">{maxLevel}</span>
          <span className="z-mark z-mark-bottom">{minLevel}</span>
        </div>
      </div>

      {/* Visibility Toggle */}
      {onToggleLevelsBelow && (
        <button
          className={`z-level-btn z-level-visibility ${showLevelsBelow ? 'active' : ''}`}
          onClick={onToggleLevelsBelow}
          title={showLevelsBelow ? 'Hide levels below' : 'Show levels below'}
          aria-label={showLevelsBelow ? 'Hide levels below' : 'Show levels below'}
        >
          {showLevelsBelow ? <Eye size={16} /> : <EyeOff size={16} />}
        </button>
      )}

      {/* Levels to Show Control */}
      {showLevelsBelow && onLevelsToShowChange && (
        <div className="z-level-depth">
          <label htmlFor="levels-depth" className="z-level-depth-label">
            Depth
          </label>
          <select
            id="levels-depth"
            className="z-level-depth-select"
            value={levelsToShow}
            onChange={(e) => onLevelsToShowChange(parseInt(e.target.value, 10))}
          >
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
            <option value={5}>5</option>
            <option value={10}>All</option>
          </select>
        </div>
      )}
    </div>
  );
}

export default ZLevelControls;
