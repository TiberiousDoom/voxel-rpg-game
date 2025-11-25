/**
 * BehaviorTree.js - Generic Behavior Tree Architecture
 *
 * Implements a flexible behavior tree system for AI decision-making:
 * - Node types: Selector, Sequence, Decorator, Leaf, Parallel
 * - Status: SUCCESS, FAILURE, RUNNING
 * - Blackboard for shared state
 *
 * @see https://www.gamedeveloper.com/programming/behavior-trees-for-ai-how-they-work
 */

/**
 * Node execution status
 */
export const NodeStatus = {
  SUCCESS: 'SUCCESS',
  FAILURE: 'FAILURE',
  RUNNING: 'RUNNING'
};

/**
 * Blackboard - Shared memory for behavior tree nodes
 * Allows nodes to store and retrieve data without direct coupling
 */
export class Blackboard {
  constructor() {
    this.data = new Map();
  }

  /**
   * Set a value on the blackboard
   * @param {string} key - Key to store value under
   * @param {*} value - Value to store
   */
  set(key, value) {
    this.data.set(key, value);
  }

  /**
   * Get a value from the blackboard
   * @param {string} key - Key to retrieve
   * @param {*} defaultValue - Default if key not found
   * @returns {*} Stored value or default
   */
  get(key, defaultValue = null) {
    return this.data.has(key) ? this.data.get(key) : defaultValue;
  }

  /**
   * Check if key exists
   * @param {string} key - Key to check
   * @returns {boolean}
   */
  has(key) {
    return this.data.has(key);
  }

  /**
   * Remove a key from blackboard
   * @param {string} key - Key to remove
   */
  remove(key) {
    this.data.delete(key);
  }

  /**
   * Clear all data
   */
  clear() {
    this.data.clear();
  }

  /**
   * Serialize blackboard to JSON
   * @returns {Object}
   */
  toJSON() {
    const obj = {};
    for (const [key, value] of this.data) {
      obj[key] = value;
    }
    return obj;
  }

  /**
   * Load from JSON
   * @param {Object} data
   */
  fromJSON(data) {
    this.data.clear();
    for (const [key, value] of Object.entries(data)) {
      this.data.set(key, value);
    }
  }
}

/**
 * Base Node class for behavior tree nodes
 */
export class BTNode {
  constructor(name = 'BTNode') {
    this.name = name;
    this.children = [];
    this.parent = null;
  }

  /**
   * Execute the node
   * @param {Object} context - Execution context {entity, blackboard, gameState, deltaTime}
   * @returns {string} NodeStatus
   */
  execute(context) {
    return NodeStatus.FAILURE;
  }

  /**
   * Add a child node
   * @param {BTNode} child - Child node to add
   * @returns {BTNode} This node for chaining
   */
  addChild(child) {
    if (child instanceof BTNode) {
      child.parent = this;
      this.children.push(child);
    }
    return this;
  }

  /**
   * Remove a child node
   * @param {BTNode} child - Child to remove
   * @returns {boolean} Success
   */
  removeChild(child) {
    const index = this.children.indexOf(child);
    if (index !== -1) {
      this.children.splice(index, 1);
      child.parent = null;
      return true;
    }
    return false;
  }

  /**
   * Reset node state (called when tree is restarted)
   */
  reset() {
    for (const child of this.children) {
      child.reset();
    }
  }
}

/**
 * Selector Node (OR logic)
 * Executes children in order until one succeeds
 * Returns SUCCESS if any child succeeds
 * Returns FAILURE only if all children fail
 * Returns RUNNING if a child is running
 */
export class Selector extends BTNode {
  constructor(name = 'Selector') {
    super(name);
    this.runningChildIndex = 0;
  }

  execute(context) {
    for (let i = this.runningChildIndex; i < this.children.length; i++) {
      const status = this.children[i].execute(context);

      if (status === NodeStatus.RUNNING) {
        this.runningChildIndex = i;
        return NodeStatus.RUNNING;
      }

      if (status === NodeStatus.SUCCESS) {
        this.runningChildIndex = 0;
        return NodeStatus.SUCCESS;
      }
    }

    this.runningChildIndex = 0;
    return NodeStatus.FAILURE;
  }

  reset() {
    this.runningChildIndex = 0;
    super.reset();
  }
}

/**
 * Sequence Node (AND logic)
 * Executes children in order until one fails
 * Returns FAILURE if any child fails
 * Returns SUCCESS only if all children succeed
 * Returns RUNNING if a child is running
 */
export class Sequence extends BTNode {
  constructor(name = 'Sequence') {
    super(name);
    this.runningChildIndex = 0;
  }

  execute(context) {
    for (let i = this.runningChildIndex; i < this.children.length; i++) {
      const status = this.children[i].execute(context);

      if (status === NodeStatus.RUNNING) {
        this.runningChildIndex = i;
        return NodeStatus.RUNNING;
      }

      if (status === NodeStatus.FAILURE) {
        this.runningChildIndex = 0;
        return NodeStatus.FAILURE;
      }
    }

    this.runningChildIndex = 0;
    return NodeStatus.SUCCESS;
  }

  reset() {
    this.runningChildIndex = 0;
    super.reset();
  }
}

/**
 * Parallel Node
 * Executes all children simultaneously
 * Policy determines success/failure conditions
 */
export class Parallel extends BTNode {
  /**
   * @param {string} name - Node name
   * @param {number} successThreshold - Number of children that must succeed (default: all)
   * @param {number} failureThreshold - Number of children that must fail to fail (default: 1)
   */
  constructor(name = 'Parallel', successThreshold = -1, failureThreshold = 1) {
    super(name);
    this.successThreshold = successThreshold;
    this.failureThreshold = failureThreshold;
  }

  execute(context) {
    let successCount = 0;
    let failureCount = 0;
    let runningCount = 0;

    for (const child of this.children) {
      const status = child.execute(context);

      if (status === NodeStatus.SUCCESS) {
        successCount++;
      } else if (status === NodeStatus.FAILURE) {
        failureCount++;
      } else {
        runningCount++;
      }
    }

    // Check failure threshold
    if (failureCount >= this.failureThreshold) {
      return NodeStatus.FAILURE;
    }

    // Check success threshold (-1 means all must succeed)
    const requiredSuccesses = this.successThreshold === -1 ?
      this.children.length : this.successThreshold;

    if (successCount >= requiredSuccesses) {
      return NodeStatus.SUCCESS;
    }

    // Still running if any are running
    if (runningCount > 0) {
      return NodeStatus.RUNNING;
    }

    return NodeStatus.FAILURE;
  }
}

/**
 * Decorator Node - Wraps a single child and modifies its behavior
 */
export class Decorator extends BTNode {
  constructor(name = 'Decorator') {
    super(name);
  }

  get child() {
    return this.children[0] || null;
  }

  set child(node) {
    this.children = node ? [node] : [];
    if (node) node.parent = this;
  }
}

/**
 * Inverter Decorator
 * Inverts the result of its child (SUCCESS <-> FAILURE)
 * RUNNING is passed through unchanged
 */
export class Inverter extends Decorator {
  constructor(name = 'Inverter') {
    super(name);
  }

  execute(context) {
    if (!this.child) return NodeStatus.FAILURE;

    const status = this.child.execute(context);

    if (status === NodeStatus.SUCCESS) return NodeStatus.FAILURE;
    if (status === NodeStatus.FAILURE) return NodeStatus.SUCCESS;
    return status;
  }
}

/**
 * Succeeder Decorator
 * Always returns SUCCESS regardless of child result
 * (except RUNNING which is passed through)
 */
export class Succeeder extends Decorator {
  constructor(name = 'Succeeder') {
    super(name);
  }

  execute(context) {
    if (!this.child) return NodeStatus.SUCCESS;

    const status = this.child.execute(context);
    return status === NodeStatus.RUNNING ? NodeStatus.RUNNING : NodeStatus.SUCCESS;
  }
}

/**
 * Repeater Decorator
 * Repeats child execution a specified number of times
 */
export class Repeater extends Decorator {
  /**
   * @param {string} name - Node name
   * @param {number} times - Number of times to repeat (-1 for infinite)
   */
  constructor(name = 'Repeater', times = -1) {
    super(name);
    this.times = times;
    this.currentCount = 0;
  }

  execute(context) {
    if (!this.child) return NodeStatus.FAILURE;

    if (this.times !== -1 && this.currentCount >= this.times) {
      this.currentCount = 0;
      return NodeStatus.SUCCESS;
    }

    const status = this.child.execute(context);

    if (status === NodeStatus.RUNNING) {
      return NodeStatus.RUNNING;
    }

    this.currentCount++;

    if (this.times === -1) {
      return NodeStatus.RUNNING;
    }

    if (this.currentCount >= this.times) {
      this.currentCount = 0;
      return NodeStatus.SUCCESS;
    }

    return NodeStatus.RUNNING;
  }

  reset() {
    this.currentCount = 0;
    super.reset();
  }
}

/**
 * Condition Decorator
 * Only executes child if condition is met
 */
export class Condition extends Decorator {
  /**
   * @param {string} name - Node name
   * @param {Function} conditionFn - Function that returns boolean
   */
  constructor(name = 'Condition', conditionFn = () => true) {
    super(name);
    this.conditionFn = conditionFn;
  }

  execute(context) {
    if (!this.conditionFn(context)) {
      return NodeStatus.FAILURE;
    }

    if (!this.child) {
      return NodeStatus.SUCCESS;
    }

    return this.child.execute(context);
  }
}

/**
 * Cooldown Decorator
 * Prevents child from executing more often than specified interval
 */
export class Cooldown extends Decorator {
  /**
   * @param {string} name - Node name
   * @param {number} cooldownMs - Cooldown in milliseconds
   */
  constructor(name = 'Cooldown', cooldownMs = 1000) {
    super(name);
    this.cooldownMs = cooldownMs;
    this.lastExecutionTime = 0;
  }

  execute(context) {
    const now = Date.now();

    if (now - this.lastExecutionTime < this.cooldownMs) {
      return NodeStatus.FAILURE;
    }

    if (!this.child) return NodeStatus.FAILURE;

    const status = this.child.execute(context);

    if (status !== NodeStatus.RUNNING) {
      this.lastExecutionTime = now;
    }

    return status;
  }

  reset() {
    this.lastExecutionTime = 0;
    super.reset();
  }
}

/**
 * Leaf Node - Base class for action/condition nodes
 * Subclass and override execute() to create custom behaviors
 */
export class Leaf extends BTNode {
  constructor(name = 'Leaf') {
    super(name);
  }
}

/**
 * Action Node - Executes a function
 * Convenient for simple actions without creating a subclass
 */
export class Action extends Leaf {
  /**
   * @param {string} name - Node name
   * @param {Function} actionFn - Function to execute, returns NodeStatus
   */
  constructor(name = 'Action', actionFn = () => NodeStatus.SUCCESS) {
    super(name);
    this.actionFn = actionFn;
  }

  execute(context) {
    try {
      const result = this.actionFn(context);
      // Ensure we return a valid status
      if (Object.values(NodeStatus).includes(result)) {
        return result;
      }
      return result ? NodeStatus.SUCCESS : NodeStatus.FAILURE;
    } catch (error) {
      console.error(`[BehaviorTree] Action '${this.name}' error:`, error);
      return NodeStatus.FAILURE;
    }
  }
}

/**
 * ConditionCheck Node - Checks a condition
 */
export class ConditionCheck extends Leaf {
  /**
   * @param {string} name - Node name
   * @param {Function} checkFn - Function that returns boolean
   */
  constructor(name = 'ConditionCheck', checkFn = () => false) {
    super(name);
    this.checkFn = checkFn;
  }

  execute(context) {
    try {
      return this.checkFn(context) ? NodeStatus.SUCCESS : NodeStatus.FAILURE;
    } catch (error) {
      console.error(`[BehaviorTree] Condition '${this.name}' error:`, error);
      return NodeStatus.FAILURE;
    }
  }
}

/**
 * Wait Node - Returns RUNNING for a specified duration, then SUCCESS
 */
export class Wait extends Leaf {
  /**
   * @param {string} name - Node name
   * @param {number} durationMs - Duration to wait in milliseconds
   */
  constructor(name = 'Wait', durationMs = 1000) {
    super(name);
    this.durationMs = durationMs;
    this.startTime = null;
  }

  execute(context) {
    if (this.startTime === null) {
      this.startTime = Date.now();
    }

    const elapsed = Date.now() - this.startTime;

    if (elapsed >= this.durationMs) {
      this.startTime = null;
      return NodeStatus.SUCCESS;
    }

    return NodeStatus.RUNNING;
  }

  reset() {
    this.startTime = null;
    super.reset();
  }
}

/**
 * BehaviorTree - Main behavior tree class
 * Manages tree execution and blackboard
 */
export class BehaviorTree {
  /**
   * @param {BTNode} root - Root node of the tree
   * @param {Blackboard} blackboard - Optional shared blackboard
   */
  constructor(root = null, blackboard = null) {
    this.root = root;
    this.blackboard = blackboard || new Blackboard();
    this.lastStatus = null;
  }

  /**
   * Set the root node
   * @param {BTNode} node - Root node
   */
  setRoot(node) {
    this.root = node;
  }

  /**
   * Execute the behavior tree
   * @param {Object} entity - Entity running this tree
   * @param {Object} gameState - Current game state
   * @param {number} deltaTime - Time since last update (ms)
   * @returns {string} NodeStatus
   */
  update(entity, gameState, deltaTime = 0) {
    if (!this.root) {
      return NodeStatus.FAILURE;
    }

    const context = {
      entity,
      blackboard: this.blackboard,
      gameState,
      deltaTime
    };

    this.lastStatus = this.root.execute(context);
    return this.lastStatus;
  }

  /**
   * Reset the tree to initial state
   */
  reset() {
    if (this.root) {
      this.root.reset();
    }
    this.lastStatus = null;
  }

  /**
   * Get the last execution status
   * @returns {string|null}
   */
  getLastStatus() {
    return this.lastStatus;
  }
}

/**
 * BehaviorTreeBuilder - Fluent builder for creating behavior trees
 */
export class BehaviorTreeBuilder {
  constructor() {
    this.stack = [];
    this.root = null;
  }

  /**
   * Start a selector node
   * @param {string} name - Node name
   * @returns {BehaviorTreeBuilder}
   */
  selector(name = 'Selector') {
    const node = new Selector(name);
    this._addNode(node);
    this.stack.push(node);
    return this;
  }

  /**
   * Start a sequence node
   * @param {string} name - Node name
   * @returns {BehaviorTreeBuilder}
   */
  sequence(name = 'Sequence') {
    const node = new Sequence(name);
    this._addNode(node);
    this.stack.push(node);
    return this;
  }

  /**
   * Start a parallel node
   * @param {string} name - Node name
   * @param {number} successThreshold - Success threshold
   * @param {number} failureThreshold - Failure threshold
   * @returns {BehaviorTreeBuilder}
   */
  parallel(name = 'Parallel', successThreshold = -1, failureThreshold = 1) {
    const node = new Parallel(name, successThreshold, failureThreshold);
    this._addNode(node);
    this.stack.push(node);
    return this;
  }

  /**
   * Add an inverter decorator
   * @param {string} name - Node name
   * @returns {BehaviorTreeBuilder}
   */
  inverter(name = 'Inverter') {
    const node = new Inverter(name);
    this._addNode(node);
    this.stack.push(node);
    return this;
  }

  /**
   * Add a condition decorator
   * @param {string} name - Node name
   * @param {Function} conditionFn - Condition function
   * @returns {BehaviorTreeBuilder}
   */
  condition(name, conditionFn) {
    const node = new Condition(name, conditionFn);
    this._addNode(node);
    this.stack.push(node);
    return this;
  }

  /**
   * Add a cooldown decorator
   * @param {string} name - Node name
   * @param {number} cooldownMs - Cooldown duration
   * @returns {BehaviorTreeBuilder}
   */
  cooldown(name, cooldownMs) {
    const node = new Cooldown(name, cooldownMs);
    this._addNode(node);
    this.stack.push(node);
    return this;
  }

  /**
   * Add an action leaf
   * @param {string} name - Node name
   * @param {Function} actionFn - Action function
   * @returns {BehaviorTreeBuilder}
   */
  action(name, actionFn) {
    const node = new Action(name, actionFn);
    this._addNode(node);
    return this;
  }

  /**
   * Add a condition check leaf
   * @param {string} name - Node name
   * @param {Function} checkFn - Check function
   * @returns {BehaviorTreeBuilder}
   */
  check(name, checkFn) {
    const node = new ConditionCheck(name, checkFn);
    this._addNode(node);
    return this;
  }

  /**
   * Add a wait leaf
   * @param {string} name - Node name
   * @param {number} durationMs - Duration to wait
   * @returns {BehaviorTreeBuilder}
   */
  wait(name, durationMs) {
    const node = new Wait(name, durationMs);
    this._addNode(node);
    return this;
  }

  /**
   * End current composite/decorator node
   * @returns {BehaviorTreeBuilder}
   */
  end() {
    if (this.stack.length > 0) {
      this.stack.pop();
    }
    return this;
  }

  /**
   * Build the behavior tree
   * @param {Blackboard} blackboard - Optional blackboard
   * @returns {BehaviorTree}
   */
  build(blackboard = null) {
    return new BehaviorTree(this.root, blackboard);
  }

  /**
   * Internal: Add node to tree
   * @private
   */
  _addNode(node) {
    if (this.stack.length === 0) {
      this.root = node;
    } else {
      const parent = this.stack[this.stack.length - 1];
      if (parent instanceof Decorator) {
        parent.child = node;
      } else {
        parent.addChild(node);
      }
    }
  }
}

export default BehaviorTree;
