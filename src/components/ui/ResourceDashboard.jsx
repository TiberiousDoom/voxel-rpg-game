/**
 * ResourceDashboard.jsx
 * Detailed resource production and consumption overview
 */

import React, { useState, useEffect } from 'react';
import useGameStore from '../../stores/useGameStore';

const RESOURCE_COLORS = {
  FOOD: '#27ae60',
  WOOD: '#8B4513',
  STONE: '#95a5a6',
  GOLD: '#f1c40f',
  ESSENCE: '#9b59b6',
  CRYSTAL: '#3498db',
};

const RESOURCE_ICONS = {
  FOOD: '\uD83C\uDF3E',
  WOOD: '\uD83E\uDEB5',
  STONE: '\uD83E\uDEA8',
  GOLD: '\uD83D\uDCB0',
  ESSENCE: '\uD83D\uDD2E',
  CRYSTAL: '\uD83D\uDC8E',
};

const ResourceDashboard = ({ isOpen, onClose }) => {
  const [, setTick] = useState(0);
  const settlement = useGameStore((s) => s.settlement);

  // Refresh every 2 seconds
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => setTick((t) => t + 1), 2000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const resources = settlement?.resources || {};
  const buildings = settlement?.buildings ? Object.values(settlement.buildings) : [];
  const npcs = settlement?.npcs ? Object.values(settlement.npcs) : [];

  // Calculate production and consumption estimates
  const getResourceStats = (resourceType) => {
    const stored = resources[resourceType] || 0;

    // Estimate production from buildings
    let production = 0;
    for (const building of buildings) {
      if (building.status !== 'COMPLETE') continue;
      if (building.type === 'FARM' && resourceType === 'FOOD') production += 2;
      if (building.type === 'CRAFTING_STATION' && resourceType === 'GOLD') production += 1;
      if (building.type === 'MARKETPLACE' && resourceType === 'GOLD') production += 3;
    }

    // Estimate consumption
    let consumption = 0;
    if (resourceType === 'FOOD') {
      consumption = npcs.length * 0.5; // Each NPC consumes ~0.5 food/tick
    }

    const net = production - consumption;
    const ticksUntilEmpty = net < 0 && stored > 0 ? Math.floor(stored / Math.abs(net)) : null;
    const ticksUntilFull = net > 0 ? 'Growing' : null;

    return { stored, production, consumption, net, ticksUntilEmpty, ticksUntilFull };
  };

  const resourceTypes = ['FOOD', 'WOOD', 'STONE', 'GOLD', 'ESSENCE', 'CRYSTAL'];

  return (
    <div
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
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
          maxWidth: '600px',
          width: '90%',
          border: '2px solid #333',
          color: '#eee',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '18px' }}>Resource Dashboard</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#999', fontSize: '20px', cursor: 'pointer' }}>x</button>
        </div>

        {/* Summary */}
        <div style={{ marginBottom: '16px', padding: '10px', backgroundColor: '#16213e', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
            <span style={{ color: '#999' }}>Buildings: <span style={{ color: '#fff' }}>{buildings.length}</span></span>
            <span style={{ color: '#999' }}>Population: <span style={{ color: '#fff' }}>{npcs.length}</span></span>
          </div>
        </div>

        {/* Resource Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #333' }}>
              <th style={{ textAlign: 'left', padding: '8px', color: '#999' }}>Resource</th>
              <th style={{ textAlign: 'right', padding: '8px', color: '#999' }}>Stored</th>
              <th style={{ textAlign: 'right', padding: '8px', color: '#27ae60' }}>Income</th>
              <th style={{ textAlign: 'right', padding: '8px', color: '#e74c3c' }}>Expense</th>
              <th style={{ textAlign: 'right', padding: '8px', color: '#999' }}>Net</th>
              <th style={{ textAlign: 'right', padding: '8px', color: '#999' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {resourceTypes.map((type) => {
              const stats = getResourceStats(type);
              const netColor = stats.net > 0 ? '#27ae60' : stats.net < 0 ? '#e74c3c' : '#999';

              return (
                <tr key={type} style={{ borderBottom: '1px solid #222' }}>
                  <td style={{ padding: '8px' }}>
                    <span style={{ marginRight: '6px' }}>{RESOURCE_ICONS[type]}</span>
                    <span style={{ color: RESOURCE_COLORS[type] }}>{type}</span>
                  </td>
                  <td style={{ textAlign: 'right', padding: '8px', color: '#fff', fontWeight: 'bold' }}>
                    {Math.floor(stats.stored)}
                  </td>
                  <td style={{ textAlign: 'right', padding: '8px', color: '#27ae60' }}>
                    +{stats.production.toFixed(1)}/t
                  </td>
                  <td style={{ textAlign: 'right', padding: '8px', color: stats.consumption > 0 ? '#e74c3c' : '#666' }}>
                    {stats.consumption > 0 ? `-${stats.consumption.toFixed(1)}/t` : '-'}
                  </td>
                  <td style={{ textAlign: 'right', padding: '8px', color: netColor, fontWeight: 'bold' }}>
                    {stats.net > 0 ? '+' : ''}{stats.net.toFixed(1)}/t
                  </td>
                  <td style={{ textAlign: 'right', padding: '8px', fontSize: '11px' }}>
                    {stats.ticksUntilEmpty ? (
                      <span style={{ color: '#e74c3c' }}>Empty in ~{stats.ticksUntilEmpty}t</span>
                    ) : stats.net > 0 ? (
                      <span style={{ color: '#27ae60' }}>Growing</span>
                    ) : (
                      <span style={{ color: '#666' }}>Stable</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div style={{ marginTop: '12px', fontSize: '11px', color: '#666', textAlign: 'center' }}>
          Press <kbd style={{ padding: '2px 6px', backgroundColor: '#333', borderRadius: '3px', color: '#ccc' }}>R</kbd> to toggle | Values are estimates per game tick
        </div>
      </div>
    </div>
  );
};

export default ResourceDashboard;
