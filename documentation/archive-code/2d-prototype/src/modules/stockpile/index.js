/**
 * Stockpile Module - Resource storage zones for NPC logistics
 *
 * This module provides designated areas where NPCs can store and retrieve
 * resources for construction and other activities.
 *
 * Components:
 * - Stockpile: Individual storage zone with slots
 * - StockpileManager: Manages all stockpiles in the world
 * - Resource types and categories
 *
 * Usage:
 *   import { StockpileManager, ResourceType, ResourceCategory } from './modules/stockpile';
 *
 *   const manager = new StockpileManager();
 *   manager.createStockpile({ x: 10, y: 10, z: 0, width: 5, depth: 5 });
 */

export {
  Stockpile,
  StockpileSlot,
  ResourceType,
  ResourceCategory,
  RESOURCE_CATEGORIES
} from './Stockpile.js';

export { StockpileManager } from './StockpileManager.js';
