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
import { BlockTypes, isSolid } from '../../systems/chunks/blockTypes';
import useGameStore from '../../stores/useGameStore';
import { isTouchDevice } from '../../utils/deviceDetection';

// Maximum reach distance for block interaction
const REACH_DISTANCE = 12;

// Longer reach for third-person/mobile (camera is ~16+ world units from terrain)
const REACH_DISTANCE_THIRD_PERSON = 50;

// Raycast step size (smaller = more precise, but slower)
const RAY_STEP = 0.5;

// Long press settings for mobile block interaction
const LONG_PRESS_DURATION = 500; // ms to hold before mining/placing
const LONG_PRESS_MOVE_THRESHOLD = 20; // pixels of movement that cancels long press

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
 * Main BlockInteraction component
 */
export function BlockInteraction({ chunkManager }) {
  const { camera, gl, size } = useThree();
  const [targetBlock, setTargetBlock] = useState(null);
  const [targetFace, setTargetFace] = useState(null);
  const [previewPosition, setPreviewPosition] = useState(null);
  const [previewValid, setPreviewValid] = useState(true);
  const lastRaycast = useRef(0);

  // Track if we're on mobile
  const isMobile = useRef(isTouchDevice());

  // Get selected block type, placement mode, and first-person mode from store
  const selectedBlockType = useGameStore((state) => state.selectedBlockType ?? BlockTypes.DIRT);
  const firstPerson = useGameStore((state) => state.camera.firstPerson);
  const blockPlacementMode = useGameStore((state) => state.blockPlacementMode);

  // Raycaster for screen-space raycasting (mobile)
  const raycasterRef = useRef(new THREE.Raycaster());

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
  useEffect(() => {
    if (!blockPlacementMode || !targetBlock || !targetFace || !chunkManager) {
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
  }, [blockPlacementMode, targetBlock, targetFace, chunkManager]);

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
        // Found a solid block
        let face = null;
        if (hasLastAir) {
          const dx = cx - lastAirX;
          const dy = cy - lastAirY;
          const dz = cz - lastAirZ;

          const absDx = Math.abs(dx);
          const absDy = Math.abs(dy);
          const absDz = Math.abs(dz);

          if (absDx > absDy && absDx > absDz) {
            face = dx > 0 ? 'west' : 'east';
          } else if (absDy > absDx && absDy > absDz) {
            face = dy > 0 ? 'bottom' : 'top';
          } else {
            face = dz > 0 ? 'south' : 'north';
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

  // Update raycast every few frames (desktop first-person mode only)
  useFrame(() => {
    // On mobile or in third-person, don't do continuous raycasting
    // Mobile uses tap-to-target instead
    if (isMobile.current || !firstPerson) {
      // Clear target when not in first-person (unless mobile has selected a block)
      if (!isMobile.current && targetBlock !== null) {
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
      // Could add particle effect, sound, etc. here
      // Could add block to inventory here
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

  // Desktop: pointer down handler for first-person mining/placement
  useEffect(() => {
    const handlePointerDown = (event) => {
      // Only handle primary button (left click)
      if (event.button !== 0) return;

      // Mobile uses long-press touch handlers instead
      if (isMobile.current) return;

      const store = useGameStore.getState();
      const isPointerLocked = document.pointerLockElement != null;

      if (firstPerson && isPointerLocked) {
        // Desktop first-person mode with pointer lock: click performs action on crosshair target
        if (store.blockPlacementMode) {
          placeBlock(selectedBlockType);
        } else {
          mineBlock();
        }
      }
    };

    // Listen on document to catch events when pointer lock is active
    document.addEventListener('pointerdown', handlePointerDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [gl, mineBlock, placeBlock, selectedBlockType, firstPerson]);

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

        // Start long press timer - action fires after holding
        clearTimeout(longPressTimer.current);
        longPressTimer.current = setTimeout(() => {
          longPressActive.current = true;

          // Stamp canvas so the capture-phase click handler knows to block
          canvas.dataset.longPressAt = String(Date.now());

          // Use refs + chunkManager directly (no React state dependency)
          const block = longPressBlock.current;
          const face = longPressFace.current;
          if (!block || !chunkManager) return;

          const blockX = Math.floor(block.x / VOXEL_SIZE) * VOXEL_SIZE + VOXEL_SIZE / 2;
          const blockY = Math.floor(block.y / VOXEL_SIZE) * VOXEL_SIZE + VOXEL_SIZE / 2;
          const blockZ = Math.floor(block.z / VOXEL_SIZE) * VOXEL_SIZE + VOXEL_SIZE / 2;

          const store = useGameStore.getState();
          if (store.blockPlacementMode) {
            // Place block on adjacent face
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
            // Mine block
            const currentBlock = chunkManager.getBlock(blockX, blockY, blockZ);
            if (currentBlock !== BlockTypes.BEDROCK) {
              chunkManager.setBlock(blockX, blockY, blockZ, BlockTypes.AIR);
            }
          }
        }, LONG_PRESS_DURATION);
      }
    };

    const handleTouchMove = (e) => {
      if (!longPressTimer.current) return;

      const touch = e.touches[0];
      const dx = touch.clientX - longPressTouchStart.current.x;
      const dy = touch.clientY - longPressTouchStart.current.y;

      // Cancel long press if finger moved too far
      if (dx * dx + dy * dy > LONG_PRESS_MOVE_THRESHOLD * LONG_PRESS_MOVE_THRESHOLD) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
        longPressBlock.current = null;
        longPressFace.current = null;
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

      if (longPressActive.current) {
        // Long press action already fired - block is already mined/placed
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
      {/* Mining target highlight */}
      {!blockPlacementMode && (
        <BlockHighlight
          position={highlightPosition}
          visible={targetBlock !== null}
        />
      )}

      {/* Placement preview ghost block */}
      {blockPlacementMode && previewPosition && (
        <PlacementPreview
          position={previewPosition}
          blockType={selectedBlockType}
          isValid={previewValid}
        />
      )}
    </>
  );
}

export default BlockInteraction;
