/**
 * NPCListView.jsx - Sortable NPC table view with pagination
 *
 * Features:
 * - Sortable columns (name, role, assignment, happiness, health)
 * - Click to select/expand NPC
 * - Pagination controls
 * - Batch selection support
 */

import React from 'react';
import './NPCListView.css';

const NPCListView = ({
  npcs,
  onNPCClick,
  selectedNPC,
  sortBy,
  sortOrder,
  onSort,
  currentPage,
  totalPages,
  onPageChange,
  onPrevPage,
  onNextPage,
  buildings = [],
  selectedNPCs = [],
  onNPCSelect,
  batchMode = false,
}) => {
  /**
   * Get sort indicator icon
   */
  const getSortIcon = (field) => {
    if (sortBy !== field) return '⇅';
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  /**
   * Get building name by ID
   */
  const getBuildingName = (buildingId) => {
    if (!buildingId) return 'None';
    const building = buildings.find((b) => b.id === buildingId);
    return building ? building.type || building.name || buildingId : buildingId;
  };

  /**
   * Get health color
   */
  const getHealthColor = (health) => {
    if (health >= 75) return '#4caf50';
    if (health >= 40) return '#ff9800';
    return '#f44336';
  };

  /**
   * Get happiness/morale indicator
   */
  const getHappinessIndicator = (npc) => {
    const happiness = npc.happiness !== undefined ? npc.happiness : npc.morale || 50;
    if (happiness >= 75) return '😊';
    if (happiness >= 40) return '😐';
    return '😞';
  };

  /**
   * Handle NPC row click
   */
  const handleRowClick = (npc) => {
    if (batchMode && onNPCSelect) {
      onNPCSelect(npc);
    } else if (onNPCClick) {
      onNPCClick(npc);
    }
  };

  /**
   * Check if NPC is selected
   */
  const isNPCSelected = (npc) => {
    if (batchMode) {
      return selectedNPCs.some((n) => n.id === npc.id);
    }
    return selectedNPC && selectedNPC.id === npc.id;
  };

  return (
    <div className="npc-list-view">
      {/* Table */}
      <div className="npc-table-container">
        <table className="npc-table">
          <thead>
            <tr>
              {batchMode && (
                <th className="npc-table-header npc-table-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedNPCs.length === npcs.length && npcs.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        npcs.forEach((npc) => onNPCSelect(npc));
                      } else {
                        selectedNPCs.forEach((npc) => onNPCSelect(npc));
                      }
                    }}
                  />
                </th>
              )}
              <th
                className="npc-table-header npc-table-sortable"
                onClick={() => onSort('name')}
              >
                Name <span className="npc-sort-icon">{getSortIcon('name')}</span>
              </th>
              <th
                className="npc-table-header npc-table-sortable"
                onClick={() => onSort('role')}
              >
                Role <span className="npc-sort-icon">{getSortIcon('role')}</span>
              </th>
              <th
                className="npc-table-header npc-table-sortable"
                onClick={() => onSort('assignment')}
              >
                Assignment <span className="npc-sort-icon">{getSortIcon('assignment')}</span>
              </th>
              <th
                className="npc-table-header npc-table-sortable"
                onClick={() => onSort('happiness')}
              >
                Happiness <span className="npc-sort-icon">{getSortIcon('happiness')}</span>
              </th>
              <th
                className="npc-table-header npc-table-sortable"
                onClick={() => onSort('health')}
              >
                Health <span className="npc-sort-icon">{getSortIcon('health')}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {npcs.length === 0 ? (
              <tr>
                <td colSpan={batchMode ? 6 : 5} className="npc-table-empty">
                  No NPCs found
                </td>
              </tr>
            ) : (
              npcs.map((npc) => (
                <tr
                  key={npc.id}
                  className={`npc-table-row ${isNPCSelected(npc) ? 'npc-table-row-selected' : ''}`}
                  onClick={() => handleRowClick(npc)}
                >
                  {batchMode && (
                    <td className="npc-table-cell npc-table-checkbox">
                      <input
                        type="checkbox"
                        checked={isNPCSelected(npc)}
                        onChange={() => onNPCSelect(npc)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                  )}
                  <td className="npc-table-cell npc-table-name">
                    {npc.name || `NPC #${npc.id}`}
                  </td>
                  <td className="npc-table-cell npc-table-role">
                    <span className="npc-role-badge">{npc.role}</span>
                  </td>
                  <td className="npc-table-cell npc-table-assignment">
                    {getBuildingName(npc.assignedBuilding || npc.assignedBuildingId)}
                  </td>
                  <td className="npc-table-cell npc-table-happiness">
                    <span className="npc-happiness-emoji" title={`Happiness: ${npc.happiness || npc.morale || 50}`}>
                      {getHappinessIndicator(npc)}
                    </span>
                    <span className="npc-happiness-value">
                      {npc.happiness !== undefined ? npc.happiness : npc.morale || 50}
                    </span>
                  </td>
                  <td className="npc-table-cell npc-table-health">
                    <div className="npc-health-bar">
                      <div
                        className="npc-health-fill"
                        style={{
                          width: `${npc.health || 100}%`,
                          backgroundColor: getHealthColor(npc.health || 100),
                        }}
                      />
                    </div>
                    <span className="npc-health-value">{npc.health || 100}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="npc-pagination">
          <button
            className="npc-pagination-btn"
            onClick={onPrevPage}
            disabled={currentPage === 1}
          >
            ‹ Prev
          </button>

          <div className="npc-pagination-info">
            <span className="npc-pagination-page">
              Page {currentPage} of {totalPages}
            </span>

            {/* Page number buttons for small page counts */}
            {totalPages <= 5 && (
              <div className="npc-pagination-numbers">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    className={`npc-pagination-number ${currentPage === page ? 'active' : ''}`}
                    onClick={() => onPageChange(page)}
                  >
                    {page}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            className="npc-pagination-btn"
            onClick={onNextPage}
            disabled={currentPage === totalPages}
          >
            Next ›
          </button>
        </div>
      )}
    </div>
  );
};

export default NPCListView;
