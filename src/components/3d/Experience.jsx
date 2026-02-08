import React, { Suspense, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import Player from './Player';
import Enemy from './Enemy';
import Projectile from './Projectile';
import TouchControls from './TouchControls';
import CameraRotateControls from './CameraRotateControls';
import FirstPersonControls from './FirstPersonControls';
import TargetMarker from './TargetMarker';
import DamageNumber from './DamageNumber';
import XPOrb from './XPOrb';
import LootDrop from './LootDrop';
import ParticleEffect from './ParticleEffect';
import ChunkRenderer from './ChunkRenderer';
import BlockInteraction from './BlockInteraction';
import ScreenShakeController from './ScreenShakeController';
import DayNightCycle from './DayNightCycle';
import SurvivalTick from './SurvivalTick';
import RiftController from './RiftController';
import RiftVisual from './RiftVisual';
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
  const lootDrops = useGameStore((state) => state.lootDrops);
  const particleEffects = useGameStore((state) => state.particleEffects);
  const removeDamageNumber = useGameStore((state) => state.removeDamageNumber);
  const removeXPOrb = useGameStore((state) => state.removeXPOrb);
  const removeLootDrop = useGameStore((state) => state.removeLootDrop);
  const removeParticleEffect = useGameStore((state) => state.removeParticleEffect);
  const removeTargetMarker = useGameStore((state) => state.removeTargetMarker);
  const playerPosition = useGameStore((state) => state.player.position);
  const riftEnemies = useGameStore((state) => state.enemies);
  const rifts = useGameStore((state) => state.rifts);
  const isNight = useGameStore((state) => state.worldTime.isNight);

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
      {/* Screen shake controller */}
      <ScreenShakeController />

      {/* Touch/Click controls */}
      <TouchControls />

      {/* Camera rotation controls */}
      <CameraRotateControls />

      {/* First-person controls (pointer lock) */}
      <FirstPersonControls />

      {/* Day/night lighting cycle (ambient + directional + sky/fog colors) */}
      {/* DayNightCycle manages scene.background and fog dynamically */}
      <DayNightCycle />

      {/* Survival systems tick (hunger drain, starvation damage, shelter detection) */}
      <SurvivalTick chunkManager={isReady ? chunkManager : null} />

      {/* Rift controller — manages spawning logic */}
      <RiftController />

      {/* Rift visuals — render nearest rifts */}
      {rifts.slice(0, 3).map((rift) => (
        <RiftVisual key={rift.id} x={rift.x} z={rift.z} isNight={isNight} />
      ))}

      {/* Physics world */}
      <Physics gravity={[0, -20, 0]}>
        {/* Player - outside Suspense for reliable physics */}
        <Player />

        {/* Dynamic rift-spawned enemies */}
        {riftEnemies.map((monster) => (
          <Enemy
            key={monster.id}
            position={monster.position}
            type={monster.type}
            name={monster.name}
            monsterData={monster}
          />
        ))}

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

          {/* Loot Drops */}
          {lootDrops.map((loot) => (
            <LootDrop key={loot.id} {...loot} onCollect={removeLootDrop} />
          ))}
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
          id={marker.id}
          position={marker.position}
          color={marker.color || '#00ff00'}
          duration={2}
          onComplete={removeTargetMarker}
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
