/**
 * HorizontalTabBar.jsx - Horizontal navigation bar for all tabs
 *
 * Features:
 * - Displays all tabs horizontally below header
 * - Grouped by sidebar (left/right)
 * - Click to expand sidebar and show content
 * - Badge notifications
 * - Active tab highlighting
 */

import React from 'react';
import './HorizontalTabBar.css';

function HorizontalTabBar({
  leftTabs = [],
  rightTabs = [],
  activeTab,
  onTabClick,
  leftCollapsed,
  rightCollapsed
}) {
  return (
    <div className="horizontal-tab-bar">
      {/* Left Sidebar Tabs */}
      <div className="tab-group left-group">
        {leftTabs.map((tab) => (
          <button
            key={tab.id}
            className={`horizontal-tab ${activeTab === tab.id ? 'active' : ''} ${!leftCollapsed && activeTab === tab.id ? 'expanded' : ''}`}
            onClick={() => onTabClick(tab.id, 'left')}
            title={tab.label}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
            {tab.badge !== undefined && tab.badge !== null && (
              <span className="tab-badge">
                {typeof tab.badge === 'number' && tab.badge > 0 ? tab.badge : ''}
                {typeof tab.badge === 'boolean' && tab.badge && <span className="badge-dot" />}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="tab-divider" />

      {/* Right Sidebar Tabs */}
      <div className="tab-group right-group">
        {rightTabs.map((tab) => (
          <button
            key={tab.id}
            className={`horizontal-tab ${activeTab === tab.id ? 'active' : ''} ${!rightCollapsed && activeTab === tab.id ? 'expanded' : ''}`}
            onClick={() => onTabClick(tab.id, 'right')}
            title={tab.label}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
            {tab.badge !== undefined && tab.badge !== null && (
              <span className="tab-badge">
                {typeof tab.badge === 'number' && tab.badge > 0 ? tab.badge : ''}
                {typeof tab.badge === 'boolean' && tab.badge && <span className="badge-dot" />}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export default HorizontalTabBar;
