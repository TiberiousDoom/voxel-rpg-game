import React, { Suspense } from 'react';
import { Physics, RigidBody } from '@react-three/rapier';
import Player from './Player';
import VoxelTerrain from './VoxelTerrain';
import Enemy from './Enemy';
import Projectile from './Projectile';
import TouchControls from './TouchControls';
import TargetMarker from './TargetMarker';
import DamageNumber from './DamageNumber';
import useGameStore from '../../stores/useGameStore';

/**
 * Experience component - Main 3D scene container
 */
const Experience = () => {
  const projectiles = useGameStore((state) => state.projectiles);
  const targetMarkers = useGameStore((state) => state.targetMarkers);
  const damageNumbers = useGameStore((state) => state.damageNumbers);
  const removeDamageNumber = useGameStore((state) => state.removeDamageNumber);

  return (
    <>
      {/* Touch/Click controls */}
      <TouchControls />

      {/* Basic sky color */}
      <color attach="background" args={['#87ceeb']} />

      {/* Ambient light for general illumination */}
      <ambientLight intensity={0.6} />

      {/* Directional light (sun) - no shadows for performance */}
      <directionalLight
        position={[50, 50, 25]}
        intensity={0.8}
      />

      {/* Fog for depth */}
      <fog attach="fog" args={['#87ceeb', 50, 150]} />

      {/* Physics world */}
      <Physics gravity={[0, -20, 0]}>
        <Suspense fallback={null}>
          {/* Terrain - visual only */}
          <VoxelTerrain size={40} voxelSize={2} />

          {/* Ground plane - provides collision */}
          <RigidBody type="fixed" colliders="cuboid" position={[0, 0, 0]}>
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[200, 1, 200]} />
              <meshStandardMaterial color="#228b22" transparent opacity={0} />
            </mesh>
          </RigidBody>

          {/* Player */}
          <Player />

          {/* Enemies - spawn a few for testing */}
          <Enemy position={[10, 5, 10]} />
          <Enemy position={[-15, 5, 8]} />
          <Enemy position={[8, 5, -12]} />
          <Enemy position={[-10, 5, -15]} />

          {/* Projectiles - inside physics for collision detection */}
          {projectiles.map((proj) => (
            <Projectile key={proj.id} {...proj} />
          ))}

          {/* TODO: Add interactable objects */}
        </Suspense>
      </Physics>

      {/* Target markers for tap-to-move/attack feedback */}
      {targetMarkers.map((marker) => (
        <TargetMarker
          key={marker.id}
          position={marker.position}
          color={marker.color || '#00ff00'}
          duration={2}
        />
      ))}

      {/* Floating damage numbers */}
      {damageNumbers.map((dmg) => (
        <DamageNumber
          key={dmg.id}
          position={dmg.position}
          damage={dmg.damage}
          id={dmg.id}
          onComplete={removeDamageNumber}
        />
      ))}
    </>
  );
};

export default Experience;
