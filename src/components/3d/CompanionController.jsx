/**
 * CompanionController.jsx — Invisible R3F component that syncs CompanionAISystem
 * state to the Zustand store for rendering by Companion.jsx.
 *
 * Also handles companion movement toward the player.
 */

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import useGameStore from '../../stores/useGameStore';

const CompanionController = () => {
  const lastSyncRef = useRef(0);

  useFrame(() => {
    const state = useGameStore.getState();
    if (state.gameState !== 'playing') return;
    if (!state.companion.active) return;

    const now = state.worldTime.elapsed;
    if (now - lastSyncRef.current < 0.5) return; // Sync every 0.5s
    lastSyncRef.current = now;

    // Sync companion position: follow behind and to the side of the player
    const pp = state.player.position;
    const facing = state.player.facingAngle || 0;

    // Offset: 3 units behind + 2 units to the right
    const followDist = 3;
    const sideOffset = 2;
    const targetX = pp[0] - Math.sin(facing) * followDist + Math.cos(facing) * sideOffset;
    const targetZ = pp[2] - Math.cos(facing) * followDist - Math.sin(facing) * sideOffset;

    const companion = state.companion;
    const cx = companion.position[0];
    const cz = companion.position[2];

    // Smooth movement toward target
    const dx = targetX - cx;
    const dz = targetZ - cz;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist > 1.5) {
      const speed = Math.min(dist * 0.3, 4); // Proportional speed, cap at 4
      const moveX = cx + (dx / dist) * speed;
      const moveZ = cz + (dz / dist) * speed;

      state.setCompanionState({
        position: [moveX, pp[1], moveZ],
        state: 'FOLLOWING',
      });
    } else {
      state.setCompanionState({
        position: [companion.position[0], pp[1], companion.position[2]],
        state: 'IDLE',
      });
    }

    // Sync bonding: increase bond when near player
    const aiManager = state.aiSystemManager;
    if (aiManager && aiManager.companionSystem) {
      const active = aiManager.companionSystem.getActiveCompanion?.();
      if (active) {
        state.setCompanionState({
          health: active.health ?? companion.health,
          maxHealth: active.maxHealth ?? companion.maxHealth,
          bondLevel: active.bondLevel ?? companion.bondLevel,
        });
      }
    }
  });

  return null;
};

export default CompanionController;
