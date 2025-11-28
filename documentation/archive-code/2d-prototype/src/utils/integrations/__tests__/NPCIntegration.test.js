/**
 * NPCIntegration.test.js
 * Tests for Leadership attribute integration with NPC system
 *
 * TDD Approach: These tests are written BEFORE implementation
 * They will FAIL until the actual integration code is written in Phase 1
 */

import { NPCIntegration } from '../NPCIntegration';

describe('NPCIntegration', () => {
  let mockCharacter;
  let mockNPC;
  let mockSettlement;

  beforeEach(() => {
    mockCharacter = {
      level: 10,
      attributes: {
        leadership: 40,
        construction: 20,
        exploration: 20,
        combat: 30,
        magic: 20,
        endurance: 30,
      },
      skills: {
        activeNodes: [],
      },
    };

    mockNPC = {
      id: 'npc_001',
      name: 'Bob the Builder',
      type: 'worker',
      role: 'builder',
      baseEfficiency: 1.0,
      happiness: 0.8,
      morale: 0.9,
      workSpeed: 1.0,
      skills: {
        building: 0.8,
        gathering: 0.6,
        crafting: 0.7,
      },
    };

    mockSettlement = {
      population: 15,
      maxPopulation: 20,
      buildings: ['house', 'house', 'workshop'],
      happiness: 0.75,
      resources: {
        food: 500,
        wood: 300,
        stone: 200,
      },
    };
  });

  // ============================================================================
  // LEADERSHIP ATTRIBUTE: NPC EFFICIENCY
  // ============================================================================

  describe('NPC Efficiency', () => {
    test('Leadership attribute increases NPC efficiency by 1% per point', () => {
      const efficiency = NPCIntegration.calculateNPCEfficiency(mockNPC, mockCharacter);

      // Base efficiency: 1.0
      // Leadership bonus: 40 * 0.01 = 0.40 (40% increase)
      // Total: 1.0 * (1 + 0.40) = 1.4
      expect(efficiency).toBe(1.4);
    });

    test('NPC efficiency applies to work speed', () => {
      const workSpeed = NPCIntegration.calculateNPCWorkSpeed(mockNPC, mockCharacter);

      // Base work speed: 1.0
      // Efficiency multiplier: 1.4
      // Total: 1.0 * 1.4 = 1.4
      expect(workSpeed).toBe(1.4);
    });

    test('NPC efficiency applies to resource gathering', () => {
      const gatheringRate = NPCIntegration.calculateGatheringRate(mockNPC, mockCharacter);

      // Base gathering: mockNPC.skills.gathering = 0.6
      // Efficiency multiplier: 1.4
      // Total: 0.6 * 1.4 = 0.84
      expect(gatheringRate).toBeCloseTo(0.84, 2);
    });

    test('NPC efficiency applies to building construction', () => {
      const buildSpeed = NPCIntegration.calculateBuildSpeed(mockNPC, mockCharacter);

      // Base building skill: 0.8
      // Efficiency multiplier: 1.4
      // Total: 0.8 * 1.4 = 1.12
      expect(buildSpeed).toBeCloseTo(1.12, 2);
    });

    test('Zero leadership provides base efficiency', () => {
      mockCharacter.attributes.leadership = 0;

      const efficiency = NPCIntegration.calculateNPCEfficiency(mockNPC, mockCharacter);

      expect(efficiency).toBe(1.0); // Base efficiency only
    });
  });

  // ============================================================================
  // LEADERSHIP ATTRIBUTE: NPC HAPPINESS
  // ============================================================================

  describe('NPC Happiness', () => {
    test('Leadership increases NPC happiness by 0.5% per point', () => {
      const happinessBonus = NPCIntegration.calculateHappinessBonus(mockCharacter);

      // Leadership: 40
      // Bonus: 40 * 0.005 = 0.20 (20% increase)
      expect(happinessBonus).toBe(0.20);
    });

    test('Happiness bonus is applied to NPC morale', () => {
      const morale = NPCIntegration.calculateNPCMorale(mockNPC, mockCharacter);

      // Base morale: 0.9
      // Leadership bonus: 20%
      // Total: 0.9 * (1 + 0.20) = 1.08
      expect(morale).toBeCloseTo(1.08, 2);
    });

    test('Happiness is capped at 1.0 (100%)', () => {
      mockNPC.happiness = 0.95;
      mockCharacter.attributes.leadership = 50; // Would give 25% bonus

      const happiness = NPCIntegration.calculateNPCHappiness(mockNPC, mockCharacter);

      expect(happiness).toBe(1.0); // Capped at 100%
    });

    test('High happiness reduces NPC turnover rate', () => {
      const turnoverRate = NPCIntegration.calculateTurnoverRate(mockNPC, mockCharacter);

      // Base turnover: 0.05 (5% chance to leave per day)
      // Happiness: 0.8
      // Leadership bonus: 20%
      // Final happiness: 0.96
      // Turnover reduction: (1 - 0.96) = 0.04 (4%)
      expect(turnoverRate).toBeCloseTo(0.04, 3);
    });

    test('Unhappy NPCs have higher turnover despite leadership', () => {
      mockNPC.happiness = 0.3; // Very unhappy
      mockCharacter.attributes.leadership = 40;

      const turnoverRate = NPCIntegration.calculateTurnoverRate(mockNPC, mockCharacter);

      // Even with leadership, unhappy NPCs still have elevated turnover
      expect(turnoverRate).toBeGreaterThan(0.05);
    });
  });

  // ============================================================================
  // LEADERSHIP ATTRIBUTE: SETTLEMENT CAPACITY
  // ============================================================================

  describe('Settlement Capacity', () => {
    test('Leadership increases max population by 0.5 per point', () => {
      const maxPopulation = NPCIntegration.calculateMaxPopulation(mockSettlement, mockCharacter);

      // Base max: 20
      // Leadership bonus: 40 * 0.5 = 20
      // Total: 40
      expect(maxPopulation).toBe(40);
    });

    test('Population capacity scales with housing', () => {
      mockSettlement.buildings = ['house', 'house']; // Each house provides 10 capacity

      const maxPopulation = NPCIntegration.calculateMaxPopulation(mockSettlement, mockCharacter);

      // Base housing capacity: 2 * 10 = 20
      // Leadership bonus: 40 * 0.5 = 20
      // Total: 40
      expect(maxPopulation).toBe(40);
    });

    test('Zero leadership still provides base housing capacity', () => {
      mockCharacter.attributes.leadership = 0;

      const maxPopulation = NPCIntegration.calculateMaxPopulation(mockSettlement, mockCharacter);

      // Only housing capacity: 20
      expect(maxPopulation).toBe(20);
    });

    test('Can calculate available population slots', () => {
      const available = NPCIntegration.calculateAvailableSlots(mockSettlement, mockCharacter);

      // Max: 40
      // Current: 15
      // Available: 25
      expect(available).toBe(25);
    });
  });

  // ============================================================================
  // LEADERSHIP ATTRIBUTE: NPC RECRUITMENT
  // ============================================================================

  describe('NPC Recruitment', () => {
    test('Leadership reduces NPC recruitment cost by 0.5% per point', () => {
      const baseRecruitmentCost = 100; // 100 gold

      const recruitmentCost = NPCIntegration.calculateRecruitmentCost(
        baseRecruitmentCost,
        mockCharacter
      );

      // Base cost: 100
      // Leadership reduction: 40 * 0.005 = 0.20 (20% reduction)
      // Total: 100 * 0.80 = 80
      expect(recruitmentCost).toBe(80);
    });

    test('Recruitment cost reduction is capped at 40%', () => {
      const baseRecruitmentCost = 100;
      mockCharacter.attributes.leadership = 100; // Would give 50% reduction

      const recruitmentCost = NPCIntegration.calculateRecruitmentCost(
        baseRecruitmentCost,
        mockCharacter
      );

      // Cost reduction capped at 40%
      // 100 * 0.60 = 60
      expect(recruitmentCost).toBe(60);
    });

    test('Leadership increases NPC recruitment rate', () => {
      const recruitmentChance = NPCIntegration.calculateRecruitmentChance(mockCharacter);

      // Base chance: 0.10 (10% per day)
      // Leadership bonus: 40 * 0.003 = 0.12 (12% increase)
      // Total: 0.22 (22% per day)
      expect(recruitmentChance).toBeCloseTo(0.22, 2);
    });

    test('Recruitment chance is capped at 50%', () => {
      mockCharacter.attributes.leadership = 200;

      const recruitmentChance = NPCIntegration.calculateRecruitmentChance(mockCharacter);

      expect(recruitmentChance).toBe(0.50); // Capped at 50%
    });
  });

  // ============================================================================
  // LEADERSHIP ATTRIBUTE: NPC SKILL TRAINING
  // ============================================================================

  describe('NPC Skill Training', () => {
    test('Leadership increases NPC skill gain rate by 0.3% per point', () => {
      const skillGainRate = NPCIntegration.calculateSkillGainRate(mockCharacter);

      // Base rate: 1.0
      // Leadership bonus: 40 * 0.003 = 0.12 (12% increase)
      // Total: 1.12
      expect(skillGainRate).toBeCloseTo(1.12, 2);
    });

    test('NPCs gain skills faster with high leadership', () => {
      const baseXP = 10; // XP gained from task

      const actualXP = NPCIntegration.applyLeadershipToSkillGain(baseXP, mockCharacter);

      // Base XP: 10
      // Leadership multiplier: 1.12
      // Total: 11.2
      expect(actualXP).toBeCloseTo(11.2, 1);
    });

    test('Leadership reduces training time for new skills', () => {
      const baseTrainingTime = 3600; // 1 hour in seconds

      const trainingTime = NPCIntegration.calculateTrainingTime(baseTrainingTime, mockCharacter);

      // Base time: 3600s
      // Leadership reduction: 12%
      // Total: 3600 * 0.88 = 3168s
      expect(trainingTime).toBeCloseTo(3168, 0);
    });
  });

  // ============================================================================
  // LEADERSHIP ATTRIBUTE: SETTLEMENT HAPPINESS
  // ============================================================================

  describe('Settlement-Wide Effects', () => {
    test('Leadership increases overall settlement happiness', () => {
      const settlementHappiness = NPCIntegration.calculateSettlementHappiness(
        mockSettlement,
        mockCharacter
      );

      // Base happiness: 0.75
      // Leadership bonus: 40 * 0.005 = 0.20 (20%)
      // Total: 0.75 * 1.20 = 0.90
      expect(settlementHappiness).toBeCloseTo(0.90, 2);
    });

    test('Settlement happiness affects all NPCs', () => {
      const npcs = [
        { ...mockNPC, id: 'npc_001' },
        { ...mockNPC, id: 'npc_002' },
        { ...mockNPC, id: 'npc_003' },
      ];

      const averageHappiness = NPCIntegration.calculateAverageNPCHappiness(
        npcs,
        mockCharacter,
        mockSettlement
      );

      // Each NPC gets leadership happiness bonus
      expect(averageHappiness).toBeGreaterThan(mockNPC.happiness);
    });

    test('Leadership reduces resource consumption per NPC', () => {
      const baseConsumption = 10; // Food per NPC per day

      const consumption = NPCIntegration.calculateResourceConsumption(
        baseConsumption,
        mockCharacter
      );

      // Base: 10
      // Leadership efficiency: 1.4
      // NPCs work more efficiently, consume less: 10 / 1.4 = 7.14
      expect(consumption).toBeCloseTo(7.14, 1);
    });
  });

  // ============================================================================
  // MULTI-ATTRIBUTE SYNERGIES
  // ============================================================================

  describe('Attribute Synergies', () => {
    test('Leadership + Construction synergy for building NPCs', () => {
      const builderNPC = { ...mockNPC, role: 'builder' };

      const buildEfficiency = NPCIntegration.calculateSpecializedEfficiency(
        builderNPC,
        mockCharacter
      );

      // Base efficiency: 1.0
      // Leadership: 40% bonus
      // Construction synergy: Additional 10% for builders
      // Total: 1.54
      expect(buildEfficiency).toBeCloseTo(1.54, 2);
    });

    test('Leadership + Exploration synergy for scout NPCs', () => {
      const scoutNPC = { ...mockNPC, role: 'scout' };

      const scoutEfficiency = NPCIntegration.calculateSpecializedEfficiency(
        scoutNPC,
        mockCharacter
      );

      // Base efficiency: 1.0
      // Leadership: 40% bonus
      // Exploration synergy: Additional 10% for scouts
      // Total: 1.54
      expect(scoutEfficiency).toBeCloseTo(1.54, 2);
    });

    test('Leadership + Combat synergy for guard NPCs', () => {
      const guardNPC = { ...mockNPC, role: 'guard' };

      const guardEfficiency = NPCIntegration.calculateSpecializedEfficiency(
        guardNPC,
        mockCharacter
      );

      // Base efficiency: 1.0
      // Leadership: 40% bonus
      // Combat synergy: Additional 10% for guards
      // Total: 1.54
      expect(guardEfficiency).toBeCloseTo(1.54, 2);
    });
  });

  // ============================================================================
  // SOFT CAPS AND DIMINISHING RETURNS
  // ============================================================================

  describe('Soft Caps', () => {
    test('Leadership has soft cap at 50 points for efficiency', () => {
      mockCharacter.attributes.leadership = 75;

      const efficiency = NPCIntegration.calculateNPCEfficiency(mockNPC, mockCharacter);

      // First 50 points: 50 * 0.01 = 0.50 (50%)
      // Next 25 points: 25 * 0.005 = 0.125 (12.5%) - half effectiveness
      // Total bonus: 62.5%
      // Final: 1.0 * (1 + 0.625) = 1.625
      expect(efficiency).toBeCloseTo(1.625, 2);
    });

    test('Leadership has soft cap at 50 points for population', () => {
      mockCharacter.attributes.leadership = 75;

      const maxPopulation = NPCIntegration.calculateMaxPopulation(mockSettlement, mockCharacter);

      // First 50 points: 50 * 0.5 = 25
      // Next 25 points: 25 * 0.25 = 6.25 - half effectiveness
      // Total leadership bonus: 31.25
      // Base housing: 20
      // Total: 20 + 31.25 = 51.25 (rounded to 51)
      expect(maxPopulation).toBeCloseTo(51, 0);
    });

    test('Soft cap documentation is accessible', () => {
      const softCapInfo = NPCIntegration.getSoftCapInfo('leadership');

      expect(softCapInfo).toEqual({
        attribute: 'leadership',
        softCapThreshold: 50,
        fullEffectiveness: 1.0,
        reducedEffectiveness: 0.5,
        description: 'Leadership gains are halved after 50 points',
      });
    });
  });

  // ============================================================================
  // INTEGRATION WITH EXISTING NPC SYSTEM
  // ============================================================================

  describe('NPC System Integration', () => {
    test('Integrates with existing NPCManager', () => {
      const npcUpdate = NPCIntegration.updateNPCStats(mockNPC, mockCharacter);

      expect(npcUpdate).toHaveProperty('efficiency');
      expect(npcUpdate).toHaveProperty('happiness');
      expect(npcUpdate).toHaveProperty('workSpeed');
      expect(npcUpdate.efficiency).toBeGreaterThan(mockNPC.baseEfficiency);
    });

    test('Works with NPC task assignment system', () => {
      const task = {
        type: 'build',
        duration: 100, // seconds
        difficulty: 1.0,
      };

      const taskCompletion = NPCIntegration.calculateTaskCompletionTime(
        task,
        mockNPC,
        mockCharacter
      );

      // Base duration: 100s
      // NPC building skill: 0.8
      // Leadership efficiency: 1.4
      // Effective skill: 0.8 * 1.4 = 1.12
      // Time: 100 / 1.12 = 89.3s
      expect(taskCompletion).toBeCloseTo(89.3, 0);
    });

    test('Handles multiple NPCs in settlement', () => {
      const npcs = [
        { ...mockNPC, id: 'npc_001', role: 'builder' },
        { ...mockNPC, id: 'npc_002', role: 'gatherer' },
        { ...mockNPC, id: 'npc_003', role: 'scout' },
      ];

      const efficiencies = NPCIntegration.calculateAllNPCEfficiencies(npcs, mockCharacter);

      expect(efficiencies).toHaveLength(3);
      efficiencies.forEach((eff) => {
        expect(eff).toBeGreaterThan(1.0); // All should have leadership bonus
      });
    });
  });

  // ============================================================================
  // EDGE CASES AND ERROR HANDLING
  // ============================================================================

  describe('Edge Cases', () => {
    test('Handles NPC with missing skills', () => {
      const incompleteNPC = {
        id: 'npc_incomplete',
        baseEfficiency: 1.0,
        skills: {},
      };

      const efficiency = NPCIntegration.calculateNPCEfficiency(incompleteNPC, mockCharacter);

      expect(efficiency).toBeGreaterThan(0);
    });

    test('Handles character with no leadership attribute', () => {
      const noLeadershipChar = { ...mockCharacter };
      delete noLeadershipChar.attributes.leadership;

      const efficiency = NPCIntegration.calculateNPCEfficiency(mockNPC, noLeadershipChar);

      expect(efficiency).toBe(1.0); // Base efficiency
    });

    test('Handles negative happiness values', () => {
      mockNPC.happiness = -0.5;

      const happiness = NPCIntegration.calculateNPCHappiness(mockNPC, mockCharacter);

      expect(happiness).toBeGreaterThanOrEqual(0); // Should clamp to 0
    });

    test('Handles settlement at max capacity', () => {
      mockSettlement.population = mockSettlement.maxPopulation;

      const available = NPCIntegration.calculateAvailableSlots(mockSettlement, mockCharacter);

      expect(available).toBeGreaterThanOrEqual(0);
    });

    test('Handles extremely high leadership values', () => {
      mockCharacter.attributes.leadership = 10000;

      const efficiency = NPCIntegration.calculateNPCEfficiency(mockNPC, mockCharacter);

      expect(Number.isFinite(efficiency)).toBe(true);
      expect(efficiency).toBeLessThan(100); // Reasonable cap
    });
  });

  // ============================================================================
  // BACKWARD COMPATIBILITY
  // ============================================================================

  describe('Backward Compatibility', () => {
    test('Works with NPCs created before character system', () => {
      const legacyNPC = {
        id: 'legacy_001',
        type: 'worker',
        efficiency: 1.0,
      };

      const efficiency = NPCIntegration.calculateNPCEfficiency(legacyNPC, mockCharacter);

      expect(efficiency).toBeGreaterThan(1.0); // Should apply leadership bonus
    });

    test('Preserves existing NPC data structure', () => {
      const updatedNPC = NPCIntegration.updateNPCStats(mockNPC, mockCharacter);

      // Should maintain original properties
      expect(updatedNPC.id).toBe(mockNPC.id);
      expect(updatedNPC.name).toBe(mockNPC.name);
      expect(updatedNPC.type).toBe(mockNPC.type);
    });

    test('Gracefully handles missing character object', () => {
      const efficiency = NPCIntegration.calculateNPCEfficiency(mockNPC, null);

      expect(efficiency).toBe(mockNPC.baseEfficiency); // Use base only
    });
  });

  // ============================================================================
  // PERFORMANCE TESTS
  // ============================================================================

  describe('Performance', () => {
    test('NPC efficiency calculation completes quickly', () => {
      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        NPCIntegration.calculateNPCEfficiency(mockNPC, mockCharacter);
      }

      const end = performance.now();
      const avgTime = (end - start) / 1000;

      expect(avgTime).toBeLessThan(0.5); // < 0.5ms per calculation
    });

    test('Can handle many NPCs efficiently', () => {
      const manyNPCs = Array.from({ length: 100 }, (_, i) => ({
        ...mockNPC,
        id: `npc_${i}`,
      }));

      const start = performance.now();
      NPCIntegration.calculateAllNPCEfficiencies(manyNPCs, mockCharacter);
      const end = performance.now();

      expect(end - start).toBeLessThan(10); // < 10ms for 100 NPCs
    });
  });
});
