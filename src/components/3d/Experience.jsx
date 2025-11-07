import React, { Suspense } from 'react';
import { Physics } from '@react-three/rapier';
import { Sky, Environment } from '@react-three/drei';
import Player from './Player';
import VoxelTerrain from './VoxelTerrain';
import Enemy from './Enemy';
import Projectile from './Projectile';
import useGameStore from '../../stores/useGameStore';

/**
 * Experience component - Main 3D scene container
 */
const Experience = () => {
  const projectiles = useGameStore((state) => state.projectiles);

  return (
    <>
      {/* Sky and lighting */}
      <Sky
        distance={450000}
        sunPosition={[100, 20, 100]}
        inclination={0.6}
        azimuth={0.25}
      />

      {/* Ambient light for general illumination */}
      <ambientLight intensity={0.5} />

      {/* Directional light (sun) with shadows */}
      <directionalLight
        position={[50, 50, 25]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={200}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
      />

      {/* Fog for depth */}
      <fog attach="fog" args={['#87ceeb', 50, 200]} />

      {/* Physics world */}
      <Physics gravity={[0, -20, 0]}>
        <Suspense fallback={null}>
          {/* Terrain */}
          <VoxelTerrain size={50} voxelSize={2} />

          {/* Player */}
          <Player />

          {/* Enemies - spawn a few for testing */}
          <Enemy position={[10, 5, 10]} />
          <Enemy position={[-15, 5, 8]} />
          <Enemy position={[8, 5, -12]} />
          <Enemy position={[-10, 5, -15]} />

          {/* TODO: Add interactable objects */}
        </Suspense>
      </Physics>

      {/* Projectiles (outside physics for now) */}
      {projectiles.map((proj) => (
        <Projectile key={proj.id} {...proj} />
      ))}

      {/* Environment for reflections */}
      <Environment preset="sunset" />
    </>
  );
};

export default Experience;
