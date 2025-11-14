import React, { useState } from 'react';
import CollapsibleSection from './CollapsibleSection';

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
    <CollapsibleSection
      title="NPCs"
      icon="👥"
      badge={`${npcs.length}`}
      defaultExpanded={true}
      className="npc-panel-collapsible"
    >
      <div className="npc-panel-content">
        <div className="npc-stats-compact">
          <div className="stat-compact">
            <span className="stat-icon">💤</span>
            <span className="stat-text">Idle: {idleNPCs.length}</span>
          </div>
          <div className="stat-compact">
            <span className="stat-icon">🏢</span>
            <span className="stat-text">Working: {workingNPCs.length}</span>
          </div>
        </div>

        <div className="npc-actions-compact">
          <button onClick={onAutoAssign} className="compact-btn primary">
            ⚡ Auto-Assign
          </button>
          <button onClick={() => setShowIdleModal(true)} className="compact-btn secondary">
            👀 Idle ({idleNPCs.length})
          </button>
        </div>

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

        {workingNPCs.length > 0 && (
          <div className="working-npcs-section">
            <h4 className="section-subtitle">Working NPCs ({workingNPCs.length})</h4>
            <div className="npc-list-compact">
              {workingNPCs.map(npc => {
                const building = buildings.find(b => b.id === npc.assignedBuilding);
                return (
                  <div key={npc.id} className="npc-item-compact working">
                    <div className="npc-basic-info">
                      <span className="npc-role">{npc.role}</span>
                      <span className="npc-assignment">→ {building?.type || 'Unknown'}</span>
                    </div>
                    <div className="npc-morale-compact">
                      <div className="morale-bar-small">
                        <div
                          className="morale-fill"
                          style={{ width: `${Math.max(0, Math.min(100, npc.morale || 50))}%` }}
                        />
                      </div>
                      <span className="morale-value-small">{Math.round(npc.morale || 50)}</span>
                    </div>
                    <button
                      onClick={() => handleUnassign(npc.id)}
                      className="unassign-btn-small"
                      title="Unassign NPC"
                    >
                      ✖️
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {selectedNPC && (
          <div className="assignment-controls-compact">
            <p className="assignment-title">Assign {selectedNPC.role} to:</p>
            <select
              onChange={(e) => setSelectedBuilding(buildings.find(b => b.id === e.target.value))}
              value={selectedBuilding?.id || ''}
              className="compact-select"
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
              className="compact-btn primary full-width"
            >
              Assign to {selectedBuilding?.type || '...'}
            </button>
          </div>
        )}
      </div>
    </CollapsibleSection>
  );
};

export default NPCPanel;
