/**
 * TownUpgradesPanel.jsx
 * UI panel for viewing and starting town upgrades
 */

import React, { useState, useEffect } from 'react';
import { useTownManagement } from '../../modules/module4/stores/useTownManagement';
import { useProgressionSystem } from '../../modules/module4/stores/useProgressionSystem';
import { TOWN_UPGRADES } from '../../shared/config';

const UPGRADE_TYPE_COLORS = {
  DEFENSIVE: '#e74c3c',
  FUNCTIONAL: '#3498db',
  COSMETIC: '#9b59b6',
};

const UPGRADE_TYPE_ICONS = {
  DEFENSIVE: '\u{1F6E1}\uFE0F',
  FUNCTIONAL: '\u{2699}\uFE0F',
  COSMETIC: '\u{1F3A8}',
};

const TownUpgradesPanel = ({ isOpen, onClose }) => {
  const [selectedUpgrade, setSelectedUpgrade] = useState(null);
  const [, setTick] = useState(0);

  const activeTownId = useTownManagement((s) => s.activeTownId);
  const getActiveTown = useTownManagement((s) => s.getActiveTown);
  const startUpgrade = useTownManagement((s) => s.startUpgrade);
  const getUpgradeProgress = useTownManagement((s) => s.getUpgradeProgress);
  const isUpgradeUnlocked = useProgressionSystem((s) => s.isUpgradeUnlocked);

  // Refresh progress bars every second
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const town = getActiveTown();
  const upgrades = town ? town.upgrades : {};

  const handleStartUpgrade = (upgradeId) => {
    if (!activeTownId) return;
    // Pass empty buildings array - in real integration, this would come from game state
    const result = startUpgrade(activeTownId, upgradeId, []);
    if (!result.success) {
      // Could show toast notification here
      console.warn('Upgrade failed:', result.error);
    }
  };

  const getUpgradeStatus = (upgradeId, upgrade) => {
    if (upgrade.completed) return 'completed';
    if (upgrade.inProgress) return 'in-progress';
    if (!isUpgradeUnlocked(upgradeId)) return 'locked';
    return 'available';
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const formatCosts = (costs) => {
    if (!costs) return 'Free';
    return Object.entries(costs)
      .map(([resource, amount]) => `${amount} ${resource}`)
      .join(', ');
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#1a1a2e',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '700px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
          border: '2px solid #333',
          color: '#eee',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '20px' }}>
            Town Upgrades {town ? `- ${town.name}` : ''}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#999',
              fontSize: '24px',
              cursor: 'pointer',
            }}
          >
            x
          </button>
        </div>

        {!town ? (
          <p style={{ color: '#999', textAlign: 'center', padding: '40px 0' }}>
            No active town. Create a settlement first.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {Object.entries(upgrades).map(([upgradeId, upgrade]) => {
              const status = getUpgradeStatus(upgradeId, upgrade);
              const progress = getUpgradeProgress(activeTownId, upgradeId);
              const typeColor = UPGRADE_TYPE_COLORS[upgrade.type] || '#888';
              const typeIcon = UPGRADE_TYPE_ICONS[upgrade.type] || '';
              const isSelected = selectedUpgrade === upgradeId;

              return (
                <div
                  key={upgradeId}
                  style={{
                    backgroundColor: isSelected ? '#2a2a4a' : '#16213e',
                    borderRadius: '8px',
                    padding: '16px',
                    border: `1px solid ${status === 'completed' ? '#27ae60' : status === 'in-progress' ? '#f39c12' : '#333'}`,
                    cursor: status === 'locked' ? 'not-allowed' : 'pointer',
                    opacity: status === 'locked' ? 0.5 : 1,
                    transition: 'all 0.2s',
                  }}
                  onClick={() => status !== 'locked' && setSelectedUpgrade(isSelected ? null : upgradeId)}
                >
                  {/* Upgrade Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '20px' }}>{typeIcon}</span>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '16px' }}>{upgrade.name}</h3>
                        <span style={{ fontSize: '12px', color: typeColor, fontWeight: 'bold' }}>
                          {upgrade.type}
                        </span>
                      </div>
                    </div>
                    <div>
                      {status === 'completed' && (
                        <span style={{ color: '#27ae60', fontWeight: 'bold', fontSize: '14px' }}>
                          COMPLETED
                        </span>
                      )}
                      {status === 'in-progress' && (
                        <span style={{ color: '#f39c12', fontWeight: 'bold', fontSize: '14px' }}>
                          {Math.round(progress * 100)}%
                        </span>
                      )}
                      {status === 'locked' && (
                        <span style={{ color: '#666', fontSize: '14px' }}>LOCKED</span>
                      )}
                      {status === 'available' && (
                        <span style={{ color: '#3498db', fontSize: '14px' }}>AVAILABLE</span>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar (in-progress only) */}
                  {status === 'in-progress' && (
                    <div style={{ marginTop: '10px' }}>
                      <div style={{
                        height: '6px',
                        backgroundColor: '#333',
                        borderRadius: '3px',
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${progress * 100}%`,
                          backgroundColor: '#f39c12',
                          borderRadius: '3px',
                          transition: 'width 0.5s',
                        }} />
                      </div>
                      <span style={{ fontSize: '11px', color: '#999', marginTop: '4px', display: 'block' }}>
                        {formatTime(Math.max(0, upgrade.buildTime - ((Date.now() - upgrade.startedAt) / 1000)))} remaining
                      </span>
                    </div>
                  )}

                  {/* Expanded Details */}
                  {isSelected && (
                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #333' }}>
                      <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#ccc' }}>
                        {upgrade.description}
                      </p>

                      {/* Cost */}
                      <div style={{ marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', color: '#999' }}>Cost: </span>
                        <span style={{ fontSize: '12px', color: '#f1c40f' }}>{formatCosts(upgrade.costs)}</span>
                      </div>

                      {/* Build Time */}
                      <div style={{ marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', color: '#999' }}>Build Time: </span>
                        <span style={{ fontSize: '12px', color: '#ccc' }}>{formatTime(upgrade.buildTime)}</span>
                      </div>

                      {/* Effects */}
                      {upgrade.effects && (
                        <div style={{ marginBottom: '12px' }}>
                          <span style={{ fontSize: '12px', color: '#999' }}>Effects: </span>
                          {Object.entries(upgrade.effects).map(([key, val]) => (
                            <span key={key} style={{ fontSize: '12px', color: '#2ecc71', marginRight: '10px' }}>
                              +{val} {key}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Requirements */}
                      {upgrade.requirements && (
                        <div style={{ marginBottom: '12px' }}>
                          <span style={{ fontSize: '12px', color: '#999' }}>Requirements: </span>
                          {Object.entries(upgrade.requirements).map(([key, val]) => (
                            <span key={key} style={{ fontSize: '12px', color: '#e67e22', marginRight: '10px' }}>
                              {key}: {val}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Start Button */}
                      {status === 'available' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartUpgrade(upgradeId);
                          }}
                          style={{
                            backgroundColor: '#27ae60',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '8px 20px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 'bold',
                          }}
                        >
                          Start Upgrade
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Victory Progress */}
        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #333' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#999' }}>Victory Progress</h3>
          <VictoryConditions />
        </div>
      </div>
    </div>
  );
};

const VictoryConditions = () => {
  const getVictoryConditions = useProgressionSystem((s) => s.getVictoryConditions);
  const getOverallProgress = useProgressionSystem((s) => s.getOverallProgress);

  const conditions = getVictoryConditions();
  const overall = getOverallProgress();

  return (
    <div>
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#ccc', marginBottom: '4px' }}>
          <span>Overall Progress</span>
          <span>{overall}%</span>
        </div>
        <div style={{ height: '4px', backgroundColor: '#333', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${overall}%`, backgroundColor: '#9b59b6', borderRadius: '2px' }} />
        </div>
      </div>
      {conditions.map((c) => (
        <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0' }}>
          <span style={{ color: c.completed ? '#27ae60' : '#999' }}>
            {c.completed ? '\u2713' : '\u25CB'} {c.description}
          </span>
          <span style={{ color: '#666' }}>{Math.round(c.progress)}%</span>
        </div>
      ))}
    </div>
  );
};

export default TownUpgradesPanel;
