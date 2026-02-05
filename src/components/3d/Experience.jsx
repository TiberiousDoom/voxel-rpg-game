import React, { Suspense, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import Player from './Player';
import Enemy from './Enemy';
import Projectile from './Projectile';
import TouchControls from './TouchControls';
import CameraRotateControls from './CameraRotateControls';
import TargetMarker from './TargetMarker';
import DamageNumber from './DamageNumber';
import XPOrb from './XPOrb';
import ParticleEffect from './ParticleEffect';
import ChunkRenderer from './ChunkRenderer';
import BlockInteraction from './BlockInteraction';
import useGameStore from '../../stores/useGameStore';
import { useChunkSystem } from '../../hooks/useChunkSystem';

/**
 * Experience component - Main 3D scene container
 */
const Experience = () => {
  const projectiles = useGameStore((state) => state.projectiles);
  const targetMarkers = useGameStore((state) => state.targetMarkers);
  const damageNumbers = useGameStore((state) => state.damageNumbers);
  const xpOrbs = useGameStore((state) => state.xpOrbs);
  const particleEffects = useGameStore((state) => state.particleEffects);
  const removeDamageNumber = useGameStore((state) => state.removeDamageNumber);
  const removeXPOrb = useGameStore((state) => state.removeXPOrb);
  const removeParticleEffect = useGameStore((state) => state.removeParticleEffect);
  const playerPosition = useGameStore((state) => state.player.position);

  // Initialize chunk system
  const {
    isReady,
    chunkManager,
    workerPool,
    updatePlayerPosition,
    update: updateChunks,
  } = useChunkSystem({
    seed: 12345,
    viewDistance: 4,
  });

  // Update chunk system based on player position
  useEffect(() => {
    if (isReady && playerPosition) {
      updatePlayerPosition(playerPosition[0], playerPosition[2]);
    }
  }, [isReady, playerPosition, updatePlayerPosition]);

  // Update chunk system every frame
  useFrame((state, delta) => {
    if (isReady) {
      updateChunks(delta);
    }
  });

  return (
    <>
      {/* Touch/Click controls */}
      <TouchControls />

      {/* Camera rotation controls */}
      <CameraRotateControls />

      {/* Basic sky color */}
      <color attach="background" args={['#87ceeb']} />

      {/* Ambient light for general illumination */}
      <ambientLight intensity={0.6} />

      {/* Directional light (sun) - no shadows for performance */}
      <directionalLight
        position={[50, 50, 25]}
        intensity={0.8}
      />

      {/* Fog for depth - pushed back to see more terrain */}
      <fog attach="fog" args={['#87ceeb', 150, 400]} />

      {/* Physics world */}
      <Physics gravity={[0, -20, 0]}>
        {/* Player - outside Suspense for reliable physics */}
        <Player />

        {/* Enemies - spawn above terrain, will land on chunk trimesh colliders */}
        <Enemy position={[10, 12, 10]} name="Slime" />
        <Enemy position={[-15, 12, 8]} name="Goblin" />
        <Enemy position={[8, 12, -12]} name="Orc" />
        <Enemy position={[-10, 12, -15]} name="Skeleton" />

        <Suspense fallback={null}>
          {/* Chunk-based terrain */}
          {isReady && chunkManager && workerPool && (
            <>
              <ChunkRenderer
                chunkManager={chunkManager}
                workerPool={workerPool}
              />
              <BlockInteraction chunkManager={chunkManager} />
            </>
          )}

          {/* Projectiles - inside physics for collision detection */}
          {projectiles.map((proj) => (
            <Projectile key={proj.id} {...proj} />
          ))}

          {/* XP Orbs */}
          {xpOrbs.map((orb) => (
            <XPOrb key={orb.id} {...orb} onCollect={removeXPOrb} />
          ))}

          {/* TODO: Add interactable objects */}
        </Suspense>
      </Physics>

      {/* Particle Effects (outside physics) */}
      {particleEffects.map((effect) => (
        <ParticleEffect
          key={effect.id}
          {...effect}
          onComplete={removeParticleEffect}
        />
      ))}

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
