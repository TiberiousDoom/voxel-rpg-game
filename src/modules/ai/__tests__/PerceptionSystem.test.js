/**
 * PerceptionSystem.test.js - Comprehensive tests for AI Perception
 */

import {
  PerceptionSystem,
  PerceptionEventType,
  SoundType,
  WeatherPerceptionModifiers,
  MemoryEntry
} from '../PerceptionSystem.js';

describe('PerceptionSystem', () => {
  let perception;

  beforeEach(() => {
    perception = new PerceptionSystem({
      defaultVisionRange: 100,
      defaultHearingRange: 50,
      defaultFOV: 120,
      memoryDuration: 30000,
      memoryDecayRate: 0.1
    });
  });

  // ============================================
  // MEMORY ENTRY TESTS
  // ============================================

  describe('MemoryEntry', () => {
    test('should create memory entry', () => {
      const entity = { id: 'target1', type: 'enemy', threatLevel: 5 };
      const position = { x: 100, z: 200 };
      const entry = new MemoryEntry(entity, position, 'vision');

      expect(entry.entityId).toBe('target1');
      expect(entry.entityType).toBe('enemy');
      expect(entry.position.x).toBe(100);
      expect(entry.position.z).toBe(200);
      expect(entry.source).toBe('vision');
      expect(entry.confidence).toBe(1.0);
      expect(entry.threatLevel).toBe(5);
    });

    test('should handle entity with just id', () => {
      const entry = new MemoryEntry('target1', { x: 0, z: 0 });
      expect(entry.entityId).toBe('target1');
      expect(entry.entityType).toBe('unknown');
    });

    test('should update memory', () => {
      const entry = new MemoryEntry({ id: 'target1' }, { x: 0, z: 0 });
      const initialSightings = entry.sightings;

      entry.update({ x: 100, z: 100 }, 'vision');

      expect(entry.position.x).toBe(100);
      expect(entry.position.z).toBe(100);
      expect(entry.sightings).toBe(initialSightings + 1);
      expect(entry.confidence).toBe(1.0);
    });

    test('should decay confidence', () => {
      const entry = new MemoryEntry({ id: 'target1' }, { x: 0, z: 0 });
      entry.decay(0.1, 5000); // 5 seconds at 0.1 per second

      expect(entry.confidence).toBeCloseTo(0.5, 1);
    });

    test('should not decay below zero', () => {
      const entry = new MemoryEntry({ id: 'target1' }, { x: 0, z: 0 });
      entry.decay(1.0, 10000); // Full decay

      expect(entry.confidence).toBe(0);
    });

    test('should calculate age', () => {
      const entry = new MemoryEntry({ id: 'target1' }, { x: 0, z: 0 });
      const age = entry.getAge();

      expect(age).toBeGreaterThanOrEqual(0);
      expect(age).toBeLessThan(100);
    });

    test('should check validity', () => {
      const entry = new MemoryEntry({ id: 'target1' }, { x: 0, z: 0 });
      expect(entry.isValid(30000)).toBe(true);

      entry.confidence = 0;
      expect(entry.isValid(30000)).toBe(false);
    });

    test('should serialize to JSON', () => {
      const entry = new MemoryEntry(
        { id: 'target1', type: 'enemy' },
        { x: 100, z: 200 }
      );

      const json = entry.toJSON();
      expect(json.entityId).toBe('target1');
      expect(json.entityType).toBe('enemy');
      expect(json.position).toEqual({ x: 100, z: 200 });
    });

    test('should deserialize from JSON', () => {
      const data = {
        entityId: 'target1',
        entityType: 'enemy',
        position: { x: 100, z: 200 },
        source: 'vision',
        firstSeen: Date.now() - 5000,
        lastSeen: Date.now(),
        sightings: 3,
        confidence: 0.8,
        threatLevel: 5,
        isFriendly: false
      };

      const entry = MemoryEntry.fromJSON(data);
      expect(entry.entityId).toBe('target1');
      expect(entry.sightings).toBe(3);
      expect(entry.confidence).toBe(0.8);
    });
  });

  // ============================================
  // WEATHER MODIFIERS TESTS
  // ============================================

  describe('WeatherPerceptionModifiers', () => {
    test('should have clear weather as baseline', () => {
      expect(WeatherPerceptionModifiers.CLEAR.vision).toBe(1.0);
      expect(WeatherPerceptionModifiers.CLEAR.hearing).toBe(1.0);
    });

    test('should reduce vision in fog', () => {
      expect(WeatherPerceptionModifiers.FOG.vision).toBeLessThan(1.0);
    });

    test('should reduce hearing in rain', () => {
      expect(WeatherPerceptionModifiers.RAIN.hearing).toBeLessThan(1.0);
    });

    test('should enhance hearing at night', () => {
      expect(WeatherPerceptionModifiers.NIGHT.hearing).toBeGreaterThan(1.0);
    });
  });

  // ============================================
  // SOUND TYPES TESTS
  // ============================================

  describe('SoundType', () => {
    test('should have footstep sounds', () => {
      expect(SoundType.FOOTSTEP).toBeDefined();
      expect(SoundType.FOOTSTEP.range).toBeGreaterThan(0);
    });

    test('should have combat sounds with high priority', () => {
      expect(SoundType.COMBAT.priority).toBeGreaterThan(SoundType.FOOTSTEP.priority);
    });

    test('should have explosion with highest range', () => {
      expect(SoundType.EXPLOSION.range).toBeGreaterThan(SoundType.COMBAT.range);
    });
  });

  // ============================================
  // CONFIGURATION TESTS
  // ============================================

  describe('Configuration', () => {
    test('should accept custom options', () => {
      const custom = new PerceptionSystem({
        defaultVisionRange: 200,
        defaultHearingRange: 100,
        defaultFOV: 90
      });

      expect(custom.defaultVisionRange).toBe(200);
      expect(custom.defaultHearingRange).toBe(100);
      expect(custom.defaultFOV).toBe(90);
    });

    test('should use defaults', () => {
      const defaultSystem = new PerceptionSystem();
      expect(defaultSystem.defaultVisionRange).toBe(100);
      expect(defaultSystem.defaultHearingRange).toBe(50);
    });
  });

  // ============================================
  // WEATHER TESTS
  // ============================================

  describe('Weather System', () => {
    test('should set weather', () => {
      perception.setWeather('RAIN');
      expect(perception.currentWeather).toBe('RAIN');
    });

    test('should set night mode', () => {
      perception.setNightMode(true);
      expect(perception.isNight).toBe(true);
    });

    test('should get weather modifier', () => {
      perception.setWeather('RAIN');
      const modifier = perception.getWeatherModifier();

      expect(modifier.vision).toBe(0.7);
      expect(modifier.hearing).toBe(0.5);
    });

    test('should combine weather and night modifiers', () => {
      perception.setWeather('CLEAR');
      perception.setNightMode(true);

      const modifier = perception.getWeatherModifier();
      expect(modifier.vision).toBeLessThan(1.0);
    });

    test('should handle unknown weather', () => {
      perception.setWeather('UNKNOWN');
      const modifier = perception.getWeatherModifier();

      expect(modifier.vision).toBe(1.0);
      expect(modifier.hearing).toBe(1.0);
    });
  });

  // ============================================
  // VISION TESTS
  // ============================================

  describe('Vision System', () => {
    test('should detect target in range', () => {
      const perceiver = {
        id: 'npc1',
        position: { x: 100, z: 100 },
        facingAngle: 0
      };

      const targets = [
        { id: 'target1', position: { x: 150, z: 100 } }
      ];

      const visible = perception.checkVision(perceiver, targets);
      expect(visible.length).toBe(1);
      expect(visible[0].id).toBe('target1');
    });

    test('should not detect target out of range', () => {
      const perceiver = {
        id: 'npc1',
        position: { x: 100, z: 100 },
        facingAngle: 0,
        visionRange: 50
      };

      const targets = [
        { id: 'target1', position: { x: 200, z: 100 } }
      ];

      const visible = perception.checkVision(perceiver, targets);
      expect(visible.length).toBe(0);
    });

    test('should respect field of view', () => {
      const perceiver = {
        id: 'npc1',
        position: { x: 100, z: 100 },
        facingAngle: 0, // Facing right (+x)
        fov: 90
      };

      const targets = [
        { id: 'inFront', position: { x: 150, z: 100 } },
        { id: 'behind', position: { x: 50, z: 100 } }
      ];

      const visible = perception.checkVision(perceiver, targets);
      expect(visible.length).toBe(1);
      expect(visible[0].id).toBe('inFront');
    });

    test('should detect all targets with 360 FOV', () => {
      const perceiver = {
        id: 'npc1',
        position: { x: 100, z: 100 },
        facingAngle: 0,
        fov: 360
      };

      const targets = [
        { id: 'front', position: { x: 150, z: 100 } },
        { id: 'back', position: { x: 50, z: 100 } },
        { id: 'left', position: { x: 100, z: 50 } },
        { id: 'right', position: { x: 100, z: 150 } }
      ];

      const visible = perception.checkVision(perceiver, targets);
      expect(visible.length).toBe(4);
    });

    test('should skip self in targets', () => {
      const perceiver = {
        id: 'npc1',
        position: { x: 100, z: 100 },
        facingAngle: 0
      };

      const targets = [
        { id: 'npc1', position: { x: 100, z: 100 } },
        { id: 'target1', position: { x: 150, z: 100 } }
      ];

      const visible = perception.checkVision(perceiver, targets);
      expect(visible.length).toBe(1);
      expect(visible[0].id).toBe('target1');
    });

    test('should use line of sight checker', () => {
      perception.setLineOfSightChecker((from, to) => {
        return to.x < 200; // Can only see left side
      });

      const perceiver = {
        id: 'npc1',
        position: { x: 100, z: 100 },
        facingAngle: 0,
        fov: 360
      };

      const targets = [
        { id: 'visible', position: { x: 150, z: 100 } },
        { id: 'blocked', position: { x: 250, z: 100 } }
      ];

      const visible = perception.checkVision(perceiver, targets);
      expect(visible.length).toBe(1);
      expect(visible[0].id).toBe('visible');
    });

    test('should apply weather modifier to vision range', () => {
      perception.setWeather('FOG');

      const perceiver = {
        id: 'npc1',
        position: { x: 100, z: 100 },
        visionRange: 100
      };

      const targets = [
        { id: 'nearTarget', position: { x: 120, z: 100 } },
        { id: 'farTarget', position: { x: 180, z: 100 } }
      ];

      const visible = perception.checkVision(perceiver, targets);
      // Far target should be out of fogged vision range (100 * 0.3 = 30)
      expect(visible.length).toBe(1);
      expect(visible[0].id).toBe('nearTarget');
    });

    test('should update memory on vision', () => {
      const perceiver = { id: 'npc1', position: { x: 100, z: 100 } };
      const targets = [{ id: 'target1', position: { x: 150, z: 100 } }];

      perception.checkVision(perceiver, targets);

      const memory = perception.getMemory('npc1', 'target1');
      expect(memory).not.toBeNull();
      expect(memory.source).toBe('vision');
    });

    test('should increment vision checks stat', () => {
      const perceiver = { id: 'npc1', position: { x: 100, z: 100 } };
      perception.checkVision(perceiver, []);

      expect(perception.stats.visionChecks).toBe(1);
    });
  });

  // ============================================
  // HEARING TESTS
  // ============================================

  describe('Hearing System', () => {
    test('should detect sound in range', () => {
      const perceiver = {
        id: 'npc1',
        position: { x: 100, z: 100 },
        hearingRange: 50
      };

      const sounds = [
        { position: { x: 130, z: 100 }, type: 'FOOTSTEP', sourceId: 'player' }
      ];

      const heard = perception.checkHearing(perceiver, sounds);
      expect(heard.length).toBe(1);
    });

    test('should not detect sound out of range', () => {
      const perceiver = {
        id: 'npc1',
        position: { x: 100, z: 100 },
        hearingRange: 20
      };

      const sounds = [
        { position: { x: 200, z: 100 }, type: 'FOOTSTEP', sourceId: 'player' }
      ];

      const heard = perception.checkHearing(perceiver, sounds);
      expect(heard.length).toBe(0);
    });

    test('should sort by priority', () => {
      const perceiver = {
        id: 'npc1',
        position: { x: 100, z: 100 },
        hearingRange: 200
      };

      const sounds = [
        { position: { x: 120, z: 100 }, type: 'FOOTSTEP', sourceId: 'player' },
        { position: { x: 130, z: 100 }, type: 'COMBAT', sourceId: 'enemy' }
      ];

      const heard = perception.checkHearing(perceiver, sounds);
      expect(heard[0].type).toBe('COMBAT');
    });

    test('should skip sounds from self', () => {
      const perceiver = {
        id: 'npc1',
        position: { x: 100, z: 100 }
      };

      const sounds = [
        { position: { x: 100, z: 100 }, type: 'FOOTSTEP', sourceId: 'npc1' }
      ];

      const heard = perception.checkHearing(perceiver, sounds);
      expect(heard.length).toBe(0);
    });

    test('should apply weather modifier to hearing', () => {
      perception.setWeather('HEAVY_RAIN');

      const perceiver = {
        id: 'npc1',
        position: { x: 100, z: 100 },
        hearingRange: 100
      };

      const sounds = [
        { position: { x: 150, z: 100 }, type: 'FOOTSTEP', sourceId: 'player' }
      ];

      const heard = perception.checkHearing(perceiver, sounds);
      // Heavy rain reduces hearing to 30%, footstep range 20 * 0.3 = 6
      expect(heard.length).toBe(0);
    });

    test('should update memory with approximate position', () => {
      const perceiver = {
        id: 'npc1',
        position: { x: 100, z: 100 },
        hearingRange: 100
      };

      const sounds = [
        { position: { x: 130, z: 100 }, type: 'FOOTSTEP', sourceId: 'player' }
      ];

      perception.checkHearing(perceiver, sounds);
      const memory = perception.getMemory('npc1', 'player');

      expect(memory).not.toBeNull();
      expect(memory.source).toBe('hearing');
    });
  });

  // ============================================
  // CONVENIENCE METHOD TESTS
  // ============================================

  describe('canSee Method', () => {
    test('should return true when target visible', () => {
      const perceiver = {
        id: 'npc1',
        position: { x: 100, z: 100 }
      };

      const target = {
        id: 'target1',
        position: { x: 150, z: 100 }
      };

      expect(perception.canSee(perceiver, target)).toBe(true);
    });

    test('should return false when target not visible', () => {
      const perceiver = {
        id: 'npc1',
        position: { x: 100, z: 100 },
        visionRange: 30
      };

      const target = {
        id: 'target1',
        position: { x: 200, z: 100 }
      };

      expect(perception.canSee(perceiver, target)).toBe(false);
    });
  });

  // ============================================
  // THREAT SHARING TESTS
  // ============================================

  describe('Threat Sharing', () => {
    test('should share threat with allies', () => {
      // Create memory for perceiver
      const perceiver = { id: 'npc1', position: { x: 100, z: 100 } };
      const target = { id: 'enemy1', position: { x: 200, z: 200 } };
      perception.checkVision(perceiver, [target]);

      const allies = [
        { id: 'ally1', position: { x: 120, z: 100 } },
        { id: 'ally2', position: { x: 130, z: 100 } }
      ];

      perception.shareThreatWithAllies(perceiver, allies, 'enemy1', 100);

      // Allies should have memory of threat
      expect(perception.getMemory('ally1', 'enemy1')).not.toBeNull();
      expect(perception.getMemory('ally2', 'enemy1')).not.toBeNull();
    });

    test('should not share with allies out of range', () => {
      const perceiver = { id: 'npc1', position: { x: 100, z: 100 } };
      const target = { id: 'enemy1', position: { x: 200, z: 200 } };
      perception.checkVision(perceiver, [target]);

      const allies = [
        { id: 'farAlly', position: { x: 500, z: 500 } }
      ];

      perception.shareThreatWithAllies(perceiver, allies, 'enemy1', 50);

      expect(perception.getMemory('farAlly', 'enemy1')).toBeNull();
    });

    test('should not share with self', () => {
      const perceiver = { id: 'npc1', position: { x: 100, z: 100 } };
      const target = { id: 'enemy1', position: { x: 200, z: 200 } };
      perception.checkVision(perceiver, [target]);

      const allies = [
        { id: 'npc1', position: { x: 100, z: 100 } }
      ];

      const initialMemory = perception.getMemory('npc1', 'enemy1');
      perception.shareThreatWithAllies(perceiver, allies, 'enemy1', 100);

      // Memory shouldn't be duplicated or modified unexpectedly
      expect(perception.getMemory('npc1', 'enemy1')).not.toBeNull();
    });
  });

  // ============================================
  // MEMORY MANAGEMENT TESTS
  // ============================================

  describe('Memory Management', () => {
    test('should get memory', () => {
      const perceiver = { id: 'npc1', position: { x: 100, z: 100 } };
      const target = { id: 'target1', position: { x: 150, z: 100 } };
      perception.checkVision(perceiver, [target]);

      const memory = perception.getMemory('npc1', 'target1');
      expect(memory).not.toBeNull();
    });

    test('should return null for non-existent memory', () => {
      expect(perception.getMemory('npc1', 'unknown')).toBeNull();
    });

    test('should get all memories', () => {
      const perceiver = { id: 'npc1', position: { x: 100, z: 100 } };
      const targets = [
        { id: 'target1', position: { x: 120, z: 100 } },
        { id: 'target2', position: { x: 140, z: 100 } }
      ];
      perception.checkVision(perceiver, targets);

      const memories = perception.getAllMemories('npc1');
      expect(memories.length).toBe(2);
    });

    test('should filter memories by type', () => {
      const perceiver = { id: 'npc1', position: { x: 100, z: 100 } };
      const targets = [
        { id: 'target1', position: { x: 120, z: 100 }, type: 'enemy' },
        { id: 'target2', position: { x: 140, z: 100 }, type: 'friendly' }
      ];
      perception.checkVision(perceiver, targets);

      const enemies = perception.getAllMemories('npc1', { type: 'enemy' });
      expect(enemies.length).toBe(1);
    });

    test('should get hostile memories', () => {
      const perceiver = { id: 'npc1', position: { x: 100, z: 100 } };
      const targets = [
        { id: 'target1', position: { x: 120, z: 100 }, faction: 'player', isFriendly: true },
        { id: 'target2', position: { x: 140, z: 100 }, faction: 'enemy', isFriendly: false }
      ];
      perception.checkVision(perceiver, targets);

      const hostile = perception.getHostileMemories('npc1');
      expect(hostile.length).toBe(1);
      expect(hostile[0].entityId).toBe('target2');
    });

    test('should get last known position', () => {
      const perceiver = { id: 'npc1', position: { x: 100, z: 100 } };
      const target = { id: 'target1', position: { x: 150, z: 200 } };
      perception.checkVision(perceiver, [target]);

      const pos = perception.getLastKnownPosition('npc1', 'target1');
      expect(pos).not.toBeNull();
      expect(pos.x).toBe(150);
      expect(pos.z).toBe(200);
    });

    test('should clear memories for entity', () => {
      const perceiver = { id: 'npc1', position: { x: 100, z: 100 } };
      const target = { id: 'target1', position: { x: 150, z: 100 } };
      perception.checkVision(perceiver, [target]);

      perception.clearMemories('npc1');
      expect(perception.getMemory('npc1', 'target1')).toBeNull();
    });
  });

  // ============================================
  // UPDATE TESTS
  // ============================================

  describe('Update System', () => {
    test('should decay memory confidence', () => {
      const perceiver = { id: 'npc1', position: { x: 100, z: 100 } };
      const target = { id: 'target1', position: { x: 150, z: 100 } };
      perception.checkVision(perceiver, [target]);

      perception.update(5000); // 5 seconds

      const memory = perception.getMemory('npc1', 'target1');
      expect(memory.confidence).toBeLessThan(1.0);
    });

    test('should expire old memories', () => {
      const perceiver = { id: 'npc1', position: { x: 100, z: 100 } };
      const target = { id: 'target1', position: { x: 150, z: 100 } };
      perception.checkVision(perceiver, [target]);

      // Manually set old timestamp
      const entityMemories = perception.memories.get('npc1');
      const memory = entityMemories.get('target1');
      memory.lastSeen = Date.now() - 60000; // 1 minute ago
      memory.confidence = 0;

      perception.update(1000);

      expect(perception.getMemory('npc1', 'target1')).toBeNull();
    });

    test('should track expired memories in stats', () => {
      const perceiver = { id: 'npc1', position: { x: 100, z: 100 } };
      const target = { id: 'target1', position: { x: 150, z: 100 } };
      perception.checkVision(perceiver, [target]);

      const entityMemories = perception.memories.get('npc1');
      const memory = entityMemories.get('target1');
      memory.lastSeen = Date.now() - 60000;
      memory.confidence = 0;

      perception.update(1000);

      expect(perception.stats.memoriesExpired).toBeGreaterThan(0);
    });
  });

  // ============================================
  // EVENT LISTENER TESTS
  // ============================================

  describe('Event Listeners', () => {
    test('should add listener', () => {
      const listener = jest.fn();
      perception.addListener(listener);

      expect(perception.listeners).toContain(listener);
    });

    test('should remove listener', () => {
      const listener = jest.fn();
      perception.addListener(listener);
      perception.removeListener(listener);

      expect(perception.listeners).not.toContain(listener);
    });

    test('should emit SAW_ENTITY event', () => {
      const listener = jest.fn();
      perception.addListener(listener);

      const perceiver = { id: 'npc1', position: { x: 100, z: 100 } };
      const target = { id: 'target1', position: { x: 150, z: 100 } };
      perception.checkVision(perceiver, [target]);

      expect(listener).toHaveBeenCalledWith(
        PerceptionEventType.SAW_ENTITY,
        expect.objectContaining({
          perceiverId: 'npc1',
          targetId: 'target1'
        })
      );
    });

    test('should emit HEARD_SOUND event', () => {
      const listener = jest.fn();
      perception.addListener(listener);

      const perceiver = { id: 'npc1', position: { x: 100, z: 100 } };
      const sounds = [
        { position: { x: 110, z: 100 }, type: 'FOOTSTEP', sourceId: 'player' }
      ];
      perception.checkHearing(perceiver, sounds);

      expect(listener).toHaveBeenCalledWith(
        PerceptionEventType.HEARD_SOUND,
        expect.objectContaining({
          perceiverId: 'npc1',
          sourceId: 'player'
        })
      );
    });

    test('should handle listener errors gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const errorListener = () => { throw new Error('Test error'); };
      perception.addListener(errorListener);

      const perceiver = { id: 'npc1', position: { x: 100, z: 100 } };
      const target = { id: 'target1', position: { x: 150, z: 100 } };

      expect(() => {
        perception.checkVision(perceiver, [target]);
      }).not.toThrow();

      consoleSpy.mockRestore();
    });
  });

  // ============================================
  // UTILITY METHOD TESTS
  // ============================================

  describe('Utility Methods', () => {
    test('should calculate distance', () => {
      const dist = perception.getDistance(
        { x: 0, z: 0 },
        { x: 3, z: 4 }
      );
      expect(dist).toBe(5);
    });

    test('should calculate direction', () => {
      const dir = perception.getDirection(
        { x: 0, z: 0 },
        { x: 1, z: 0 }
      );
      expect(dir).toBeCloseTo(0, 5);
    });
  });

  // ============================================
  // STATISTICS TESTS
  // ============================================

  describe('Statistics', () => {
    test('should track vision checks', () => {
      const perceiver = { id: 'npc1', position: { x: 100, z: 100 } };
      perception.checkVision(perceiver, []);
      perception.checkVision(perceiver, []);

      expect(perception.stats.visionChecks).toBe(2);
    });

    test('should track hearing checks', () => {
      const perceiver = { id: 'npc1', position: { x: 100, z: 100 } };
      perception.checkHearing(perceiver, []);

      expect(perception.stats.hearingChecks).toBe(1);
    });

    test('should track memories created', () => {
      const perceiver = { id: 'npc1', position: { x: 100, z: 100 } };
      const targets = [
        { id: 'target1', position: { x: 120, z: 100 } },
        { id: 'target2', position: { x: 140, z: 100 } }
      ];
      perception.checkVision(perceiver, targets);

      expect(perception.stats.memoriesCreated).toBe(2);
    });

    test('should get full statistics', () => {
      const stats = perception.getStatistics();
      expect(stats).toHaveProperty('visionChecks');
      expect(stats).toHaveProperty('hearingChecks');
      expect(stats).toHaveProperty('memoriesCreated');
      expect(stats).toHaveProperty('entitiesWithMemory');
      expect(stats).toHaveProperty('totalMemories');
    });

    test('should reset statistics', () => {
      const perceiver = { id: 'npc1', position: { x: 100, z: 100 } };
      perception.checkVision(perceiver, []);
      perception.resetStatistics();

      expect(perception.stats.visionChecks).toBe(0);
    });
  });

  // ============================================
  // SERIALIZATION TESTS
  // ============================================

  describe('Serialization', () => {
    test('should serialize to JSON', () => {
      perception.setWeather('RAIN');
      perception.setNightMode(true);

      const perceiver = { id: 'npc1', position: { x: 100, z: 100 } };
      const target = { id: 'target1', position: { x: 150, z: 100 } };
      perception.checkVision(perceiver, [target]);

      const json = perception.toJSON();
      expect(json.currentWeather).toBe('RAIN');
      expect(json.isNight).toBe(true);
      expect(json.memories).toHaveProperty('npc1');
    });

    test('should deserialize from JSON', () => {
      const data = {
        currentWeather: 'FOG',
        isNight: true,
        memories: {
          'npc1': {
            'target1': {
              entityId: 'target1',
              entityType: 'enemy',
              position: { x: 100, z: 200 },
              source: 'vision',
              firstSeen: Date.now(),
              lastSeen: Date.now(),
              sightings: 1,
              confidence: 1.0,
              threatLevel: 5,
              isFriendly: false
            }
          }
        }
      };

      perception.fromJSON(data);

      expect(perception.currentWeather).toBe('FOG');
      expect(perception.isNight).toBe(true);
      expect(perception.getMemory('npc1', 'target1')).not.toBeNull();
    });
  });
});
