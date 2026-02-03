/**
 * InventoryManager - Manages player inventory
 *
 * Handles item storage, stacking, and quick slots.
 */

import { getEventBus } from '@core/EventBus';
import { getResourceManager, ResourceDefinition } from './ResourceManager';

// ============================================================================
// Inventory Types
// ============================================================================

export interface InventorySlot {
  resourceId: string | null;
  quantity: number;
  durability?: number;  // For tools/weapons
}

export interface InventoryConfig {
  size: number;           // Total inventory slots
  quickSlots: number;     // Number of quick access slots
}

const DEFAULT_CONFIG: InventoryConfig = {
  size: 30,
  quickSlots: 9,
};

// ============================================================================
// InventoryManager Implementation
// ============================================================================

export class InventoryManager {
  private slots: InventorySlot[] = [];
  private config: InventoryConfig;
  private selectedQuickSlot: number = 0;

  constructor(config: Partial<InventoryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initializeSlots();
  }

  /**
   * Initialize empty slots
   */
  private initializeSlots(): void {
    this.slots = [];
    for (let i = 0; i < this.config.size; i++) {
      this.slots.push({ resourceId: null, quantity: 0 });
    }
  }

  /**
   * Get all slots
   */
  public getSlots(): readonly InventorySlot[] {
    return this.slots;
  }

  /**
   * Get a specific slot
   */
  public getSlot(index: number): InventorySlot | undefined {
    return this.slots[index];
  }

  /**
   * Get quick slots (first N slots)
   */
  public getQuickSlots(): readonly InventorySlot[] {
    return this.slots.slice(0, this.config.quickSlots);
  }

  /**
   * Get selected quick slot index
   */
  public getSelectedQuickSlot(): number {
    return this.selectedQuickSlot;
  }

  /**
   * Set selected quick slot
   */
  public setSelectedQuickSlot(index: number): void {
    if (index >= 0 && index < this.config.quickSlots) {
      this.selectedQuickSlot = index;
    }
  }

  /**
   * Get item in hand (selected quick slot)
   */
  public getItemInHand(): InventorySlot {
    return this.slots[this.selectedQuickSlot];
  }

  /**
   * Add an item to inventory
   * Returns the amount that couldn't be added (0 if all added)
   */
  public addItem(resourceId: string, quantity: number = 1, durability?: number): number {
    const resourceManager = getResourceManager();
    const resource = resourceManager.getResource(resourceId);
    if (!resource) {
      console.warn(`[InventoryManager] Unknown resource: ${resourceId}`);
      return quantity;
    }

    let remaining = quantity;
    const stackSize = resource.stackSize;

    // First, try to add to existing stacks
    if (stackSize > 1) {
      for (const slot of this.slots) {
        if (remaining <= 0) break;
        if (slot.resourceId === resourceId && slot.quantity < stackSize) {
          const canAdd = Math.min(remaining, stackSize - slot.quantity);
          slot.quantity += canAdd;
          remaining -= canAdd;
        }
      }
    }

    // Then, add to empty slots
    for (const slot of this.slots) {
      if (remaining <= 0) break;
      if (slot.resourceId === null) {
        const canAdd = Math.min(remaining, stackSize);
        slot.resourceId = resourceId;
        slot.quantity = canAdd;
        slot.durability = durability ?? resource.durability;
        remaining -= canAdd;
      }
    }

    // Emit event for what was added
    if (remaining < quantity) {
      const eventBus = getEventBus();
      eventBus.emit('player:inventoryChanged', {
        itemId: resourceId,
        delta: quantity - remaining,
      });
    }

    return remaining;
  }

  /**
   * Remove an item from inventory
   * Returns the amount actually removed
   */
  public removeItem(resourceId: string, quantity: number = 1): number {
    let remaining = quantity;

    // Remove from slots in reverse order (preserves quick slots longer)
    for (let i = this.slots.length - 1; i >= 0; i--) {
      if (remaining <= 0) break;
      const slot = this.slots[i];
      if (slot.resourceId === resourceId) {
        const canRemove = Math.min(remaining, slot.quantity);
        slot.quantity -= canRemove;
        remaining -= canRemove;

        if (slot.quantity <= 0) {
          slot.resourceId = null;
          slot.quantity = 0;
          slot.durability = undefined;
        }
      }
    }

    const removed = quantity - remaining;

    if (removed > 0) {
      const eventBus = getEventBus();
      eventBus.emit('player:inventoryChanged', {
        itemId: resourceId,
        delta: -removed,
      });
    }

    return removed;
  }

  /**
   * Check if inventory has a certain amount of an item
   */
  public hasItem(resourceId: string, quantity: number = 1): boolean {
    return this.getItemCount(resourceId) >= quantity;
  }

  /**
   * Get total count of an item
   */
  public getItemCount(resourceId: string): number {
    return this.slots
      .filter(slot => slot.resourceId === resourceId)
      .reduce((sum, slot) => sum + slot.quantity, 0);
  }

  /**
   * Check if inventory has space for items
   */
  public hasSpace(resourceId: string, quantity: number = 1): boolean {
    const resourceManager = getResourceManager();
    const resource = resourceManager.getResource(resourceId);
    if (!resource) return false;

    const stackSize = resource.stackSize;
    let canFit = 0;

    // Check existing stacks
    if (stackSize > 1) {
      for (const slot of this.slots) {
        if (slot.resourceId === resourceId) {
          canFit += stackSize - slot.quantity;
        }
      }
    }

    // Check empty slots
    for (const slot of this.slots) {
      if (slot.resourceId === null) {
        canFit += stackSize;
      }
    }

    return canFit >= quantity;
  }

  /**
   * Get number of empty slots
   */
  public getEmptySlotCount(): number {
    return this.slots.filter(slot => slot.resourceId === null).length;
  }

  /**
   * Check if inventory is full
   */
  public isFull(): boolean {
    return this.getEmptySlotCount() === 0;
  }

  /**
   * Move item between slots
   */
  public moveItem(fromIndex: number, toIndex: number): boolean {
    if (fromIndex < 0 || fromIndex >= this.slots.length) return false;
    if (toIndex < 0 || toIndex >= this.slots.length) return false;
    if (fromIndex === toIndex) return false;

    const fromSlot = this.slots[fromIndex];
    const toSlot = this.slots[toIndex];

    // If target is empty, just move
    if (toSlot.resourceId === null) {
      toSlot.resourceId = fromSlot.resourceId;
      toSlot.quantity = fromSlot.quantity;
      toSlot.durability = fromSlot.durability;
      fromSlot.resourceId = null;
      fromSlot.quantity = 0;
      fromSlot.durability = undefined;
      return true;
    }

    // If same item type, try to stack
    if (toSlot.resourceId === fromSlot.resourceId) {
      const resourceManager = getResourceManager();
      const resource = resourceManager.getResource(toSlot.resourceId!);
      if (resource && resource.stackSize > 1) {
        const canMove = Math.min(fromSlot.quantity, resource.stackSize - toSlot.quantity);
        toSlot.quantity += canMove;
        fromSlot.quantity -= canMove;
        if (fromSlot.quantity <= 0) {
          fromSlot.resourceId = null;
          fromSlot.quantity = 0;
          fromSlot.durability = undefined;
        }
        return true;
      }
    }

    // Otherwise, swap
    const temp = { ...fromSlot };
    fromSlot.resourceId = toSlot.resourceId;
    fromSlot.quantity = toSlot.quantity;
    fromSlot.durability = toSlot.durability;
    toSlot.resourceId = temp.resourceId;
    toSlot.quantity = temp.quantity;
    toSlot.durability = temp.durability;

    return true;
  }

  /**
   * Use durability on an item (for tools/weapons)
   * Returns true if item broke
   */
  public useDurability(index: number, amount: number = 1): boolean {
    const slot = this.slots[index];
    if (!slot || slot.durability === undefined) return false;

    slot.durability -= amount;
    if (slot.durability <= 0) {
      const resourceId = slot.resourceId;
      slot.resourceId = null;
      slot.quantity = 0;
      slot.durability = undefined;

      const eventBus = getEventBus();
      eventBus.emit('player:inventoryChanged', {
        itemId: resourceId!,
        delta: -1,
      });

      return true; // Item broke
    }

    return false;
  }

  /**
   * Clear the inventory
   */
  public clear(): void {
    this.initializeSlots();
  }

  /**
   * Serialize for saving
   */
  public serialize(): Array<{ itemId: string; quantity: number; durability?: number }> {
    const items: Array<{ itemId: string; quantity: number; durability?: number }> = [];

    for (const slot of this.slots) {
      if (slot.resourceId) {
        items.push({
          itemId: slot.resourceId,
          quantity: slot.quantity,
          durability: slot.durability,
        });
      }
    }

    return items;
  }

  /**
   * Deserialize from save data
   */
  public deserialize(items: Array<{ itemId: string; quantity: number; durability?: number }>): void {
    this.clear();
    for (const item of items) {
      this.addItem(item.itemId, item.quantity, item.durability);
    }
  }
}

// ============================================================================
// Singleton Access
// ============================================================================

let inventoryManagerInstance: InventoryManager | null = null;

export function getInventoryManager(): InventoryManager {
  if (!inventoryManagerInstance) {
    inventoryManagerInstance = new InventoryManager();
  }
  return inventoryManagerInstance;
}
