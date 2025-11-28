/**
 * ThoughtBubble.jsx - Thought bubble component for NPCs
 *
 * Displays thought bubbles above NPCs showing:
 * - Critical needs (hunger, rest, etc.)
 * - Current activity
 * - Warnings/alerts
 */

import React from 'react';
import PropTypes from 'prop-types';
import './ThoughtBubble.css';

/**
 * Get thought content based on NPC state
 * @param {Object} npc - NPC object
 * @returns {Object|null} Thought content {icon, text, priority}
 */
function getThoughtContent(npc) {
  if (!npc) return null;

  // Priority order: Critical needs > Warnings > Status
  const thoughts = [];

  // Dead
  if (npc.alive === false) {
    thoughts.push({ icon: '💀', text: 'Dead', priority: 100 });
  }

  // Critical health
  const health = npc.health || 100;
  const maxHealth = npc.maxHealth || 100;
  const healthPercent = health / maxHealth;

  if (healthPercent < 0.2 && npc.alive !== false) {
    thoughts.push({ icon: '❤️', text: 'Critical health!', priority: 90 });
  }

  // Hunger
  if (npc.hungry) {
    thoughts.push({ icon: '🍖', text: 'Hungry', priority: 80 });
  }

  // Fatigue / Rest
  if (npc.fatigued || npc.isResting) {
    thoughts.push({ icon: '😴', text: 'Tired', priority: 70 });
  }

  // Low morale
  if (npc.morale !== undefined && npc.morale < 25) {
    thoughts.push({ icon: '😞', text: 'Unhappy', priority: 60 });
  }

  // Working
  if (npc.isWorking || npc.status === 'WORKING') {
    thoughts.push({ icon: '⚙️', text: 'Working', priority: 30 });
  }

  // Moving
  if (npc.isMoving || npc.status === 'MOVING') {
    thoughts.push({ icon: '🚶', text: 'Moving', priority: 20 });
  }

  // Patrolling
  if (npc.status === 'PATROLLING') {
    thoughts.push({ icon: '👁️', text: 'Patrolling', priority: 25 });
  }

  // Idle
  if (npc.status === 'IDLE' && thoughts.length === 0) {
    thoughts.push({ icon: '💤', text: 'Idle', priority: 10 });
  }

  // Return highest priority thought
  if (thoughts.length === 0) return null;

  thoughts.sort((a, b) => b.priority - a.priority);
  return thoughts[0];
}

/**
 * ThoughtBubble Component
 * Displays a thought bubble above an NPC
 *
 * @param {Object} props - Component props
 * @param {Object} props.npc - NPC object
 * @param {boolean} props.showText - Show text label (default: false, icon only)
 * @param {string} props.position - Bubble position ('top', 'top-left', 'top-right', default: 'top')
 * @param {number} props.size - Bubble size in pixels (default: 20)
 * @param {boolean} props.animate - Enable animation (default: true)
 */
function ThoughtBubble({ npc, showText = false, position = 'top', size = 20, animate = true }) {
  if (!npc) return null;

  const thought = getThoughtContent(npc);
  if (!thought) return null;

  // Only show critical thoughts by default (priority >= 60)
  if (!showText && thought.priority < 60) return null;

  const bubbleClass = `thought-bubble ${animate ? 'animate' : ''} position-${position}`;

  const bubbleStyle = {
    fontSize: `${size}px`
  };

  return (
    <div className={bubbleClass} style={bubbleStyle}>
      <div className="thought-bubble-icon" title={thought.text}>
        {thought.icon}
      </div>
      {showText && (
        <div className="thought-bubble-text">
          {thought.text}
        </div>
      )}
    </div>
  );
}

ThoughtBubble.propTypes = {
  npc: PropTypes.shape({
    alive: PropTypes.bool,
    health: PropTypes.number,
    maxHealth: PropTypes.number,
    hungry: PropTypes.bool,
    fatigued: PropTypes.bool,
    isResting: PropTypes.bool,
    isWorking: PropTypes.bool,
    isMoving: PropTypes.bool,
    status: PropTypes.string,
    morale: PropTypes.number
  }),
  showText: PropTypes.bool,
  position: PropTypes.oneOf(['top', 'top-left', 'top-right']),
  size: PropTypes.number,
  animate: PropTypes.bool
};

/**
 * MultipleThoughtBubbles Component
 * Displays multiple thoughts in a stack
 *
 * @param {Object} props - Component props
 * @param {Object} props.npc - NPC object
 * @param {number} props.maxThoughts - Maximum thoughts to show (default: 3)
 */
export function MultipleThoughtBubbles({ npc, maxThoughts = 3 }) {
  if (!npc) return null;

  const thoughts = [];

  // Collect all thoughts
  if (npc.alive === false) {
    thoughts.push({ icon: '💀', text: 'Dead', priority: 100 });
  }

  const health = npc.health || 100;
  const maxHealth = npc.maxHealth || 100;
  const healthPercent = health / maxHealth;

  if (healthPercent < 0.3 && npc.alive !== false) {
    thoughts.push({ icon: '❤️', text: 'Low health', priority: 90 });
  }

  if (npc.hungry) {
    thoughts.push({ icon: '🍖', text: 'Hungry', priority: 80 });
  }

  if (npc.fatigued || npc.isResting) {
    thoughts.push({ icon: '😴', text: 'Tired', priority: 70 });
  }

  if (npc.morale !== undefined && npc.morale < 30) {
    thoughts.push({ icon: '😞', text: 'Unhappy', priority: 60 });
  }

  // Sort by priority and limit
  thoughts.sort((a, b) => b.priority - a.priority);
  const topThoughts = thoughts.slice(0, maxThoughts);

  if (topThoughts.length === 0) return null;

  return (
    <div className="multiple-thought-bubbles">
      {topThoughts.map((thought, index) => (
        <div key={index} className="thought-bubble-item" title={thought.text}>
          {thought.icon}
        </div>
      ))}
    </div>
  );
}

MultipleThoughtBubbles.propTypes = {
  npc: PropTypes.object,
  maxThoughts: PropTypes.number
};

export default ThoughtBubble;
