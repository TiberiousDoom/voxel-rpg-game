/**
 * Structure Templates Loader
 * Imports all structure JSON templates
 *
 * Phase 3D: Structure Generation
 */

import smallRuin1 from './small_ruin_1.json';
import smallRuin2 from './small_ruin_2.json';
import largeRuin from './large_ruin.json';
import npcHut1 from './npc_hut_1.json';
import dungeonEntrance from './dungeon_entrance.json';
import caveDungeonEntrance from './cave_dungeon_entrance.json';
import forestDungeonEntrance from './forest_dungeon_entrance.json';
import ruinsDungeonEntrance from './ruins_dungeon_entrance.json';
import stoneTower from './stone_tower.json';
import stoneCircle from './stone_circle.json';
import resourceCamp from './resource_camp.json';

/**
 * All structure templates indexed by ID
 */
export const structureTemplates = {
  small_ruin_1: smallRuin1,
  small_ruin_2: smallRuin2,
  large_ruin: largeRuin,
  npc_hut_1: npcHut1,
  dungeon_entrance: dungeonEntrance, // Generic fallback (kept for compatibility)
  cave_dungeon_entrance: caveDungeonEntrance, // CAVE type - plains/mountains
  forest_dungeon_entrance: forestDungeonEntrance, // FOREST type - forest biome
  ruins_dungeon_entrance: ruinsDungeonEntrance, // RUINS type - desert biome
  stone_tower: stoneTower,
  stone_circle: stoneCircle,
  resource_camp: resourceCamp,
};

/**
 * Get structure template by ID
 * @param {string} id - Template ID
 * @returns {object|null} Template or null
 */
export function getTemplate(id) {
  return structureTemplates[id] || null;
}

/**
 * Get all template IDs
 * @returns {Array<string>} Array of template IDs
 */
export function getTemplateIds() {
  return Object.keys(structureTemplates);
}

/**
 * Get templates by type
 * @param {string} type - Structure type (ruin, dwelling, dungeon, etc.)
 * @returns {Array} Array of matching templates
 */
export function getTemplatesByType(type) {
  return Object.values(structureTemplates).filter(t => t.type === type);
}

/**
 * Get templates that can spawn in biome
 * @param {string} biome - Biome name
 * @returns {Array} Array of eligible templates
 */
export function getTemplatesForBiome(biome) {
  return Object.values(structureTemplates).filter(t =>
    !t.biomes || t.biomes.includes(biome) || t.biomes.includes('any')
  );
}

export default structureTemplates;
