import React, { useState } from 'react';
import { Activity, Swords, Map, Shield, ChevronDown, ChevronUp, X } from 'lucide-react';
import { useGame } from '../context/GameContext';
import './HybridSystemDebugPanel.css';

/**
 * HybridSystemDebugPanel - Shows live data from all hybrid game systems
 * Compact, collapsible debug view for testing and monitoring
 */
function HybridSystemDebugPanel({ onClose }) {
  const { gameState, gameManager } = useGame();
  const [collapsed, setCollapsed] = useState({});

  // Get hybrid system data
  const getSystemData = () => {
    if (!gameManager?.orchestrator) {
      return null;
    }

    const orchestrator = gameManager.orchestrator;

    return {
      mode: orchestrator.unifiedState?.getCurrentMode() || 'settlement',
      npcs: orchestrator.npcManager?.getStatistics() || {},
      raids: {
        active: orchestrator.raidEventManager?.getActiveRaid(),
        nextRaid: orchestrator.raidEventManager?.nextRaidTime,
        history: orchestrator.raidEventManager?.getRaidHistory()?.length || 0
      },
      expeditions: {
        active: orchestrator.expeditionManager?.getActiveExpedition(),
        history: orchestrator.expeditionManager?.expeditionHistory?.length || 0
      },
      combat: {
        skillSystem: orchestrator.npcSkillSystem ? 'Ready' : 'Not loaded',
        equipmentManager: orchestrator.npcEquipmentManager ? 'Ready' : 'Not loaded'
      },
      settlement: {
        health: orchestrator.defenseCombatEngine?.getSettlementHealth() || 1000
      }
    };
  };

  const systemData = getSystemData();

  const toggleSection = (section) => {
    setCollapsed(prev => ({ ...prev, [section]: !prev[section] }));
  };

  if (!systemData) {
    return (
      <div className="debug-panel">
        <div className="debug-header">
          <Activity size={16} />
          <span>System Debug</span>
          {onClose && <button onClick={onClose} className="debug-close"><X size={16} /></button>}
        </div>
        <div className="debug-body">
          <p>Initializing...</p>
        </div>
      </div>
    );
  }

  const getModeColor = (mode) => {
    switch(mode) {
      case 'settlement': return '#22c55e';
      case 'expedition': return '#f59e0b';
      case 'defense': return '#ef4444';
      default: return '#64748b';
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'None';
    const diff = timestamp - Date.now();
    if (diff < 0) return 'Ready';
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  return (
    <div className="debug-panel">
      <div className="debug-header">
        <Activity size={16} />
        <span>Hybrid Systems Debug</span>
        {onClose && <button onClick={onClose} className="debug-close"><X size={16} /></button>}
      </div>

      <div className="debug-body">
        {/* Current Mode */}
        <div className="debug-section">
          <div className="debug-section-header">
            <span className="mode-badge" style={{ background: getModeColor(systemData.mode) }}>
              {systemData.mode.toUpperCase()}
            </span>
            <span className="debug-label">Current Mode</span>
          </div>
        </div>

        {/* NPC Stats */}
        <div className="debug-section">
          <button
            className="debug-section-header clickable"
            onClick={() => toggleSection('npcs')}
          >
            <Swords size={14} />
            <span>NPC Combat ({systemData.npcs.alive || 0} alive)</span>
            {collapsed.npcs ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
          {!collapsed.npcs && (
            <div className="debug-content">
              <div className="debug-row">
                <span>Total:</span>
                <span>{systemData.npcs.total || 0}</span>
              </div>
              <div className="debug-row">
                <span>Alive:</span>
                <span className="good">{systemData.npcs.alive || 0}</span>
              </div>
              <div className="debug-row">
                <span>On Expedition:</span>
                <span className="warn">{systemData.npcs.onExpedition || 0}</span>
              </div>
              <div className="debug-row">
                <span>Veterans:</span>
                <span className="info">{systemData.npcs.veterans || 0}</span>
              </div>
            </div>
          )}
        </div>

        {/* Raid System */}
        <div className="debug-section">
          <button
            className="debug-section-header clickable"
            onClick={() => toggleSection('raids')}
          >
            <Shield size={14} />
            <span>Raid System</span>
            {collapsed.raids ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
          {!collapsed.raids && (
            <div className="debug-content">
              <div className="debug-row">
                <span>Active Raid:</span>
                <span className={systemData.raids.active ? 'bad' : 'good'}>
                  {systemData.raids.active ? `Wave ${systemData.raids.active.currentWave}/${systemData.raids.active.totalWaves}` : 'None'}
                </span>
              </div>
              {systemData.raids.active && (
                <>
                  <div className="debug-row">
                    <span>Type:</span>
                    <span className="warn">{systemData.raids.active.type}</span>
                  </div>
                  <div className="debug-row">
                    <span>Difficulty:</span>
                    <span>{systemData.raids.active.difficulty}</span>
                  </div>
                  <div className="debug-row">
                    <span>Enemies Killed:</span>
                    <span className="good">{systemData.raids.active.stats?.enemiesKilled || 0}</span>
                  </div>
                  <div className="debug-row">
                    <span>Defenders Lost:</span>
                    <span className="bad">{systemData.raids.active.stats?.defendersKilled || 0}</span>
                  </div>
                </>
              )}
              <div className="debug-row">
                <span>Next Raid:</span>
                <span className="info">{formatTime(systemData.raids.nextRaid)}</span>
              </div>
              <div className="debug-row">
                <span>Raids Completed:</span>
                <span>{systemData.raids.history}</span>
              </div>
            </div>
          )}
        </div>

        {/* Expedition System */}
        <div className="debug-section">
          <button
            className="debug-section-header clickable"
            onClick={() => toggleSection('expeditions')}
          >
            <Map size={14} />
            <span>Expeditions</span>
            {collapsed.expeditions ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
          {!collapsed.expeditions && (
            <div className="debug-content">
              <div className="debug-row">
                <span>Active:</span>
                <span className={systemData.expeditions.active ? 'warn' : 'good'}>
                  {systemData.expeditions.active ? 'In Progress' : 'None'}
                </span>
              </div>
              {systemData.expeditions.active && (
                <>
                  <div className="debug-row">
                    <span>Floor:</span>
                    <span>{systemData.expeditions.active.currentFloor} / {systemData.expeditions.active.targetFloor}</span>
                  </div>
                  <div className="debug-row">
                    <span>Dungeon:</span>
                    <span className="info">{systemData.expeditions.active.dungeon}</span>
                  </div>
                </>
              )}
              <div className="debug-row">
                <span>Completed:</span>
                <span>{systemData.expeditions.history}</span>
              </div>
            </div>
          )}
        </div>

        {/* Settlement */}
        <div className="debug-section">
          <button
            className="debug-section-header clickable"
            onClick={() => toggleSection('settlement')}
          >
            <Shield size={14} />
            <span>Settlement</span>
            {collapsed.settlement ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
          {!collapsed.settlement && (
            <div className="debug-content">
              <div className="debug-row">
                <span>Health:</span>
                <span className={systemData.settlement.health > 800 ? 'good' : systemData.settlement.health > 400 ? 'warn' : 'bad'}>
                  {systemData.settlement.health} / 1000
                </span>
              </div>
              <div className="debug-progress-bar">
                <div
                  className="debug-progress-fill"
                  style={{
                    width: `${(systemData.settlement.health / 1000) * 100}%`,
                    background: systemData.settlement.health > 800 ? '#22c55e' : systemData.settlement.health > 400 ? '#f59e0b' : '#ef4444'
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Systems Status */}
        <div className="debug-section">
          <button
            className="debug-section-header clickable"
            onClick={() => toggleSection('systems')}
          >
            <Activity size={14} />
            <span>Systems</span>
            {collapsed.systems ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
          {!collapsed.systems && (
            <div className="debug-content">
              <div className="debug-row">
                <span>Skill System:</span>
                <span className="good">{systemData.combat.skillSystem}</span>
              </div>
              <div className="debug-row">
                <span>Equipment:</span>
                <span className="good">{systemData.combat.equipmentManager}</span>
              </div>
              <div className="debug-row">
                <span>Tick:</span>
                <span className="info">{gameState.currentTick || 0}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default HybridSystemDebugPanel;
