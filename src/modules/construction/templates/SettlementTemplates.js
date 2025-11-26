/**
 * SettlementTemplates.js - Settlement tier building blueprints
 *
 * More advanced structures for established settlements.
 * Higher resource requirements, larger footprints.
 */

import { createBlueprint, BlueprintCategory, BlueprintTier } from '../Blueprint.js';
import { BlockType } from '../../voxel/BlockTypes.js';

/**
 * Wooden House - 5x5x3, proper housing for NPCs
 */
export const WoodenHouseBlueprint = createBlueprint()
  .id('wooden_house')
  .name('Wooden House')
  .description('A comfortable wooden house for settlers')
  .category(BlueprintCategory.HOUSING)
  .tier(BlueprintTier.SETTLEMENT);

// Build the house programmatically
const houseBuilder = WoodenHouseBlueprint;

// Floor
for (let y = 0; y < 5; y++) {
  for (let x = 0; x < 5; x++) {
    houseBuilder.addBlock(x, y, 0, BlockType.WOOD_PLANK);
  }
}

// Walls - layer 1
for (let y = 0; y < 5; y++) {
  for (let x = 0; x < 5; x++) {
    const isEdge = x === 0 || x === 4 || y === 0 || y === 4;
    const isDoor = x === 2 && y === 0;
    if (isEdge && !isDoor) {
      houseBuilder.addBlock(x, y, 1, BlockType.WOOD_LOG);
    }
  }
}

// Walls - layer 2 (with windows)
for (let y = 0; y < 5; y++) {
  for (let x = 0; x < 5; x++) {
    const isEdge = x === 0 || x === 4 || y === 0 || y === 4;
    const isWindow = (x === 2 && (y === 0 || y === 4)) || ((x === 0 || x === 4) && y === 2);
    if (isEdge) {
      houseBuilder.addBlock(x, y, 2, isWindow ? BlockType.WINDOW : BlockType.WOOD_LOG);
    }
  }
}

// Roof (thatch, peaked)
for (let y = 0; y < 5; y++) {
  for (let x = 0; x < 5; x++) {
    houseBuilder.addBlock(x, y, 3, BlockType.THATCH);
  }
}

// Interior - bed
houseBuilder.addBlock(1, 3, 1, BlockType.BED);
// Interior - chest
houseBuilder.addBlock(3, 3, 1, BlockType.CHEST);

houseBuilder.addEntryPoint(2, 0, 1);
houseBuilder.addWorkSlot(2, 2, 1);
houseBuilder.storageCapacity(200);

export const WoodenHouseFinal = houseBuilder.build();

/**
 * Farm Plot - 7x7x1, agricultural area
 */
export const FarmPlotBlueprint = createBlueprint()
  .id('farm_plot')
  .name('Farm Plot')
  .description('A fenced farming area for growing crops')
  .category(BlueprintCategory.PRODUCTION)
  .tier(BlueprintTier.SETTLEMENT);

const farmBuilder = FarmPlotBlueprint;

// Fence perimeter
for (let x = 0; x < 7; x++) {
  farmBuilder.addBlock(x, 0, 0, BlockType.WOOD_FENCE);
  farmBuilder.addBlock(x, 6, 0, BlockType.WOOD_FENCE);
}
for (let y = 1; y < 6; y++) {
  farmBuilder.addBlock(0, y, 0, BlockType.WOOD_FENCE);
  farmBuilder.addBlock(6, y, 0, BlockType.WOOD_FENCE);
}

// Farmland inside (with gate opening)
for (let y = 1; y < 6; y++) {
  for (let x = 1; x < 6; x++) {
    farmBuilder.addBlock(x, y, 0, BlockType.FARMLAND);
  }
}

// Remove fence for gate
// (Gate is at position 3,0 - we just don't add the fence there)

farmBuilder.addEntryPoint(3, 0, 0);
farmBuilder.addWorkSlot(3, 3, 0);

export const FarmPlotFinal = farmBuilder.build();

/**
 * Warehouse - 7x7x4, large storage building
 */
export const WarehouseBlueprint = createBlueprint()
  .id('warehouse')
  .name('Warehouse')
  .description('A large building for storing resources')
  .category(BlueprintCategory.STORAGE)
  .tier(BlueprintTier.SETTLEMENT);

const warehouseBuilder = WarehouseBlueprint;

// Foundation floor
for (let y = 0; y < 7; y++) {
  for (let x = 0; x < 7; x++) {
    warehouseBuilder.addBlock(x, y, 0, BlockType.COBBLESTONE);
  }
}

// Walls - 3 levels
for (let z = 1; z <= 3; z++) {
  for (let y = 0; y < 7; y++) {
    for (let x = 0; x < 7; x++) {
      const isEdge = x === 0 || x === 6 || y === 0 || y === 6;
      const isDoor = x === 3 && y === 0 && z <= 2;

      if (isEdge && !isDoor) {
        warehouseBuilder.addBlock(x, y, z, BlockType.STONE_BRICK);
      }
    }
  }
}

// Roof
for (let y = 0; y < 7; y++) {
  for (let x = 0; x < 7; x++) {
    warehouseBuilder.addBlock(x, y, 4, BlockType.WOOD_PLANK);
  }
}

// Interior storage shelves
for (let x = 1; x <= 5; x += 2) {
  warehouseBuilder.addBlock(x, 2, 1, BlockType.BARREL);
  warehouseBuilder.addBlock(x, 4, 1, BlockType.BARREL);
  warehouseBuilder.addBlock(x, 2, 2, BlockType.CRATE);
  warehouseBuilder.addBlock(x, 4, 2, BlockType.CRATE);
}

warehouseBuilder.addEntryPoint(3, 0, 1);
warehouseBuilder.storageCapacity(1000);

export const WarehouseFinal = warehouseBuilder.build();

/**
 * Stone Wall Section - 5x1x2, defensive wall
 */
export const StoneWallBlueprint = createBlueprint()
  .id('stone_wall')
  .name('Stone Wall')
  .description('A section of defensive stone wall')
  .category(BlueprintCategory.DEFENSE)
  .tier(BlueprintTier.SETTLEMENT);

const wallBuilder = StoneWallBlueprint;

for (let x = 0; x < 5; x++) {
  wallBuilder.addBlock(x, 0, 0, BlockType.COBBLESTONE);
  wallBuilder.addBlock(x, 0, 1, BlockType.STONE_BRICK);
}

export const StoneWallFinal = wallBuilder.build();

/**
 * Stairs (stone) - 1x3x3, connects Z-levels
 */
export const StoneStairsBlueprint = createBlueprint()
  .id('stone_stairs')
  .name('Stone Stairs')
  .description('Stone stairs connecting different levels')
  .category(BlueprintCategory.INFRASTRUCTURE)
  .tier(BlueprintTier.SETTLEMENT)
  .addBlock(0, 0, 0, BlockType.STONE_STAIRS)
  .addBlock(0, 1, 1, BlockType.STONE_STAIRS)
  .addBlock(0, 2, 2, BlockType.STONE_STAIRS)
  .build();

/**
 * Get all settlement tier blueprints
 * @returns {Array<Blueprint>}
 */
export function getSettlementBlueprints() {
  return [
    WoodenHouseFinal,
    FarmPlotFinal,
    WarehouseFinal,
    StoneWallFinal,
    StoneStairsBlueprint
  ];
}
