import React, { useState } from 'react';
import CollapsibleSection from './CollapsibleSection';
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
    >
      <div className="npc-panel-content">
        {/* Auto-Assign Button */}
        <button onClick={onAutoAssign} className="auto-assign-btn">
          ⚡ Auto-Assign All
        </button>

        {/* Idle NPCs Section */}
        <div className="npc-subsection">
          <button
            className="npc-subsection-header"
            onClick={() => setShowIdleList(!showIdleList)}
          >
            <span>💤 Idle ({idleNPCs.length})</span>
            <span className="npc-toggle">{showIdleList ? '▼' : '▶'}</span>
          </button>

          {showIdleList && (
            <div className="npc-list-compact">
              {idleNPCs.length === 0 ? (
                <p className="no-npcs-compact">All NPCs assigned!</p>
              ) : (
                idleNPCs.map(npc => (
                  <div
                    key={npc.id}
                    className={`npc-item-compact ${selectedNPC?.id === npc.id ? 'selected' : ''}`}
                    onClick={() => setSelectedNPC(selectedNPC?.id === npc.id ? null : npc)}
                  >
                    <span className="npc-role-compact">{npc.role}</span>
                    <div className="npc-indicators">
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
        <div className="npc-subsection">
          <button
            className="npc-subsection-header"
            onClick={() => setShowWorkingList(!showWorkingList)}
          >
            <span>💼 Working ({workingNPCs.length})</span>
            <span className="npc-toggle">{showWorkingList ? '▼' : '▶'}</span>
          </button>

          {showWorkingList && (
            <div className="npc-working-groups">
              {Object.entries(workingByBuilding).map(([buildingType, npcList]) => (
                <div key={buildingType} className="npc-building-group">
                  <div className="npc-building-label">
                    {buildingType} × {npcList.length}
                  </div>
                  {npcList.map(npc => (
                    <div key={npc.id} className="npc-item-compact working">
                      <span className="npc-role-compact">{npc.role}</span>
                      <div className="npc-indicators">
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
                      >
                        ✖️
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
          <div className="assignment-controls-compact">
            <div className="assignment-header">Assign {selectedNPC.role}</div>
            <select
              onChange={(e) => setSelectedBuilding(buildings.find(b => b.id === e.target.value))}
              value={selectedBuilding?.id || ''}
              className="assignment-select"
            >
              <option value="">Select building...</option>
              {buildings
                .filter(b => b.state === 'COMPLETE' && (b.properties.npcCapacity || 0) > 0)
                .map(b => {
                  const capacity = b.properties.npcCapacity || 0;
                  const assigned = workingNPCs.filter(npc => npc.assignedBuilding === b.id).length;
                  return (
                    <option key={b.id} value={b.id} disabled={assigned >= capacity}>
                      {b.type} ({assigned}/{capacity})
                    </option>
                  );
                })}
            </select>
            <div className="assignment-buttons">
              <button
                onClick={handleAssign}
                disabled={!selectedBuilding}
                className="assign-btn-compact"
              >
                ✓ Assign
              </button>
              <button
                onClick={() => setSelectedNPC(null)}
                className="cancel-btn-compact"
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
