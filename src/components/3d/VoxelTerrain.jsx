import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';

/**
 * Simple noise function for terrain generation
 * @param {number} x - X coordinate
 * @param {number} z - Z coordinate
 * @returns {number} Height value
 */
function simpleNoise(x, z) {
  // Simple pseudo-random terrain using sine waves
  return (
    Math.sin(x * 0.1) * Math.cos(z * 0.1) * 3 +
    Math.sin(x * 0.05) * Math.cos(z * 0.05) * 5 +
    Math.sin(x * 0.02) * 2
  );
}

/**
 * VoxelTerrain component - renders terrain using InstancedMesh for performance
 * @param {Object} props
 * @param {number} props.size - Size of terrain grid (default 50)
 * @param {number} props.voxelSize - Size of each voxel (default 2)
 */
const VoxelTerrain = ({ size = 50, voxelSize = 2 }) => {
  const meshRef = useRef();

  // Generate voxel positions and colors
  const { positions, colors, count } = useMemo(() => {
    const voxels = [];

    // Generate terrain (step by 2 for better performance)
    for (let x = -size / 2; x < size / 2; x += 2) {
      for (let z = -size / 2; z < size / 2; z += 2) {
        // Get height from noise function
        const height = Math.floor(simpleNoise(x, z));

        // Create voxels from ground level up to height
        for (let y = 0; y <= Math.max(0, height); y++) {
          // Determine voxel color based on height
          let color;
          if (y === 0) {
            // Bedrock - dark gray
            color = new THREE.Color(0x333333);
          } else if (y < height - 2) {
            // Stone - gray
            color = new THREE.Color(0x808080);
          } else if (y < height) {
            // Dirt - brown
            color = new THREE.Color(0x8b4513);
          } else {
            // Grass - green
            color = new THREE.Color(0x228b22);
          }

          voxels.push({
            position: [x * voxelSize, y * voxelSize, z * voxelSize],
            color,
          });
        }
      }
    }

    const positions = [];
    const colors = [];

    voxels.forEach((voxel) => {
      positions.push(voxel.position);
      colors.push([voxel.color.r, voxel.color.g, voxel.color.b]);
    });

    return { positions, colors, count: voxels.length };
  }, [size, voxelSize]);

  // Set up instanced mesh transforms - useEffect runs after ref is assigned
  useEffect(() => {
    if (!meshRef.current || count === 0) return;

    const tempObject = new THREE.Object3D();
    const tempColor = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const [x, y, z] = positions[i];
      tempObject.position.set(x, y, z);
      tempObject.scale.set(voxelSize, voxelSize, voxelSize);
      tempObject.updateMatrix();

      meshRef.current.setMatrixAt(i, tempObject.matrix);

      // Set color
      tempColor.setRGB(colors[i][0], colors[i][1], colors[i][2]);
      meshRef.current.setColorAt(i, tempColor);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  }, [positions, colors, count, voxelSize]);

  if (count === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[null, null, count]}
      receiveShadow
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial vertexColors />
    </instancedMesh>
  );
};

export default VoxelTerrain;
