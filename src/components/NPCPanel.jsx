/**
 * NPCPanel.jsx - Enhanced NPC management panel
 *
 * Features (WF2 Phase 4 Enhancements):
 * - NPCFilter: Search and filter NPCs by role/status
 * - NPCListView: Sortable table with pagination
 * - NPCDetailCard: Detailed NPC information
 * - PopulationChart: Role distribution visualization
 * - Batch selection and assignment
 */

import React, { useState } from 'react';
import CollapsibleSection from './CollapsibleSection';
import NPCFilter from './npc/NPCFilter';
import NPCListView from './npc/NPCListView';
import NPCDetailCard from './npc/NPCDetailCard';
import PopulationChart from './npc/PopulationChart';
import useNPCFilters from '../hooks/useNPCFilters';
import './NPCPanel.css';

const NPCPanel = ({
  npcs = [],
  buildings = [],
  onAssignNPC,
  onUnassignNPC,
  onAutoAssign,
  onSpawnNPC,
  maxPopulation = 100,
}) => {
  // View mode: 'list' or 'chart'
  const [viewMode, setViewMode] = useState('list');

  // Selected NPC for detail view
  const [selectedNPC, setSelectedNPC] = useState(null);

  // Batch selection mode
  const [batchMode, setBatchMode] = useState(false);
  const [selectedNPCs, setSelectedNPCs] = useState([]);

  // Building selection for assignment
  const [selectedBuilding, setSelectedBuilding] = useState(null);

  // Use NPC filters hook
  const {
    paginatedNPCs,
    totalNPCs,
    searchTerm,
    roleFilter,
    statusFilter,
    sortBy,
    sortOrder,
    currentPage,
    totalPages,
    setSearchTerm,
    setRoleFilter,
    setStatusFilter,
    handleSort,
    goToPage,
    nextPage,
    prevPage,
    resetFilters,
  } = useNPCFilters(npcs, {
    itemsPerPage: 10,
    initialSortBy: 'name',
    initialSortOrder: 'asc',
  });

  /**
   * Handle NPC click (show detail)
   */
  const handleNPCClick = (npc) => {
    setSelectedNPC(selectedNPC?.id === npc.id ? null : npc);
  };

  /**
   * Handle batch NPC selection
   */
  const handleNPCSelect = (npc) => {
    setSelectedNPCs((prev) => {
      const isSelected = prev.some((n) => n.id === npc.id);
      if (isSelected) {
        return prev.filter((n) => n.id !== npc.id);
      } else {
        return [...prev, npc];
      }
    });
  };

  /**
   * Handle batch assign
   */
  const handleBatchAssign = () => {
    if (!selectedBuilding || selectedNPCs.length === 0) return;

    selectedNPCs.forEach((npc) => {
      if (onAssignNPC) {
        onAssignNPC(npc.id, selectedBuilding.id);
      }
    });

    // Clear selection
    setSelectedNPCs([]);
    setSelectedBuilding(null);
    setBatchMode(false);
  };

  /**
   * Handle unassign from detail card
   */
  const handleUnassign = (npcId) => {
    if (onUnassignNPC) {
      onUnassignNPC(npcId);
    }
    setSelectedNPC(null);
  };

  /**
   * Handle assign from detail card
   */
  const handleAssignFromDetail = (npc) => {
    setSelectedNPC(npc);
    // User will need to select a building
  };

  /**
   * Get building for NPC
   */
  const getBuildingForNPC = (npc) => {
    const buildingId = npc.assignedBuilding || npc.assignedBuildingId;
    if (!buildingId) return null;
    return buildings.find((b) => b.id === buildingId);
  };

  const workingNPCs = npcs.filter(
    (npc) => npc.assignedBuilding || npc.assignedBuildingId
  );

  return (
    <CollapsibleSection
      title="NPCs"
      icon="👥"
      badge={`${workingNPCs.length}/${npcs.length}`}
      defaultExpanded={true}
    >
      <div className="npc-panel-enhanced">
        {/* View Mode Toggle */}
        <div className="npc-panel-toolbar">
          <div className="npc-view-toggle">
            <button
              className={`npc-view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              📋 List
            </button>
            <button
              className={`npc-view-btn ${viewMode === 'chart' ? 'active' : ''}`}
              onClick={() => setViewMode('chart')}
            >
              📊 Chart
            </button>
          </div>

          {/* Action Buttons */}
          <div className="npc-panel-actions">
            {viewMode === 'list' && (
              <button
                className={`npc-batch-toggle-btn ${batchMode ? 'active' : ''}`}
                onClick={() => {
                  setBatchMode(!batchMode);
                  setSelectedNPCs([]);
                }}
              >
                {batchMode ? '✓ Exit Batch' : '☑ Batch Select'}
              </button>
            )}
            {onAutoAssign && (
              <button onClick={onAutoAssign} className="npc-auto-assign-btn">
                ⚡ Auto-Assign
              </button>
            )}
          </div>
        </div>

        {/* List View */}
        {viewMode === 'list' && (
          <>
            {/* Filters */}
            <NPCFilter
              searchTerm={searchTerm}
              roleFilter={roleFilter}
              statusFilter={statusFilter}
              onSearchChange={setSearchTerm}
              onRoleChange={setRoleFilter}
              onStatusChange={setStatusFilter}
              onClearFilters={resetFilters}
              totalNPCs={npcs.length}
              filteredCount={totalNPCs}
            />

            {/* NPC List Table */}
            <NPCListView
              npcs={paginatedNPCs}
              onNPCClick={handleNPCClick}
              selectedNPC={selectedNPC}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={handleSort}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={goToPage}
              onPrevPage={prevPage}
              onNextPage={nextPage}
              buildings={buildings}
              selectedNPCs={selectedNPCs}
              onNPCSelect={handleNPCSelect}
              batchMode={batchMode}
            />

            {/* Batch Assignment Controls */}
            {batchMode && selectedNPCs.length > 0 && (
              <div className="npc-batch-controls">
                <div className="npc-batch-header">
                  Assign {selectedNPCs.length} NPC{selectedNPCs.length > 1 ? 's' : ''}
                </div>
                <select
                  onChange={(e) =>
                    setSelectedBuilding(
                      buildings.find((b) => b.id === e.target.value)
                    )
                  }
                  value={selectedBuilding?.id || ''}
                  className="npc-batch-select"
                >
                  <option value="">Select building...</option>
                  {buildings
                    .filter(
                      (b) =>
                        b.state === 'COMPLETE' &&
                        (b.properties?.npcCapacity || 0) > 0
                    )
                    .map((b) => {
                      const capacity = b.properties?.npcCapacity || 0;
                      const assigned = workingNPCs.filter(
                        (npc) =>
                          npc.assignedBuilding === b.id ||
                          npc.assignedBuildingId === b.id
                      ).length;
                      return (
                        <option
                          key={b.id}
                          value={b.id}
                          disabled={assigned >= capacity}
                        >
                          {b.type} ({assigned}/{capacity})
                        </option>
                      );
                    })}
                </select>
                <div className="npc-batch-buttons">
                  <button
                    onClick={handleBatchAssign}
                    disabled={!selectedBuilding}
                    className="npc-batch-assign-btn"
                  >
                    ✓ Assign All
                  </button>
                  <button
                    onClick={() => {
                      setSelectedNPCs([]);
                      setSelectedBuilding(null);
                    }}
                    className="npc-batch-cancel-btn"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Detail Card Modal */}
            {selectedNPC && !batchMode && (
              <div className="npc-detail-modal">
                <div className="npc-detail-backdrop" onClick={() => setSelectedNPC(null)} />
                <div className="npc-detail-wrapper">
                  <NPCDetailCard
                    npc={selectedNPC}
                    building={getBuildingForNPC(selectedNPC)}
                    onClose={() => setSelectedNPC(null)}
                    onUnassign={handleUnassign}
                    onAssign={handleAssignFromDetail}
                  />
                </div>
              </div>
            )}
          </>
        )}

        {/* Chart View */}
        {viewMode === 'chart' && (
          <PopulationChart
            npcs={npcs}
            maxPopulation={maxPopulation}
            onSpawnNPC={onSpawnNPC}
            showSpawnButtons={!!onSpawnNPC}
          />
        )}
      </div>
    </CollapsibleSection>
  );
};

export default NPCPanel;
