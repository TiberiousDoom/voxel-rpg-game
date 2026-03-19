export const ZoneType = { MINING: 'MINING', STOCKPILE: 'STOCKPILE' };

export const ZONE_COLORS = {
  MINING:    { fill: '#ff8c00', border: '#ff6600', opacity: 0.25 },
  STOCKPILE: { fill: '#4488ff', border: '#2266dd', opacity: 0.25 },
};

let _zoneIdCounter = 0;
export function createZone({ type, minX, minZ, maxX, maxZ }) {
  return {
    id: `zone_${++_zoneIdCounter}_${Date.now()}`,
    type,
    bounds: { minX, minZ, maxX, maxZ },  // World coords, snapped to VOXEL_SIZE grid
    active: true,
    createdAt: Date.now(),
    miningTasks: null,  // Populated for MINING zones
  };
}
