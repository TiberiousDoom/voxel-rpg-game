/**
 * NPCTaskQueue.jsx
 * Shows selected NPC's current task and queued tasks
 */

import React from 'react';

const TASK_ICONS = {
  IDLE: '\u23F8\uFE0F',
  GATHER: '\u26CF\uFE0F',
  BUILD: '\uD83D\uDD28',
  PATROL: '\uD83D\uDEB6',
  REST: '\uD83D\uDCA4',
  EAT: '\uD83C\uDF7D\uFE0F',
  CRAFT: '\u2699\uFE0F',
  GUARD: '\uD83D\uDEE1\uFE0F',
  FARM: '\uD83C\uDF3E',
  HEAL: '\u2764\uFE0F',
  EXPLORE: '\uD83E\uDDED',
  SOCIALIZE: '\uD83D\uDCAC',
  DEFAULT: '\u2B55',
};

const NPCTaskQueue = ({ npc, onClose }) => {
  if (!npc) return null;

  const currentTask = npc.currentTask || npc.task || { type: 'IDLE', description: 'Idle' };
  const taskQueue = npc.taskQueue || npc.pendingTasks || [];

  const getIcon = (taskType) => TASK_ICONS[taskType] || TASK_ICONS.DEFAULT;

  return (
    <div
      style={{
        position: 'absolute',
        backgroundColor: 'rgba(20, 20, 40, 0.95)',
        borderRadius: '8px',
        padding: '12px',
        minWidth: '220px',
        border: '1px solid #444',
        color: '#eee',
        fontSize: '12px',
        zIndex: 500,
        pointerEvents: 'auto',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontWeight: 'bold', fontSize: '13px' }}>
          {npc.name || 'NPC'} - Tasks
        </span>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: '14px' }}
        >
          x
        </button>
      </div>

      {/* Current Task */}
      <div style={{
        padding: '6px 8px',
        backgroundColor: '#1a3a5c',
        borderRadius: '4px',
        marginBottom: '6px',
        borderLeft: '3px solid #3498db',
      }}>
        <div style={{ color: '#999', fontSize: '10px', marginBottom: '2px' }}>CURRENT</div>
        <div>
          {getIcon(currentTask.type)} {currentTask.description || currentTask.type || 'Idle'}
        </div>
        {currentTask.progress != null && (
          <div style={{
            marginTop: '4px',
            height: '3px',
            backgroundColor: '#333',
            borderRadius: '2px',
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${Math.min(100, currentTask.progress * 100)}%`,
              height: '100%',
              backgroundColor: '#3498db',
            }} />
          </div>
        )}
      </div>

      {/* Queue */}
      {taskQueue.length > 0 ? (
        taskQueue.slice(0, 3).map((task, i) => (
          <div
            key={i}
            style={{
              padding: '4px 8px',
              backgroundColor: 'rgba(255,255,255,0.05)',
              borderRadius: '4px',
              marginBottom: '3px',
              color: '#aaa',
              borderLeft: '3px solid #555',
            }}
          >
            <span style={{ color: '#666', fontSize: '10px', marginRight: '6px' }}>#{i + 1}</span>
            {getIcon(task.type)} {task.description || task.type}
          </div>
        ))
      ) : (
        <div style={{ color: '#666', fontStyle: 'italic', padding: '4px 8px' }}>
          No queued tasks
        </div>
      )}

      {/* NPC Stats */}
      <div style={{
        marginTop: '8px',
        paddingTop: '6px',
        borderTop: '1px solid #333',
        display: 'flex',
        gap: '12px',
        fontSize: '11px',
        color: '#888',
      }}>
        {npc.health != null && <span>HP: {Math.round(npc.health)}</span>}
        {npc.hunger != null && <span>Food: {Math.round(npc.hunger)}</span>}
        {npc.morale != null && <span>Morale: {Math.round(npc.morale)}</span>}
      </div>
    </div>
  );
};

export default NPCTaskQueue;
