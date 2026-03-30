/**
 * StockpilePanel — Deposit/withdraw UI for stockpile zones.
 * Renders as an HTML overlay when activeStockpileZoneId is set.
 */

import React, { useCallback, useEffect } from 'react';
import useGameStore from '../../stores/useGameStore';

// Ordered list of materials to display
const MATERIAL_ORDER = [
  'wood', 'stone', 'iron', 'coal', 'dirt', 'sand', 'clay',
  'gold_ore', 'leather', 'crystal', 'berry', 'meat', 'bone', 'fiber',
];

const MATERIAL_COLORS = {
  wood: '#8B4513', stone: '#808080', iron: '#C0C0C0', coal: '#333333',
  dirt: '#654321', sand: '#F4A460', clay: '#CC7744', gold_ore: '#FFD700',
  leather: '#8B6914', crystal: '#88CCFF', berry: '#CC2244', meat: '#E8967A',
  bone: '#F5F5DC', fiber: '#98FB98',
};

function MaterialRow({ material, stockpileQty, playerQty, zoneId }) {
  const deposit = useGameStore((s) => s.depositToStockpile);
  const withdraw = useGameStore((s) => s.withdrawFromStockpile);

  const btnStyle = (enabled) => ({
    padding: '4px 8px',
    minWidth: 36,
    background: enabled ? '#444' : '#2a2a2a',
    color: enabled ? '#fff' : '#666',
    border: '1px solid #555',
    borderRadius: 3,
    cursor: enabled ? 'pointer' : 'default',
    fontFamily: 'monospace',
    fontSize: 13,
    touchAction: 'manipulation',
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', borderBottom: '1px solid #333' }}>
      <div style={{
        width: 14, height: 14, borderRadius: 2,
        background: MATERIAL_COLORS[material] || '#888',
        flexShrink: 0,
      }} />
      <div style={{ width: 70, fontWeight: 'bold', textTransform: 'capitalize', fontSize: 13 }}>
        {material.replace('_', ' ')}
      </div>
      <div style={{ width: 45, textAlign: 'right', color: '#aaa', fontSize: 12 }}>
        inv:{playerQty}
      </div>

      {/* Deposit buttons */}
      <button style={btnStyle(playerQty >= 1)} onClick={() => deposit(zoneId, material, 1)} disabled={playerQty < 1}>+1</button>
      <button style={btnStyle(playerQty >= 10)} onClick={() => deposit(zoneId, material, 10)} disabled={playerQty < 10}>+10</button>
      <button style={btnStyle(playerQty >= 1)} onClick={() => deposit(zoneId, material, playerQty)} disabled={playerQty < 1}>All&rarr;</button>

      <div style={{ width: 45, textAlign: 'center', color: '#4488ff', fontWeight: 'bold', fontSize: 13 }}>
        {stockpileQty}
      </div>

      {/* Withdraw buttons */}
      <button style={btnStyle(stockpileQty >= 1)} onClick={() => withdraw(zoneId, material, stockpileQty)} disabled={stockpileQty < 1}>&larr;All</button>
      <button style={btnStyle(stockpileQty >= 10)} onClick={() => withdraw(zoneId, material, 10)} disabled={stockpileQty < 10}>-10</button>
      <button style={btnStyle(stockpileQty >= 1)} onClick={() => withdraw(zoneId, material, 1)} disabled={stockpileQty < 1}>-1</button>
    </div>
  );
}

export default function StockpilePanel() {
  const activeZoneId = useGameStore((s) => s.activeStockpileZoneId);
  const zones = useGameStore((s) => s.zones);
  const materials = useGameStore((s) => s.inventory?.materials);
  const closePanel = useGameStore((s) => s.closeStockpilePanel);
  const depositToStockpile = useGameStore((s) => s.depositToStockpile);
  const withdrawFromStockpile = useGameStore((s) => s.withdrawFromStockpile);

  const zone = activeZoneId ? zones.find(z => z.id === activeZoneId) : null;
  const storage = zone?.storage;
  const items = storage?.items || {};
  const capacity = storage?.capacity || 0;
  const usedCapacity = storage?.usedCapacity || 0;

  // Close on Escape key
  useEffect(() => {
    if (!activeZoneId) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closePanel();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [activeZoneId, closePanel]);

  // Deposit all
  const handleDepositAll = useCallback(() => {
    if (!materials || !activeZoneId) return;
    for (const mat of MATERIAL_ORDER) {
      const qty = materials[mat] || 0;
      if (qty > 0) depositToStockpile(activeZoneId, mat, qty);
    }
  }, [activeZoneId, materials, depositToStockpile]);

  // Withdraw all
  const handleWithdrawAll = useCallback(() => {
    if (!activeZoneId) return;
    for (const mat of MATERIAL_ORDER) {
      const qty = items[mat] || 0;
      if (qty > 0) withdrawFromStockpile(activeZoneId, mat, qty);
    }
  }, [activeZoneId, items, withdrawFromStockpile]);

  if (!activeZoneId || !storage) return null;

  const fillPct = capacity > 0 ? Math.min(1, usedCapacity / capacity) : 0;

  // Build visible materials list — only show where either player or stockpile has >0
  const visibleMaterials = MATERIAL_ORDER.filter(mat =>
    (items[mat] || 0) > 0 || (materials?.[mat] || 0) > 0
  );

  return (
    <div
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          background: 'rgba(10, 10, 20, 0.92)',
          border: '2px solid #4488ff',
          borderRadius: 8,
          padding: 16,
          minWidth: 420,
          maxWidth: 520,
          maxHeight: '80vh',
          color: '#eee',
          fontFamily: 'monospace',
          pointerEvents: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 18, fontWeight: 'bold', color: '#4488ff' }}>Stockpile</span>
          <button
            onClick={closePanel}
            style={{
              background: '#333', color: '#fff', border: '1px solid #555',
              borderRadius: 4, padding: '4px 10px', cursor: 'pointer',
              fontFamily: 'monospace', fontSize: 14,
            }}
          >
            X
          </button>
        </div>

        {/* Capacity bar */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 12, color: '#aaa', marginBottom: 3 }}>
            Capacity: {usedCapacity} / {capacity}
          </div>
          <div style={{ width: '100%', height: 8, background: '#222', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              width: `${fillPct * 100}%`,
              height: '100%',
              background: fillPct > 0.9 ? '#ff4444' : fillPct > 0.7 ? '#ffaa00' : '#4488ff',
              borderRadius: 4,
              transition: 'width 0.2s',
            }} />
          </div>
        </div>

        {/* Bulk actions */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <button
            onClick={handleDepositAll}
            style={{
              flex: 1, padding: '6px 0', background: '#2a4a2a', color: '#88ff88',
              border: '1px solid #4a6a4a', borderRadius: 4, cursor: 'pointer',
              fontFamily: 'monospace', fontSize: 13, touchAction: 'manipulation',
            }}
          >
            Deposit All
          </button>
          <button
            onClick={handleWithdrawAll}
            style={{
              flex: 1, padding: '6px 0', background: '#4a2a2a', color: '#ff8888',
              border: '1px solid #6a4a4a', borderRadius: 4, cursor: 'pointer',
              fontFamily: 'monospace', fontSize: 13, touchAction: 'manipulation',
            }}
          >
            Withdraw All
          </button>
        </div>

        {/* Material list */}
        <div style={{ overflowY: 'auto', maxHeight: '50vh' }}>
          {visibleMaterials.length === 0 ? (
            <div style={{ color: '#666', textAlign: 'center', padding: 20 }}>
              No materials to show. Gather resources first!
            </div>
          ) : (
            visibleMaterials.map(mat => (
              <MaterialRow
                key={mat}
                material={mat}
                stockpileQty={items[mat] || 0}
                playerQty={materials?.[mat] || 0}
                zoneId={activeZoneId}
              />
            ))
          )}
        </div>

        {/* Footer hint */}
        <div style={{ marginTop: 8, fontSize: 11, color: '#666', textAlign: 'center' }}>
          Press E or Escape to close
        </div>
      </div>
    </div>
  );
}
