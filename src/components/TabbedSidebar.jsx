/**
 * TabbedSidebar.jsx - Reusable tabbed sidebar component
 *
 * Features:
 * - Tab navigation with active indicator
 * - Smooth slide transitions between tabs
 * - Badge notifications (red dot for new items)
 * - Icon + text labels
 * - Persistent tab selection (localStorage)
 * - Keyboard navigation support
 * - Collapsible/expandable sidebar
 */

import React, { useState, useEffect } from 'react';
import './TabbedSidebar.css';

/**
 * TabbedSidebar Component
 *
 * @param {Object} props
 * @param {Array} props.tabs - Array of tab objects: { id, label, icon, content, badge }
 * @param {string} props.side - 'left' or 'right'
 * @param {string} props.storageKey - LocalStorage key for persisting tab selection
 * @param {string} props.defaultTab - Default tab ID to show
 * @param {string} props.className - Additional CSS classes
 */
function TabbedSidebar({
  tabs = [],
  side = 'left',
  storageKey = 'selectedTab',
  defaultTab = null,
  className = ''
}) {
  // Get initial collapsed state from localStorage (default: collapsed)
  const getInitialCollapsed = () => {
    const stored = localStorage.getItem(`${storageKey}_collapsed`);
    return stored !== null ? stored === 'true' : true; // Default to collapsed
  };

  // Get initial tab from localStorage or default
  const getInitialTab = () => {
    const stored = localStorage.getItem(storageKey);
    if (stored && tabs.find(t => t.id === stored)) {
      return stored;
    }
    return defaultTab || (tabs.length > 0 ? tabs[0].id : null);
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [collapsed, setCollapsed] = useState(getInitialCollapsed);

  // Persist tab selection
  useEffect(() => {
    if (activeTab) {
      localStorage.setItem(storageKey, activeTab);
    }
  }, [activeTab, storageKey]);

  // Persist collapsed state
  useEffect(() => {
    localStorage.setItem(`${storageKey}_collapsed`, collapsed.toString());
  }, [collapsed, storageKey]);

  // Handle tab change - expand sidebar when tab is clicked
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    if (collapsed) {
      setCollapsed(false);
    }
  };

  // Handle minimize/collapse
  const handleMinimize = () => {
    setCollapsed(true);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e, tabId, index) => {
    let newIndex = index;

    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      newIndex = index > 0 ? index - 1 : tabs.length - 1;
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      newIndex = index < tabs.length - 1 ? index + 1 : 0;
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleTabChange(tabId);
      return;
    }

    // Focus the new tab button
    const buttons = document.querySelectorAll(`.tabbed-sidebar.${side} .tab-button`);
    if (buttons[newIndex]) {
      buttons[newIndex].focus();
    }
  };

  return (
    <div className={`tabbed-sidebar ${side} ${collapsed ? 'collapsed' : 'expanded'} ${className}`}>
      {/* Tab Navigation */}
      <div className="tab-nav" role="tablist" aria-label={`${side} sidebar tabs`}>
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => handleTabChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, tab.id, index)}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`tab-panel-${tab.id}`}
            id={`tab-${tab.id}`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            title={collapsed ? tab.label : ''}
          >
            <span className="tab-icon" aria-hidden="true">{tab.icon}</span>
            {!collapsed && <span className="tab-label">{tab.label}</span>}
            {tab.badge !== undefined && tab.badge !== null && !collapsed && (
              <span className="tab-badge" aria-label={`${tab.badge} notifications`}>
                {typeof tab.badge === 'number' && tab.badge > 0 ? tab.badge : ''}
                {typeof tab.badge === 'boolean' && tab.badge && <span className="badge-dot" />}
              </span>
            )}
            {tab.badge !== undefined && tab.badge !== null && collapsed && (
              <span className="tab-badge-dot" aria-label={`${tab.badge} notifications`} />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content - only show when expanded */}
      {!collapsed && (
        <>
          <button
            className="minimize-button"
            onClick={handleMinimize}
            aria-label="Minimize sidebar"
            title="Minimize"
          >
            {side === 'left' ? '◀' : '▶'}
          </button>
          <div className="tab-content-wrapper">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                className={`tab-content ${activeTab === tab.id ? 'active' : ''}`}
                role="tabpanel"
                id={`tab-panel-${tab.id}`}
                aria-labelledby={`tab-${tab.id}`}
                hidden={activeTab !== tab.id}
              >
                {tab.content}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default TabbedSidebar;
