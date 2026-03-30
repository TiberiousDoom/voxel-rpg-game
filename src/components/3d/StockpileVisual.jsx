/**
 * StockpileVisual — Renders small colored crate meshes on stockpile zones
 * to represent stored items. Uses merged geometry per zone for performance.
 */

import React, { useMemo } from 'react';
import * as THREE from 'three';
import useGameStore from '../../stores/useGameStore';
import { VOXEL_SIZE, CHUNK_SIZE_Y, worldToChunk } from '../../systems/chunks/coordinates';
import { isSolid } from '../../systems/chunks/blockTypes';

const MATERIAL_COLORS = {
  wood: '#8B4513', stone: '#808080', iron: '#C0C0C0', coal: '#333333',
  dirt: '#654321', sand: '#F4A460', clay: '#CC7744', gold_ore: '#FFD700',
  leather: '#8B6914', crystal: '#88CCFF', berry: '#CC2244', meat: '#E8967A',
  bone: '#F5F5DC', fiber: '#98FB98',
};

const BOX_SIZE = 0.6;
const BOX_HALF = BOX_SIZE / 2;
const MAX_VISUAL_BOXES = 40;

// Shared box geometry
const boxGeo = new THREE.BoxGeometry(BOX_SIZE, BOX_SIZE, BOX_SIZE);

function getTerrainY(chunkManager, wx, wz) {
  if (!chunkManager) return 2;
  const { chunkX, chunkZ } = worldToChunk(wx, wz);
  const chunk = chunkManager.getChunk(chunkX, chunkZ);
  if (!chunk) return 2;
  for (let vy = CHUNK_SIZE_Y - 1; vy >= 0; vy--) {
    const worldY = vy * VOXEL_SIZE + VOXEL_SIZE / 2;
    const block = chunkManager.getBlock(wx, worldY, wz);
    if (isSolid(block)) {
      return (vy + 1) * VOXEL_SIZE;
    }
  }
  return 2;
}

function StockpileZoneVisual({ zone, chunkManager }) {
  const { bounds, storage } = zone;
  const storageItems = storage?.items;

  // Build a stable key from items for memoization
  const itemsKey = useMemo(() => {
    if (!storageItems) return '[]';
    const entries = Object.entries(storageItems).filter(([, v]) => v > 0).sort();
    return JSON.stringify(entries);
  }, [storageItems]);

  const meshData = useMemo(() => {
    if (!storageItems) return null;
    const entries = Object.entries(storageItems).filter(([, v]) => v > 0);
    if (entries.length === 0) return null;

    // Calculate total items and proportional box counts
    const totalItems = entries.reduce((sum, [, v]) => sum + v, 0);
    if (totalItems === 0) return null;

    // Determine grid positions within bounds
    const { minX, minZ, maxX, maxZ } = bounds;
    const zoneW = maxX - minX;
    const zoneD = maxZ - minZ;
    const cols = Math.max(1, Math.floor(zoneW / (BOX_SIZE + 0.2)));
    const rows = Math.max(1, Math.floor(zoneD / (BOX_SIZE + 0.2)));
    const maxSlots = Math.min(cols * rows, MAX_VISUAL_BOXES);

    // Assign boxes proportionally to materials
    const boxAssignments = [];
    let slotsUsed = 0;
    for (const [mat, qty] of entries) {
      const count = Math.max(1, Math.round((qty / totalItems) * maxSlots));
      for (let i = 0; i < count && slotsUsed < maxSlots; i++) {
        boxAssignments.push(mat);
        slotsUsed++;
      }
    }

    // Build position + color arrays
    const positions = [];
    const colors = [];
    const stepX = zoneW / cols;
    const stepZ = zoneD / rows;

    for (let i = 0; i < boxAssignments.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols) % rows;
      const wx = minX + stepX * (col + 0.5);
      const wz = minZ + stepZ * (row + 0.5);
      const terrainY = getTerrainY(chunkManager, wx, wz);

      positions.push([wx, terrainY + BOX_HALF, wz]);
      const hex = MATERIAL_COLORS[boxAssignments[i]] || '#888888';
      const c = new THREE.Color(hex);
      colors.push([c.r, c.g, c.b]);
    }

    return { positions, colors };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsKey, bounds.minX, bounds.minZ, bounds.maxX, bounds.maxZ, chunkManager]);

  if (!meshData) return null;

  return (
    <>
      {meshData.positions.map((pos, i) => (
        <mesh key={i} geometry={boxGeo} position={pos}>
          <meshStandardMaterial color={new THREE.Color(...meshData.colors[i])} />
        </mesh>
      ))}
    </>
  );
}

export default function StockpileVisual({ chunkManager }) {
  const zones = useGameStore((s) => s.zones);

  const stockpileZones = useMemo(() =>
    zones.filter(z => z.type === 'STOCKPILE' && z.storage),
    [zones]
  );

  if (stockpileZones.length === 0 || !chunkManager) return null;

  return (
    <>
      {stockpileZones.map(zone => (
        <StockpileZoneVisual key={zone.id} zone={zone} chunkManager={chunkManager} />
      ))}
    </>
  );
}
