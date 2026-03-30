/**
 * ConstructionTick — Invisible useFrame component that auto-places blocks
 * for construction sites in BUILDING status.
 *
 * Pattern: same as SurvivalTick, SettlementTick (accumulator-based tick).
 */

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import useGameStore from '../../stores/useGameStore';
import { getBuildingById, parseLayers } from '../../data/buildings';
import { VOXEL_SIZE } from '../../systems/chunks/coordinates';
import { CONSTRUCTION_BLOCK_INTERVAL } from '../../data/tuning';
import { siteHasNPCBuilder } from '../../systems/settlement/TaskAssignmentEngine';

export default function ConstructionTick({ chunkManager }) {
  const accumRef = useRef(0);

  useFrame((_, delta) => {
    if (!chunkManager) return;

    const store = useGameStore.getState();
    if (store.worldTime.paused) return;

    accumRef.current += delta;
    if (accumRef.current < CONSTRUCTION_BLOCK_INTERVAL) return;
    accumRef.current -= CONSTRUCTION_BLOCK_INTERVAL;

    // Process each BUILDING site (one block per site per tick)
    // Skip sites being built by NPCs to prevent double block-placement
    for (const site of store.constructionSites) {
      if (site.status !== 'BUILDING') continue;
      if (siteHasNPCBuilder(site.id)) continue;

      const building = getBuildingById(site.buildingId);
      if (!building) continue;

      const blocks = parseLayers(building);
      const nextIndex = site.blocksPlaced;
      if (nextIndex >= blocks.length) continue;

      const block = blocks[nextIndex];
      const wx = site.position[0] + block.x * VOXEL_SIZE + VOXEL_SIZE / 2;
      const wy = site.position[1] + block.y * VOXEL_SIZE + VOXEL_SIZE / 2;
      const wz = site.position[2] + block.z * VOXEL_SIZE + VOXEL_SIZE / 2;

      chunkManager.setBlock(wx, wy, wz, block.blockType);
      store.advanceConstruction(site.id);

      // Check if this was the last block
      if (nextIndex + 1 >= blocks.length) {
        store.addPickupText('Building complete!', '#44ff44');
      }
    }
  });

  return null;
}
