import React, { Suspense, useEffect, useMemo, useState } from 'react';
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
import { VOXEL_SIZE, CHUNK_SIZE_Y } from '../../systems/chunks/coordinates';
import { isSolid } from '../../systems/chunks/blockTypes';

/**
 * Find the terrain surface Y at a given world (x, z).
 * Scans downward from the top of the chunk to find the highest solid block.
 * Returns world Y of the top surface, or null if no solid block / chunk not loaded.
 */
function getTerrainY(chunkManager, wx, wz) {
  if (!chunkManager) return null;
  const maxVoxelY = CHUNK_SIZE_Y - 1;
  for (let vy = maxVoxelY; vy >= 0; vy--) {
    const worldY = vy * VOXEL_SIZE + VOXEL_SIZE / 2;
    const block = chunkManager.getBlock(wx, worldY, wz);
    if (isSolid(block)) {
      // Return the top surface of this block
      return (vy + 1) * VOXEL_SIZE;
    }
  }
  return null;
}

/**
 * Wrapper that computes terrain Y for a rift and passes it to RiftVisual.
 */
const RiftVisualWithTerrainY = React.memo(({ rift, chunkManager, isNight }) => {
  const [y, setY] = useState(null);

  useEffect(() => {
    if (!chunkManager) return;

    const computeY = () => {
      const terrainY = getTerrainY(chunkManager, rift.x, rift.z);
      if (terrainY != null) {
        setY(terrainY + 0.1);
        return true;
      }
      return false;
    };

    // Try immediately
    if (computeY()) return;

    // Retry every 500ms until chunk loads
    const interval = setInterval(() => {
      if (computeY()) clearInterval(interval);
    }, 500);

    return () => clearInterval(interval);
  }, [chunkManager, rift.x, rift.z]);

  // Don't render until we have a valid Y (avoids underground flicker)
  if (y === null) return null;

  return <RiftVisual x={rift.x} y={y} z={rift.z} isNight={isNight} />;
});

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

  // Store chunkManager reference for other systems (auto-jump, etc.)
  useEffect(() => {
    if (isReady && chunkManager) {
      useGameStore.getState().setChunkManager(chunkManager);
    }
  }, [isReady, chunkManager]);

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
      <RiftController chunkManager={isReady ? chunkManager : null} />

      {/* Rift visuals — render nearest rifts with terrain-aligned Y */}
      {isReady && chunkManager && rifts.slice(0, 3).map((rift) => (
        <RiftVisualWithTerrainY key={rift.id} rift={rift} chunkManager={chunkManager} isNight={isNight} />
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
