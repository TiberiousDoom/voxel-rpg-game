/**
 * Command System Tests
 *
 * Tests for Phase 2 NPC Control Redesign:
 * - Command creation and execution
 * - Command queue management
 * - Formation movement
 * - NPC command integration
 */

import {
  Command,
  CommandQueue,
  CommandType,
  CommandStatus,
  CommandPriority,
  CommandFactory,
  Formation,
  FormationType,
} from '../NPCCommand';
import { NPCManager } from '../NPCManager';
import GridManager from '../../foundation/GridManager';
import TownManager from '../../territory-town/TownManager';
import BuildingConfig from '../../building-types/BuildingConfig';

describe('Command System', () => {
  describe('Command', () => {
    test('should create a command with correct properties', () => {
      const command = new Command(CommandType.MOVE_TO, { position: { x: 5, y: 0, z: 5 } });

      expect(command.type).toBe(CommandType.MOVE_TO);
      expect(command.params.position).toEqual({ x: 5, y: 0, z: 5 });
      expect(command.status).toBe(CommandStatus.QUEUED);
      expect(command.progress).toBe(0);
    });

    test('should activate command', () => {
      const command = new Command(CommandType.MOVE_TO, {});
      command.activate();

      expect(command.status).toBe(CommandStatus.ACTIVE);
      expect(command.startedAt).toBeTruthy();
    });

    test('should complete command', () => {
      const command = new Command(CommandType.MOVE_TO, {});
      command.activate();
      command.complete();

      expect(command.status).toBe(CommandStatus.COMPLETED);
      expect(command.progress).toBe(1.0);
      expect(command.isComplete()).toBe(true);
    });

    test('should fail command with error', () => {
      const command = new Command(CommandType.MOVE_TO, {});
      command.fail('Target unreachable');

      expect(command.status).toBe(CommandStatus.FAILED);
      expect(command.error).toBe('Target unreachable');
      expect(command.isComplete()).toBe(true);
    });

    test('should update progress', () => {
      const command = new Command(CommandType.MOVE_TO, {});
      command.updateProgress(0.5);

      expect(command.progress).toBe(0.5);
    });
  });

  describe('CommandQueue', () => {
    test('should add commands to queue', () => {
      const queue = new CommandQueue();
      const cmd1 = new Command(CommandType.MOVE_TO, {}, CommandPriority.NORMAL);
      const cmd2 = new Command(CommandType.PATROL, {}, CommandPriority.HIGH);

      queue.addCommand(cmd1);
      queue.addCommand(cmd2);

      expect(queue.isEmpty()).toBe(false);
    });

    test('should prioritize commands correctly', () => {
      const queue = new CommandQueue();
      const lowPriority = new Command(CommandType.MOVE_TO, {}, CommandPriority.LOW);
      const highPriority = new Command(CommandType.RALLY, {}, CommandPriority.HIGH);

      queue.addCommand(lowPriority);
      queue.addCommand(highPriority);

      const next = queue.getNextCommand();
      expect(next).toBe(highPriority);
    });

    test('should return active command', () => {
      const queue = new CommandQueue();
      const command = new Command(CommandType.MOVE_TO, {});
      queue.addCommand(command);

      const first = queue.getNextCommand();
      const second = queue.getNextCommand();

      expect(first).toBe(second);
      expect(first.status).toBe(CommandStatus.ACTIVE);
    });

    test('should cancel current command', () => {
      const queue = new CommandQueue();
      const command = new Command(CommandType.MOVE_TO, {});
      queue.addCommand(command);

      queue.getNextCommand();
      queue.cancelCurrent();

      expect(command.status).toBe(CommandStatus.CANCELLED);
    });

    test('should clear completed commands', () => {
      const queue = new CommandQueue();
      const cmd1 = new Command(CommandType.MOVE_TO, {});
      const cmd2 = new Command(CommandType.MOVE_TO, {});

      cmd1.complete();
      queue.addCommand(cmd1);
      queue.addCommand(cmd2);

      queue.clearCompleted();

      const status = queue.getStatus();
      expect(status.completedCount).toBe(0);
    });
  });

  describe('CommandFactory', () => {
    test('should create moveTo command', () => {
      const command = CommandFactory.moveTo({ x: 10, y: 0, z: 10 });

      expect(command.type).toBe(CommandType.MOVE_TO);
      expect(command.params.position).toEqual({ x: 10, y: 0, z: 10 });
    });

    test('should create follow command', () => {
      const command = CommandFactory.follow('npc-123', 3.0);

      expect(command.type).toBe(CommandType.FOLLOW);
      expect(command.params.targetId).toBe('npc-123');
      expect(command.params.distance).toBe(3.0);
    });

    test('should create patrol command', () => {
      const waypoints = [{ x: 0, y: 0, z: 0 }, { x: 5, y: 0, z: 5 }];
      const command = CommandFactory.patrol(waypoints, true);

      expect(command.type).toBe(CommandType.PATROL);
      expect(command.params.waypoints).toEqual(waypoints);
      expect(command.params.loop).toBe(true);
    });
  });

  describe('Formation', () => {
    test('should create formation', () => {
      const formation = new Formation(FormationType.LINE, 'leader-1');

      expect(formation.type).toBe(FormationType.LINE);
      expect(formation.leaderId).toBe('leader-1');
      expect(formation.memberIds).toEqual([]);
    });

    test('should add members to formation', () => {
      const formation = new Formation(FormationType.LINE, 'leader-1');
      formation.addMember('npc-1');
      formation.addMember('npc-2');

      expect(formation.memberIds).toEqual(['npc-1', 'npc-2']);
    });

    test('should remove members from formation', () => {
      const formation = new Formation(FormationType.LINE, 'leader-1');
      formation.addMember('npc-1');
      formation.addMember('npc-2');
      formation.removeMember('npc-1');

      expect(formation.memberIds).toEqual(['npc-2']);
    });

    test('should calculate LINE formation positions', () => {
      const formation = new Formation(FormationType.LINE, 'leader-1');
      formation.addMember('npc-1');
      formation.addMember('npc-2');

      const leaderPos = { x: 5, y: 0, z: 5 };
      const leaderDir = { x: 0, z: 1 };

      const positions = formation.calculatePositions(leaderPos, leaderDir);

      expect(positions.size).toBe(2);
      expect(positions.has('npc-1')).toBe(true);
      expect(positions.has('npc-2')).toBe(true);
    });

    test('should calculate COLUMN formation positions', () => {
      const formation = new Formation(FormationType.COLUMN, 'leader-1');
      formation.addMember('npc-1');
      formation.addMember('npc-2');

      const leaderPos = { x: 5, y: 0, z: 5 };
      const positions = formation.calculatePositions(leaderPos);

      expect(positions.size).toBe(2);

      // NPCs should be behind leader in a column
      const pos1 = positions.get('npc-1');
      const pos2 = positions.get('npc-2');
      expect(pos1.z).toBeLessThan(leaderPos.z);
      expect(pos2.z).toBeLessThan(pos1.z);
    });
  });
});

describe('NPC Command Integration', () => {
  let npcManager;
  let gridManager;
  let townManager;

  beforeEach(() => {
    gridManager = new GridManager(10, 50);
    const buildingConfig = new BuildingConfig();
    townManager = new TownManager(buildingConfig);
    npcManager = new NPCManager(townManager, gridManager);
  });

  test('should issue command to NPC', () => {
    const result = npcManager.spawnNPC('WORKER', { x: 0, y: 25, z: 0 });
    const npcId = result.npcId;

    const command = CommandFactory.moveTo({ x: 5, y: 25, z: 5 });
    const success = npcManager.issueCommand(npcId, command);

    expect(success).toBe(true);

    const status = npcManager.getCommandStatus(npcId);
    expect(status.queuedCount).toBe(1);
  });

  test('should execute MOVE_TO command', () => {
    const result = npcManager.spawnNPC('WORKER', { x: 0, y: 25, z: 0 });
    const npcId = result.npcId;

    const command = CommandFactory.moveTo({ x: 2, y: 25, z: 2 });
    npcManager.issueCommand(npcId, command);

    const npc = npcManager.getNPC(npcId);
    const initialPos = { ...npc.position };

    // Process command and movement for 1 second (60 frames)
    for (let i = 0; i < 60; i++) {
      npcManager.updateMovement(1 / 60);
    }

    // NPC should have moved
    const finalPos = npc.position;
    const distance = Math.sqrt(
      Math.pow(finalPos.x - initialPos.x, 2) +
      Math.pow(finalPos.z - initialPos.z, 2)
    );
    expect(distance).toBeGreaterThan(0);
  });

  test('should execute FOLLOW command', () => {
    const leader = npcManager.spawnNPC('WORKER', { x: 5, y: 25, z: 5 });
    const follower = npcManager.spawnNPC('WORKER', { x: 0, y: 25, z: 0 });

    const command = CommandFactory.follow(leader.npcId, 2.0);
    npcManager.issueCommand(follower.npcId, command);

    // Process commands
    for (let i = 0; i < 30; i++) {
      npcManager.updateMovement(1 / 60);
    }

    const followerNPC = npcManager.getNPC(follower.npcId);
    const leaderNPC = npcManager.getNPC(leader.npcId);

    // Follower should be moving toward leader
    expect(followerNPC.isMoving || followerNPC.targetPosition).toBeTruthy();
  });

  test('should execute PATROL command', () => {
    const result = npcManager.spawnNPC('WORKER', { x: 0, y: 25, z: 0 });
    const npcId = result.npcId;

    const waypoints = [
      { x: 2, y: 25, z: 0 },
      { x: 2, y: 25, z: 2 },
      { x: 0, y: 25, z: 2 },
    ];

    const command = CommandFactory.patrol(waypoints, true);
    npcManager.issueCommand(npcId, command);

    // Process for 2 seconds
    for (let i = 0; i < 120; i++) {
      npcManager.updateMovement(1 / 60);
    }

    // NPC should be patrolling
    const status = npcManager.getCommandStatus(npcId);
    expect(status.activeCommand).toBeTruthy();
    expect(status.activeCommand.type).toBe(CommandType.PATROL);
  });

  test('should cancel command', () => {
    const result = npcManager.spawnNPC('WORKER', { x: 0, y: 25, z: 0 });
    const npcId = result.npcId;

    const command = CommandFactory.moveTo({ x: 10, y: 25, z: 10 });
    npcManager.issueCommand(npcId, command);

    npcManager.cancelCommand(npcId);

    const status = npcManager.getCommandStatus(npcId);
    expect(status.activeCommand).toBeNull();
  });
});

describe('Formation System', () => {
  let npcManager;
  let gridManager;
  let townManager;

  beforeEach(() => {
    gridManager = new GridManager(10, 50);
    const buildingConfig = new BuildingConfig();
    townManager = new TownManager(buildingConfig);
    npcManager = new NPCManager(townManager, gridManager);
  });

  test('should create formation', () => {
    const leader = npcManager.spawnNPC('WORKER', { x: 5, y: 25, z: 5 });
    const formation = npcManager.createFormation(FormationType.LINE, leader.npcId);

    expect(formation).toBeTruthy();
    expect(formation.leaderId).toBe(leader.npcId);
  });

  test('should add NPCs to formation', () => {
    const leader = npcManager.spawnNPC('WORKER', { x: 5, y: 25, z: 5 });
    const member1 = npcManager.spawnNPC('WORKER', { x: 4, y: 25, z: 4 });
    const member2 = npcManager.spawnNPC('WORKER', { x: 6, y: 25, z: 4 });

    const formation = npcManager.createFormation(FormationType.LINE, leader.npcId);
    npcManager.addToFormation(formation.id, member1.npcId);
    npcManager.addToFormation(formation.id, member2.npcId);

    const formationInfo = npcManager.getFormation(formation.id);
    expect(formationInfo.memberCount).toBe(2);
  });

  test('should update formation positions', () => {
    const leader = npcManager.spawnNPC('WORKER', { x: 5, y: 25, z: 5 });
    const member = npcManager.spawnNPC('WORKER', { x: 4, y: 25, z: 4 });

    const formation = npcManager.createFormation(FormationType.COLUMN, leader.npcId);
    npcManager.addToFormation(formation.id, member.npcId);

    // Move leader
    const leaderNPC = npcManager.getNPC(leader.npcId);
    leaderNPC.targetPosition = { x: 8, y: 25, z: 8 };
    leaderNPC.isMoving = true;

    // Update formations
    npcManager.updateFormations(1 / 60);

    // Member should have updated target position
    const memberNPC = npcManager.getNPC(member.npcId);
    expect(memberNPC.targetPosition).toBeTruthy();
  });

  test('should remove NPC from formation', () => {
    const leader = npcManager.spawnNPC('WORKER', { x: 5, y: 25, z: 5 });
    const member = npcManager.spawnNPC('WORKER', { x: 4, y: 25, z: 4 });

    const formation = npcManager.createFormation(FormationType.LINE, leader.npcId);
    npcManager.addToFormation(formation.id, member.npcId);
    npcManager.removeFromFormation(member.npcId);

    const formationInfo = npcManager.getFormation(formation.id);
    expect(formationInfo.memberCount).toBe(0);
  });
});
