/**
 * SurvivalTick.jsx — Runs survival systems each frame
 *
 * Ticks hunger drain, applies starvation damage, checks shelter status,
 * and updates the store. Runs inside the R3F Canvas as an invisible component.
 */

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import useGameStore from '../../stores/useGameStore';
import { tickHunger } from '../../systems/survival/HungerSystem';
import { checkShelter } from '../../systems/survival/ShelterDetector';
import { SHELTER_CHECK_INTERVAL } from '../../data/tuning';

const SurvivalTick = ({ chunkManager }) => {
  const starvationAccum = useRef(0);
  const lastShelterCheck = useRef(0);

  useFrame((_, delta) => {
    const state = useGameStore.getState();

    // Don't tick survival during intro/pause/death
    if (state.gameState !== 'playing') return;

    // Check if player is sprinting
    const isSprinting = state.player.isSprinting || false;

    // Throttled shelter detection
    const now = Date.now();
    if (chunkManager && now - lastShelterCheck.current >= SHELTER_CHECK_INTERVAL) {
      lastShelterCheck.current = now;
      const shelterResult = checkShelter(state.player.position, chunkManager);
      state.updateShelter(shelterResult);
    }

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
        state.dealDamageToPlayer(dmg, 'Starved to death');
      }
    } else {
      starvationAccum.current = 0;
    }
  });

  return null; // Invisible component
};

export default SurvivalTick;
