/**
 * HungerSystem.js — Manages hunger drain, starvation, and food effects
 *
 * Pure logic system — no React. Called each tick with delta time.
 * Reads tuning constants from tuning.js.
 */

import {
  HUNGER_DRAIN_RATE,
  SPRINT_HUNGER_MULTIPLIER,
  HUNGER_WELL_FED,
  HUNGER_STARVING,
  HUNGER_MAX,
  STARVATION_DAMAGE_RATE,
  SHELTER_HUNGER_REDUCTION,
} from '../../data/tuning.js';

/**
 * Get the hunger status label for a given hunger value.
 * @param {number} hunger - Current hunger (0–100)
 * @returns {'well_fed'|'hungry'|'starving'|'famished'}
 */
export function getHungerStatus(hunger) {
  if (hunger <= 0) return 'famished';
  if (hunger < HUNGER_STARVING) return 'starving';
  if (hunger < HUNGER_WELL_FED) return 'hungry';
  return 'well_fed';
}

/**
 * Calculate hunger drain for a tick.
 * @param {number} deltaSeconds - Real seconds elapsed
 * @param {object} options
 * @param {boolean} [options.isSprinting=false]
 * @param {boolean} [options.isInShelter=false]
 * @returns {number} Amount of hunger to subtract (positive value)
 */
export function calculateHungerDrain(deltaSeconds, { isSprinting = false, isInShelter = false } = {}) {
  let rate = HUNGER_DRAIN_RATE;

  if (isSprinting) {
    rate *= SPRINT_HUNGER_MULTIPLIER;
  }
  if (isInShelter) {
    rate *= (1 - SHELTER_HUNGER_REDUCTION);
  }

  return rate * deltaSeconds;
}

/**
 * Calculate starvation damage for a tick.
 * Only applies when hunger === 0.
 * @param {number} deltaSeconds - Real seconds elapsed
 * @param {number} currentHunger - Current hunger value
 * @returns {number} Damage to deal (positive value, 0 if not starving)
 */
export function calculateStarvationDamage(deltaSeconds, currentHunger) {
  if (currentHunger > 0) return 0;
  return STARVATION_DAMAGE_RATE * deltaSeconds;
}

/**
 * Determine speed modifier from hunger.
 * @param {number} hunger - Current hunger value
 * @returns {number} Speed multiplier (1.0 = normal, 0.8 = -20%)
 */
export function getHungerSpeedModifier(hunger) {
  if (hunger < HUNGER_STARVING) return 0.8;
  return 1.0;
}

/**
 * Determine if health regen is allowed based on hunger.
 * @param {number} hunger - Current hunger value
 * @returns {number} Health regen multiplier (1.0, 0.5, or 0.0)
 */
export function getHealthRegenModifier(hunger) {
  if (hunger < HUNGER_STARVING) return 0;     // No regen
  if (hunger < HUNGER_WELL_FED) return 0.5;   // Half regen
  return 1.0;                                   // Full regen
}

/**
 * Process a full hunger tick. Returns the new state to apply.
 * @param {number} currentHunger - Current hunger value (0–100)
 * @param {number} deltaSeconds - Real seconds elapsed
 * @param {object} options
 * @param {boolean} [options.isSprinting=false]
 * @param {boolean} [options.isInShelter=false]
 * @returns {{ hunger: number, status: string, starvationDamage: number, speedModifier: number, healthRegenModifier: number }}
 */
export function tickHunger(currentHunger, deltaSeconds, options = {}) {
  const drain = calculateHungerDrain(deltaSeconds, options);
  const newHunger = Math.max(0, currentHunger - drain);
  const starvationDamage = calculateStarvationDamage(deltaSeconds, newHunger);

  return {
    hunger: newHunger,
    status: getHungerStatus(newHunger),
    starvationDamage,
    speedModifier: getHungerSpeedModifier(newHunger),
    healthRegenModifier: getHealthRegenModifier(newHunger),
  };
}

/**
 * Calculate hunger restored from eating food.
 * @param {number} currentHunger - Current hunger
 * @param {number} restoreAmount - Amount to restore
 * @returns {number} New hunger value (clamped to max)
 */
export function eatFood(currentHunger, restoreAmount) {
  return Math.min(HUNGER_MAX, currentHunger + restoreAmount);
}
