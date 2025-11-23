/**
 * MobileHamburgerMenu.jsx - Mobile-optimized hamburger menu
 *
 * Provides a clean slide-out drawer menu for mobile devices
 * containing all game menus and settings in an organized structure.
 */

import React, { useState } from 'react';
import './MobileHamburgerMenu.css';

const MobileHamburgerMenu = ({
  onOpenResources,
  onOpenNPCs,
  onOpenBuild,
  onOpenInventory,
  onOpenStats,
  onOpenAchievements,
  onOpenExpeditions,
  onOpenDefense,
  onOpenActions,
  onOpenDeveloper,
  onSave,
  onLoad,
  // Settings toggles
  showPerformance,
  onTogglePerformance,
  showDebug,
  onToggleDebug,
  // Building legend data
  buildingLegend = {},
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState(null);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const handleMenuAction = (action) => {
    action();
    setIsOpen(false); // Close menu after action
  };

  return (
    <>
      {/* Hamburger Button */}
      <button
        className="mobile-hamburger-button"
        onClick={toggleMenu}
        aria-label="Open menu"
      >
        <span className={`hamburger-icon ${isOpen ? 'open' : ''}`}>
          <span></span>
          <span></span>
          <span></span>
        </span>
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="mobile-menu-backdrop"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Slide-out Drawer */}
      <div className={`mobile-menu-drawer ${isOpen ? 'open' : ''}`}>
        <div className="mobile-menu-header">
          <h2>Game Menu</h2>
          <button
            className="mobile-menu-close"
            onClick={() => setIsOpen(false)}
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        <div className="mobile-menu-content">
          {/* Game Status Section */}
          <div className="mobile-menu-section">
            <button
              className="mobile-menu-section-header"
              onClick={() => toggleSection('status')}
            >
              <span>📊 Game Status</span>
              <span className="mobile-menu-arrow">{expandedSection === 'status' ? '▼' : '▶'}</span>
            </button>
            {expandedSection === 'status' && (
              <div className="mobile-menu-section-content">
                <button onClick={() => handleMenuAction(onOpenResources)}>
                  💰 Resources
                </button>
                <button onClick={() => handleMenuAction(onOpenNPCs)}>
                  👥 NPCs
                </button>
                <button onClick={() => handleMenuAction(onOpenStats)}>
                  📊 Statistics
                </button>
              </div>
            )}
          </div>

          {/* Build Section */}
          <div className="mobile-menu-section">
            <button
              className="mobile-menu-section-header"
              onClick={() => handleMenuAction(onOpenBuild)}
            >
              <span>🏗️ Build</span>
            </button>
          </div>

          {/* Combat Section */}
          <div className="mobile-menu-section">
            <button
              className="mobile-menu-section-header"
              onClick={() => toggleSection('combat')}
            >
              <span>⚔️ Combat</span>
              <span className="mobile-menu-arrow">{expandedSection === 'combat' ? '▼' : '▶'}</span>
            </button>
            {expandedSection === 'combat' && (
              <div className="mobile-menu-section-content">
                <button onClick={() => handleMenuAction(onOpenExpeditions)}>
                  ⚔️ Expeditions
                </button>
                <button onClick={() => handleMenuAction(onOpenDefense)}>
                  🛡️ Defense
                </button>
              </div>
            )}
          </div>

          {/* Inventory */}
          <div className="mobile-menu-section">
            <button
              className="mobile-menu-section-header"
              onClick={() => handleMenuAction(onOpenInventory)}
            >
              <span>📦 Inventory</span>
            </button>
          </div>

          {/* Achievements */}
          <div className="mobile-menu-section">
            <button
              className="mobile-menu-section-header"
              onClick={() => handleMenuAction(onOpenAchievements)}
            >
              <span>🏆 Achievements</span>
            </button>
          </div>

          {/* Settings Section */}
          <div className="mobile-menu-section">
            <button
              className="mobile-menu-section-header"
              onClick={() => toggleSection('settings')}
            >
              <span>⚙️ Settings</span>
              <span className="mobile-menu-arrow">{expandedSection === 'settings' ? '▼' : '▶'}</span>
            </button>
            {expandedSection === 'settings' && (
              <div className="mobile-menu-section-content">
                {/* Building Legend */}
                <div className="mobile-menu-legend">
                  <h4>Building Legend:</h4>
                  <div className="mobile-menu-legend-items">
                    {Object.entries(buildingLegend).map(([type, color]) => (
                      <div key={type} className="mobile-menu-legend-item">
                        <span
                          className="mobile-menu-legend-color"
                          style={{ backgroundColor: color }}
                        />
                        <span>{type}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Toggles */}
                <div className="mobile-menu-toggle">
                  <label>
                    <input
                      type="checkbox"
                      checked={showPerformance}
                      onChange={onTogglePerformance}
                    />
                    <span>Performance Monitor</span>
                  </label>
                </div>
                <div className="mobile-menu-toggle">
                  <label>
                    <input
                      type="checkbox"
                      checked={showDebug}
                      onChange={onToggleDebug}
                    />
                    <span>Debug Panel</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Save/Load Section */}
          <div className="mobile-menu-section">
            <button
              className="mobile-menu-section-header"
              onClick={() => toggleSection('save')}
            >
              <span>💾 Save/Load</span>
              <span className="mobile-menu-arrow">{expandedSection === 'save' ? '▼' : '▶'}</span>
            </button>
            {expandedSection === 'save' && (
              <div className="mobile-menu-section-content">
                <button onClick={() => handleMenuAction(onSave)}>
                  💾 Save Game
                </button>
                <button onClick={() => handleMenuAction(onLoad)}>
                  📂 Load Game
                </button>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          {onOpenActions && (
            <div className="mobile-menu-section">
              <button
                className="mobile-menu-section-header"
                onClick={() => handleMenuAction(onOpenActions)}
              >
                <span>⚡ Quick Actions</span>
              </button>
            </div>
          )}

          {/* Developer Tools */}
          {onOpenDeveloper && (
            <div className="mobile-menu-section">
              <button
                className="mobile-menu-section-header"
                onClick={() => handleMenuAction(onOpenDeveloper)}
              >
                <span>🛠️ Developer Tools</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default MobileHamburgerMenu;
