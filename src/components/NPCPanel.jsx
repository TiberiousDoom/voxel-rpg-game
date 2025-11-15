import React, { useState } from 'react';
import CollapsibleSection from './CollapsibleSection';
import { ARIA_LABELS } from '../accessibility/aria-labels';
import './NPCPanel.css';

const NPCPanel = ({ npcs, buildings, onAssignNPC, onUnassignNPC, onAutoAssign }) => {
  const [selectedNPC, setSelectedNPC] = useState(null);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [showIdleList, setShowIdleList] = useState(false);
  const [showWorkingList, setShowWorkingList] = useState(false);

  const handleAssign = () => {
    if (selectedNPC && selectedBuilding) {
      onAssignNPC(selectedNPC.id, selectedBuilding.id);
      setSelectedNPC(null);
      setSelectedBuilding(null);
    }
  };

  const handleUnassign = (npcId) => {
    onUnassignNPC(npcId);
  };

  const idleNPCs = npcs.filter(npc => !npc.assignedBuilding);
  const workingNPCs = npcs.filter(npc => npc.assignedBuilding);

  // Group working NPCs by building type
  const workingByBuilding = workingNPCs.reduce((acc, npc) => {
    const building = buildings.find(b => b.id === npc.assignedBuilding);
    const buildingType = building?.type || 'Unknown';
    if (!acc[buildingType]) {
      acc[buildingType] = [];
    }
    acc[buildingType].push(npc);
    return acc;
  }, {});

  return (
    <CollapsibleSection
      title="NPCs"
      icon="👥"
      badge={`${workingNPCs.length}/${npcs.length}`}
      defaultExpanded={true}
      aria-label={ARIA_LABELS.NPC_PANEL.TITLE}
    >
      <div
        className="npc-panel-content"
        role="region"
        aria-label="NPC management controls"
      >
        {/* Auto-Assign Button */}
        <button
          onClick={onAutoAssign}
          className="auto-assign-btn"
          aria-label="Automatically assign all idle NPCs to available buildings"
        >
          <span aria-hidden="true">⚡</span> Auto-Assign All
        </button>

        {/* Idle NPCs Section */}
        <div className="npc-subsection" role="group" aria-label="Idle NPCs">
          <button
            className="npc-subsection-header"
            onClick={() => setShowIdleList(!showIdleList)}
            aria-expanded={showIdleList}
            aria-controls="idle-npcs-list"
            aria-label={`Idle NPCs section with ${idleNPCs.length} idle NPCs`}
          >
            <span><span aria-hidden="true">💤</span> Idle ({idleNPCs.length})</span>
            <span className="npc-toggle" aria-hidden="true">{showIdleList ? '▼' : '▶'}</span>
          </button>

          {showIdleList && (
            <div
              id="idle-npcs-list"
              className="npc-list-compact"
              role="list"
              aria-label="Idle NPCs list"
            >
              {idleNPCs.length === 0 ? (
                <p className="no-npcs-compact" role="status">All NPCs assigned!</p>
              ) : (
                idleNPCs.map((npc, index) => (
                  <div
                    key={npc.id}
                    role="listitem"
                    className={`npc-item-compact ${selectedNPC?.id === npc.id ? 'selected' : ''}`}
                    onClick={() => setSelectedNPC(selectedNPC?.id === npc.id ? null : npc)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedNPC(selectedNPC?.id === npc.id ? null : npc);
                      }
                    }}
                    tabIndex={0}
                    aria-label={`${npc.role} - Health: ${npc.health}, Morale: ${Math.round(npc.morale || 50)}`}
                    aria-selected={selectedNPC?.id === npc.id}
                  >
                    <span className="npc-role-compact">{npc.role}</span>
                    <div className="npc-indicators" aria-hidden="true">
                      <span className="npc-health-dot" title={`Health: ${npc.health}`}>
                        {npc.health > 75 ? '🟢' : npc.health > 40 ? '🟡' : '🔴'}
                      </span>
                      <span className="npc-morale-dot" title={`Morale: ${Math.round(npc.morale || 50)}`}>
                        {(npc.morale || 50) > 75 ? '😊' : (npc.morale || 50) > 40 ? '😐' : '😞'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Working NPCs Section */}
        <div className="npc-subsection" role="group" aria-label="Working NPCs">
          <button
            className="npc-subsection-header"
            onClick={() => setShowWorkingList(!showWorkingList)}
            aria-expanded={showWorkingList}
            aria-controls="working-npcs-list"
            aria-label={`Working NPCs section with ${workingNPCs.length} working NPCs`}
          >
            <span><span aria-hidden="true">💼</span> Working ({workingNPCs.length})</span>
            <span className="npc-toggle" aria-hidden="true">{showWorkingList ? '▼' : '▶'}</span>
          </button>

          {showWorkingList && (
            <div
              id="working-npcs-list"
              className="npc-working-groups"
              role="list"
              aria-label="Working NPCs grouped by building type"
            >
              {Object.entries(workingByBuilding).map(([buildingType, npcList]) => (
                <div key={buildingType} className="npc-building-group" role="listitem">
                  <div className="npc-building-label" aria-label={`${buildingType} building with ${npcList.length} assigned NPCs`}>
                    {buildingType} × {npcList.length}
                  </div>
                  {npcList.map(npc => (
                    <div
                      key={npc.id}
                      className="npc-item-compact working"
                      role="group"
                      aria-label={`${npc.role} working at ${buildingType} - Health: ${npc.health}, Morale: ${Math.round(npc.morale || 50)}`}
                    >
                      <span className="npc-role-compact">{npc.role}</span>
                      <div className="npc-indicators" aria-hidden="true">
                        <span className="npc-health-dot" title={`Health: ${npc.health}`}>
                          {npc.health > 75 ? '🟢' : npc.health > 40 ? '🟡' : '🔴'}
                        </span>
                        <span className="npc-morale-dot" title={`Morale: ${Math.round(npc.morale || 50)}`}>
                          {(npc.morale || 50) > 75 ? '😊' : (npc.morale || 50) > 40 ? '😐' : '😞'}
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnassign(npc.id);
                        }}
                        className="unassign-btn-compact"
                        title="Unassign NPC"
                        aria-label={`Unassign ${npc.role} from ${buildingType}`}
                      >
                        <span aria-hidden="true">✖️</span>
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Assignment Controls */}
        {selectedNPC && (
          <div
            className="assignment-controls-compact"
            role="region"
            aria-label={`Assignment controls for ${selectedNPC.role}`}
          >
            <div className="assignment-header" id="assignment-header">
              Assign {selectedNPC.role}
            </div>
            <select
              onChange={(e) => setSelectedBuilding(buildings.find(b => b.id === e.target.value))}
              value={selectedBuilding?.id || ''}
              className="assignment-select"
              aria-label="Select building to assign NPC to"
              aria-labelledby="assignment-header"
            >
              <option value="">Select building...</option>
              {buildings
                .filter(b => b.state === 'COMPLETE' && (b.properties.npcCapacity || 0) > 0)
                .map(b => {
                  const capacity = b.properties.npcCapacity || 0;
                  const assigned = workingNPCs.filter(npc => npc.assignedBuilding === b.id).length;
                  const isFull = assigned >= capacity;
                  return (
                    <option
                      key={b.id}
                      value={b.id}
                      disabled={isFull}
                      aria-label={`${b.type} - ${assigned} of ${capacity} slots filled${isFull ? ' (full)' : ''}`}
                    >
                      {b.type} ({assigned}/{capacity})
                    </option>
                  );
                })}
            </select>
            <div className="assignment-buttons" role="group" aria-label="Assignment actions">
              <button
                onClick={handleAssign}
                disabled={!selectedBuilding}
                className="assign-btn-compact"
                aria-label={selectedBuilding ? `Assign ${selectedNPC.role} to ${selectedBuilding.type}` : 'Select a building first'}
              >
                <span aria-hidden="true">✓</span> Assign
              </button>
              <button
                onClick={() => setSelectedNPC(null)}
                className="cancel-btn-compact"
                aria-label="Cancel NPC assignment"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </CollapsibleSection>
  );
};

export default NPCPanel;
