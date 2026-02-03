/**
 * Module 2: Building Types & Progression System
 *
 * Tier Advancement Rules (Wrapper/Re-export)
 *
 * NOTE: Tier advancement conditions have been moved to Module 3 (Resource Economy)
 * because progression requirements are fundamentally about resource/economy milestones.
 *
 * Module 2 now re-exports these from Module 3 to maintain backwards compatibility
 * while establishing Module 3 as the authoritative source for progression rules.
 *
 * This module works with Foundation and Resource Economy modules to check
 * if conditions for tier advancement are met.
 */

// Import tier progression requirements from Module 3
import {
  TIER_PROGRESSION_REQUIREMENTS,
  isBuildingRequirementMet,
  areBuildingRequirementsMet,
  isResourceSpentRequirementMet,
  isTimeRequirementMet,
  checkTierUnlockConditions,
  getTierProgressionRequirements,
  getTierRequirementsDescription,
} from '../../resource-economy/utils/resourceCalculations';

// Re-export for backwards compatibility
// Code that previously imported from Module 2 can still do so
export {
  TIER_PROGRESSION_REQUIREMENTS as TIER_ADVANCEMENT_CONDITIONS,
  isBuildingRequirementMet,
  areBuildingRequirementsMet,
  isResourceSpentRequirementMet,
  isTimeRequirementMet,
  checkTierUnlockConditions,
  getTierProgressionRequirements as getTierAdvancementConditions,
  getTierRequirementsDescription,
};

/**
 * Get the next tier that can be unlocked
 *
 * @param {Object} currentTierDef - Current tier definition
 * @returns {string|null} Next tier ID or null if at max
 */
export function getNextTierToUnlock(currentTierDef) {
  // Return the nextTier from the current tier's progression requirements
  if (!currentTierDef) return null;

  const currentTierReqs = getTierProgressionRequirements(currentTierDef);
  if (!currentTierReqs) return null;

  return currentTierReqs.nextTier || null;
}
