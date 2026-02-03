/**
 * BehaviorTree.test.js - Comprehensive tests for Behavior Tree system
 */

import {
  BehaviorTree,
  BehaviorTreeBuilder,
  BTNode,
  Selector,
  Sequence,
  Parallel,
  Decorator,
  Inverter,
  Succeeder,
  Repeater,
  Condition,
  Cooldown,
  Leaf,
  Action,
  ConditionCheck,
  Wait,
  Blackboard,
  NodeStatus
} from '../BehaviorTree.js';

describe('BehaviorTree System', () => {
  // ============================================
  // BLACKBOARD TESTS
  // ============================================

  describe('Blackboard', () => {
    let blackboard;

    beforeEach(() => {
      blackboard = new Blackboard();
    });

    test('should set and get values', () => {
      blackboard.set('health', 100);
      expect(blackboard.get('health')).toBe(100);
    });

    test('should return default value for missing keys', () => {
      expect(blackboard.get('missing', 'default')).toBe('default');
    });

    test('should return null for missing keys without default', () => {
      expect(blackboard.get('missing')).toBeNull();
    });

    test('should check if key exists', () => {
      blackboard.set('exists', true);
      expect(blackboard.has('exists')).toBe(true);
      expect(blackboard.has('notExists')).toBe(false);
    });

    test('should remove keys', () => {
      blackboard.set('toRemove', 'value');
      blackboard.remove('toRemove');
      expect(blackboard.has('toRemove')).toBe(false);
    });

    test('should clear all data', () => {
      blackboard.set('a', 1);
      blackboard.set('b', 2);
      blackboard.clear();
      expect(blackboard.has('a')).toBe(false);
      expect(blackboard.has('b')).toBe(false);
    });

    test('should serialize to JSON', () => {
      blackboard.set('name', 'test');
      blackboard.set('value', 42);
      const json = blackboard.toJSON();
      expect(json).toEqual({ name: 'test', value: 42 });
    });

    test('should load from JSON', () => {
      blackboard.fromJSON({ loaded: true, count: 5 });
      expect(blackboard.get('loaded')).toBe(true);
      expect(blackboard.get('count')).toBe(5);
    });
  });

  // ============================================
  // BTNODE TESTS
  // ============================================

  describe('BTNode', () => {
    test('should have default name', () => {
      const node = new BTNode();
      expect(node.name).toBe('BTNode');
    });

    test('should accept custom name', () => {
      const node = new BTNode('CustomNode');
      expect(node.name).toBe('CustomNode');
    });

    test('should add children', () => {
      const parent = new BTNode('Parent');
      const child = new BTNode('Child');
      parent.addChild(child);
      expect(parent.children.length).toBe(1);
      expect(child.parent).toBe(parent);
    });

    test('should remove children', () => {
      const parent = new BTNode('Parent');
      const child = new BTNode('Child');
      parent.addChild(child);
      const result = parent.removeChild(child);
      expect(result).toBe(true);
      expect(parent.children.length).toBe(0);
      expect(child.parent).toBeNull();
    });

    test('should return false when removing non-child', () => {
      const parent = new BTNode('Parent');
      const other = new BTNode('Other');
      expect(parent.removeChild(other)).toBe(false);
    });

    test('should default execute to FAILURE', () => {
      const node = new BTNode();
      expect(node.execute({})).toBe(NodeStatus.FAILURE);
    });

    test('should reset children recursively', () => {
      const parent = new BTNode('Parent');
      const child1 = new Repeater('Repeater', 5);
      const child2 = new Wait('Wait', 1000);
      child1.currentCount = 3;
      child2.startTime = Date.now();
      parent.addChild(child1);
      parent.addChild(child2);
      parent.reset();
      expect(child1.currentCount).toBe(0);
      expect(child2.startTime).toBeNull();
    });
  });

  // ============================================
  // SELECTOR TESTS
  // ============================================

  describe('Selector', () => {
    test('should return SUCCESS when first child succeeds', () => {
      const selector = new Selector('TestSelector');
      selector.addChild(new Action('Success', () => NodeStatus.SUCCESS));
      selector.addChild(new Action('NeverRun', () => NodeStatus.FAILURE));

      const status = selector.execute({});
      expect(status).toBe(NodeStatus.SUCCESS);
    });

    test('should return SUCCESS when any child succeeds', () => {
      const selector = new Selector('TestSelector');
      selector.addChild(new Action('Fail1', () => NodeStatus.FAILURE));
      selector.addChild(new Action('Fail2', () => NodeStatus.FAILURE));
      selector.addChild(new Action('Success', () => NodeStatus.SUCCESS));

      const status = selector.execute({});
      expect(status).toBe(NodeStatus.SUCCESS);
    });

    test('should return FAILURE when all children fail', () => {
      const selector = new Selector('TestSelector');
      selector.addChild(new Action('Fail1', () => NodeStatus.FAILURE));
      selector.addChild(new Action('Fail2', () => NodeStatus.FAILURE));

      const status = selector.execute({});
      expect(status).toBe(NodeStatus.FAILURE);
    });

    test('should return RUNNING and resume from running child', () => {
      let callCount = 0;
      const selector = new Selector('TestSelector');
      selector.addChild(new Action('Fail', () => NodeStatus.FAILURE));
      selector.addChild(new Action('Running', () => {
        callCount++;
        return callCount < 3 ? NodeStatus.RUNNING : NodeStatus.SUCCESS;
      }));

      expect(selector.execute({})).toBe(NodeStatus.RUNNING);
      expect(selector.execute({})).toBe(NodeStatus.RUNNING);
      expect(selector.execute({})).toBe(NodeStatus.SUCCESS);
    });

    test('should reset running child index on completion', () => {
      const selector = new Selector('TestSelector');
      selector.addChild(new Action('Success', () => NodeStatus.SUCCESS));
      selector.runningChildIndex = 1;

      selector.execute({});
      expect(selector.runningChildIndex).toBe(0);
    });
  });

  // ============================================
  // SEQUENCE TESTS
  // ============================================

  describe('Sequence', () => {
    test('should return SUCCESS when all children succeed', () => {
      const sequence = new Sequence('TestSequence');
      sequence.addChild(new Action('Success1', () => NodeStatus.SUCCESS));
      sequence.addChild(new Action('Success2', () => NodeStatus.SUCCESS));

      const status = sequence.execute({});
      expect(status).toBe(NodeStatus.SUCCESS);
    });

    test('should return FAILURE when any child fails', () => {
      const sequence = new Sequence('TestSequence');
      sequence.addChild(new Action('Success', () => NodeStatus.SUCCESS));
      sequence.addChild(new Action('Fail', () => NodeStatus.FAILURE));
      sequence.addChild(new Action('NeverRun', () => NodeStatus.SUCCESS));

      const status = sequence.execute({});
      expect(status).toBe(NodeStatus.FAILURE);
    });

    test('should return RUNNING and resume from running child', () => {
      let callCount = 0;
      const sequence = new Sequence('TestSequence');
      sequence.addChild(new Action('Success', () => NodeStatus.SUCCESS));
      sequence.addChild(new Action('Running', () => {
        callCount++;
        return callCount < 2 ? NodeStatus.RUNNING : NodeStatus.SUCCESS;
      }));

      expect(sequence.execute({})).toBe(NodeStatus.RUNNING);
      expect(sequence.execute({})).toBe(NodeStatus.SUCCESS);
    });
  });

  // ============================================
  // PARALLEL TESTS
  // ============================================

  describe('Parallel', () => {
    test('should execute all children', () => {
      let count = 0;
      const parallel = new Parallel('TestParallel');
      parallel.addChild(new Action('A', () => { count++; return NodeStatus.SUCCESS; }));
      parallel.addChild(new Action('B', () => { count++; return NodeStatus.SUCCESS; }));

      parallel.execute({});
      expect(count).toBe(2);
    });

    test('should return SUCCESS when all children succeed', () => {
      const parallel = new Parallel('TestParallel', -1, 1);
      parallel.addChild(new Action('A', () => NodeStatus.SUCCESS));
      parallel.addChild(new Action('B', () => NodeStatus.SUCCESS));

      expect(parallel.execute({})).toBe(NodeStatus.SUCCESS);
    });

    test('should return FAILURE when failure threshold reached', () => {
      const parallel = new Parallel('TestParallel', -1, 1);
      parallel.addChild(new Action('A', () => NodeStatus.FAILURE));
      parallel.addChild(new Action('B', () => NodeStatus.SUCCESS));

      expect(parallel.execute({})).toBe(NodeStatus.FAILURE);
    });

    test('should return SUCCESS when success threshold reached', () => {
      const parallel = new Parallel('TestParallel', 2, 3);
      parallel.addChild(new Action('A', () => NodeStatus.SUCCESS));
      parallel.addChild(new Action('B', () => NodeStatus.SUCCESS));
      parallel.addChild(new Action('C', () => NodeStatus.FAILURE));

      expect(parallel.execute({})).toBe(NodeStatus.SUCCESS);
    });

    test('should return RUNNING when any child is running', () => {
      const parallel = new Parallel('TestParallel', -1, 3);
      parallel.addChild(new Action('A', () => NodeStatus.SUCCESS));
      parallel.addChild(new Action('B', () => NodeStatus.RUNNING));

      expect(parallel.execute({})).toBe(NodeStatus.RUNNING);
    });
  });

  // ============================================
  // DECORATOR TESTS
  // ============================================

  describe('Decorator', () => {
    test('should have child getter and setter', () => {
      const decorator = new Decorator('TestDecorator');
      const child = new Action('Child', () => NodeStatus.SUCCESS);

      decorator.child = child;
      expect(decorator.child).toBe(child);
      expect(child.parent).toBe(decorator);
    });

    test('should return null for no child', () => {
      const decorator = new Decorator('TestDecorator');
      expect(decorator.child).toBeNull();
    });
  });

  // ============================================
  // INVERTER TESTS
  // ============================================

  describe('Inverter', () => {
    test('should invert SUCCESS to FAILURE', () => {
      const inverter = new Inverter('TestInverter');
      inverter.child = new Action('Success', () => NodeStatus.SUCCESS);

      expect(inverter.execute({})).toBe(NodeStatus.FAILURE);
    });

    test('should invert FAILURE to SUCCESS', () => {
      const inverter = new Inverter('TestInverter');
      inverter.child = new Action('Fail', () => NodeStatus.FAILURE);

      expect(inverter.execute({})).toBe(NodeStatus.SUCCESS);
    });

    test('should pass through RUNNING', () => {
      const inverter = new Inverter('TestInverter');
      inverter.child = new Action('Running', () => NodeStatus.RUNNING);

      expect(inverter.execute({})).toBe(NodeStatus.RUNNING);
    });

    test('should return FAILURE with no child', () => {
      const inverter = new Inverter('TestInverter');
      expect(inverter.execute({})).toBe(NodeStatus.FAILURE);
    });
  });

  // ============================================
  // SUCCEEDER TESTS
  // ============================================

  describe('Succeeder', () => {
    test('should convert FAILURE to SUCCESS', () => {
      const succeeder = new Succeeder('TestSucceeder');
      succeeder.child = new Action('Fail', () => NodeStatus.FAILURE);

      expect(succeeder.execute({})).toBe(NodeStatus.SUCCESS);
    });

    test('should pass through SUCCESS', () => {
      const succeeder = new Succeeder('TestSucceeder');
      succeeder.child = new Action('Success', () => NodeStatus.SUCCESS);

      expect(succeeder.execute({})).toBe(NodeStatus.SUCCESS);
    });

    test('should pass through RUNNING', () => {
      const succeeder = new Succeeder('TestSucceeder');
      succeeder.child = new Action('Running', () => NodeStatus.RUNNING);

      expect(succeeder.execute({})).toBe(NodeStatus.RUNNING);
    });

    test('should return SUCCESS with no child', () => {
      const succeeder = new Succeeder('TestSucceeder');
      expect(succeeder.execute({})).toBe(NodeStatus.SUCCESS);
    });
  });

  // ============================================
  // REPEATER TESTS
  // ============================================

  describe('Repeater', () => {
    test('should repeat specified number of times', () => {
      let count = 0;
      const repeater = new Repeater('TestRepeater', 3);
      repeater.child = new Action('Count', () => { count++; return NodeStatus.SUCCESS; });

      expect(repeater.execute({})).toBe(NodeStatus.RUNNING);
      expect(repeater.execute({})).toBe(NodeStatus.RUNNING);
      expect(repeater.execute({})).toBe(NodeStatus.SUCCESS);
      expect(count).toBe(3);
    });

    test('should return RUNNING for infinite repeat', () => {
      const repeater = new Repeater('TestRepeater', -1);
      repeater.child = new Action('Success', () => NodeStatus.SUCCESS);

      for (let i = 0; i < 10; i++) {
        expect(repeater.execute({})).toBe(NodeStatus.RUNNING);
      }
    });

    test('should pass through RUNNING from child', () => {
      const repeater = new Repeater('TestRepeater', 3);
      repeater.child = new Action('Running', () => NodeStatus.RUNNING);

      expect(repeater.execute({})).toBe(NodeStatus.RUNNING);
    });

    test('should return FAILURE with no child', () => {
      const repeater = new Repeater('TestRepeater', 3);
      expect(repeater.execute({})).toBe(NodeStatus.FAILURE);
    });

    test('should reset currentCount on reset', () => {
      const repeater = new Repeater('TestRepeater', 3);
      repeater.currentCount = 2;
      repeater.reset();
      expect(repeater.currentCount).toBe(0);
    });
  });

  // ============================================
  // CONDITION DECORATOR TESTS
  // ============================================

  describe('Condition Decorator', () => {
    test('should execute child when condition is true', () => {
      const condition = new Condition('TestCondition', () => true);
      condition.child = new Action('Success', () => NodeStatus.SUCCESS);

      expect(condition.execute({})).toBe(NodeStatus.SUCCESS);
    });

    test('should return FAILURE when condition is false', () => {
      const condition = new Condition('TestCondition', () => false);
      condition.child = new Action('Success', () => NodeStatus.SUCCESS);

      expect(condition.execute({})).toBe(NodeStatus.FAILURE);
    });

    test('should return SUCCESS with no child when condition is true', () => {
      const condition = new Condition('TestCondition', () => true);
      expect(condition.execute({})).toBe(NodeStatus.SUCCESS);
    });

    test('should receive context in condition function', () => {
      const context = { entity: { health: 50 } };
      const condition = new Condition('TestCondition', (ctx) => ctx.entity.health > 25);
      condition.child = new Action('Success', () => NodeStatus.SUCCESS);

      expect(condition.execute(context)).toBe(NodeStatus.SUCCESS);
    });
  });

  // ============================================
  // COOLDOWN TESTS
  // ============================================

  describe('Cooldown', () => {
    test('should execute child when not on cooldown', () => {
      const cooldown = new Cooldown('TestCooldown', 100);
      cooldown.child = new Action('Success', () => NodeStatus.SUCCESS);
      cooldown.lastExecutionTime = 0;

      expect(cooldown.execute({})).toBe(NodeStatus.SUCCESS);
    });

    test('should return FAILURE when on cooldown', () => {
      const cooldown = new Cooldown('TestCooldown', 1000);
      cooldown.child = new Action('Success', () => NodeStatus.SUCCESS);
      cooldown.lastExecutionTime = Date.now();

      expect(cooldown.execute({})).toBe(NodeStatus.FAILURE);
    });

    test('should not update lastExecutionTime when RUNNING', () => {
      const cooldown = new Cooldown('TestCooldown', 100);
      cooldown.child = new Action('Running', () => NodeStatus.RUNNING);
      cooldown.lastExecutionTime = 0;

      cooldown.execute({});
      expect(cooldown.lastExecutionTime).toBe(0);
    });

    test('should return FAILURE with no child', () => {
      const cooldown = new Cooldown('TestCooldown', 100);
      expect(cooldown.execute({})).toBe(NodeStatus.FAILURE);
    });
  });

  // ============================================
  // ACTION TESTS
  // ============================================

  describe('Action', () => {
    test('should execute action function', () => {
      let executed = false;
      const action = new Action('TestAction', () => {
        executed = true;
        return NodeStatus.SUCCESS;
      });

      action.execute({});
      expect(executed).toBe(true);
    });

    test('should return action function result', () => {
      const action = new Action('TestAction', () => NodeStatus.RUNNING);
      expect(action.execute({})).toBe(NodeStatus.RUNNING);
    });

    test('should convert truthy return to SUCCESS', () => {
      const action = new Action('TestAction', () => true);
      expect(action.execute({})).toBe(NodeStatus.SUCCESS);
    });

    test('should convert falsy return to FAILURE', () => {
      const action = new Action('TestAction', () => false);
      expect(action.execute({})).toBe(NodeStatus.FAILURE);
    });

    test('should handle errors gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const action = new Action('TestAction', () => {
        throw new Error('Test error');
      });

      expect(action.execute({})).toBe(NodeStatus.FAILURE);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    test('should receive context', () => {
      const context = { data: 'test' };
      let receivedContext = null;
      const action = new Action('TestAction', (ctx) => {
        receivedContext = ctx;
        return NodeStatus.SUCCESS;
      });

      action.execute(context);
      expect(receivedContext).toBe(context);
    });
  });

  // ============================================
  // CONDITIONCHECK TESTS
  // ============================================

  describe('ConditionCheck', () => {
    test('should return SUCCESS when check returns true', () => {
      const check = new ConditionCheck('TestCheck', () => true);
      expect(check.execute({})).toBe(NodeStatus.SUCCESS);
    });

    test('should return FAILURE when check returns false', () => {
      const check = new ConditionCheck('TestCheck', () => false);
      expect(check.execute({})).toBe(NodeStatus.FAILURE);
    });

    test('should receive context', () => {
      const context = { value: 10 };
      const check = new ConditionCheck('TestCheck', (ctx) => ctx.value > 5);
      expect(check.execute(context)).toBe(NodeStatus.SUCCESS);
    });

    test('should handle errors gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const check = new ConditionCheck('TestCheck', () => {
        throw new Error('Test error');
      });

      expect(check.execute({})).toBe(NodeStatus.FAILURE);
      consoleSpy.mockRestore();
    });
  });

  // ============================================
  // WAIT TESTS
  // ============================================

  describe('Wait', () => {
    test('should return RUNNING before duration', () => {
      const wait = new Wait('TestWait', 1000);
      expect(wait.execute({})).toBe(NodeStatus.RUNNING);
    });

    test('should return SUCCESS after duration', async () => {
      const wait = new Wait('TestWait', 10);
      wait.execute({});

      await new Promise(resolve => setTimeout(resolve, 20));

      expect(wait.execute({})).toBe(NodeStatus.SUCCESS);
    });

    test('should reset startTime on completion', async () => {
      const wait = new Wait('TestWait', 10);
      wait.execute({});

      await new Promise(resolve => setTimeout(resolve, 20));

      wait.execute({});
      expect(wait.startTime).toBeNull();
    });

    test('should reset startTime on reset()', () => {
      const wait = new Wait('TestWait', 1000);
      wait.startTime = Date.now();
      wait.reset();
      expect(wait.startTime).toBeNull();
    });
  });

  // ============================================
  // BEHAVIORTREE TESTS
  // ============================================

  describe('BehaviorTree', () => {
    test('should create with root and blackboard', () => {
      const root = new Selector('Root');
      const blackboard = new Blackboard();
      const tree = new BehaviorTree(root, blackboard);

      expect(tree.root).toBe(root);
      expect(tree.blackboard).toBe(blackboard);
    });

    test('should create default blackboard if not provided', () => {
      const tree = new BehaviorTree();
      expect(tree.blackboard).toBeInstanceOf(Blackboard);
    });

    test('should set root node', () => {
      const tree = new BehaviorTree();
      const root = new Selector('Root');
      tree.setRoot(root);
      expect(tree.root).toBe(root);
    });

    test('should return FAILURE with no root', () => {
      const tree = new BehaviorTree();
      expect(tree.update({}, {})).toBe(NodeStatus.FAILURE);
    });

    test('should execute root and track status', () => {
      const root = new Action('Root', () => NodeStatus.SUCCESS);
      const tree = new BehaviorTree(root);

      const status = tree.update({}, {});
      expect(status).toBe(NodeStatus.SUCCESS);
      expect(tree.getLastStatus()).toBe(NodeStatus.SUCCESS);
    });

    test('should pass context to root', () => {
      let receivedContext = null;
      const root = new Action('Root', (ctx) => {
        receivedContext = ctx;
        return NodeStatus.SUCCESS;
      });
      const tree = new BehaviorTree(root);

      const entity = { id: 'test' };
      const gameState = { time: 0 };
      tree.update(entity, gameState, 16);

      expect(receivedContext.entity).toBe(entity);
      expect(receivedContext.gameState).toBe(gameState);
      expect(receivedContext.deltaTime).toBe(16);
      expect(receivedContext.blackboard).toBe(tree.blackboard);
    });

    test('should reset tree', () => {
      const root = new Repeater('Root', 5);
      root.currentCount = 3;
      root.child = new Action('Child', () => NodeStatus.SUCCESS);

      const tree = new BehaviorTree(root);
      tree.lastStatus = NodeStatus.RUNNING;

      tree.reset();
      expect(root.currentCount).toBe(0);
      expect(tree.lastStatus).toBeNull();
    });
  });

  // ============================================
  // BEHAVIORTREEBUILDER TESTS
  // ============================================

  describe('BehaviorTreeBuilder', () => {
    test('should build simple tree with action', () => {
      const tree = new BehaviorTreeBuilder()
        .action('Test', () => NodeStatus.SUCCESS)
        .build();

      expect(tree.update({}, {})).toBe(NodeStatus.SUCCESS);
    });

    test('should build selector with children', () => {
      const tree = new BehaviorTreeBuilder()
        .selector('Root')
          .action('Fail', () => NodeStatus.FAILURE)
          .action('Success', () => NodeStatus.SUCCESS)
        .end()
        .build();

      expect(tree.update({}, {})).toBe(NodeStatus.SUCCESS);
    });

    test('should build sequence with children', () => {
      let count = 0;
      const tree = new BehaviorTreeBuilder()
        .sequence('Root')
          .action('A', () => { count++; return NodeStatus.SUCCESS; })
          .action('B', () => { count++; return NodeStatus.SUCCESS; })
        .end()
        .build();

      tree.update({}, {});
      expect(count).toBe(2);
    });

    test('should build parallel with children', () => {
      let count = 0;
      const tree = new BehaviorTreeBuilder()
        .parallel('Root')
          .action('A', () => { count++; return NodeStatus.SUCCESS; })
          .action('B', () => { count++; return NodeStatus.SUCCESS; })
        .end()
        .build();

      tree.update({}, {});
      expect(count).toBe(2);
    });

    test('should build with inverter', () => {
      const tree = new BehaviorTreeBuilder()
        .inverter('Not')
          .action('Fail', () => NodeStatus.FAILURE)
        .end()
        .build();

      expect(tree.update({}, {})).toBe(NodeStatus.SUCCESS);
    });

    test('should build with condition', () => {
      const tree = new BehaviorTreeBuilder()
        .condition('Check', () => true)
          .action('Success', () => NodeStatus.SUCCESS)
        .end()
        .build();

      expect(tree.update({}, {})).toBe(NodeStatus.SUCCESS);
    });

    test('should build with cooldown', () => {
      const tree = new BehaviorTreeBuilder()
        .cooldown('Cooldown', 1000)
          .action('Success', () => NodeStatus.SUCCESS)
        .end()
        .build();

      expect(tree.update({}, {})).toBe(NodeStatus.SUCCESS);
      expect(tree.update({}, {})).toBe(NodeStatus.FAILURE); // On cooldown
    });

    test('should build with check leaf', () => {
      const tree = new BehaviorTreeBuilder()
        .check('IsTrue', () => true)
        .build();

      expect(tree.update({}, {})).toBe(NodeStatus.SUCCESS);
    });

    test('should build with wait leaf', () => {
      const tree = new BehaviorTreeBuilder()
        .wait('Wait', 1000)
        .build();

      expect(tree.update({}, {})).toBe(NodeStatus.RUNNING);
    });

    test('should build nested structures', () => {
      const tree = new BehaviorTreeBuilder()
        .selector('Root')
          .sequence('First')
            .check('IsFalse', () => false)
            .action('NeverRun', () => NodeStatus.SUCCESS)
          .end()
          .sequence('Second')
            .check('IsTrue', () => true)
            .action('Success', () => NodeStatus.SUCCESS)
          .end()
        .end()
        .build();

      expect(tree.update({}, {})).toBe(NodeStatus.SUCCESS);
    });

    test('should accept blackboard in build', () => {
      const blackboard = new Blackboard();
      blackboard.set('test', true);

      const tree = new BehaviorTreeBuilder()
        .action('CheckBlackboard', (ctx) => {
          return ctx.blackboard.get('test') ? NodeStatus.SUCCESS : NodeStatus.FAILURE;
        })
        .build(blackboard);

      expect(tree.update({}, {})).toBe(NodeStatus.SUCCESS);
    });
  });

  // ============================================
  // INTEGRATION TESTS
  // ============================================

  describe('Integration Tests', () => {
    test('should implement simple AI behavior', () => {
      const entity = { health: 100, target: null };
      const gameState = { enemies: [{ id: 1, position: { x: 10, z: 10 } }] };

      const tree = new BehaviorTreeBuilder()
        .selector('Root')
          // Flee if low health
          .sequence('Flee')
            .check('LowHealth', (ctx) => ctx.entity.health < 30)
            .action('RunAway', () => NodeStatus.SUCCESS)
          .end()
          // Attack if has target
          .sequence('Attack')
            .check('HasTarget', (ctx) => ctx.entity.target !== null)
            .action('AttackTarget', () => NodeStatus.SUCCESS)
          .end()
          // Find target
          .sequence('FindTarget')
            .check('EnemiesExist', (ctx) => ctx.gameState.enemies.length > 0)
            .action('SelectTarget', (ctx) => {
              ctx.entity.target = ctx.gameState.enemies[0];
              return NodeStatus.SUCCESS;
            })
          .end()
          // Idle
          .action('Idle', () => NodeStatus.SUCCESS)
        .end()
        .build();

      // Should find target
      tree.update(entity, gameState);
      expect(entity.target).toBe(gameState.enemies[0]);

      // Should attack target
      expect(tree.update(entity, gameState)).toBe(NodeStatus.SUCCESS);
    });

    test('should use blackboard for state sharing', () => {
      const tree = new BehaviorTreeBuilder()
        .sequence('Root')
          .action('SetValue', (ctx) => {
            ctx.blackboard.set('step', 1);
            return NodeStatus.SUCCESS;
          })
          .action('IncrementValue', (ctx) => {
            const value = ctx.blackboard.get('step', 0);
            ctx.blackboard.set('step', value + 1);
            return NodeStatus.SUCCESS;
          })
          .check('CheckValue', (ctx) => ctx.blackboard.get('step') === 2)
        .end()
        .build();

      expect(tree.update({}, {})).toBe(NodeStatus.SUCCESS);
      expect(tree.blackboard.get('step')).toBe(2);
    });
  });
});
