/**
 * DialogueEngine.js — Processes dialogue trees with branching choices and conditions.
 *
 * Dialogue tree format:
 * {
 *   "nodeId": {
 *     "speaker": "Name",
 *     "text": "What they say",
 *     "choices": [
 *       { "id": "choice1", "text": "Player says this", "next": "otherNodeId" },
 *       { "id": "choice2", "text": "Player says this", "action": "close" },
 *       { "id": "choice3", "text": "Conditional", "requires": { "bondLevel": 50 } }
 *     ],
 *     "next": "autoAdvanceNodeId"  // If no choices, auto-advance
 *   }
 * }
 */

class DialogueEngine {
  constructor() {
    this._tree = null;
    this._currentNodeId = null;
    this._complete = false;
    this._lastAction = null;
  }

  /**
   * Start a dialogue from a tree object or a specific node within a larger tree.
   * @param {Object} tree - Dialogue tree (nodeId → node)
   * @param {string} startNodeId - Node to start from
   */
  startDialogue(tree, startNodeId = null) {
    // If tree is a single node (has 'text' property), wrap it
    if (tree && tree.text) {
      this._tree = { root: tree };
      this._currentNodeId = 'root';
    } else {
      this._tree = tree;
      this._currentNodeId = startNodeId || Object.keys(tree)[0];
    }
    this._complete = false;
    this._lastAction = null;
  }

  /**
   * Get the current dialogue node.
   * @returns {{ speaker: string, text: string, choices?: Array }|null}
   */
  getCurrentNode() {
    if (!this._tree || !this._currentNodeId || this._complete) return null;
    return this._tree[this._currentNodeId] || null;
  }

  /**
   * Get the current speaker name.
   * @returns {string|null}
   */
  getSpeaker() {
    const node = this.getCurrentNode();
    return node?.speaker || null;
  }

  /**
   * Get the current dialogue text.
   * @returns {string|null}
   */
  getText() {
    const node = this.getCurrentNode();
    return node?.text || null;
  }

  /**
   * Get available choices for the current node, filtered by conditions.
   * @param {Object} playerState - { bondLevel, inventory, ... } for condition checking
   * @returns {Array<{ id: string, text: string }>}
   */
  getAvailableChoices(playerState = {}) {
    const node = this.getCurrentNode();
    if (!node || !node.choices) return [];

    return node.choices.filter((choice) => {
      if (!choice.requires) return true;

      // Check food requirement
      if (choice.requires.food) {
        const mats = playerState.inventory?.materials;
        if (!mats) return false;
        if ((mats.berry || 0) < 1 && (mats.meat || 0) < 1) return false;
      }

      // Check bond level
      if (choice.requires.bondLevel != null) {
        if ((playerState.bondLevel || 0) < choice.requires.bondLevel) return false;
      }

      return true;
    });
  }

  /**
   * Select a choice by ID. Advances the dialogue.
   * @param {string} choiceId
   * @returns {{ action?: string, next?: string }|null}
   */
  selectChoice(choiceId) {
    const node = this.getCurrentNode();
    if (!node || !node.choices) return null;

    const choice = node.choices.find((c) => c.id === choiceId);
    if (!choice) return null;

    if (choice.action === 'close') {
      this._complete = true;
      this._lastAction = 'close';
      return { action: 'close' };
    }

    if (choice.action) {
      this._lastAction = choice.action;
    }

    if (choice.next) {
      this._currentNodeId = choice.next;
      return { next: choice.next, action: choice.action || null };
    }

    // No next node and no close action — end dialogue
    this._complete = true;
    return { action: choice.action || 'close' };
  }

  /**
   * Auto-advance to the next node (for nodes without choices).
   * @returns {boolean} Whether advancement happened
   */
  advance() {
    const node = this.getCurrentNode();
    if (!node) return false;

    if (node.next) {
      this._currentNodeId = node.next;
      return true;
    }

    // No next and no choices — dialogue ends
    if (!node.choices || node.choices.length === 0) {
      this._complete = true;
    }
    return false;
  }

  /**
   * Is the dialogue complete?
   * @returns {boolean}
   */
  isComplete() {
    return this._complete;
  }

  /**
   * Get the last action triggered (for external handling).
   * @returns {string|null}
   */
  getLastAction() {
    return this._lastAction;
  }

  /**
   * Has choices available on the current node?
   * @returns {boolean}
   */
  hasChoices() {
    const node = this.getCurrentNode();
    return node?.choices && node.choices.length > 0;
  }
}

export default DialogueEngine;
