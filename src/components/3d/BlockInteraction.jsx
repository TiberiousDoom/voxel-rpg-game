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
import { HARVEST_SPEED_BARE_HANDS } from '../../data/tuning';
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
const miningBarFillGeometry = new THREE.PlaneGeometry(1.0, 0.25); // scaled dynamically

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
};

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
 */
function MiningProgressBar({ position, progress }) {
  if (!position || progress <= 0) return null;

  const barWidth = VOXEL_SIZE * 1.2 * Math.min(1, progress);

  return (
    <group position={[position[0], position[1] + VOXEL_SIZE * 0.8, position[2]]}>
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

    // Check if placement is valid (position is empty)
    const existingBlock = chunkManager.getBlock(placeX, placeY, placeZ);
    const isValid = !isSolid(existingBlock);

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
  useFrame(() => {
    // Build mode must be active for any continuous raycasting
    if (!buildMode) {
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
      // Force immediate raycast update to allow consecutive mining
      lastRaycast.current = 0;
      prevTargetRef.current = { block: null, face: null };

      // Calculate and grant drops
      const store = useGameStore.getState();
      const equippedTool = store.equipment?.weapon;
      const toolTier = equippedTool?.stats?.toolTier || 0;
      const drops = calculateDrops(currentBlock, toolTier);

      drops.forEach((drop) => {
        store.addMaterial(drop.material, drop.amount);
        // Show floating pickup text via damage number system (white color)
        store.addDamageNumber({
          position: [blockX, blockY + 1.5, blockZ],
          damage: `+${drop.amount} ${drop.material}`,
          color: '#ffffff',
        });
      });
    }

    return success;
  }, [targetBlock, chunkManager]);

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

    // Check if placement position is empty
    const existingBlock = chunkManager.getBlock(placeX, placeY, placeZ);
    if (isSolid(existingBlock)) return false;

    // Place the block
    const success = chunkManager.setBlock(placeX, placeY, placeZ, blockType);

    if (success) {
      // Force immediate raycast update to allow consecutive placement
      // by invalidating the lastRaycast time
      lastRaycast.current = 0;
      // Clear prev target to force state update
      prevTargetRef.current = { block: null, face: null };
    }

    return success;
  }, [targetBlock, targetFace, chunkManager]);

  // Expose interaction methods to store for UI/controls to use
  React.useEffect(() => {
    const store = useGameStore.getState();

    // Add interaction methods to store
    store.mineBlock = mineBlock;
    store.placeBlock = () => placeBlock(selectedBlockType);
    store.getTargetBlock = () => targetBlock;

    return () => {
      // Cleanup
      store.mineBlock = null;
      store.placeBlock = null;
      store.getTargetBlock = null;
    };
  }, [mineBlock, placeBlock, selectedBlockType, targetBlock]);

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
        // Build mode required for block interaction in first-person
        if (!store.buildMode) return;

        if (event.button === 0) {
          // Left click: check for enemy FIRST, then mine block
          const enemy = checkEnemyFromCamera();
          if (enemy) {
            // Attack enemy with projectile (costs mana)
            const manaCost = 5;
            if (store.player.mana < manaCost) return; // No mana
            store.consumeMana(manaCost);

            const playerPos = store.player.position;
            const hitPt = enemy.hit.point;
            const dir = [
              hitPt.x - playerPos[0],
              (hitPt.y + 0.5) - (playerPos[1] + 0.5),
              hitPt.z - playerPos[2],
            ];
            const len = Math.sqrt(dir[0] ** 2 + dir[1] ** 2 + dir[2] ** 2);
            store.addProjectile({
              id: `fp-attack-${Date.now()}`,
              position: [playerPos[0], playerPos[1] + 2.0, playerPos[2]],
              direction: [dir[0] / len, dir[1] / len, dir[2] / len],
              speed: 25,
              damage: store.player.damage,
              color: '#00ffff',
            });
          } else {
            // Start progressive mining (hold to break)
            isHoldingMine.current = true;
            miningAccum.current = 0;
            miningBlockKey.current = null;
          }
        } else if (event.button === 2) {
          // Right click: place block
          placeBlock(selectedBlockType);
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
  }, [gl, mineBlock, placeBlock, selectedBlockType, firstPerson, checkEnemyFromCamera]);

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

      const dx = event.clientX - longPressTouchStart.current.x;
      const dy = event.clientY - longPressTouchStart.current.y;

      if (dx * dx + dy * dy > LONG_PRESS_MOVE_THRESHOLD * LONG_PRESS_MOVE_THRESHOLD) {
        longPressBlock.current = null;
        longPressFace.current = null;
        isHoldingMine.current = false;
        miningAccum.current = 0;
        setMiningProgress(0);
        setTargetBlock(null);
        setTargetFace(null);
      }
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
          if (!isSolid(existing)) {
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
  }, [gl, chunkManager, raycastFromScreen, firstPerson]);

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
            if (!isSolid(existing)) {
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
