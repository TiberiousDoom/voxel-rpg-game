/**
 * Building Templates Index
 *
 * Exports all pre-defined building blueprints organized by tier.
 */

import { getSurvivalBlueprints } from './SurvivalTemplates.js';
import { getSettlementBlueprints } from './SettlementTemplates.js';

// Re-export individual blueprints
export * from './SurvivalTemplates.js';
export * from './SettlementTemplates.js';

/**
 * Get all blueprints from all tiers
 * @returns {Array<Blueprint>}
 */
export function getAllTemplates() {
  return [
    ...getSurvivalBlueprints(),
    ...getSettlementBlueprints()
  ];
}

/**
 * Register all templates with a ConstructionManager
 * @param {ConstructionManager} manager
 */
export function registerAllTemplates(manager) {
  const templates = getAllTemplates();
  for (const template of templates) {
    manager.registerBlueprint(template);
  }
  return templates.length;
}
