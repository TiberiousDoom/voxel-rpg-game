/**
 * FoundationView - Renders all buildings in the 3D scene
 *
 * This component integrates the Foundation Module with the Three.js/React Three Fiber
 * rendering pipeline. It listens to the Foundation store and renders a mesh for each building.
 *
 * Usage in Experience.jsx:
 *   <FoundationView />
 *
 * This component is a pure rendering component. All building logic is in Foundation.
 */

import React, { useMemo } from 'react';
import { RigidBody } from '@react-three/rapier';
import { useFoundationStore } from '../stores/useFoundationStore';
import { getColorForStatus, getDimensions } from '../utils/buildingRegistry';

/**
 * Individual Building Mesh
 *
 * Renders a single building with collision
 */
const FoundationBuilding = ({ building }) => {
  const dimensions = getDimensions(building.type);
  const color = getColorForStatus(building.type, building.status);

  if (!dimensions) {
    console.warn(`Unknown building type: ${building.type}`);
    return null;
  }

  const { width, height, depth } = dimensions;
  const { x, y, z } = building.position;

  return (
    <RigidBody
      type="fixed"
      colliders="cuboid"
      position={[x, y, z]}
      rotation={[0, (building.rotation * Math.PI) / 180, 0]}
      key={building.id}
    >
      <mesh castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial
          color={color}
          metalness={0.3}
          roughness={0.4}
        />
      </mesh>

      {/* Wireframe overlay for selected buildings */}
      {building.isSelected && (
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[width + 0.1, height + 0.1, depth + 0.1]} />
          <meshBasicMaterial
            color={0xffff00}
            transparent
            opacity={0.3}
            wireframe
          />
        </mesh>
      )}

      {/* HP indicator bar (optional - for damaged buildings) */}
      {building.status === 'DAMAGED' && (
        <mesh position={[0, height / 2 + 0.5, 0]}>
          <planeGeometry args={[width, 0.2]} />
          <meshBasicMaterial color={0xff0000} />
        </mesh>
      )}
    </RigidBody>
  );
};

/**
 * FoundationView Component
 *
 * Main component that renders all buildings from the Foundation store.
 * This listens to the Foundation store and updates whenever buildings change.
 */
export const FoundationView = () => {
  const buildings = useFoundationStore((state) => state.getAllBuildings());

  // Memoize the buildings list to prevent unnecessary re-renders
  const buildingsMemo = useMemo(() => buildings, [buildings]);

  return (
    <>
      {buildingsMemo.map((building) => (
        <FoundationBuilding key={building.id} building={building} />
      ))}
    </>
  );
};

/**
 * Building Placement Preview
 *
 * Shows where a building will be placed before confirming.
 * Used in building mode UI.
 */
export const PlacementPreview = ({ buildingType, position, rotation, isValid }) => {
  const dimensions = getDimensions(buildingType);

  if (!dimensions || !position) {
    return null;
  }

  const { width, height, depth } = dimensions;
  const previewColor = isValid ? 0x00ff00 : 0xff0000; // Green if valid, red if not

  return (
    <mesh
      position={[position.x, position.y, position.z]}
      rotation={[0, (rotation * Math.PI) / 180, 0]}
    >
      <boxGeometry args={[width, height, depth]} />
      <meshBasicMaterial
        color={previewColor}
        transparent
        opacity={0.5}
        wireframe
      />
    </mesh>
  );
};

export default FoundationView;
