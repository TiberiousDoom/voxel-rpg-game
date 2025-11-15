/**
 * NPCFilter.jsx - NPC filtering and search component
 *
 * Provides:
 * - Search by name input
 * - Role filter dropdown
 * - Status filter dropdown
 * - Clear filters button
 */

import React from 'react';
import { NPC_ROLES, NPC_STATUSES } from '../../modules/module4/types/index';
import './NPCFilter.css';

const NPCFilter = ({
  searchTerm,
  roleFilter,
  statusFilter,
  onSearchChange,
  onRoleChange,
  onStatusChange,
  onClearFilters,
  totalNPCs,
  filteredCount,
}) => {
  const hasFilters = searchTerm || roleFilter !== 'ALL' || statusFilter !== 'ALL';

  return (
    <div className="npc-filter">
      {/* Search Input */}
      <div className="npc-filter-row">
        <div className="npc-filter-item npc-search">
          <label htmlFor="npc-search" className="npc-filter-label">
            Search
          </label>
          <input
            id="npc-search"
            type="text"
            placeholder="Search by name or ID..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="npc-search-input"
          />
        </div>

        {/* Role Filter */}
        <div className="npc-filter-item">
          <label htmlFor="role-filter" className="npc-filter-label">
            Role
          </label>
          <select
            id="role-filter"
            value={roleFilter}
            onChange={(e) => onRoleChange(e.target.value)}
            className="npc-filter-select"
          >
            <option value="ALL">All Roles</option>
            {Object.values(NPC_ROLES).map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="npc-filter-item">
          <label htmlFor="status-filter" className="npc-filter-label">
            Status
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value)}
            className="npc-filter-select"
          >
            <option value="ALL">All Status</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IDLE">Idle</option>
            {Object.values(NPC_STATUSES).map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        {/* Clear Filters Button */}
        {hasFilters && (
          <button
            onClick={onClearFilters}
            className="npc-clear-filters-btn"
            title="Clear all filters"
          >
            ✖ Clear
          </button>
        )}
      </div>

      {/* Results Count */}
      <div className="npc-filter-results">
        {hasFilters ? (
          <span className="npc-results-count">
            Showing {filteredCount} of {totalNPCs} NPCs
          </span>
        ) : (
          <span className="npc-results-count">
            {totalNPCs} NPCs total
          </span>
        )}
      </div>
    </div>
  );
};

export default NPCFilter;
