import React, { useState } from 'react';

const NPCPanel = ({ npcs, buildings, onAssignNPC, onUnassignNPC, onAutoAssign }) => {
  const [selectedNPC, setSelectedNPC] = useState(null);
  const [selectedBuilding, setSelectedBuilding] = useState(null);

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

  return (
    <div className="npc-panel">
      <h3>NPCs ({npcs.length})</h3>

      <div className="npc-stats">
        <div>
          💤 Idle: {idleNPCs.length}
        </div>
        <div>
          🏢 Working: {workingNPCs.length}
        </div>
      </div>

      <button onClick={onAutoAssign} className="auto-assign-btn">
        ⚡ Auto-Assign All
      </button>

      <h4>Idle NPCs</h4>
      <div className="npc-list">
        {idleNPCs.map(npc => (
          <div
            key={npc.id}
            className={`npc-item ${selectedNPC?.id === npc.id ? 'selected' : ''}`}
            onClick={() => setSelectedNPC(npc)}
          >
            <span className="npc-role">{npc.role}</span>
            <span className="npc-health">❤️ {npc.health}</span>
            <div className="npc-morale">
              <span className="morale-label">Morale:</span>
              <div className="morale-bar">
                <div
                  className="morale-fill"
                  style={{ width: `${Math.max(0, Math.min(100, npc.morale || 50))}%` }}
                />
              </div>
              <span className="morale-value">{Math.round(npc.morale || 50)}</span>
            </div>
          </div>
        ))}
      </div>

      <h4>Working NPCs</h4>
      <div className="npc-list">
        {workingNPCs.map(npc => {
          const building = buildings.find(b => b.id === npc.assignedBuilding);
          return (
            <div key={npc.id} className="npc-item working">
              <span className="npc-role">{npc.role}</span>
              <span className="npc-assignment">
                → {building?.type || 'Unknown'}
              </span>
              <div className="npc-morale">
                <span className="morale-label">Morale:</span>
                <div className="morale-bar">
                  <div
                    className="morale-fill"
                    style={{ width: `${Math.max(0, Math.min(100, npc.morale || 50))}%` }}
                  />
                </div>
                <span className="morale-value">{Math.round(npc.morale || 50)}</span>
              </div>
              <button
                onClick={() => handleUnassign(npc.id)}
                className="unassign-btn"
              >
                ✖️
              </button>
            </div>
          );
        })}
      </div>

      {selectedNPC && (
        <div className="assignment-controls">
          <h4>Assign {selectedNPC.role} to:</h4>
          <select
            onChange={(e) => setSelectedBuilding(buildings.find(b => b.id === e.target.value))}
            value={selectedBuilding?.id || ''}
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

          <button
            onClick={handleAssign}
            disabled={!selectedBuilding}
            className="assign-btn"
          >
            Assign to {selectedBuilding?.type || '...'}
          </button>
        </div>
      )}
    </div>
  );
};

export default NPCPanel;
