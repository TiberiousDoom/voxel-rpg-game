/**
 * Construction.test.js - Unit tests for Blueprint and ConstructionSite
 *
 * Tests:
 * - Blueprint creation and block management
 * - Material requirement calculation
 * - ConstructionSite progress tracking
 * - Block dependencies and build order
 * - ConstructionManager operations
 */

import {
  Blueprint,
  BlueprintBlock,
  BlueprintCategory,
  BlueprintTier,
  createBlueprint
} from '../Blueprint.js';
import {
  ConstructionSite,
  ConstructionBlock,
  BlockStatus,
  SiteStatus
} from '../ConstructionSite.js';
import { ConstructionManager } from '../ConstructionManager.js';
import { BlockType } from '../../voxel/BlockTypes.js';

describe('BlueprintBlock', () => {
  describe('Constructor', () => {
    it('should create block with correct position', () => {
      const block = new BlueprintBlock({
        relX: 5,
        relY: 10,
        relZ: 2,
        blockType: BlockType.STONE
      });

      expect(block.relX).toBe(5);
      expect(block.relY).toBe(10);
      expect(block.relZ).toBe(2);
      expect(block.blockType).toBe(BlockType.STONE);
    });

    it('should auto-calculate build order from position', () => {
      const block1 = new BlueprintBlock({ relX: 0, relY: 0, relZ: 0, blockType: BlockType.STONE });
      const block2 = new BlueprintBlock({ relX: 0, relY: 0, relZ: 1, blockType: BlockType.STONE });

      // Higher Z should have higher build order
      expect(block2.buildOrder).toBeGreaterThan(block1.buildOrder);
    });

    it('should use explicit build order if provided', () => {
      const block = new BlueprintBlock({
        relX: 0,
        relY: 0,
        relZ: 5,
        blockType: BlockType.STONE,
        buildOrder: 1
      });

      expect(block.buildOrder).toBe(1);
    });
  });

  describe('Material Requirements', () => {
    it('should get required material for block', () => {
      const block = new BlueprintBlock({
        relX: 0,
        relY: 0,
        relZ: 0,
        blockType: BlockType.STONE
      });

      const material = block.getRequiredMaterial();
      expect(material).not.toBeNull();
      expect(material.material).toBe('stone');
    });
  });

  describe('Cloning', () => {
    it('should clone with offset', () => {
      const block = new BlueprintBlock({
        relX: 1,
        relY: 2,
        relZ: 3,
        blockType: BlockType.WOOD_PLANK
      });

      const cloned = block.cloneWithOffset(10, 20, 5);

      expect(cloned.relX).toBe(11);
      expect(cloned.relY).toBe(22);
      expect(cloned.relZ).toBe(8);
      expect(cloned.blockType).toBe(BlockType.WOOD_PLANK);
    });
  });
});

describe('Blueprint', () => {
  describe('Constructor', () => {
    it('should create blueprint with basic properties', () => {
      const blueprint = new Blueprint({
        id: 'test_blueprint',
        name: 'Test Building',
        category: BlueprintCategory.HOUSING,
        tier: BlueprintTier.SURVIVAL
      });

      expect(blueprint.id).toBe('test_blueprint');
      expect(blueprint.name).toBe('Test Building');
      expect(blueprint.category).toBe(BlueprintCategory.HOUSING);
      expect(blueprint.tier).toBe(BlueprintTier.SURVIVAL);
    });

    it('should calculate dimensions from blocks', () => {
      const blueprint = new Blueprint({
        blocks: [
          { relX: 0, relY: 0, relZ: 0, blockType: BlockType.STONE },
          { relX: 4, relY: 3, relZ: 2, blockType: BlockType.STONE }
        ]
      });

      expect(blueprint.dimensions.width).toBe(5);
      expect(blueprint.dimensions.depth).toBe(4);
      expect(blueprint.dimensions.height).toBe(3);
    });

    it('should calculate material requirements', () => {
      const blueprint = new Blueprint({
        blocks: [
          { relX: 0, relY: 0, relZ: 0, blockType: BlockType.STONE },
          { relX: 1, relY: 0, relZ: 0, blockType: BlockType.STONE },
          { relX: 0, relY: 1, relZ: 0, blockType: BlockType.WOOD_PLANK }
        ]
      });

      expect(blueprint.requirements.stone).toBe(2);
      expect(blueprint.requirements.wood).toBe(1);
    });
  });

  describe('Block Operations', () => {
    it('should get blocks in build order', () => {
      const blueprint = new Blueprint({
        blocks: [
          { relX: 0, relY: 0, relZ: 1, blockType: BlockType.STONE },
          { relX: 0, relY: 0, relZ: 0, blockType: BlockType.STONE },
          { relX: 0, relY: 0, relZ: 2, blockType: BlockType.STONE }
        ]
      });

      const ordered = blueprint.getBlocksInBuildOrder();

      expect(ordered[0].relZ).toBe(0);
      expect(ordered[1].relZ).toBe(1);
      expect(ordered[2].relZ).toBe(2);
    });

    it('should get blocks at specific Z-level', () => {
      const blueprint = new Blueprint({
        blocks: [
          { relX: 0, relY: 0, relZ: 0, blockType: BlockType.STONE },
          { relX: 1, relY: 0, relZ: 0, blockType: BlockType.STONE },
          { relX: 0, relY: 0, relZ: 1, blockType: BlockType.DIRT }
        ]
      });

      const level0 = blueprint.getBlocksAtLevel(0);
      expect(level0.length).toBe(2);

      const level1 = blueprint.getBlocksAtLevel(1);
      expect(level1.length).toBe(1);
    });
  });

  describe('Material Checking', () => {
    it('should check if materials are satisfied', () => {
      const blueprint = new Blueprint({
        blocks: [
          { relX: 0, relY: 0, relZ: 0, blockType: BlockType.STONE },
          { relX: 1, relY: 0, relZ: 0, blockType: BlockType.STONE }
        ]
      });

      const check1 = blueprint.checkMaterials({ stone: 5 });
      expect(check1.satisfied).toBe(true);
      expect(Object.keys(check1.missing).length).toBe(0);

      const check2 = blueprint.checkMaterials({ stone: 1 });
      expect(check2.satisfied).toBe(false);
      expect(check2.missing.stone).toBe(1);
    });
  });

  describe('Footprint', () => {
    it('should get 2D footprint', () => {
      const blueprint = new Blueprint({
        blocks: [
          { relX: 0, relY: 0, relZ: 0, blockType: BlockType.STONE },
          { relX: 0, relY: 0, relZ: 1, blockType: BlockType.STONE },
          { relX: 1, relY: 1, relZ: 0, blockType: BlockType.STONE }
        ]
      });

      const footprint = blueprint.getFootprint();
      expect(footprint.length).toBe(2); // (0,0) and (1,1)
    });
  });

  describe('Serialization', () => {
    it('should serialize and deserialize', () => {
      const blueprint = new Blueprint({
        id: 'test',
        name: 'Test',
        blocks: [
          { relX: 0, relY: 0, relZ: 0, blockType: BlockType.STONE }
        ]
      });

      const json = blueprint.toJSON();
      const restored = Blueprint.fromJSON(json);

      expect(restored.id).toBe('test');
      expect(restored.blocks.length).toBe(1);
      expect(restored.blocks[0].blockType).toBe(BlockType.STONE);
    });
  });
});

describe('BlueprintBuilder', () => {
  it('should create blueprint with fluent API', () => {
    const blueprint = createBlueprint()
      .id('test_house')
      .name('Test House')
      .category(BlueprintCategory.HOUSING)
      .tier(BlueprintTier.SURVIVAL)
      .addBlock(0, 0, 0, BlockType.WOOD_PLANK)
      .addBlock(1, 0, 0, BlockType.WOOD_PLANK)
      .addBlock(0, 0, 1, BlockType.WOOD_LOG)
      .build();

    expect(blueprint.id).toBe('test_house');
    expect(blueprint.name).toBe('Test House');
    expect(blueprint.blocks.length).toBe(3);
  });

  it('should fill regions', () => {
    const blueprint = createBlueprint()
      .fillRegion(0, 0, 0, 2, 2, 0, BlockType.WOOD_PLANK)
      .build();

    expect(blueprint.blocks.length).toBe(9); // 3x3x1
  });
});

describe('ConstructionBlock', () => {
  describe('Status Transitions', () => {
    let block;

    beforeEach(() => {
      const bpBlock = new BlueprintBlock({
        relX: 0,
        relY: 0,
        relZ: 0,
        blockType: BlockType.STONE
      });
      block = new ConstructionBlock(bpBlock, { x: 10, y: 20, z: 0 });
    });

    it('should start in PENDING status', () => {
      expect(block.status).toBe(BlockStatus.PENDING);
      expect(block.needsMaterials()).toBe(true);
    });

    it('should reserve for delivery', () => {
      const success = block.reserveForDelivery('npc_1');

      expect(success).toBe(true);
      expect(block.status).toBe(BlockStatus.MATERIALS_RESERVED);
      expect(block.reservedByHauler).toBe('npc_1');
    });

    it('should deliver materials', () => {
      block.reserveForDelivery('npc_1');
      const success = block.deliverMaterials('npc_1');

      expect(success).toBe(true);
      expect(block.status).toBe(BlockStatus.MATERIALS_DELIVERED);
      expect(block.canBuild()).toBe(true);
    });

    it('should assign builder', () => {
      block.reserveForDelivery('npc_1');
      block.deliverMaterials('npc_1');
      const success = block.assignBuilder('npc_2');

      expect(success).toBe(true);
      expect(block.status).toBe(BlockStatus.IN_PROGRESS);
      expect(block.assignedBuilder).toBe('npc_2');
    });

    it('should complete on full progress', () => {
      block.reserveForDelivery('npc_1');
      block.deliverMaterials('npc_1');
      block.assignBuilder('npc_2');

      const completed = block.addProgress(100);

      expect(completed).toBe(true);
      expect(block.status).toBe(BlockStatus.COMPLETED);
    });
  });
});

describe('ConstructionSite', () => {
  let blueprint;

  beforeEach(() => {
    blueprint = new Blueprint({
      id: 'test_building',
      name: 'Test Building',
      blocks: [
        { relX: 0, relY: 0, relZ: 0, blockType: BlockType.STONE },
        { relX: 1, relY: 0, relZ: 0, blockType: BlockType.STONE },
        { relX: 0, relY: 0, relZ: 1, blockType: BlockType.WOOD_PLANK }
      ]
    });
  });

  describe('Initialization', () => {
    it('should create site with correct position', () => {
      const site = new ConstructionSite({
        blueprint,
        position: { x: 10, y: 20, z: 0 }
      });

      expect(site.position.x).toBe(10);
      expect(site.position.y).toBe(20);
      expect(site.position.z).toBe(0);
    });

    it('should create construction blocks from blueprint', () => {
      const site = new ConstructionSite({
        blueprint,
        position: { x: 0, y: 0, z: 0 }
      });

      expect(site.blocks.size).toBe(3);
    });

    it('should start in PLANNED status', () => {
      const site = new ConstructionSite({
        blueprint,
        position: { x: 0, y: 0, z: 0 }
      });

      expect(site.status).toBe(SiteStatus.PLANNED);
    });
  });

  describe('Block Access', () => {
    it('should get block at world position', () => {
      const site = new ConstructionSite({
        blueprint,
        position: { x: 10, y: 20, z: 0 }
      });

      const block = site.getBlock(10, 20, 0);
      expect(block).not.toBeNull();
      expect(block.position.x).toBe(10);
    });

    it('should get blocks needing materials', () => {
      const site = new ConstructionSite({
        blueprint,
        position: { x: 0, y: 0, z: 0 }
      });

      const needing = site.getBlocksNeedingMaterials();
      expect(needing.length).toBe(3);
    });
  });

  describe('Construction Flow', () => {
    it('should reserve block for delivery', () => {
      const site = new ConstructionSite({
        blueprint,
        position: { x: 0, y: 0, z: 0 }
      });

      const reservation = site.reserveBlockForDelivery('hauler_1');

      expect(reservation).not.toBeNull();
      expect(reservation.block.reservedByHauler).toBe('hauler_1');
    });

    it('should deliver materials to block', () => {
      const site = new ConstructionSite({
        blueprint,
        position: { x: 0, y: 0, z: 0 }
      });

      const reservation = site.reserveBlockForDelivery('hauler_1');
      const success = site.deliverMaterials(
        reservation.block.position.x,
        reservation.block.position.y,
        reservation.block.position.z,
        'hauler_1'
      );

      expect(success).toBe(true);
      expect(site.stats.deliveredBlocks).toBe(1);
    });

    it('should get blocks ready to build', () => {
      const site = new ConstructionSite({
        blueprint,
        position: { x: 0, y: 0, z: 0 }
      });

      // Deliver materials to ground level blocks
      const block1 = site.getBlock(0, 0, 0);
      block1.reserveForDelivery('h1');
      block1.deliverMaterials('h1');

      const ready = site.getBlocksReadyToBuild();
      expect(ready.length).toBe(1);
    });

    it('should enforce build order dependencies', () => {
      const site = new ConstructionSite({
        blueprint,
        position: { x: 0, y: 0, z: 0 }
      });

      // Deliver materials to upper level block
      const upperBlock = site.getBlock(0, 0, 1);
      upperBlock.reserveForDelivery('h1');
      upperBlock.deliverMaterials('h1');

      // Should not be ready because block below isn't complete
      const next = site.getNextBlockToBuild();
      expect(next).toBeNull();

      // Complete the block below
      const lowerBlock = site.getBlock(0, 0, 0);
      lowerBlock.reserveForDelivery('h2');
      lowerBlock.deliverMaterials('h2');
      site.completeBlock(0, 0, 0);

      // Now upper block should be available
      const nextAfter = site.getNextBlockToBuild();
      expect(nextAfter).toBe(upperBlock);
    });

    it('should complete blocks', () => {
      const site = new ConstructionSite({
        blueprint,
        position: { x: 0, y: 0, z: 0 }
      });

      site.completeBlock(0, 0, 0);

      expect(site.stats.completedBlocks).toBe(1);
      expect(site.getProgress()).toBeGreaterThan(0);
    });

    it('should mark site complete when all blocks done', () => {
      const site = new ConstructionSite({
        blueprint,
        position: { x: 0, y: 0, z: 0 }
      });

      site.completeBlock(0, 0, 0);
      site.completeBlock(1, 0, 0);
      site.completeBlock(0, 0, 1);

      expect(site.isComplete()).toBe(true);
      expect(site.status).toBe(SiteStatus.COMPLETED);
    });
  });

  describe('Ghost Blocks', () => {
    it('should return ghost blocks for incomplete blocks', () => {
      const site = new ConstructionSite({
        blueprint,
        position: { x: 0, y: 0, z: 0 }
      });

      const ghosts = site.getGhostBlocks();
      expect(ghosts.length).toBe(3);

      site.completeBlock(0, 0, 0);
      const ghostsAfter = site.getGhostBlocks();
      expect(ghostsAfter.length).toBe(2);
    });
  });

  describe('Serialization', () => {
    it('should serialize and deserialize', () => {
      const site = new ConstructionSite({
        blueprint,
        position: { x: 10, y: 20, z: 5 }
      });

      site.completeBlock(10, 20, 5);

      const json = site.toJSON();
      const restored = ConstructionSite.fromJSON(json, blueprint);

      expect(restored.position.x).toBe(10);
      expect(restored.stats.completedBlocks).toBe(1);
    });
  });
});

describe('ConstructionManager', () => {
  let manager;
  let blueprint;

  beforeEach(() => {
    manager = new ConstructionManager();
    blueprint = new Blueprint({
      id: 'simple_building',
      name: 'Simple Building',
      blocks: [
        { relX: 0, relY: 0, relZ: 0, blockType: BlockType.STONE },
        { relX: 1, relY: 0, relZ: 0, blockType: BlockType.STONE }
      ]
    });
    manager.registerBlueprint(blueprint);
  });

  describe('Blueprint Management', () => {
    it('should register blueprints', () => {
      expect(manager.getBlueprint('simple_building')).toBe(blueprint);
    });

    it('should get all blueprints', () => {
      expect(manager.getAllBlueprints().length).toBe(1);
    });
  });

  describe('Site Management', () => {
    it('should place blueprint to create site', () => {
      const site = manager.placeBlueprint('simple_building', { x: 0, y: 0, z: 0 });

      expect(site).not.toBeNull();
      expect(manager.getAllSites().length).toBe(1);
    });

    it('should get site by ID', () => {
      const site = manager.placeBlueprint('simple_building', { x: 0, y: 0, z: 0 });
      const fetched = manager.getSite(site.id);

      expect(fetched).toBe(site);
    });

    it('should cancel sites', () => {
      const site = manager.placeBlueprint('simple_building', { x: 0, y: 0, z: 0 });
      manager.cancelSite(site.id);

      expect(site.status).toBe(SiteStatus.CANCELLED);
    });
  });

  describe('Work Assignment', () => {
    it('should find hauling work', () => {
      manager.placeBlueprint('simple_building', { x: 10, y: 10, z: 0 });

      const work = manager.findHaulingWork({ x: 0, y: 0 }, 'hauler_1');

      expect(work).not.toBeNull();
      expect(work.site).not.toBeNull();
      expect(work.block).not.toBeNull();
      expect(work.material).not.toBeNull();
    });

    it('should find building work when materials delivered', () => {
      const site = manager.placeBlueprint('simple_building', { x: 0, y: 0, z: 0 });

      // Deliver materials to all blocks
      for (const block of site.blocks.values()) {
        block.reserveForDelivery('h1');
        block.deliverMaterials('h1');
      }

      const work = manager.findBuildingWork({ x: 0, y: 0 }, 'builder_1');

      expect(work).not.toBeNull();
      expect(work.block.status).toBe(BlockStatus.IN_PROGRESS);
    });
  });

  describe('Ghost Blocks', () => {
    it('should get all ghost blocks for rendering', () => {
      manager.placeBlueprint('simple_building', { x: 0, y: 0, z: 0 });
      manager.placeBlueprint('simple_building', { x: 10, y: 10, z: 0 });

      const ghosts = manager.getAllGhostBlocks();
      expect(ghosts.length).toBe(4); // 2 blocks x 2 sites
    });
  });

  describe('Serialization', () => {
    it('should serialize and deserialize', () => {
      manager.placeBlueprint('simple_building', { x: 0, y: 0, z: 0 });

      const json = manager.toJSON();
      const restored = ConstructionManager.fromJSON(json);

      expect(restored.getAllBlueprints().length).toBe(1);
      expect(restored.getAllSites().length).toBe(1);
    });
  });
});
