/**
 * BuildingCategoryFilter.jsx - Filter buildings by category
 *
 * Features:
 * - Tab-based filtering UI
 * - Show "All" or specific categories
 * - Display category count
 * - Smooth transitions
 */

import React, { useMemo } from 'react';
import './BuildingCategoryFilter.css';

// Category definitions with icons and colors
const BUILDING_CATEGORIES = {
  ALL: { icon: '📊', label: 'All', color: '#3b82f6' },
  PRODUCTION: { icon: '🌾', label: 'Production', color: '#4caf50' },
  HOUSING: { icon: '🏠', label: 'Housing', color: '#2196f3' },
  MILITARY: { icon: '⚔️', label: 'Military', color: '#f44336' },
  ADMINISTRATION: { icon: '🏛️', label: 'Admin', color: '#9c27b0' },
  STORAGE: { icon: '📦', label: 'Storage', color: '#ff9800' },
  UTILITY: { icon: '⚡', label: 'Utility', color: '#ffc107' }
};

function BuildingCategoryFilter({
  selectedCategory = 'ALL',
  onCategoryChange = () => {},
  buildingsByCategory = {}
}) {
  // Calculate total buildings per category
  const categoryCounts = useMemo(() => {
    const counts = { ALL: 0 };

    Object.entries(buildingsByCategory).forEach(([category, buildings]) => {
      counts[category] = buildings.length;
      counts.ALL += buildings.length;
    });

    return counts;
  }, [buildingsByCategory]);

  // Available categories with buildings
  const availableCategories = useMemo(() => {
    return Object.entries(BUILDING_CATEGORIES)
      .filter(([key]) => key === 'ALL' || buildingsByCategory[key]?.length > 0);
  }, [buildingsByCategory]);

  return (
    <div className="building-category-filter">
      <div className="category-tabs">
        {availableCategories.map(([categoryKey, categoryData]) => {
          const count = categoryCounts[categoryKey] || 0;
          const isActive = selectedCategory === categoryKey;

          return (
            <button
              key={categoryKey}
              className={`category-tab ${isActive ? 'active' : ''}`}
              onClick={() => onCategoryChange(categoryKey)}
              title={`${categoryData.label} (${count})`}
              style={{
                '--category-color': categoryData.color
              }}
            >
              <span className="category-icon">{categoryData.icon}</span>
              <span className="category-label">{categoryData.label}</span>
              {count > 0 && <span className="category-count">{count}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default BuildingCategoryFilter;
export { BUILDING_CATEGORIES };
