/**
 * TopBar.jsx - Minimal top header bar
 *
 * Features:
 * - Game title/logo
 * - Quick action buttons
 * - Clean mode toggle
 * - Save/load indicators
 * - Responsive design
 */

import React from 'react';
import {
  Menu,
  Save,
  Settings,
  Eye,
  EyeOff,
  Bug,
  Pause,
  Play,
} from 'lucide-react';
import { IconButton } from '../common';
import useUIStore, { PANEL_TYPES } from '../../stores/useUIStore';
import './TopBar.css';

/**
 * TopBar component
 * @param {Object} props
 * @param {string} props.gameName - Game/settlement name to display
 * @param {boolean} props.isPaused - Whether game is paused
 * @param {Function} props.onTogglePause - Pause toggle handler
 * @param {Function} props.onSave - Save game handler
 * @param {boolean} props.isSaving - Whether save is in progress
 * @param {string} props.className - Additional CSS classes
 */
function TopBar({
  gameName = 'Voxel RPG',
  isPaused = false,
  onTogglePause,
  onSave,
  isSaving = false,
  className = '',
}) {
  const {
    isCleanMode,
    toggleCleanMode,
    isDebugMode,
    toggleDebugMode,
    openPanel,
    toggleMobileMenu,
  } = useUIStore();

  // Don't render in clean mode (except for a minimal indicator)
  if (isCleanMode) {
    return (
      <div className="topbar-clean-mode">
        <button
          className="topbar-clean-mode-exit"
          onClick={toggleCleanMode}
          aria-label="Exit clean mode (press ` or click)"
        >
          <EyeOff size={16} />
          <span>Clean Mode</span>
        </button>
      </div>
    );
  }

  return (
    <header className={`topbar ${className}`}>
      {/* Left Section */}
      <div className="topbar-left">
        {/* Mobile Menu Button */}
        <IconButton
          icon={<Menu size={20} />}
          onClick={toggleMobileMenu}
          variant="ghost"
          size="small"
          ariaLabel="Open menu"
          className="topbar-mobile-menu"
        />

        {/* Game Title */}
        <div className="topbar-title">
          <h1 className="topbar-game-name">{gameName}</h1>
        </div>
      </div>

      {/* Center Section (optional - for status indicators) */}
      <div className="topbar-center">
        {isPaused && (
          <div className="topbar-status topbar-status-paused">
            <Pause size={14} />
            <span>Paused</span>
          </div>
        )}
      </div>

      {/* Right Section */}
      <div className="topbar-right">
        {/* Pause/Play */}
        {onTogglePause && (
          <IconButton
            icon={isPaused ? <Play size={18} /> : <Pause size={18} />}
            onClick={onTogglePause}
            variant="ghost"
            size="small"
            ariaLabel={isPaused ? 'Resume game' : 'Pause game'}
            tooltip={isPaused ? 'Resume (Space)' : 'Pause (Space)'}
          />
        )}

        {/* Save */}
        {onSave && (
          <IconButton
            icon={<Save size={18} />}
            onClick={onSave}
            variant="ghost"
            size="small"
            ariaLabel="Save game"
            tooltip="Save (Ctrl+S)"
            loading={isSaving}
          />
        )}

        {/* Clean Mode Toggle */}
        <IconButton
          icon={<Eye size={18} />}
          onClick={toggleCleanMode}
          variant="ghost"
          size="small"
          ariaLabel="Enter clean mode"
          tooltip="Clean Mode (`)"
        />

        {/* Debug Toggle (dev only) */}
        {isDebugMode !== undefined && (
          <IconButton
            icon={<Bug size={18} />}
            onClick={toggleDebugMode}
            variant={isDebugMode ? 'accent' : 'ghost'}
            size="small"
            ariaLabel="Toggle debug mode"
            tooltip="Debug Mode"
            className={isDebugMode ? 'topbar-debug-active' : ''}
          />
        )}

        {/* Settings */}
        <IconButton
          icon={<Settings size={18} />}
          onClick={() => openPanel(PANEL_TYPES.SETTINGS)}
          variant="ghost"
          size="small"
          ariaLabel="Open settings"
          tooltip="Settings"
        />
      </div>
    </header>
  );
}

export default TopBar;
