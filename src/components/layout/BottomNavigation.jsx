/**
 * BottomNavigation.jsx - Mobile-first bottom navigation bar
 *
 * Features:
 * - Fixed bottom navigation
 * - Icon tabs with labels
 * - Active state indicator
 * - Overflow menu for additional items
 * - Badge support for notifications
 * - Keyboard shortcuts display
 */

import React from 'react';
import {
  Hammer,
  Package,
  Users,
  Coins,
  Scroll,
  MoreHorizontal,
  BarChart3,
  User,
  Compass,
  Shield,
  Wrench,
  Settings,
  Bug,
  X,
} from 'lucide-react';
import useUIStore, { NAV_TABS, OVERFLOW_ITEMS, PANEL_TYPES } from '../../stores/useUIStore';
import { Badge } from '../common';
import './BottomNavigation.css';

// Icon mapping
const ICONS = {
  Hammer,
  Package,
  Users,
  Coins,
  Scroll,
  MoreHorizontal,
  BarChart3,
  User,
  Compass,
  Shield,
  Wrench,
  Settings,
  Bug,
};

/**
 * NavTab component for individual navigation items
 */
function NavTab({ id, label, icon, shortcut, isActive, badge, onClick }) {
  const Icon = ICONS[icon] || Package;

  return (
    <button
      className={`nav-tab ${isActive ? 'nav-tab-active' : ''}`}
      onClick={onClick}
      aria-label={`${label}${shortcut ? ` (${shortcut})` : ''}`}
      aria-pressed={isActive}
      title={`${label}${shortcut ? ` (${shortcut})` : ''}`}
    >
      <div className="nav-tab-icon">
        <Icon size={22} />
        {badge > 0 && (
          <span className="nav-tab-badge">{badge > 99 ? '99+' : badge}</span>
        )}
      </div>
      <span className="nav-tab-label">{label}</span>
      {isActive && <div className="nav-tab-indicator" />}
    </button>
  );
}

/**
 * OverflowMenu component for additional options
 */
function OverflowMenu({ isOpen, onClose, items, activePanel, onItemClick, isDebugMode }) {
  if (!isOpen) return null;

  const filteredItems = items.filter(item => !item.devOnly || isDebugMode);

  return (
    <>
      <div className="overflow-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="overflow-menu" role="menu" aria-label="More options">
        <div className="overflow-menu-header">
          <span className="overflow-menu-title">More</span>
          <button
            className="overflow-menu-close"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>
        <div className="overflow-menu-items">
          {filteredItems.map((item) => {
            const Icon = ICONS[item.icon] || Package;
            const isActive = activePanel === item.id;

            return (
              <button
                key={item.id}
                className={`overflow-item ${isActive ? 'overflow-item-active' : ''}`}
                onClick={() => onItemClick(item.id)}
                role="menuitem"
                aria-pressed={isActive}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

/**
 * BottomNavigation component
 */
function BottomNavigation({ className = '' }) {
  const {
    activePanel,
    togglePanel,
    isOverflowMenuOpen,
    toggleOverflowMenu,
    closeOverflowMenu,
    isDebugMode,
    isCleanMode,
    notificationCount,
  } = useUIStore();

  // Don't render in clean mode
  if (isCleanMode) return null;

  // Get badge count for specific tabs
  const getBadge = (tabId) => {
    // Example: show notification count on specific tabs
    if (tabId === PANEL_TYPES.QUESTS && notificationCount > 0) {
      return notificationCount;
    }
    return 0;
  };

  const handleTabClick = (tabId) => {
    closeOverflowMenu();
    togglePanel(tabId);
  };

  const handleOverflowItemClick = (itemId) => {
    closeOverflowMenu();
    togglePanel(itemId);
  };

  return (
    <nav className={`bottom-navigation ${className}`} role="navigation" aria-label="Main navigation">
      <div className="bottom-navigation-inner">
        {NAV_TABS.map((tab) => (
          <NavTab
            key={tab.id}
            id={tab.id}
            label={tab.label}
            icon={tab.icon}
            shortcut={tab.shortcut}
            isActive={activePanel === tab.id}
            badge={getBadge(tab.id)}
            onClick={() => handleTabClick(tab.id)}
          />
        ))}

        {/* More Button */}
        <NavTab
          id="more"
          label="More"
          icon="MoreHorizontal"
          isActive={isOverflowMenuOpen || OVERFLOW_ITEMS.some(item => item.id === activePanel)}
          onClick={toggleOverflowMenu}
        />
      </div>

      {/* Overflow Menu */}
      <OverflowMenu
        isOpen={isOverflowMenuOpen}
        onClose={closeOverflowMenu}
        items={OVERFLOW_ITEMS}
        activePanel={activePanel}
        onItemClick={handleOverflowItemClick}
        isDebugMode={isDebugMode}
      />
    </nav>
  );
}

export default BottomNavigation;
