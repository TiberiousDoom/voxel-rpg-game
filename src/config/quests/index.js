/**
 * Quest definitions index
 * Combines all quest definition files
 */

import starterQuests from './starter-quests.json';
import sideQuests from './side-quests.json';
import dailyQuests from './daily-quests.json';
import dungeonQuests from './dungeon-quests.json';

/**
 * All quest definitions
 */
export const ALL_QUESTS = [
  ...starterQuests,
  ...sideQuests,
  ...dailyQuests,
  ...dungeonQuests
];

/**
 * Quests by category
 */
export const QUESTS_BY_CATEGORY = {
  MAIN: [...starterQuests, ...dungeonQuests.filter(q => q.category === 'MAIN')],
  SIDE: sideQuests,
  DAILY: [...dailyQuests, ...dungeonQuests.filter(q => q.category === 'DAILY')],
  DUNGEON: dungeonQuests
};

/**
 * Get quest by ID
 * @param {string} questId - Quest ID
 * @returns {Object|null} - Quest definition or null
 */
export function getQuestById(questId) {
  return ALL_QUESTS.find(q => q.id === questId) || null;
}

/**
 * Get quests by level requirement
 * @param {number} minLevel - Minimum level
 * @param {number} maxLevel - Maximum level
 * @returns {Array<Object>} - Quest definitions
 */
export function getQuestsByLevel(minLevel, maxLevel = Infinity) {
  return ALL_QUESTS.filter(q =>
    q.levelRequirement >= minLevel &&
    q.levelRequirement <= maxLevel
  );
}

/**
 * Get starter quests (level 1-3)
 * @returns {Array<Object>} - Quest definitions
 */
export function getStarterQuests() {
  return getQuestsByLevel(1, 3);
}

export default ALL_QUESTS;
