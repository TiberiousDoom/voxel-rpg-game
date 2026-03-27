/**
 * BlockInteraction - Handles block selection, mining, and placement
 *
 * Desktop (first-person): Raycasts from camera center, click to mine/place
 * Mobile: Long press (~500ms) on a block to mine/place; short tap moves (via TouchControls)
 */

import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { VOXEL_SIZE } from '../../systems/chunks/coordinates';
import { BlockTypes, isSolid, getBlockHardness } from '../../systems/chunks/blockTypes';
import useGameStore from '../../stores/useGameStore';
import { calculateDrops } from '../../data/blockDrops';
import { BLOCK_USE_ACTIONS } from '../../data/blockUseActions';
import { HARVEST_SPEED_BARE_HANDS, USE_KEY_RANGE, USE_KEY_COOLDOWN } from '../../data/tuning';
import { getSpellById, executeSpell } from '../../data/spells';
import { performMeleeAttack, MELEE_COOLDOWN } from '../../data/meleeAttack';
import { audioManager } from '../../utils/AudioManager';
import { getQuestManager } from '../../systems/QuestManager';
import { isTouchDevice } from '../../utils/deviceDetection';

// Maximum reach distance for block interaction
const REACH_DISTANCE = 12;

// Longer reach for third-person/mobile (camera is ~16+ world units from terrain)
const REACH_DISTANCE_THIRD_PERSON = 50;

// Raycast step size (smaller = more precise, but slower)
// Using 0.25 for better accuracy near block edges and corners
const RAY_STEP = 0.25;

// Long press settings for mobile block interaction
const LONG_PRESS_DURATION = 250; // ms to hold before mining/placing
const LONG_PRESS_MOVE_THRESHOLD = 20; // pixels of movement that cancels long press

// Mining progress geometry (flat bar above the block)
const miningBarBgGeometry = new THREE.PlaneGeometry(VOXEL_SIZE * 1.2, 0.3);
const miningBarBorderGeometry = new THREE.PlaneGeometry(VOXEL_SIZE * 1.2 + 0.08, 0.38);
// Pre-create geometry for highlight (reused across all renders)
const highlightBoxGeometry = new THREE.BoxGeometry(
  VOXEL_SIZE + 0.02,
  VOXEL_SIZE + 0.02,
  VOXEL_SIZE + 0.02
);
const highlightEdgesGeometry = new THREE.EdgesGeometry(highlightBoxGeometry);

// Pre-create geometry for placement preview
const previewBoxGeometry = new THREE.BoxGeometry(VOXEL_SIZE, VOXEL_SIZE, VOXEL_SIZE);

// Block type to color mapping for preview
const BLOCK_COLORS = {
  [BlockTypes.DIRT]: '#8B4513',
  [BlockTypes.GRASS]: '#228B22',
  [BlockTypes.STONE]: '#808080',
  [BlockTypes.WOOD]: '#DEB887',
  [BlockTypes.SAND]: '#F4A460',
  [BlockTypes.WATER]: '#4169E1',
  [BlockTypes.LEAVES]: '#32CD32',
  [BlockTypes.CAMPFIRE]: '#E6661A',
};

/**
 * Check if placing a block at (bx, by, bz) would overlap the player's body.
 * Player capsule: radius 0.6, centered at playerY+1.4, half-height 0.8
 * → AABB from (px±0.6, py+0, pz±0.6) to (px±0.6, py+2.8, pz±0.6)
 * Block AABB: center ± VOXEL_SIZE/2
 */
function wouldOverlapPlayer(bx, by, bz) {
  const pos = useGameStore.getState().player.position;
  const px = pos[0], py = pos[1], pz = pos[2];
  const half = VOXEL_SIZE / 2;

  // Player AABB
  const pMinX = px - 0.6, pMaxX = px + 0.6;
  const pMinY = py,       pMaxY = py + 2.8;
  const pMinZ = pz - 0.6, pMaxZ = pz + 0.6;

  // Block AABB
  const bMinX = bx - half, bMaxX = bx + half;
  const bMinY = by - half, bMaxY = by + half;
  const bMinZ = bz - half, bMaxZ = bz + half;

  return pMinX < bMaxX && pMaxX > bMinX &&
         pMinY < bMaxY && pMaxY > bMinY &&
         pMinZ < bMaxZ && pMaxZ > bMinZ;
}

/**
 * Execute a use-action on a block (harvest berries, pick up campfire, etc.)
 */
function _executeUseAction(action, wx, wy, wz, blockType, chunkManager, store) {
  // Calculate drops
  for (const drop of action.drops) {
    const amount = drop.min === drop.max
      ? drop.min
      : drop.min + Math.floor(Math.random() * (drop.max - drop.min + 1));
    if (amount > 0) {
      store.addMaterial(drop.material, amount);
      store.addPickupText(`+${amount} ${drop.material}`, '#44ff44');
    }
  }

  // Destroy block if specified
  if (action.destroyBlock) {
    chunkManager.setBlock(wx, wy, wz, BlockTypes.AIR);
  }

  return true;
}

/**
 * BlockHighlight - Wireframe cube showing selected block
 */
function BlockHighlight({ position, visible }) {
  if (!visible || !position) return null;

  return (
    <group position={position}>
      <lineSegments geometry={highlightEdgesGeometry}>
        <lineBasicMaterial color="#ffffff" linewidth={2} />
      </lineSegments>
    </group>
  );
}

/**
 * PlacementPreview - Ghost block showing where block will be placed
 */
function PlacementPreview({ position, blockType, isValid }) {
  if (!position) return null;

  const color = BLOCK_COLORS[blockType] || '#888888';

  return (
    <group position={position}>
      {/* Semi-transparent preview block */}
      <mesh geometry={previewBoxGeometry}>
        <meshBasicMaterial
          color={isValid ? color : '#ff0000'}
          transparent
          opacity={isValid ? 0.5 : 0.3}
          depthWrite={false}
        />
      </mesh>
      {/* Wireframe outline */}
      <lineSegments geometry={highlightEdgesGeometry}>
        <lineBasicMaterial color={isValid ? '#00ff00' : '#ff0000'} linewidth={2} />
      </lineSegments>
    </group>
  );
}

/**
 * MiningProgressBar - Shows mining progress above the targeted block
 * Always faces the camera (manual billboard since drei Billboard causes WebGL issues)
 */
function MiningProgressBar({ position, progress }) {
  const groupRef = useRef();
  const { camera } = useThree();

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.lookAt(camera.position);
    }
  });

  if (!position || progress <= 0) return null;

  const barWidth = VOXEL_SIZE * 1.2 * Math.min(1, progress);

  return (
    <group ref={groupRef} position={[position[0], position[1] + VOXEL_SIZE * 0.8, position[2]]}>
      {/* Black border frame */}
      <mesh geometry={miningBarBorderGeometry} position={[0, 0, -0.01]}>
        <meshBasicMaterial color="#000000" side={THREE.DoubleSide} depthTest={false} />
      </mesh>
      {/* Background */}
      <mesh geometry={miningBarBgGeometry}>
        <meshBasicMaterial color="#333333" transparent opacity={0.85} side={THREE.DoubleSide} depthTest={false} />
      </mesh>
      {/* Fill */}
      <mesh
        position={[-(VOXEL_SIZE * 1.2 - barWidth) / 2, 0, 0.01]}
        scale={[barWidth, 1, 1]}
      >
        <planeGeometry args={[1, 0.25]} />
        <meshBasicMaterial
          color={progress > 0.75 ? '#ff4444' : progress > 0.5 ? '#ffaa00' : '#44ff44'}
          side={THREE.DoubleSide}
          depthTest={false}
        />
      </mesh>
    </group>
  );
}

/**
 * Main BlockInteraction component
 */
export function BlockInteraction({ chunkManager }) {
  const { camera, gl, size, scene } = useThree();
  const [targetBlock, setTargetBlock] = useState(null);
  const [targetFace, setTargetFace] = useState(null);
  const [previewPosition, setPreviewPosition] = useState(null);
  const [previewValid, setPreviewValid] = useState(true);
  const [miningProgress, setMiningProgress] = useState(0);
  const lastRaycast = useRef(0);

  // Progressive mining state
  const isHoldingMine = useRef(false);
  const miningAccum = useRef(0);
  const miningBlockKey = useRef(null); // "x,y,z" of block being mined

  // Track if we're on mobile
  const isMobile = useRef(isTouchDevice());

  // Get selected block type, placement mode, first-person mode, and build mode from store
  const selectedBlockType = useGameStore((state) => state.selectedBlockType ?? BlockTypes.DIRT);
  const firstPerson = useGameStore((state) => state.camera.firstPerson);
  const blockPlacementMode = useGameStore((state) => state.blockPlacementMode);
  const buildMode = useGameStore((state) => state.buildMode);

  // Raycaster for screen-space raycasting (mobile + desktop third-person)
  const raycasterRef = useRef(new THREE.Raycaster());

  // Raycaster for scene intersection (enemy detection in first-person)
  const sceneRaycasterRef = useRef(new THREE.Raycaster());

  // Long press state for mobile
  const longPressTimer = useRef(null);
  const longPressActive = useRef(false);
  const longPressTouchStart = useRef({ x: 0, y: 0 });
  const longPressBlock = useRef(null);
  const longPressFace = useRef(null);

  // Convert world position to block center position for highlight
  const highlightPosition = useMemo(() => {
    if (!targetBlock) return null;

    // Block center = floor to grid + half voxel size
    const x = Math.floor(targetBlock.x / VOXEL_SIZE) * VOXEL_SIZE + VOXEL_SIZE / 2;
    const y = Math.floor(targetBlock.y / VOXEL_SIZE) * VOXEL_SIZE + VOXEL_SIZE / 2;
    const z = Math.floor(targetBlock.z / VOXEL_SIZE) * VOXEL_SIZE + VOXEL_SIZE / 2;

    return [x, y, z];
  }, [targetBlock]);

  // Calculate placement preview position (where block will be placed)
  // Show in placement mode OR in first-person (where right-click always places)
  useEffect(() => {
    const showPreview = blockPlacementMode || firstPerson;
    if (!showPreview || !targetBlock || !targetFace || !chunkManager) {
      setPreviewPosition(null);
      return;
    }

    const blockX = Math.floor(targetBlock.x / VOXEL_SIZE) * VOXEL_SIZE + VOXEL_SIZE / 2;
    const blockY = Math.floor(targetBlock.y / VOXEL_SIZE) * VOXEL_SIZE + VOXEL_SIZE / 2;
    const blockZ = Math.floor(targetBlock.z / VOXEL_SIZE) * VOXEL_SIZE + VOXEL_SIZE / 2;

    let placeX = blockX;
    let placeY = blockY;
    let placeZ = blockZ;

    // Offset based on face
    switch (targetFace) {
      case 'top': placeY += VOXEL_SIZE; break;
      case 'bottom': placeY -= VOXEL_SIZE; break;
      case 'north': placeZ += VOXEL_SIZE; break;
      case 'south': placeZ -= VOXEL_SIZE; break;
      case 'east': placeX += VOXEL_SIZE; break;
      case 'west': placeX -= VOXEL_SIZE; break;
      default:
        setPreviewPosition(null);
        return;
    }

    // Check if placement is valid (position is empty and doesn't overlap player)
    const existingBlock = chunkManager.getBlock(placeX, placeY, placeZ);
    const isValid = !isSolid(existingBlock) && !wouldOverlapPlayer(placeX, placeY, placeZ);

    setPreviewPosition([placeX, placeY, placeZ]);
    setPreviewValid(isValid);
  }, [blockPlacementMode, firstPerson, targetBlock, targetFace, chunkManager]);

  // Reusable vectors for raycast (avoid allocations)
  const rayDirection = useRef(new THREE.Vector3());
  const rayOrigin = useRef(new THREE.Vector3());

  // Core raycast function - steps along a ray to find blocks
  const raycastAlongRay = useCallback((origin, direction, maxDistance = REACH_DISTANCE) => {
    if (!chunkManager) return { block: null, face: null };

    const ox = origin.x;
    const oy = origin.y;
    const oz = origin.z;
    const dir = direction;

    let lastAirX = 0,
      lastAirY = 0,
      lastAirZ = 0;
    let hasLastAir = false;

    // Step along ray
    for (let dist = 0; dist < maxDistance; dist += RAY_STEP) {
      const cx = ox + dir.x * dist;
      const cy = oy + dir.y * dist;
      const cz = oz + dir.z * dist;

      const blockType = chunkManager.getBlock(cx, cy, cz);

      if (isSolid(blockType)) {
        // Found a solid block - determine which face was hit
        let face = null;
        if (hasLastAir) {
          // Compare voxel grid positions (not float positions) to find
          // which face boundary was actually crossed.  Float differences
          // are always proportional to the ray direction and misidentify
          // the face when the ray enters at an oblique angle.
          const solidVX = Math.floor(cx / VOXEL_SIZE);
          const solidVY = Math.floor(cy / VOXEL_SIZE);
          const solidVZ = Math.floor(cz / VOXEL_SIZE);
          const airVX = Math.floor(lastAirX / VOXEL_SIZE);
          const airVY = Math.floor(lastAirY / VOXEL_SIZE);
          const airVZ = Math.floor(lastAirZ / VOXEL_SIZE);

          const dx = solidVX - airVX;
          const dy = solidVY - airVY;
          const dz = solidVZ - airVZ;

          const absDx = Math.abs(dx);
          const absDy = Math.abs(dy);
          const absDz = Math.abs(dz);

          if (absDx > absDy && absDx > absDz) {
            face = dx > 0 ? 'west' : 'east';
          } else if (absDy > absDx && absDy > absDz) {
            face = dy > 0 ? 'bottom' : 'top';
          } else if (absDz > absDx && absDz > absDy) {
            face = dz > 0 ? 'south' : 'north';
          } else {
            // Diagonal voxel crossing (rare, near corners) —
            // fall back to ray direction as tiebreaker
            const rAbsDx = Math.abs(dir.x);
            const rAbsDy = Math.abs(dir.y);
            const rAbsDz = Math.abs(dir.z);
            if (rAbsDy >= rAbsDx && rAbsDy >= rAbsDz) {
              face = dir.y > 0 ? 'bottom' : 'top';
            } else if (rAbsDx >= rAbsDz) {
              face = dir.x > 0 ? 'west' : 'east';
            } else {
              face = dir.z > 0 ? 'south' : 'north';
            }
          }
        } else {
          // Ray origin is inside a solid block — infer face from ray direction
          const rAbsDx = Math.abs(dir.x);
          const rAbsDy = Math.abs(dir.y);
          const rAbsDz = Math.abs(dir.z);
          if (rAbsDy >= rAbsDx && rAbsDy >= rAbsDz) {
            face = dir.y > 0 ? 'bottom' : 'top';
          } else if (rAbsDx >= rAbsDz) {
            face = dir.x > 0 ? 'west' : 'east';
          } else {
            face = dir.z > 0 ? 'south' : 'north';
          }
        }

        return {
          block: { x: cx, y: cy, z: cz },
          face,
          adjacentPos: hasLastAir ? { x: lastAirX, y: lastAirY, z: lastAirZ } : null,
        };
      }

      lastAirX = cx;
      lastAirY = cy;
      lastAirZ = cz;
      hasLastAir = true;
    }

    return { block: null, face: null, adjacentPos: null };
  }, [chunkManager]);

  // Raycast from camera center (desktop first-person mode)
  const raycastForBlock = useCallback(() => {
    camera.getWorldDirection(rayDirection.current);
    rayOrigin.current.copy(camera.position);
    return raycastAlongRay(rayOrigin.current, rayDirection.current);
  }, [camera, raycastAlongRay]);

  // Raycast from screen position (mobile tap-to-target)
  // Uses longer reach because third-person camera is far from terrain
  const raycastFromScreen = useCallback((screenX, screenY) => {
    // Convert screen coordinates to normalized device coordinates (-1 to +1)
    const ndcX = (screenX / size.width) * 2 - 1;
    const ndcY = -(screenY / size.height) * 2 + 1;

    // Set up raycaster from camera through screen point
    raycasterRef.current.setFromCamera({ x: ndcX, y: ndcY }, camera);

    const ray = raycasterRef.current.ray;
    return raycastAlongRay(ray.origin, ray.direction, REACH_DISTANCE_THIRD_PERSON);
  }, [camera, size, raycastAlongRay]);

  // Track previous target to avoid unnecessary state updates
  const prevTargetRef = useRef({ block: null, face: null });

  // Update raycast every few frames (first-person mode OR third-person build mode)
  const zoneMode = useGameStore((state) => state.zoneMode);

  useFrame(() => {
    // Build mode must be active for any continuous raycasting; skip in zone mode
    if (!buildMode || zoneMode) {
      if (targetBlock !== null && !isHoldingMine.current) {
        setTargetBlock(null);
        setTargetFace(null);
        prevTargetRef.current = { block: null, face: null };
      }
      return;
    }

    // On mobile or in third-person without first-person, don't do continuous raycasting
    // Mobile uses tap-to-target instead
    if (isMobile.current || !firstPerson) {
      // Clear target when not in first-person, BUT keep it while actively mining
      if (!isMobile.current && targetBlock !== null && !isHoldingMine.current) {
        setTargetBlock(null);
        setTargetFace(null);
        prevTargetRef.current = { block: null, face: null };
      }
      return;
    }

    const now = Date.now();
    if (now - lastRaycast.current < 50) return; // 20 raycasts per second max
    lastRaycast.current = now;

    const result = raycastForBlock();
    const prev = prevTargetRef.current;

    // Only update state if target actually changed (avoid re-renders)
    const blockChanged =
      (result.block === null) !== (prev.block === null) ||
      (result.block &&
        prev.block &&
        (Math.floor(result.block.x / VOXEL_SIZE) !== Math.floor(prev.block.x / VOXEL_SIZE) ||
          Math.floor(result.block.y / VOXEL_SIZE) !== Math.floor(prev.block.y / VOXEL_SIZE) ||
          Math.floor(result.block.z / VOXEL_SIZE) !== Math.floor(prev.block.z / VOXEL_SIZE)));

    if (blockChanged || result.face !== prev.face) {
      setTargetBlock(result.block);
      setTargetFace(result.face);
      prevTargetRef.current = { block: result.block, face: result.face };
    }
  });

  // Progressive mining: accumulate progress while holding on a block
  useFrame((_, delta) => {
    if (!buildMode || !isHoldingMine.current || !chunkManager) {
      if (miningAccum.current > 0) {
        miningAccum.current = 0;
        miningBlockKey.current = null;
        setMiningProgress(0);
      }
      return;
    }

    // If no target block but we're holding mine, keep using the last known block
    // This prevents mining interruption from brief raycast misses during camera movement
    if (!targetBlock && miningBlockKey.current) {
      // Continue mining the last known block
    } else if (!targetBlock) {
      return;
    }

    const bx = targetBlock ? Math.floor(targetBlock.x / VOXEL_SIZE) : null;
    const by = targetBlock ? Math.floor(targetBlock.y / VOXEL_SIZE) : null;
    const bz = targetBlock ? Math.floor(targetBlock.z / VOXEL_SIZE) : null;
    const blockKey = targetBlock ? `${bx},${by},${bz}` : miningBlockKey.current;

    // Reset if target block changed (but not if target temporarily went null)
    if (targetBlock && miningBlockKey.current && miningBlockKey.current !== blockKey) {
      miningAccum.current = 0;
      miningBlockKey.current = blockKey;
    } else if (!miningBlockKey.current) {
      miningBlockKey.current = blockKey;
    }

    // Get block hardness — parse from blockKey if target went null
    let worldX, worldY, worldZ;
    if (bx !== null) {
      worldX = bx * VOXEL_SIZE + VOXEL_SIZE / 2;
      worldY = by * VOXEL_SIZE + VOXEL_SIZE / 2;
      worldZ = bz * VOXEL_SIZE + VOXEL_SIZE / 2;
    } else {
      const parts = miningBlockKey.current.split(',');
      worldX = Number(parts[0]) * VOXEL_SIZE + VOXEL_SIZE / 2;
      worldY = Number(parts[1]) * VOXEL_SIZE + VOXEL_SIZE / 2;
      worldZ = Number(parts[2]) * VOXEL_SIZE + VOXEL_SIZE / 2;
    }
    const blockType = chunkManager.getBlock(worldX, worldY, worldZ);
    if (!blockType || blockType === BlockTypes.AIR || blockType === BlockTypes.BEDROCK) return;

    const hardness = getBlockHardness(blockType);
    const store = useGameStore.getState();
    const equippedTool = store.equipment?.weapon;
    const harvestSpeed = equippedTool?.stats?.harvestSpeed || HARVEST_SPEED_BARE_HANDS;
    const breakTime = hardness / harvestSpeed;

    // Accumulate mining progress
    miningAccum.current += delta;
    const progress = Math.min(1, miningAccum.current / breakTime);
    setMiningProgress(progress);

    // Block breaks when progress reaches 100%
    if (miningAccum.current >= breakTime) {
      mineBlock();
      miningAccum.current = 0;
      miningBlockKey.current = null;
      setMiningProgress(0);
      // Force immediate raycast so continuous mining picks up the next block
      lastRaycast.current = 0;
    }
  });

  // Handle block mining (destroy block)
  const mineBlock = useCallback(() => {
    if (!targetBlock || !chunkManager) return false;

    const blockX = Math.floor(targetBlock.x / VOXEL_SIZE) * VOXEL_SIZE + VOXEL_SIZE / 2;
    const blockY = Math.floor(targetBlock.y / VOXEL_SIZE) * VOXEL_SIZE + VOXEL_SIZE / 2;
    const blockZ = Math.floor(targetBlock.z / VOXEL_SIZE) * VOXEL_SIZE + VOXEL_SIZE / 2;

    // Get current block type before destroying (for future inventory)
    const currentBlock = chunkManager.getBlock(blockX, blockY, blockZ);

    // Don't allow breaking bedrock
    if (currentBlock === BlockTypes.BEDROCK) return false;

    // Set block to air
    const success = chunkManager.setBlock(blockX, blockY, blockZ, BlockTypes.AIR);

    if (success) {
      // Force immediate raycast to update target for consecutive mining
      lastRaycast.current = 0;
      prevTargetRef.current = { block: null, face: null };
      // Synchronous raycast so next click has fresh target
      const result = raycastForBlock();
      setTargetBlock(result.block);
      setTargetFace(result.face);
      prevTargetRef.current = { block: result.block, face: result.face };

      // Calculate and grant drops
      const store = useGameStore.getState();
      const equippedTool = store.equipment?.weapon;
      const toolTier = equippedTool?.stats?.toolTier || 0;
      const drops = calculateDrops(currentBlock, toolTier);

      drops.forEach((drop) => {
        store.addMaterial(drop.material, drop.amount);
        store.addPickupText(`+${drop.amount} ${drop.material}`, '#44ff44');
      });

      // Audio + quest tracking for mining
      audioManager.play('lootDrop');
      drops.forEach((drop) => {
        try { getQuestManager().emit('itemCollected', drop.material); } catch (_) { /* quest system not ready */ }
      });
    }

    return success;
  }, [targetBlock, chunkManager, raycastForBlock]);

  // Handle block placement
  const placeBlock = useCallback((blockType) => {
    if (!targetBlock || !chunkManager) return false;

    // Calculate adjacent position based on face hit
    const blockX = Math.floor(targetBlock.x / VOXEL_SIZE) * VOXEL_SIZE + VOXEL_SIZE / 2;
    const blockY = Math.floor(targetBlock.y / VOXEL_SIZE) * VOXEL_SIZE + VOXEL_SIZE / 2;
    const blockZ = Math.floor(targetBlock.z / VOXEL_SIZE) * VOXEL_SIZE + VOXEL_SIZE / 2;

    let placeX = blockX;
    let placeY = blockY;
    let placeZ = blockZ;

    // Offset based on face
    switch (targetFace) {
      case 'top': placeY += VOXEL_SIZE; break;
      case 'bottom': placeY -= VOXEL_SIZE; break;
      case 'north': placeZ += VOXEL_SIZE; break;
      case 'south': placeZ -= VOXEL_SIZE; break;
      case 'east': placeX += VOXEL_SIZE; break;
      case 'west': placeX -= VOXEL_SIZE; break;
      default: return false;
    }

    // Check if placement position is empty and doesn't overlap the player
    const existingBlock = chunkManager.getBlock(placeX, placeY, placeZ);
    if (isSolid(existingBlock)) return false;
    if (wouldOverlapPlayer(placeX, placeY, placeZ)) return false;

    // Place the block
    const success = chunkManager.setBlock(placeX, placeY, placeZ, blockType);

    if (success) {
      // Force immediate raycast to update target for consecutive placement
      lastRaycast.current = 0;
      prevTargetRef.current = { block: null, face: null };
      // Synchronous raycast so next click has fresh target
      const result = raycastForBlock();
      setTargetBlock(result.block);
      setTargetFace(result.face);
      prevTargetRef.current = { block: result.block, face: result.face };
    }

    return success;
  }, [targetBlock, targetFace, chunkManager, raycastForBlock]);

  // E key "use" action — interact with usable blocks (berry bushes, campfires, etc.)
  const useBlockCooldown = useRef(0);

  const useBlock = useCallback(() => {
    if (!chunkManager) return false;
    const now = Date.now();
    if (now - useBlockCooldown.current < USE_KEY_COOLDOWN) {
      useGameStore.getState()._debugStats.useKeyCooldownLeft = USE_KEY_COOLDOWN - (now - useBlockCooldown.current);
      return false;
    }

    const store = useGameStore.getState();
    const playerPos = store.player.position;

    // Check for rift interaction (E key near rift)
    const riftManager = store._riftManager;
    if (riftManager) {
      for (const rift of riftManager.rifts) {
        if (rift.state === 'CLOSED') continue;
        if (rift.state !== 'ACTIVE' && rift.state !== 'WOUNDED') continue;

        const rdx = playerPos[0] - rift.x;
        const rdz = playerPos[2] - rift.z;
        const rdist = Math.sqrt(rdx * rdx + rdz * rdz);

        if (rdist < 24) {
          // Show distance feedback so player knows they're getting close
          if (rdist >= 8) {
            store.addPickupText(`Rift nearby (${Math.round(rdist)} units away — get closer!)`, '#aa88ff');
            useBlockCooldown.current = now;
            return true;
          }

          // Must kill all rift monsters first
          if (rift.spawnedMonsterIds.length > 0) {
            store.addPickupText('Kill all rift monsters first!', '#ff6666');
            useBlockCooldown.current = now;
            return true;
          }

          const worldNow = store.worldTime.elapsed;
          if (rift.state === 'ACTIVE') {
            if (riftManager.beginClosing(rift.id, worldNow)) {
              store.addPickupText('Rift closing begun! Defend the anchor!', '#aa44ff');
              useBlockCooldown.current = now;
              return true;
            }
          } else if (rift.state === 'WOUNDED') {
            if (riftManager.resumeClosing(rift.id, worldNow)) {
              store.addPickupText('Resuming rift purification!', '#aa44ff');
              useBlockCooldown.current = now;
              return true;
            }
          }
        }
      }
    }

    // In first-person with a target block: use it if usable
    if (firstPerson && targetBlock) {
      const bx = Math.floor(targetBlock.x / VOXEL_SIZE) * VOXEL_SIZE + VOXEL_SIZE / 2;
      const by = Math.floor(targetBlock.y / VOXEL_SIZE) * VOXEL_SIZE + VOXEL_SIZE / 2;
      const bz = Math.floor(targetBlock.z / VOXEL_SIZE) * VOXEL_SIZE + VOXEL_SIZE / 2;
      const blockType = chunkManager.getBlock(bx, by, bz);
      const action = BLOCK_USE_ACTIONS[blockType];
      if (action) {
        useBlockCooldown.current = now;
        return _executeUseAction(action, bx, by, bz, blockType, chunkManager, store);
      }
    }

    // Otherwise (or if first-person had no usable target): proximity scan
    if (!firstPerson || !targetBlock) {
      const range = USE_KEY_RANGE;
      const px = playerPos[0];
      const py = playerPos[1];
      const pz = playerPos[2];

      // Scan blocks in range (7x4x7 grid centered on player)
      const halfRange = Math.ceil(range / VOXEL_SIZE);
      const playerVX = Math.floor(px / VOXEL_SIZE);
      const playerVY = Math.floor(py / VOXEL_SIZE);
      const playerVZ = Math.floor(pz / VOXEL_SIZE);

      let bestDist = Infinity;
      let bestBlock = null;

      for (let dy = -1; dy <= 2; dy++) {
        for (let dz = -halfRange; dz <= halfRange; dz++) {
          for (let dx = -halfRange; dx <= halfRange; dx++) {
            const wx = (playerVX + dx) * VOXEL_SIZE + VOXEL_SIZE / 2;
            const wy = (playerVY + dy) * VOXEL_SIZE + VOXEL_SIZE / 2;
            const wz = (playerVZ + dz) * VOXEL_SIZE + VOXEL_SIZE / 2;

            const blockType = chunkManager.getBlock(wx, wy, wz);
            if (!BLOCK_USE_ACTIONS[blockType]) continue;

            const ddx = wx - px;
            const ddy = wy - py;
            const ddz = wz - pz;
            const dist = ddx * ddx + ddy * ddy + ddz * ddz;

            if (dist < bestDist && dist <= range * range) {
              bestDist = dist;
              bestBlock = { x: wx, y: wy, z: wz, type: blockType };
            }
          }
        }
      }

      if (bestBlock) {
        useBlockCooldown.current = now;
        const action = BLOCK_USE_ACTIONS[bestBlock.type];
        return _executeUseAction(action, bestBlock.x, bestBlock.y, bestBlock.z, bestBlock.type, chunkManager, store);
      }
    }

    return false;
  }, [chunkManager, firstPerson, targetBlock]);

  // Expose interaction methods to store for UI/controls to use
  React.useEffect(() => {
    const store = useGameStore.getState();

    // Add interaction methods to store
    store.mineBlock = mineBlock;
    store.placeBlock = () => placeBlock(selectedBlockType);
    store.getTargetBlock = () => targetBlock;
    store.useBlock = useBlock;

    return () => {
      // Cleanup
      store.mineBlock = null;
      store.placeBlock = null;
      store.getTargetBlock = null;
      store.useBlock = null;
    };
  }, [mineBlock, placeBlock, selectedBlockType, targetBlock, useBlock]);

  // Check for enemy along camera center ray (first-person attack)
  const checkEnemyFromCamera = useCallback(() => {
    camera.getWorldDirection(rayDirection.current);
    sceneRaycasterRef.current.set(camera.position, rayDirection.current);
    sceneRaycasterRef.current.far = REACH_DISTANCE;
    const intersects = sceneRaycasterRef.current.intersectObjects(scene.children, true);

    for (let i = 0; i < intersects.length; i++) {
      let obj = intersects[i].object;
      while (obj) {
        if (obj.userData?.isEnemy && obj.userData?.takeDamage) {
          return { hit: intersects[i], enemyData: obj.userData };
        }
        obj = obj.parent;
      }
    }
    return null;
  }, [camera, scene]);

  // Desktop: pointer down/up handlers for first-person mining/placement/attack
  useEffect(() => {
    const handlePointerDown = (event) => {
      // Mobile uses long-press touch handlers instead
      if (isMobile.current) return;

      const store = useGameStore.getState();
      const isPointerLocked = document.pointerLockElement != null;

      if (firstPerson && isPointerLocked) {
        if (event.button === 0) {
          // Left click: check for enemy FIRST (works outside build mode), then mine block
          const enemy = checkEnemyFromCamera();
          if (enemy) {
            // Try spell first, then fall back to melee
            const spell = getSpellById(store.activeSpellId);
            let spellFired = false;
            if (spell && store.player.mana >= spell.manaCost) {
              const cooldown = store.getSpellCooldown(spell.id);
              if (cooldown <= 0) {
                const result = executeSpell(spell, store.player, store);
                if (result.success) {
                  store.setSpellCooldown(spell.id, spell.cooldown);
                  spellFired = true;
                }
              }
            }

            // Melee fallback: if spell didn't fire, swing melee
            if (!spellFired) {
              const meleeCooldown = store.getSpellCooldown('__melee__');
              if (!meleeCooldown || meleeCooldown <= 0) {
                // Get facing angle from camera direction
                camera.getWorldDirection(rayDirection.current);
                const facingAngle = Math.atan2(rayDirection.current.x, rayDirection.current.z);
                performMeleeAttack(store, store.player.position, facingAngle, store.enemies);
                store.setSpellCooldown('__melee__', MELEE_COOLDOWN);
              }
            }
          } else if (store.buildMode) {
            // Start progressive mining (hold to break) — requires build mode
            isHoldingMine.current = true;
            miningAccum.current = 0;
            miningBlockKey.current = null;
          }
        } else if (event.button === 2) {
          // Build mode required for block placement
          if (!store.buildMode) return;
          // Right click: place block — do a fresh raycast to get current target
          const freshResult = raycastForBlock();
          if (freshResult.block && freshResult.face) {
            setTargetBlock(freshResult.block);
            setTargetFace(freshResult.face);
            prevTargetRef.current = { block: freshResult.block, face: freshResult.face };
            // Place adjacent to the freshly raycasted block
            const bx = Math.floor(freshResult.block.x / VOXEL_SIZE) * VOXEL_SIZE + VOXEL_SIZE / 2;
            const by = Math.floor(freshResult.block.y / VOXEL_SIZE) * VOXEL_SIZE + VOXEL_SIZE / 2;
            const bz = Math.floor(freshResult.block.z / VOXEL_SIZE) * VOXEL_SIZE + VOXEL_SIZE / 2;
            let px = bx, py = by, pz = bz;
            switch (freshResult.face) {
              case 'top': py += VOXEL_SIZE; break;
              case 'bottom': py -= VOXEL_SIZE; break;
              case 'north': pz += VOXEL_SIZE; break;
              case 'south': pz -= VOXEL_SIZE; break;
              case 'east': px += VOXEL_SIZE; break;
              case 'west': px -= VOXEL_SIZE; break;
              default: break;
            }
            if (chunkManager && !isSolid(chunkManager.getBlock(px, py, pz)) && !wouldOverlapPlayer(px, py, pz)) {
              chunkManager.setBlock(px, py, pz, selectedBlockType);
              // Refresh target after placement
              lastRaycast.current = 0;
              prevTargetRef.current = { block: null, face: null };
            }
          }
        }
      }
    };

    const handlePointerUp = (event) => {
      if (event.button === 0) {
        isHoldingMine.current = false;
        miningAccum.current = 0;
        miningBlockKey.current = null;
        setMiningProgress(0);
      }
    };

    const handleContextMenu = (event) => {
      // Prevent context menu in first-person mode so right-click works for placement
      if (firstPerson && document.pointerLockElement != null) {
        event.preventDefault();
      }
    };

    // Listen on document to catch events when pointer lock is active
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('pointerup', handlePointerUp);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [gl, camera, mineBlock, placeBlock, selectedBlockType, firstPerson, checkEnemyFromCamera, chunkManager, raycastForBlock]);

  // Desktop third-person: left-click to mine, right-click to place
  // Uses a store flag (_blockClickActive) to coordinate with TouchControls
  useEffect(() => {
    if (isMobile.current) return;

    const canvas = gl.domElement;

    // Track right-click for block placement (without drag)
    const rightClickStart = { x: 0, y: 0 };
    let rightClickPending = false;
    let rightClickResult = null;

    const handleMouseDown = (event) => {
      // Only handle in third-person mode (not pointer locked)
      if (document.pointerLockElement) return;

      // Build mode required for block interaction in third-person
      if (!useGameStore.getState().buildMode) return;

      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      if (event.button === 2) {
        // Right-click: record position and raycast for potential block placement
        rightClickStart.x = event.clientX;
        rightClickStart.y = event.clientY;
        rightClickPending = true;
        rightClickResult = raycastFromScreen(x, y);
        return;
      }

      if (event.button !== 0) return;

      // First check if click hits an enemy (scene raycast) — if so, let TouchControls handle it
      const ndcX = (x / rect.width) * 2 - 1;
      const ndcY = -(y / rect.height) * 2 + 1;
      const sceneRc = raycasterRef.current;
      sceneRc.setFromCamera({ x: ndcX, y: ndcY }, camera);
      sceneRc.far = REACH_DISTANCE_THIRD_PERSON;
      const sceneHits = sceneRc.intersectObjects(scene.children, true);
      for (let i = 0; i < sceneHits.length; i++) {
        let obj = sceneHits[i].object;
        while (obj) {
          if (obj.userData?.isEnemy) {
            // Click is on an enemy — don't intercept, let TouchControls attack
            return;
          }
          obj = obj.parent;
        }
      }

      // Raycast from mouse position to find block
      const result = raycastFromScreen(x, y);

      if (result.block) {
        // Block found — set store flag to suppress TouchControls movement
        useGameStore.getState()._blockClickActive = true;
        // Also stamp longPressAt as backup suppression signal
        canvas.dataset.longPressAt = String(Date.now());

        longPressBlock.current = result.block;
        longPressFace.current = result.face;
        longPressTouchStart.current = { x: event.clientX, y: event.clientY };

        // Show highlight immediately
        setTargetBlock(result.block);
        setTargetFace(result.face);

        // Desktop: always mine on left-click (no toggle mode)
        isHoldingMine.current = true;
        miningAccum.current = 0;
        // Set miningBlockKey immediately so mining progress can find the block
        const mbx = Math.floor(result.block.x / VOXEL_SIZE);
        const mby = Math.floor(result.block.y / VOXEL_SIZE);
        const mbz = Math.floor(result.block.z / VOXEL_SIZE);
        miningBlockKey.current = `${mbx},${mby},${mbz}`;
      }
    };

    const handleMouseMove = (event) => {
      // Cancel right-click placement if mouse moved too far (it's a camera drag)
      if (rightClickPending) {
        const rdx = event.clientX - rightClickStart.x;
        const rdy = event.clientY - rightClickStart.y;
        if (rdx * rdx + rdy * rdy > 25) { // 5px threshold
          rightClickPending = false;
          rightClickResult = null;
        }
      }

      if (!isHoldingMine.current) return;

      // Re-raycast from current mouse position to check if still on the same block
      const rect = canvas.getBoundingClientRect();
      const mx = event.clientX - rect.left;
      const my = event.clientY - rect.top;
      const moveResult = raycastFromScreen(mx, my);

      if (moveResult.block && miningBlockKey.current) {
        const mbx = Math.floor(moveResult.block.x / VOXEL_SIZE);
        const mby = Math.floor(moveResult.block.y / VOXEL_SIZE);
        const mbz = Math.floor(moveResult.block.z / VOXEL_SIZE);
        const newKey = `${mbx},${mby},${mbz}`;
        if (newKey === miningBlockKey.current) {
          // Still on the same block — continue mining, update face highlight
          setTargetBlock(moveResult.block);
          setTargetFace(moveResult.face);
          return;
        }
      }

      // Cursor moved off the block — cancel mining
      longPressBlock.current = null;
      longPressFace.current = null;
      isHoldingMine.current = false;
      miningAccum.current = 0;
      setMiningProgress(0);
      setTargetBlock(null);
      setTargetFace(null);
    };

    const handleMouseUp = (event) => {
      // Right-click release: place block if mouse didn't drag
      if (event.button === 2 && rightClickPending && rightClickResult?.block) {
        const result = rightClickResult;
        const block = result.block;
        const face = result.face;
        if (block && face && chunkManager) {
          const blockX = Math.floor(block.x / VOXEL_SIZE) * VOXEL_SIZE + VOXEL_SIZE / 2;
          const blockY = Math.floor(block.y / VOXEL_SIZE) * VOXEL_SIZE + VOXEL_SIZE / 2;
          const blockZ = Math.floor(block.z / VOXEL_SIZE) * VOXEL_SIZE + VOXEL_SIZE / 2;
          let plX = blockX, plY = blockY, plZ = blockZ;
          switch (face) {
            case 'top': plY += VOXEL_SIZE; break;
            case 'bottom': plY -= VOXEL_SIZE; break;
            case 'north': plZ += VOXEL_SIZE; break;
            case 'south': plZ -= VOXEL_SIZE; break;
            case 'east': plX += VOXEL_SIZE; break;
            case 'west': plX -= VOXEL_SIZE; break;
            default: break;
          }
          const existing = chunkManager.getBlock(plX, plY, plZ);
          if (!isSolid(existing) && !wouldOverlapPlayer(plX, plY, plZ)) {
            const store = useGameStore.getState();
            chunkManager.setBlock(plX, plY, plZ, store.selectedBlockType ?? BlockTypes.DIRT);
          }
        }
        rightClickPending = false;
        rightClickResult = null;
        return;
      }
      rightClickPending = false;
      rightClickResult = null;

      // Stop mining on mouseup
      longPressBlock.current = null;
      longPressFace.current = null;
      isHoldingMine.current = false;
      miningAccum.current = 0;
      setMiningProgress(0);
      setTargetBlock(null);
      setTargetFace(null);
    };

    const handleContextMenu3P = (event) => {
      // Prevent context menu in third-person mode on canvas
      if (!document.pointerLockElement) {
        event.preventDefault();
      }
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('contextmenu', handleContextMenu3P);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('contextmenu', handleContextMenu3P);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [gl, chunkManager, raycastFromScreen, firstPerson, camera, scene.children]);

  // Mobile: long-press touch handlers for mining/placement
  // Calls chunkManager.setBlock() directly to avoid React lifecycle timing issues
  useEffect(() => {
    if (!isMobile.current) return;

    const canvas = gl.domElement;

    // Prevent text selection and context menu on long press
    canvas.style.webkitUserSelect = 'none';
    canvas.style.userSelect = 'none';
    canvas.style.webkitTouchCallout = 'none';

    const handleContextMenu = (e) => e.preventDefault();

    // Capture-phase click handler: intercepts clicks BEFORE TouchControls
    // can process them, blocking movement after a long press fires.
    const handleClickCapture = (e) => {
      const longPressAt = Number(canvas.dataset.longPressAt || '0');
      if (Date.now() - longPressAt < 1000) {
        e.stopImmediatePropagation();
        e.preventDefault();
      }
    };

    const handleTouchStart = (e) => {
      if (e.touches.length !== 1) return;

      // Build mode required for block interaction on mobile
      if (!useGameStore.getState().buildMode) return;

      const touch = e.touches[0];
      longPressTouchStart.current = { x: touch.clientX, y: touch.clientY };
      longPressActive.current = false;
      longPressBlock.current = null;
      longPressFace.current = null;

      // Raycast from touch position to find block
      const rect = canvas.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      const result = raycastFromScreen(x, y);

      if (result.block) {
        // Store raycast result in refs for the timer callback
        longPressBlock.current = result.block;
        longPressFace.current = result.face;

        // Show highlight immediately
        setTargetBlock(result.block);
        setTargetFace(result.face);

        // Prevent the synthetic click event chain entirely when targeting a
        // block. This is the spec-compliant way to suppress clicks from
        // touch — preventDefault must be called on touchstart, not touchend.
        e.preventDefault();

        // Start long press timer — after hold threshold, start progressive mining
        clearTimeout(longPressTimer.current);
        longPressTimer.current = setTimeout(() => {
          longPressActive.current = true;

          // Stamp canvas so the capture-phase click handler knows to block
          canvas.dataset.longPressAt = String(Date.now());

          // Use refs + chunkManager directly (no React state dependency)
          const block = longPressBlock.current;
          const face = longPressFace.current;
          if (!block || !chunkManager) return;

          const store = useGameStore.getState();
          if (store.blockPlacementMode) {
            // Placement is still instant
            const blockX = Math.floor(block.x / VOXEL_SIZE) * VOXEL_SIZE + VOXEL_SIZE / 2;
            const blockY = Math.floor(block.y / VOXEL_SIZE) * VOXEL_SIZE + VOXEL_SIZE / 2;
            const blockZ = Math.floor(block.z / VOXEL_SIZE) * VOXEL_SIZE + VOXEL_SIZE / 2;
            let placeX = blockX, placeY = blockY, placeZ = blockZ;
            switch (face) {
              case 'top': placeY += VOXEL_SIZE; break;
              case 'bottom': placeY -= VOXEL_SIZE; break;
              case 'north': placeZ += VOXEL_SIZE; break;
              case 'south': placeZ -= VOXEL_SIZE; break;
              case 'east': placeX += VOXEL_SIZE; break;
              case 'west': placeX -= VOXEL_SIZE; break;
              default: return;
            }
            const existing = chunkManager.getBlock(placeX, placeY, placeZ);
            if (!isSolid(existing) && !wouldOverlapPlayer(placeX, placeY, placeZ)) {
              chunkManager.setBlock(placeX, placeY, placeZ, store.selectedBlockType ?? BlockTypes.DIRT);
            }
          } else {
            // Start progressive mining (useFrame will accumulate)
            isHoldingMine.current = true;
            miningAccum.current = 0;
            miningBlockKey.current = null;
          }
        }, LONG_PRESS_DURATION);
      }
    };

    const handleTouchMove = (e) => {
      if (!longPressTimer.current && !isHoldingMine.current) return;

      const touch = e.touches[0];
      const dx = touch.clientX - longPressTouchStart.current.x;
      const dy = touch.clientY - longPressTouchStart.current.y;

      // Cancel long press / mining if finger moved too far
      if (dx * dx + dy * dy > LONG_PRESS_MOVE_THRESHOLD * LONG_PRESS_MOVE_THRESHOLD) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
        longPressBlock.current = null;
        longPressFace.current = null;
        isHoldingMine.current = false;
        miningAccum.current = 0;
        setMiningProgress(0);
        setTargetBlock(null);
        setTargetFace(null);
      }
    };

    const handleTouchEnd = (e) => {
      const wasTimerActive = longPressTimer.current !== null;

      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }

      // Stop mining
      isHoldingMine.current = false;
      miningAccum.current = 0;
      setMiningProgress(0);

      if (longPressActive.current) {
        // Long press action already fired
        longPressActive.current = false;
      } else if (wasTimerActive && longPressBlock.current) {
        // Short tap on a block (lifted before 500ms) — we called
        // preventDefault on touchstart so the browser won't generate a
        // click. Dispatch one manually so TouchControls can handle movement.
        const syntheticClick = new MouseEvent('click', {
          clientX: longPressTouchStart.current.x,
          clientY: longPressTouchStart.current.y,
          bubbles: true,
        });
        canvas.dispatchEvent(syntheticClick);
      }

      // Clear refs and highlight
      longPressBlock.current = null;
      longPressFace.current = null;
      setTargetBlock(null);
      setTargetFace(null);
    };

    canvas.addEventListener('click', handleClickCapture, true); // capture phase
    canvas.addEventListener('contextmenu', handleContextMenu);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: true });
    canvas.addEventListener('touchend', handleTouchEnd);
    canvas.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      clearTimeout(longPressTimer.current);
      canvas.removeEventListener('click', handleClickCapture, true);
      canvas.removeEventListener('contextmenu', handleContextMenu);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [gl, chunkManager, raycastFromScreen]);

  return (
    <>
      {/* Mining target highlight — show when not in placement-only mode, or in first-person (both actions available) */}
      {(!blockPlacementMode || firstPerson) && (
        <BlockHighlight
          position={highlightPosition}
          visible={targetBlock !== null}
        />
      )}

      {/* Placement preview ghost block — show in placement mode or first-person (right-click places) */}
      {(blockPlacementMode || firstPerson) && previewPosition && (
        <PlacementPreview
          position={previewPosition}
          blockType={selectedBlockType}
          isValid={previewValid}
        />
      )}

      {/* Mining progress bar */}
      <MiningProgressBar position={highlightPosition} progress={miningProgress} />
    </>
  );
}

export default BlockInteraction;
