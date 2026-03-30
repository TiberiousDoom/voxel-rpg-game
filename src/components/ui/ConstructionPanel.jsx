/**
 * ConstructionPanel — E key panel for delivering materials to a construction site.
 */

import React, { useCallback, useEffect } from 'react';
import useGameStore from '../../stores/useGameStore';
import { getBuildingById } from '../../data/buildings';

const MATERIAL_COLORS = {
  wood: '#8B4513', stone: '#808080', iron: '#C0C0C0', coal: '#333333',
};

const STATUS_COLORS = {
  PLACED: '#ffaa00',
  BUILDING: '#44aaff',
  COMPLETE: '#44ff44',
};

function MaterialDeliveryRow({ material, required, delivered, playerQty, siteId }) {
  const deliverToConstruction = useGameStore((s) => s.deliverToConstruction);
  const remaining = required - delivered;

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

  const canDeliver = remaining > 0 && playerQty > 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0', borderBottom: '1px solid #333' }}>
      <div style={{
        width: 14, height: 14, borderRadius: 2,
        background: MATERIAL_COLORS[material] || '#888',
        flexShrink: 0,
      }} />
      <div style={{ width: 60, fontWeight: 'bold', textTransform: 'capitalize', fontSize: 13 }}>
        {material}
      </div>
      <div style={{ width: 65, textAlign: 'right', fontSize: 12, color: delivered >= required ? '#44ff44' : '#ffaa00' }}>
        {delivered}/{required}
      </div>
      <div style={{ width: 45, textAlign: 'right', color: '#aaa', fontSize: 12 }}>
        inv:{playerQty}
      </div>

      <button style={btnStyle(canDeliver)} onClick={() => deliverToConstruction(siteId, material, 1)} disabled={!canDeliver}>+1</button>
      <button style={btnStyle(canDeliver && playerQty >= 10)} onClick={() => deliverToConstruction(siteId, material, 10)} disabled={!canDeliver || playerQty < 10}>+10</button>
      <button style={btnStyle(canDeliver)} onClick={() => deliverToConstruction(siteId, material, remaining)} disabled={!canDeliver}>All&rarr;</button>
    </div>
  );
}

export default function ConstructionPanel() {
  const activeSiteId = useGameStore((s) => s.activeConstructionSiteId);
  const constructionSites = useGameStore((s) => s.constructionSites);
  const materials = useGameStore((s) => s.inventory?.materials);
  const closePanel = useGameStore((s) => s.closeConstructionPanel);
  const deliverToConstruction = useGameStore((s) => s.deliverToConstruction);
  const removeConstructionSite = useGameStore((s) => s.removeConstructionSite);
  const addPickupText = useGameStore((s) => s.addPickupText);

  const site = activeSiteId ? constructionSites.find(s => s.id === activeSiteId) : null;
  const building = site ? getBuildingById(site.buildingId) : null;

  // Close on Escape key
  useEffect(() => {
    if (!activeSiteId) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closePanel();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [activeSiteId, closePanel]);

  // Auto-close and notify when status transitions to BUILDING
  useEffect(() => {
    if (site?.status === 'BUILDING' && activeSiteId) {
      addPickupText('Construction started!', '#44aaff');
      closePanel();
    }
  }, [site?.status, activeSiteId, addPickupText, closePanel]);

  // Deliver all materials at once
  const handleDeliverAll = useCallback(() => {
    if (!site || !materials || !activeSiteId) return;
    for (const [mat, required] of Object.entries(site.materialsRequired)) {
      const delivered = site.materialsDelivered[mat] || 0;
      const remaining = required - delivered;
      const available = materials[mat] || 0;
      if (remaining > 0 && available > 0) {
        deliverToConstruction(activeSiteId, mat, Math.min(remaining, available));
      }
    }
  }, [activeSiteId, site, materials, deliverToConstruction]);

  // Cancel construction
  const handleCancel = useCallback(() => {
    if (!activeSiteId) return;
    removeConstructionSite(activeSiteId);
    addPickupText('Construction canceled — materials returned', '#ffaa00');
  }, [activeSiteId, removeConstructionSite, addPickupText]);

  if (!activeSiteId || !site || !building) return null;

  // Calculate overall delivery progress
  let totalRequired = 0;
  let totalDelivered = 0;
  for (const [mat, req] of Object.entries(site.materialsRequired)) {
    totalRequired += req;
    totalDelivered += Math.min(site.materialsDelivered[mat] || 0, req);
  }
  const deliveryPct = totalRequired > 0 ? totalDelivered / totalRequired : 0;

  // Block progress for BUILDING status
  const blockPct = site.totalBlocks > 0 ? site.blocksPlaced / site.totalBlocks : 0;

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
          maxWidth: 480,
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
          <div>
            <span style={{ fontSize: 16, fontWeight: 'bold', color: '#4488ff' }}>{building.name}</span>
            <span style={{
              marginLeft: 8,
              fontSize: 11,
              padding: '2px 6px',
              borderRadius: 3,
              background: STATUS_COLORS[site.status] || '#555',
              color: '#000',
              fontWeight: 'bold',
            }}>
              {site.status}
            </span>
          </div>
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

        {/* Progress bar */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 12, color: '#aaa', marginBottom: 3 }}>
            {site.status === 'PLACED' ? `Materials: ${totalDelivered}/${totalRequired}` :
             site.status === 'BUILDING' ? `Blocks: ${site.blocksPlaced}/${site.totalBlocks}` :
             'Complete!'}
          </div>
          <div style={{ width: '100%', height: 8, background: '#222', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              width: `${(site.status === 'BUILDING' ? blockPct : deliveryPct) * 100}%`,
              height: '100%',
              background: site.status === 'COMPLETE' ? '#44ff44' : site.status === 'BUILDING' ? '#44aaff' : '#ffaa00',
              borderRadius: 4,
              transition: 'width 0.2s',
            }} />
          </div>
        </div>

        {/* Material delivery (only for PLACED status) */}
        {site.status === 'PLACED' && (
          <>
            <div style={{ overflowY: 'auto', maxHeight: '40vh' }}>
              {Object.entries(site.materialsRequired).map(([mat, req]) => (
                <MaterialDeliveryRow
                  key={mat}
                  material={mat}
                  required={req}
                  delivered={site.materialsDelivered[mat] || 0}
                  playerQty={materials?.[mat] || 0}
                  siteId={activeSiteId}
                />
              ))}
            </div>

            {/* Bulk deliver */}
            <button
              onClick={handleDeliverAll}
              style={{
                marginTop: 8, padding: '6px 0', background: '#2a4a2a', color: '#88ff88',
                border: '1px solid #4a6a4a', borderRadius: 4, cursor: 'pointer',
                fontFamily: 'monospace', fontSize: 13, touchAction: 'manipulation',
              }}
            >
              Deliver All
            </button>
          </>
        )}

        {site.status === 'BUILDING' && (
          <div style={{ textAlign: 'center', padding: 10, color: '#44aaff', fontSize: 13 }}>
            Construction in progress... ({site.blocksPlaced}/{site.totalBlocks} blocks)
          </div>
        )}

        {site.status === 'COMPLETE' && (
          <div style={{ textAlign: 'center', padding: 10, color: '#44ff44', fontSize: 13 }}>
            Building complete!
          </div>
        )}

        {/* Cancel button (only for non-complete sites) */}
        {site.status !== 'COMPLETE' && (
          <button
            onClick={handleCancel}
            style={{
              marginTop: 8, padding: '6px 0', background: '#4a2a2a', color: '#ff8888',
              border: '1px solid #6a4a4a', borderRadius: 4, cursor: 'pointer',
              fontFamily: 'monospace', fontSize: 13, touchAction: 'manipulation',
            }}
          >
            Cancel Construction
          </button>
        )}

        {/* Footer */}
        <div style={{ marginTop: 8, fontSize: 11, color: '#666', textAlign: 'center' }}>
          Press E or Escape to close
        </div>
      </div>
    </div>
  );
}
