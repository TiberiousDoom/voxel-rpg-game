/**
 * SharedInventoryManager - Manages equipment and items across modes
 */
class SharedInventoryManager {
  constructor(unifiedState) {
    this.state = unifiedState;

    // Item ID counter
    this.nextItemId = 1;
  }

  /**
   * Add equipment to inventory
   * @param {Object} item - Equipment item
   * @returns {string} Item ID
   */
  addEquipment(item) {
    const itemWithId = {
      id: `equip_${this.nextItemId++}`,
      ...item,
      addedAt: Date.now()
    };

    this.state.sharedInventory.equipment.push(itemWithId);
    return itemWithId.id;
  }

  /**
   * Add consumable to inventory
   * @param {Object} item - Consumable item
   * @param {number} quantity - Quantity to add
   */
  addConsumable(item, quantity = 1) {
    // Check if we already have this consumable
    const existing = this.state.sharedInventory.consumables.find(
      c => c.name === item.name
    );

    if (existing) {
      existing.quantity += quantity;
    } else {
      this.state.sharedInventory.consumables.push({
        id: `cons_${this.nextItemId++}`,
        ...item,
        quantity,
        addedAt: Date.now()
      });
    }
  }

  /**
   * Add material to inventory
   * @param {string} material - Material type
   * @param {number} quantity - Quantity to add
   */
  addMaterial(material, quantity) {
    const existing = this.state.sharedInventory.materials.find(
      m => m.type === material
    );

    if (existing) {
      existing.quantity += quantity;
    } else {
      this.state.sharedInventory.materials.push({
        id: `mat_${this.nextItemId++}`,
        type: material,
        quantity,
        addedAt: Date.now()
      });
    }
  }

  /**
   * Remove item from inventory
   * @param {string} category - 'equipment' | 'consumables' | 'materials'
   * @param {string} itemId - Item ID
   * @returns {boolean} Success
   */
  removeItem(category, itemId) {
    const items = this.state.sharedInventory[category];
    const index = items.findIndex(item => item.id === itemId);

    if (index >= 0) {
      items.splice(index, 1);
      return true;
    }

    return false;
  }

  /**
   * Use consumable
   * @param {string} itemId - Consumable ID
   * @returns {Object} Item used (or null if not found)
   */
  useConsumable(itemId) {
    const consumable = this.state.sharedInventory.consumables.find(
      c => c.id === itemId
    );

    if (!consumable) return null;

    consumable.quantity--;

    if (consumable.quantity <= 0) {
      this.removeItem('consumables', itemId);
    }

    return consumable;
  }

  /**
   * Get all equipment
   * @returns {Array} Equipment items
   */
  getEquipment() {
    return [...this.state.sharedInventory.equipment];
  }

  /**
   * Get all consumables
   * @returns {Array} Consumable items
   */
  getConsumables() {
    return [...this.state.sharedInventory.consumables];
  }

  /**
   * Get all materials
   * @returns {Array} Material items
   */
  getMaterials() {
    return [...this.state.sharedInventory.materials];
  }

  /**
   * Get item by ID
   * @param {string} itemId - Item ID
   * @returns {Object} Item (or null if not found)
   */
  getItem(itemId) {
    for (const category of ['equipment', 'consumables', 'materials']) {
      const item = this.state.sharedInventory[category].find(
        i => i.id === itemId
      );
      if (item) return item;
    }
    return null;
  }

  /**
   * Get all items across all categories
   * @returns {Array} All items
   */
  getAllItems() {
    return [
      ...this.state.sharedInventory.equipment,
      ...this.state.sharedInventory.consumables,
      ...this.state.sharedInventory.materials
    ];
  }

  /**
   * Get inventory statistics
   * @returns {Object} Stats
   */
  getStats() {
    return {
      equipmentCount: this.state.sharedInventory.equipment.length,
      consumableCount: this.state.sharedInventory.consumables.reduce(
        (sum, c) => sum + c.quantity, 0
      ),
      materialCount: this.state.sharedInventory.materials.reduce(
        (sum, m) => sum + m.quantity, 0
      )
    };
  }
}

export default SharedInventoryManager;
