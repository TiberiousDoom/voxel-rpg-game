import React, { useState } from 'react';

const NPCPanel = ({ npcs, buildings, onAssignNPC, onUnassignNPC, onAutoAssign }) => {
  const [selectedNPC, setSelectedNPC] = useState(null);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [showIdleModal, setShowIdleModal] = useState(false);

  const handleAssign = () => {
    if (selectedNPC && selectedBuilding) {
      onAssignNPC(selectedNPC.id, selectedBuilding.id);
      setSelectedNPC(null);
      setSelectedBuilding(null);
      setShowIdleModal(false);
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

      <button onClick={() => setShowIdleModal(true)} className="view-idle-btn">
        👀 View Idle NPCs ({idleNPCs.length})
      </button>

      {/* Idle NPCs Modal */}
      {showIdleModal && (
        <div className="idle-modal-backdrop" onClick={() => setShowIdleModal(false)}>
          <div className="idle-modal" onClick={(e) => e.stopPropagation()}>
            <div className="idle-modal-header">
              <h4>Idle NPCs ({idleNPCs.length})</h4>
              <button onClick={() => setShowIdleModal(false)} className="modal-close-btn">✖️</button>
            </div>
            <div className="idle-modal-content">
              {idleNPCs.length === 0 ? (
                <p className="no-npcs">No idle NPCs</p>
              ) : (
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
              )}
            </div>
          </div>
        </div>
      )}

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
