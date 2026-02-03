/**
 * NPCPartyManager.test.js - Tests for NPC party system
 */
import NPCPartyManager from '../NPCPartyManager.js';

describe('NPCPartyManager', () => {
  let partyManager, mockNPCManager, mockNPCs;

  beforeEach(() => {
    // Create mock NPCs
    mockNPCs = {
      npc1: {
        id: 'npc1',
        name: 'Warrior',
        alive: true,
        onExpedition: false,
        combatStats: {
          health: { current: 150, max: 150 },
          damage: 25,
          defense: 10,
          speed: 3,
          critChance: 10,
          dodgeChance: 5
        }
      },
      npc2: {
        id: 'npc2',
        name: 'Mage',
        alive: true,
        onExpedition: false,
        combatStats: {
          health: { current: 100, max: 100 },
          damage: 40,
          defense: 5,
          speed: 2.5,
          critChance: 15,
          dodgeChance: 10
        }
      },
      npc3: {
        id: 'npc3',
        name: 'Healer',
        alive: true,
        onExpedition: false,
        combatStats: {
          health: { current: 120, max: 120 },
          damage: 10,
          defense: 8,
          speed: 2.8,
          critChance: 5,
          dodgeChance: 8
        }
      },
      npc4: {
        id: 'npc4',
        name: 'Rogue',
        alive: true,
        onExpedition: false,
        combatStats: {
          health: { current: 110, max: 110 },
          damage: 30,
          defense: 6,
          speed: 4,
          critChance: 20,
          dodgeChance: 15
        }
      },
      npc5: {
        id: 'npc5',
        name: 'Dead NPC',
        alive: false,
        onExpedition: false,
        combatStats: {
          health: { current: 0, max: 100 },
          damage: 10,
          defense: 5,
          speed: 3,
          critChance: 5,
          dodgeChance: 5
        }
      }
    };

    // Mock NPC manager
    mockNPCManager = {
      getNPC: jest.fn((id) => mockNPCs[id] || null)
    };

    partyManager = new NPCPartyManager(mockNPCManager);
  });

  describe('createParty', () => {
    test('creates a new party', () => {
      const party = partyManager.createParty();

      expect(party).toBeDefined();
      expect(party.id).toContain('party_');
      expect(party.members).toEqual([]);
      expect(party.leader).toBeNull();
      expect(party.formation).toBe('balanced');
      expect(party.createdAt).toBeDefined();
    });

    test('replaces existing party', async () => {
      const party1 = partyManager.createParty();
      // Wait 5ms to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 5));
      const party2 = partyManager.createParty();

      expect(party2.id).not.toBe(party1.id);
      expect(partyManager.getParty()).toBe(party2);
    });
  });

  describe('addToParty', () => {
    beforeEach(() => {
      partyManager.createParty();
    });

    test('adds NPC to party successfully', () => {
      const result = partyManager.addToParty('npc1', 'tank');

      expect(result.success).toBe(true);
      expect(partyManager.currentParty.members).toHaveLength(1);
      expect(partyManager.currentParty.members[0].npcId).toBe('npc1');
      expect(partyManager.currentParty.members[0].role).toBe('tank');
      expect(partyManager.currentParty.members[0].position).toBe(0);
    });

    test('sets first member as leader', () => {
      partyManager.addToParty('npc1', 'tank');

      expect(partyManager.currentParty.leader).toBe('npc1');
    });

    test('adds multiple NPCs with correct positions', () => {
      partyManager.addToParty('npc1', 'tank');
      partyManager.addToParty('npc2', 'damage');
      partyManager.addToParty('npc3', 'support');

      expect(partyManager.currentParty.members).toHaveLength(3);
      expect(partyManager.currentParty.members[0].position).toBe(0);
      expect(partyManager.currentParty.members[1].position).toBe(1);
      expect(partyManager.currentParty.members[2].position).toBe(2);
    });

    test('prevents adding to non-existent party', () => {
      partyManager.currentParty = null;
      const result = partyManager.addToParty('npc1', 'tank');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No active party');
    });

    test('prevents adding non-existent NPC', () => {
      const result = partyManager.addToParty('nonexistent', 'tank');

      expect(result.success).toBe(false);
      expect(result.error).toBe('NPC not found');
    });

    test('prevents adding duplicate NPC', () => {
      partyManager.addToParty('npc1', 'tank');
      const result = partyManager.addToParty('npc1', 'damage');

      expect(result.success).toBe(false);
      expect(result.error).toBe('NPC already in party');
      expect(partyManager.currentParty.members).toHaveLength(1);
    });

    test('prevents exceeding max party size', () => {
      partyManager.addToParty('npc1', 'tank');
      partyManager.addToParty('npc2', 'damage');
      partyManager.addToParty('npc3', 'support');
      partyManager.addToParty('npc4', 'utility');

      const result = partyManager.addToParty('npc5', 'damage');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Party is full');
      expect(partyManager.currentParty.members).toHaveLength(4);
    });
  });

  describe('removeFromParty', () => {
    beforeEach(() => {
      partyManager.createParty();
      partyManager.addToParty('npc1', 'tank');
      partyManager.addToParty('npc2', 'damage');
      partyManager.addToParty('npc3', 'support');
    });

    test('removes NPC from party', () => {
      const result = partyManager.removeFromParty('npc2');

      expect(result.success).toBe(true);
      expect(partyManager.currentParty.members).toHaveLength(2);
      expect(partyManager.currentParty.members.find(m => m.npcId === 'npc2')).toBeUndefined();
    });

    test('updates positions after removal', () => {
      partyManager.removeFromParty('npc1');

      expect(partyManager.currentParty.members[0].npcId).toBe('npc2');
      expect(partyManager.currentParty.members[0].position).toBe(0);
      expect(partyManager.currentParty.members[1].npcId).toBe('npc3');
      expect(partyManager.currentParty.members[1].position).toBe(1);
    });

    test('updates leader when leader is removed', () => {
      partyManager.removeFromParty('npc1');

      expect(partyManager.currentParty.leader).toBe('npc2');
    });

    test('sets leader to null when last member removed', () => {
      partyManager.removeFromParty('npc1');
      partyManager.removeFromParty('npc2');
      partyManager.removeFromParty('npc3');

      expect(partyManager.currentParty.leader).toBeNull();
    });

    test('prevents removing NPC not in party', () => {
      const result = partyManager.removeFromParty('npc4');

      expect(result.success).toBe(false);
      expect(result.error).toBe('NPC not in party');
    });

    test('prevents removing from non-existent party', () => {
      partyManager.currentParty = null;
      const result = partyManager.removeFromParty('npc1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No active party');
    });
  });

  describe('setLeader', () => {
    beforeEach(() => {
      partyManager.createParty();
      partyManager.addToParty('npc1', 'tank');
      partyManager.addToParty('npc2', 'damage');
    });

    test('sets new leader', () => {
      const result = partyManager.setLeader('npc2');

      expect(result.success).toBe(true);
      expect(partyManager.currentParty.leader).toBe('npc2');
    });

    test('prevents setting non-member as leader', () => {
      const result = partyManager.setLeader('npc3');

      expect(result.success).toBe(false);
      expect(result.error).toBe('NPC not in party');
    });

    test('prevents setting leader on non-existent party', () => {
      partyManager.currentParty = null;
      const result = partyManager.setLeader('npc1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No active party');
    });
  });

  describe('setFormation', () => {
    beforeEach(() => {
      partyManager.createParty();
    });

    test('sets balanced formation', () => {
      const result = partyManager.setFormation('balanced');

      expect(result.success).toBe(true);
      expect(partyManager.currentParty.formation).toBe('balanced');
    });

    test('sets offensive formation', () => {
      const result = partyManager.setFormation('offensive');

      expect(result.success).toBe(true);
      expect(partyManager.currentParty.formation).toBe('offensive');
    });

    test('sets defensive formation', () => {
      const result = partyManager.setFormation('defensive');

      expect(result.success).toBe(true);
      expect(partyManager.currentParty.formation).toBe('defensive');
    });

    test('prevents setting invalid formation', () => {
      const result = partyManager.setFormation('invalid');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid formation');
    });

    test('prevents setting formation on non-existent party', () => {
      partyManager.currentParty = null;
      const result = partyManager.setFormation('balanced');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No active party');
    });
  });

  describe('getParty', () => {
    test('returns current party', () => {
      const party = partyManager.createParty();

      expect(partyManager.getParty()).toBe(party);
    });

    test('returns null when no party', () => {
      expect(partyManager.getParty()).toBeNull();
    });
  });

  describe('disbandParty', () => {
    test('disbands party', () => {
      partyManager.createParty();
      const result = partyManager.disbandParty();

      expect(result.success).toBe(true);
      expect(partyManager.currentParty).toBeNull();
    });
  });

  describe('getPartyStats', () => {
    test('calculates party stats', () => {
      partyManager.createParty();
      partyManager.addToParty('npc1', 'tank');
      partyManager.addToParty('npc2', 'damage');

      const stats = partyManager.getPartyStats();

      expect(stats.totalHealth).toBe(250); // 150 + 100
      expect(stats.totalDamage).toBe(65); // 25 + 40
      expect(stats.averageDefense).toBe(7.5); // (10 + 5) / 2
      expect(stats.averageSpeed).toBe(2.75); // (3 + 2.5) / 2
      expect(stats.critChance).toBe(12.5); // (10 + 15) / 2
      expect(stats.dodgeChance).toBe(7.5); // (5 + 10) / 2
      expect(stats.memberCount).toBe(2);
    });

    test('returns null for empty party', () => {
      partyManager.createParty();

      const stats = partyManager.getPartyStats();

      expect(stats).toBeNull();
    });

    test('returns null when no party exists', () => {
      const stats = partyManager.getPartyStats();

      expect(stats).toBeNull();
    });

    test('handles missing NPCs gracefully', () => {
      partyManager.createParty();
      partyManager.currentParty.members.push({
        npcId: 'nonexistent',
        role: 'tank',
        position: 0
      });

      const stats = partyManager.getPartyStats();

      expect(stats.memberCount).toBe(1);
      expect(stats.totalHealth).toBe(0);
    });
  });

  describe('validateParty', () => {
    beforeEach(() => {
      partyManager.createParty();
    });

    test('validates valid party', () => {
      partyManager.addToParty('npc1', 'tank');
      partyManager.addToParty('npc2', 'damage');

      const result = partyManager.validateParty();

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('fails when no party created', () => {
      partyManager.currentParty = null;

      const result = partyManager.validateParty();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('No party created');
    });

    test('fails when party is empty', () => {
      const result = partyManager.validateParty();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Party is empty');
    });

    test('fails when NPC is dead', () => {
      partyManager.addToParty('npc5', 'tank');

      const result = partyManager.validateParty();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Dead NPC is dead');
    });

    test('fails when NPC has no health', () => {
      mockNPCs.npc1.combatStats.health.current = 0;
      partyManager.addToParty('npc1', 'tank');

      const result = partyManager.validateParty();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Warrior has no health');
    });

    test('fails when NPC is already on expedition', () => {
      mockNPCs.npc1.onExpedition = true;
      partyManager.addToParty('npc1', 'tank');

      const result = partyManager.validateParty();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Warrior is already on an expedition');
    });

    test('reports multiple errors', () => {
      partyManager.addToParty('npc5', 'tank'); // Dead
      mockNPCs.npc1.onExpedition = true;
      partyManager.addToParty('npc1', 'damage'); // On expedition

      const result = partyManager.validateParty();

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('getMemberAtPosition', () => {
    beforeEach(() => {
      partyManager.createParty();
      partyManager.addToParty('npc1', 'tank');
      partyManager.addToParty('npc2', 'damage');
    });

    test('gets member at position', () => {
      const member = partyManager.getMemberAtPosition(1);

      expect(member).toBeDefined();
      expect(member.npcId).toBe('npc2');
    });

    test('returns null for empty position', () => {
      const member = partyManager.getMemberAtPosition(3);

      expect(member).toBeNull();
    });

    test('returns null when no party', () => {
      partyManager.currentParty = null;

      const member = partyManager.getMemberAtPosition(0);

      expect(member).toBeNull();
    });
  });

  describe('swapPositions', () => {
    beforeEach(() => {
      partyManager.createParty();
      partyManager.addToParty('npc1', 'tank');
      partyManager.addToParty('npc2', 'damage');
      partyManager.addToParty('npc3', 'support');
    });

    test('swaps positions successfully', () => {
      const result = partyManager.swapPositions(0, 2);

      expect(result.success).toBe(true);

      const member0 = partyManager.getMemberAtPosition(0);
      const member2 = partyManager.getMemberAtPosition(2);

      expect(member0.npcId).toBe('npc3');
      expect(member2.npcId).toBe('npc1');
    });

    test('prevents swapping invalid positions', () => {
      const result = partyManager.swapPositions(0, 5);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid positions');
    });

    test('prevents swapping when no party', () => {
      partyManager.currentParty = null;

      const result = partyManager.swapPositions(0, 1);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No active party');
    });
  });

  describe('getComposition', () => {
    beforeEach(() => {
      partyManager.createParty();
    });

    test('returns composition summary', () => {
      partyManager.addToParty('npc1', 'tank');
      partyManager.addToParty('npc2', 'damage');
      partyManager.addToParty('npc3', 'support');
      partyManager.addToParty('npc4', 'damage');

      const composition = partyManager.getComposition();

      expect(composition.tank).toBe(1);
      expect(composition.damage).toBe(2);
      expect(composition.support).toBe(1);
      expect(composition.utility).toBe(0);
    });

    test('returns null for empty party', () => {
      const composition = partyManager.getComposition();

      expect(composition).toBeNull();
    });

    test('returns null when no party', () => {
      partyManager.currentParty = null;

      const composition = partyManager.getComposition();

      expect(composition).toBeNull();
    });
  });

  describe('Integration', () => {
    test('complete party management flow', () => {
      // Create party
      partyManager.createParty();
      expect(partyManager.getParty()).toBeDefined();

      // Add members
      partyManager.addToParty('npc1', 'tank');
      partyManager.addToParty('npc2', 'damage');
      partyManager.addToParty('npc3', 'support');

      expect(partyManager.currentParty.members).toHaveLength(3);
      expect(partyManager.currentParty.leader).toBe('npc1');

      // Change leader
      partyManager.setLeader('npc2');
      expect(partyManager.currentParty.leader).toBe('npc2');

      // Change formation
      partyManager.setFormation('offensive');
      expect(partyManager.currentParty.formation).toBe('offensive');

      // Get stats
      const stats = partyManager.getPartyStats();
      expect(stats.memberCount).toBe(3);

      // Validate
      const validation = partyManager.validateParty();
      expect(validation.valid).toBe(true);

      // Remove member
      partyManager.removeFromParty('npc3');
      expect(partyManager.currentParty.members).toHaveLength(2);

      // Disband
      partyManager.disbandParty();
      expect(partyManager.currentParty).toBeNull();
    });
  });
});
