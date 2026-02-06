/**
 * BlockInteraction - Handles block selection, mining, and placement
 *
 * Desktop (first-person): Raycasts from camera center, click to mine/place
 * Mobile (tap-to-target): Tap to select block, tap again to mine/place
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

// Raycast step size (smaller = more precise, but slower)
const RAY_STEP = 0.5;

// Pre-create geometry for highlight (reused across all renders)
const highlightBoxGeometry = new THREE.BoxGeometry(
  VOXEL_SIZE + 0.02,
  VOXEL_SIZE + 0.02,
  VOXEL_SIZE + 0.02
);
const highlightEdgesGeometry = new THREE.EdgesGeometry(highlightBoxGeometry);

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
 * Main BlockInteraction component
 */
export function BlockInteraction({ chunkManager }) {
  const { camera, gl, size } = useThree();
  const [targetBlock, setTargetBlock] = useState(null);
  const [targetFace, setTargetFace] = useState(null);
  const lastRaycast = useRef(0);

  // Track if we're on mobile
  const isMobile = useRef(isTouchDevice());

  // For mobile: track the selected block for tap-to-target
  const [mobileSelectedBlock, setMobileSelectedBlock] = useState(null);

  // Get selected block type and first-person mode from store
  const selectedBlockType = useGameStore((state) => state.selectedBlockType ?? BlockTypes.DIRT);
  const firstPerson = useGameStore((state) => state.camera.firstPerson);

  // Raycaster for screen-space raycasting (mobile)
  const raycasterRef = useRef(new THREE.Raycaster());

  // Convert world position to block center position for highlight
  const highlightPosition = useMemo(() => {
    if (!targetBlock) return null;

    // Block center = floor to grid + half voxel size
    const x = Math.floor(targetBlock.x / VOXEL_SIZE) * VOXEL_SIZE + VOXEL_SIZE / 2;
    const y = Math.floor(targetBlock.y / VOXEL_SIZE) * VOXEL_SIZE + VOXEL_SIZE / 2;
    const z = Math.floor(targetBlock.z / VOXEL_SIZE) * VOXEL_SIZE + VOXEL_SIZE / 2;

    return [x, y, z];
  }, [targetBlock]);

  // Reusable vectors for raycast (avoid allocations)
  const rayDirection = useRef(new THREE.Vector3());
  const rayOrigin = useRef(new THREE.Vector3());

  // Core raycast function - steps along a ray to find blocks
  const raycastAlongRay = useCallback((origin, direction) => {
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
    for (let dist = 0; dist < REACH_DISTANCE; dist += RAY_STEP) {
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
  const raycastFromScreen = useCallback((screenX, screenY) => {
    // Convert screen coordinates to normalized device coordinates (-1 to +1)
    const ndcX = (screenX / size.width) * 2 - 1;
    const ndcY = -(screenY / size.height) * 2 + 1;

    // Set up raycaster from camera through screen point
    raycasterRef.current.setFromCamera({ x: ndcX, y: ndcY }, camera);

    const ray = raycasterRef.current.ray;
    return raycastAlongRay(ray.origin, ray.direction);
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

  // Helper to check if two blocks are the same grid position
  const isSameBlock = useCallback((a, b) => {
    if (!a || !b) return false;
    return (
      Math.floor(a.x / VOXEL_SIZE) === Math.floor(b.x / VOXEL_SIZE) &&
      Math.floor(a.y / VOXEL_SIZE) === Math.floor(b.y / VOXEL_SIZE) &&
      Math.floor(a.z / VOXEL_SIZE) === Math.floor(b.z / VOXEL_SIZE)
    );
  }, []);

  // Handle pointer/touch events
  useEffect(() => {
    const handlePointerDown = (event) => {
      // Only handle primary button (left click / touch)
      if (event.button !== 0) return;

      const store = useGameStore.getState();
      const isPointerLocked = document.pointerLockElement != null;

      if (isMobile.current) {
        // Mobile: tap-to-target mode - must be on canvas
        if (event.target !== gl.domElement) return;

        const rect = gl.domElement.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        const result = raycastFromScreen(x, y);

        if (result.block) {
          // Check if tapping the same block as currently selected
          if (isSameBlock(result.block, mobileSelectedBlock)) {
            // Second tap on same block - perform action
            if (store.blockPlacementMode) {
              placeBlock(selectedBlockType);
            } else {
              mineBlock();
            }
            // Clear selection after action
            setMobileSelectedBlock(null);
            setTargetBlock(null);
            setTargetFace(null);
          } else {
            // First tap or different block - select it
            setMobileSelectedBlock(result.block);
            setTargetBlock(result.block);
            setTargetFace(result.face);
          }
        } else {
          // Tapped on empty space - clear selection
          setMobileSelectedBlock(null);
          setTargetBlock(null);
          setTargetFace(null);
        }
      } else if (firstPerson && isPointerLocked) {
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
  }, [gl, mineBlock, placeBlock, selectedBlockType, firstPerson, raycastFromScreen, isSameBlock, mobileSelectedBlock]);

  return (
    <BlockHighlight
      position={highlightPosition}
      visible={targetBlock !== null}
    />
  );
}

export default BlockInteraction;
