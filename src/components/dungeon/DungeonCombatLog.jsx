/**
 * DungeonCombatLog.jsx - Combat log display component
 *
 * Shows scrollable list of combat events with different styling
 * for player actions, enemy actions, rewards, and system messages.
 */

import React, { useRef, useEffect, memo } from 'react';
import './DungeonCombatLog.css';

/**
 * Log type configurations
 */
const LOG_STYLES = {
  player: { icon: '⚔️', className: 'log-player' },
  enemy: { icon: '👹', className: 'log-enemy' },
  skill: { icon: '✨', className: 'log-skill' },
  reward: { icon: '💰', className: 'log-reward' },
  loot: { icon: '🎁', className: 'log-loot' },
  heal: { icon: '💚', className: 'log-heal' },
  boss: { icon: '👑', className: 'log-boss' },
  system: { icon: '📢', className: 'log-system' }
};

/**
 * DungeonCombatLog Component
 */
const DungeonCombatLog = memo(function DungeonCombatLog({ logs = [] }) {
  const logContainerRef = useRef(null);

  // Auto-scroll to bottom when new logs appear
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs.length]);

  // Get last N logs (keep log manageable)
  const displayLogs = logs.slice(-50);

  return (
    <div className="dungeon-combat-log">
      <h3>Combat Log</h3>
      <div className="log-container" ref={logContainerRef}>
        {displayLogs.length === 0 ? (
          <div className="log-empty">No events yet...</div>
        ) : (
          displayLogs.map((log, index) => {
            const style = LOG_STYLES[log.type] || LOG_STYLES.system;

            return (
              <div key={index} className={`log-entry ${style.className}`}>
                <span className="log-icon">{style.icon}</span>
                <span className="log-message">{log.message}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
});

export default DungeonCombatLog;
