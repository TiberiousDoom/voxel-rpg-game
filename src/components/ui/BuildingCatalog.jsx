/**
 * BuildingCatalog — B key panel for browsing and selecting buildings to place.
 */

import React, { useEffect } from 'react';
import useGameStore from '../../stores/useGameStore';
import { BUILDINGS } from '../../data/buildings';

const MATERIAL_COLORS = {
  wood: '#8B4513', stone: '#808080', iron: '#C0C0C0', coal: '#333333',
};

function BuildingCard({ building }) {
  const materials = useGameStore((s) => s.inventory?.materials);
  const startPlacing = useGameStore((s) => s.startPlacingBuilding);

  const canAfford = Object.entries(building.cost).every(
    ([mat, qty]) => (materials?.[mat] || 0) >= qty
  );

  return (
    <div style={{
      background: 'rgba(30, 30, 50, 0.9)',
      border: '1px solid #555',
      borderRadius: 6,
      padding: 10,
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
    }}>
      <div style={{ fontWeight: 'bold', fontSize: 14, color: '#fff' }}>{building.name}</div>
      <div style={{ fontSize: 11, color: '#aaa', lineHeight: 1.3 }}>{building.description}</div>

      {/* Cost */}
      <div style={{ fontSize: 11, color: '#ccc' }}>
        <span style={{ color: '#888' }}>Cost: </span>
        {Object.entries(building.cost).map(([mat, qty]) => {
          const have = materials?.[mat] || 0;
          const enough = have >= qty;
          return (
            <span key={mat} style={{ marginRight: 8 }}>
              <span style={{
                display: 'inline-block', width: 8, height: 8, borderRadius: 2,
                background: MATERIAL_COLORS[mat] || '#888',
                marginRight: 3, verticalAlign: 'middle',
              }} />
              <span style={{ color: enough ? '#88ff88' : '#ff6666' }}>
                {have}/{qty}
              </span>
              <span style={{ color: '#888' }}> {mat}</span>
            </span>
          );
        })}
      </div>

      {/* Effects */}
      <div style={{ fontSize: 11, color: '#88aaff' }}>
        {building.effects.housing > 0 && <span style={{ marginRight: 8 }}>+{building.effects.housing} housing</span>}
        {building.effects.attractiveness > 0 && <span>+{building.effects.attractiveness} attractiveness</span>}
      </div>

      {/* Size */}
      <div style={{ fontSize: 10, color: '#666' }}>
        Size: {building.size.width}x{building.size.depth}x{building.size.height}
      </div>

      <button
        onClick={() => startPlacing(building.id)}
        disabled={!canAfford}
        style={{
          padding: '6px 0',
          background: canAfford ? '#2a5a2a' : '#2a2a2a',
          color: canAfford ? '#88ff88' : '#666',
          border: `1px solid ${canAfford ? '#4a8a4a' : '#444'}`,
          borderRadius: 4,
          cursor: canAfford ? 'pointer' : 'default',
          fontFamily: 'monospace',
          fontSize: 13,
          fontWeight: 'bold',
          touchAction: 'manipulation',
        }}
      >
        {canAfford ? 'Place' : 'Not enough materials'}
      </button>
    </div>
  );
}

export default function BuildingCatalog() {
  const isOpen = useGameStore((s) => s.activeBuildingCatalog);
  const toggleCatalog = useGameStore((s) => s.toggleBuildingCatalog);
  const closeCatalog = useGameStore((s) => s.closeBuildingCatalog);

  // Toggle on B key, close on Escape
  useEffect(() => {
    const handleKey = (e) => {
      if (e.code === 'KeyB') {
        const tag = e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        toggleCatalog();
      }
      if (e.key === 'Escape' && isOpen) {
        closeCatalog();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, toggleCatalog, closeCatalog]);

  if (!isOpen) return null;

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
          minWidth: 380,
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 18, fontWeight: 'bold', color: '#4488ff' }}>Buildings</span>
          <button
            onClick={closeCatalog}
            style={{
              background: '#333', color: '#fff', border: '1px solid #555',
              borderRadius: 4, padding: '4px 10px', cursor: 'pointer',
              fontFamily: 'monospace', fontSize: 14,
            }}
          >
            X
          </button>
        </div>

        {/* Building grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 8,
          overflowY: 'auto',
          maxHeight: '60vh',
        }}>
          {BUILDINGS.map(b => (
            <BuildingCard key={b.id} building={b} />
          ))}
        </div>

        {/* Footer */}
        <div style={{ marginTop: 8, fontSize: 11, color: '#666', textAlign: 'center' }}>
          Press B or Escape to close
        </div>
      </div>
    </div>
  );
}
