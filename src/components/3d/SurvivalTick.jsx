/**
 * SurvivalTick.jsx — Runs survival systems each frame
 *
 * Ticks hunger drain, applies starvation damage, and updates the store.
 * Runs inside the R3F Canvas as an invisible component.
 */

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import useGameStore from '../../stores/useGameStore';
import { tickHunger } from '../../systems/survival/HungerSystem';

const SurvivalTick = () => {
  const starvationAccum = useRef(0);

  useFrame((_, delta) => {
    const state = useGameStore.getState();

    // Don't tick survival during intro/pause/death
    if (state.gameState !== 'playing') return;

    // Check if player is sprinting (shift held + moving)
    const isSprinting = false; // TODO: wire to actual sprint state when available

    // Check shelter state
    const isInShelter = state.shelter.isFullShelter || state.shelter.isPartialShelter;

    // Tick hunger
    const result = tickHunger(state.hunger.current, delta, {
      isSprinting,
      isInShelter,
    });

    // Update hunger state in store
    state.updateHunger({
      current: result.hunger,
      isStarving: result.hunger <= 0,
      status: result.status,
    });

    // Apply starvation damage
    if (result.starvationDamage > 0) {
      starvationAccum.current += result.starvationDamage;
      // Apply in integer chunks to avoid spamming tiny damage numbers
      if (starvationAccum.current >= 1) {
        const dmg = Math.floor(starvationAccum.current);
        starvationAccum.current -= dmg;
        state.dealDamageToPlayer(dmg);
      }
    } else {
      starvationAccum.current = 0;
    }
  });

  return null; // Invisible component
};

export default SurvivalTick;
