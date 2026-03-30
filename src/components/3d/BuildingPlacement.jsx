/**
 * BuildingPlacement — Ghost preview + click-to-place for construction sites.
 *
 * Active when placingBuildingId !== null. Raycasts from camera center to
 * find terrain surface, renders translucent building preview, validates
 * placement, and commits on click.
 */

import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import useGameStore from '../../stores/useGameStore';
import { getBuildingById, parseLayers } from '../../data/buildings';
import { VOXEL_SIZE } from '../../systems/chunks/coordinates';
import { isSolid } from '../../systems/chunks/blockTypes';
import { getBlockColor } from '../../systems/chunks/blockTypes';

const boxGeo = new THREE.BoxGeometry(VOXEL_SIZE, VOXEL_SIZE, VOXEL_SIZE);

export default function BuildingPlacement({ chunkManager }) {
  const { camera, gl } = useThree();
  const placingBuildingId = useGameStore((s) => s.placingBuildingId);
  const placeConstructionSite = useGameStore((s) => s.placeConstructionSite);
  const cancelPlacingBuilding = useGameStore((s) => s.cancelPlacingBuilding);

  const previewRef = useRef(null);
  const positionRef = useRef([0, 0, 0]);
  const validRef = useRef(false);
  const rayDir = useRef(new THREE.Vector3());

  const building = useMemo(() => placingBuildingId ? getBuildingById(placingBuildingId) : null, [placingBuildingId]);
  const blocks = useMemo(() => building ? parseLayers(building) : [], [building]);

  // Create instanced mesh data for the ghost blocks
  const blockData = useMemo(() => {
    if (!building || blocks.length === 0) return null;
    return blocks.map(b => ({
      offset: [b.x * VOXEL_SIZE, b.y * VOXEL_SIZE, b.z * VOXEL_SIZE],
      color: getBlockColor(b.blockType),
    }));
  }, [building, blocks]);

  // Raycast from camera center to find terrain placement position
  useFrame(() => {
    if (!building || !chunkManager || !previewRef.current) return;

    camera.getWorldDirection(rayDir.current);
    const origin = camera.position;
    const dir = rayDir.current;

    // Step along ray to find first solid block
    let foundPos = null;
    for (let dist = 0; dist < 50; dist += 0.5) {
      const cx = origin.x + dir.x * dist;
      const cy = origin.y + dir.y * dist;
      const cz = origin.z + dir.z * dist;

      const block = chunkManager.getBlock(cx, cy, cz);
      if (isSolid(block)) {
        // Snap to voxel grid — place building on top surface
        const vx = Math.floor(cx / VOXEL_SIZE) * VOXEL_SIZE;
        const vy = Math.floor(cy / VOXEL_SIZE) * VOXEL_SIZE + VOXEL_SIZE; // Top of this block
        const vz = Math.floor(cz / VOXEL_SIZE) * VOXEL_SIZE;
        foundPos = [vx, vy, vz];
        break;
      }
    }

    if (!foundPos) {
      previewRef.current.visible = false;
      validRef.current = false;
      return;
    }

    const [px, py, pz] = foundPos;
    positionRef.current = foundPos;
    previewRef.current.visible = true;
    previewRef.current.position.set(px, py, pz);

    // Validate placement
    let valid = true;

    // Check player range (20 world units)
    const playerPos = useGameStore.getState().player.position;
    const dpx = playerPos[0] - px, dpz = playerPos[2] - pz;
    if (Math.sqrt(dpx * dpx + dpz * dpz) > 40) {
      valid = false;
    }

    // Check ground support: all bottom-layer blocks need solid terrain below
    if (valid) {
      for (const b of blocks) {
        if (b.y !== 0) continue; // Only check bottom layer
        const wx = px + b.x * VOXEL_SIZE + VOXEL_SIZE / 2;
        const wy = py - VOXEL_SIZE / 2; // Block below the foundation
        const wz = pz + b.z * VOXEL_SIZE + VOXEL_SIZE / 2;
        if (!isSolid(chunkManager.getBlock(wx, wy, wz))) {
          valid = false;
          break;
        }
      }
    }

    // Check overlap with existing construction sites
    if (valid) {
      const sites = useGameStore.getState().constructionSites;
      for (const site of sites) {
        const sb = getBuildingById(site.buildingId);
        if (!sb) continue;
        const [sx, sy, sz] = site.position;
        // Simple AABB overlap check
        const overlapX = px < sx + sb.size.width * VOXEL_SIZE && px + building.size.width * VOXEL_SIZE > sx;
        const overlapY = py < sy + sb.size.height * VOXEL_SIZE && py + building.size.height * VOXEL_SIZE > sy;
        const overlapZ = pz < sz + sb.size.depth * VOXEL_SIZE && pz + building.size.depth * VOXEL_SIZE > sz;
        if (overlapX && overlapY && overlapZ) {
          valid = false;
          break;
        }
      }
    }

    validRef.current = valid;

    // Update ghost block colors (green = valid, red = invalid)
    const children = previewRef.current.children;
    for (let i = 0; i < children.length; i++) {
      const mesh = children[i];
      if (mesh.isMesh && mesh.material) {
        mesh.material.color.setRGB(
          valid ? 0 : 1,
          valid ? 1 : 0,
          0
        );
      }
    }
  });

  // Handle click to place + right-click/Escape to cancel
  useEffect(() => {
    if (!placingBuildingId || !chunkManager) return;

    const handleClick = (e) => {
      if (e.button !== 0) return;
      if (!validRef.current || !building) return;

      const pos = positionRef.current;
      placeConstructionSite(building.id, [...pos], { ...building.cost }, blocks.length);
    };

    const handleContextMenu = (e) => {
      e.preventDefault();
      cancelPlacingBuilding();
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        cancelPlacingBuilding();
      }
    };

    const canvas = gl.domElement;
    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      canvas.removeEventListener('click', handleClick);
      canvas.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [placingBuildingId, building, blocks, chunkManager, gl, placeConstructionSite, cancelPlacingBuilding]);

  if (!building || !blockData) return null;

  return (
    <group ref={previewRef} visible={false}>
      {blockData.map((b, i) => (
        <mesh
          key={i}
          geometry={boxGeo}
          position={[
            b.offset[0] + VOXEL_SIZE / 2,
            b.offset[1] + VOXEL_SIZE / 2,
            b.offset[2] + VOXEL_SIZE / 2,
          ]}
        >
          <meshBasicMaterial
            color="#00ff00"
            transparent
            opacity={0.3}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}
