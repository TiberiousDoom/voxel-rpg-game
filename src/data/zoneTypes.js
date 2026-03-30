export const ZoneType = {
  MINING: 'MINING',
  STOCKPILE: 'STOCKPILE',
  FARMING: 'FARMING',
  BUILDING: 'BUILDING',
  RESTRICTED: 'RESTRICTED',
};

export const ZONE_COLORS = {
  MINING:     { fill: '#ff8c00', border: '#ff6600', opacity: 0.25 },
  STOCKPILE:  { fill: '#4488ff', border: '#2266dd', opacity: 0.25 },
  FARMING:    { fill: '#44cc44', border: '#228822', opacity: 0.25 },
  BUILDING:   { fill: '#cc8833', border: '#aa6622', opacity: 0.25 },
  RESTRICTED: { fill: '#cc3333', border: '#aa2222', opacity: 0.25 },
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
    // Stockpile storage (initialized for STOCKPILE zones, null otherwise)
    storage: type === 'STOCKPILE' ? { items: {}, capacity: 0, usedCapacity: 0 } : null,
  };
}
