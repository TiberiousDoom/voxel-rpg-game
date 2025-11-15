/**
 * BuildingSearch.jsx - Search and filter buildings by name
 *
 * Features:
 * - Real-time search as user types
 * - Clear button to reset search
 * - Highlights search term in results
 * - Shows match count
 */

import React, { useState } from 'react';
import './BuildingSearch.css';

function BuildingSearch({
  searchTerm = '',
  onSearchChange = () => {},
  matchCount = 0,
  totalCount = 0
}) {
  const [isFocused, setIsFocused] = useState(false);

  const handleClear = () => {
    onSearchChange('');
  };

  const handleChange = (e) => {
    onSearchChange(e.target.value);
  };

  return (
    <div className={`building-search ${isFocused ? 'focused' : ''}`}>
      <div className="search-input-wrapper">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          className="search-input"
          placeholder="Search buildings..."
          value={searchTerm}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          aria-label="Search buildings by name"
        />
        {searchTerm && (
          <button
            className="clear-button"
            onClick={handleClear}
            title="Clear search"
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {/* Search results info */}
      {searchTerm && (
        <div className="search-info">
          <span className="search-results">
            Found {matchCount} of {totalCount} building{totalCount !== 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  );
}

export default BuildingSearch;
