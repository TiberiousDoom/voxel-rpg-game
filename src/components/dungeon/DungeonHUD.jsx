/**
 * DungeonHUD.jsx - Dungeon exploration heads-up display
 *
 * Features:
 * - Boss health bar with phase indicator
 * - Room info and exploration progress
 * - Combat status
 * - Loot summary
 * - Exit/retreat options
 */

import React, { memo, useCallback } from 'react';
import useDungeonStore, { DUNGEON_STATES } from '../../stores/useDungeonStore';
import useGameStore from '../../stores/useGameStore';

/**
 * Boss health bar component
 */
const BossHealthBar = memo(function BossHealthBar({
  boss,
  healthPercent,
  phase,
  enraged,
  phaseName
}) {
  if (!boss) return null;

  // Determine health bar color based on percent
  const getHealthColor = (percent) => {
    if (percent > 60) return '#22c55e';
    if (percent > 30) return '#eab308';
    return '#ef4444';
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '400px',
        maxWidth: '90vw',
        background: 'rgba(0, 0, 0, 0.85)',
        border: '2px solid #7c3aed',
        borderRadius: '12px',
        padding: '12px 16px',
        zIndex: 2000
      }}
    >
      {/* Boss Name */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px' }}>💀</span>
          <span
            style={{
              color: '#fff',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              textShadow: '0 0 10px rgba(124, 58, 237, 0.5)'
            }}
          >
            {boss.name || 'Boss'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {enraged && (
            <span
              style={{
                background: '#ef4444',
                color: '#fff',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '0.7rem',
                fontWeight: 'bold',
                animation: 'pulse 1s infinite'
              }}
            >
              ENRAGED
            </span>
          )}
          <span
            style={{
              color: '#a78bfa',
              fontSize: '0.8rem'
            }}
          >
            Phase {phase + 1}: {phaseName}
          </span>
        </div>
      </div>

      {/* Health Bar */}
      <div
        style={{
          height: '20px',
          background: '#1f2937',
          borderRadius: '10px',
          overflow: 'hidden',
          border: '1px solid #374151'
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${healthPercent}%`,
            background: `linear-gradient(90deg, ${getHealthColor(healthPercent)}, ${getHealthColor(healthPercent)}dd)`,
            borderRadius: '10px',
            transition: 'width 0.3s ease',
            boxShadow: `0 0 10px ${getHealthColor(healthPercent)}88`
          }}
        />
      </div>

      {/* Health Text */}
      <div
        style={{
          textAlign: 'center',
          marginTop: '4px',
          color: '#94a3b8',
          fontSize: '0.75rem'
        }}
      >
        {Math.round(healthPercent)}%
      </div>
    </div>
  );
});

/**
 * Room info panel
 */
const RoomInfoPanel = memo(function RoomInfoPanel({
  dungeonType,
  dungeonLevel,
  currentRoom,
  progress,
  enemiesRemaining,
  inCombat
}) {
  return (
    <div
      style={{
        position: 'fixed',
        top: '80px',
        left: '20px',
        background: 'rgba(30, 30, 46, 0.95)',
        border: '2px solid #4a5568',
        borderRadius: '12px',
        padding: '12px',
        minWidth: '160px',
        zIndex: 1500
      }}
    >
      {/* Dungeon Info */}
      <div style={{ marginBottom: '10px' }}>
        <div
          style={{
            color: '#60a5fa',
            fontSize: '0.9rem',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <span>⚔️</span>
          <span>{dungeonType} Dungeon</span>
        </div>
        <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
          Level {dungeonLevel}
        </div>
      </div>

      {/* Current Room */}
      <div style={{ marginBottom: '10px' }}>
        <div style={{ color: '#94a3b8', fontSize: '0.7rem', marginBottom: '2px' }}>
          Current Room
        </div>
        <div
          style={{
            color: '#fff',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          {getRoomIcon(currentRoom?.type)}
          <span>{currentRoom?.type || 'Unknown'}</span>
        </div>
      </div>

      {/* Combat Status */}
      {inCombat && (
        <div
          style={{
            background: '#7f1d1d',
            borderRadius: '6px',
            padding: '6px 10px',
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span style={{ fontSize: '14px' }}>⚔️</span>
          <span style={{ color: '#fca5a5', fontSize: '0.8rem', fontWeight: 'bold' }}>
            {enemiesRemaining} {enemiesRemaining === 1 ? 'Enemy' : 'Enemies'}
          </span>
        </div>
      )}

      {/* Progress */}
      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            color: '#94a3b8',
            fontSize: '0.7rem',
            marginBottom: '4px'
          }}
        >
          <span>Explored</span>
          <span>{progress.explored}/{progress.total}</span>
        </div>
        <div
          style={{
            height: '6px',
            background: '#1f2937',
            borderRadius: '3px',
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progress.percent}%`,
              background: '#4ade80',
              borderRadius: '3px',
              transition: 'width 0.3s ease'
            }}
          />
        </div>
      </div>
    </div>
  );
});

/**
 * Loot summary panel
 */
const LootSummaryPanel = memo(function LootSummaryPanel({
  goldCollected,
  xpGained,
  lootCount
}) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '100px',
        left: '20px',
        background: 'rgba(30, 30, 46, 0.95)',
        border: '2px solid #4a5568',
        borderRadius: '12px',
        padding: '10px 14px',
        zIndex: 1500
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: '16px',
          fontSize: '0.85rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>💰</span>
          <span style={{ color: '#fbbf24' }}>{goldCollected}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>⭐</span>
          <span style={{ color: '#a78bfa' }}>{xpGained} XP</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>📦</span>
          <span style={{ color: '#60a5fa' }}>{lootCount}</span>
        </div>
      </div>
    </div>
  );
});

/**
 * Get room type icon
 */
function getRoomIcon(type) {
  const icons = {
    ENTRANCE: '🚪',
    CORRIDOR: '🔲',
    CHAMBER: '🏛️',
    BOSS: '💀',
    TREASURE: '💎'
  };
  return icons[type] || '❓';
}

/**
 * Main DungeonHUD Component
 */
const DungeonHUD = memo(function DungeonHUD({ onRetreat }) {
  const {
    status,
    dungeonType,
    dungeonLevel,
    boss,
    bossHealthPercent,
    bossPhase,
    bossEnraged,
    enemiesRemaining,
    goldCollected,
    xpGained,
    loot,
    getProgress,
    getCurrentRoom,
    isInCombat
  } = useDungeonStore();

  const player = useGameStore(state => state.player);

  const currentRoom = getCurrentRoom();
  const progress = getProgress();
  const inCombat = isInCombat();
  const showBossHealth = status === DUNGEON_STATES.BOSS_FIGHT && boss;

  const handleRetreat = useCallback(() => {
    if (onRetreat) {
      onRetreat();
    }
  }, [onRetreat]);

  // Don't render if not in dungeon
  if (status === DUNGEON_STATES.INACTIVE) {
    return null;
  }

  // Get boss phase name
  const getBossPhaseName = () => {
    if (!boss || !boss.phases) return '';
    const phase = boss.phases[bossPhase];
    return phase?.name || `Phase ${bossPhase + 1}`;
  };

  return (
    <>
      {/* Boss Health Bar */}
      {showBossHealth && (
        <BossHealthBar
          boss={boss}
          healthPercent={bossHealthPercent}
          phase={bossPhase}
          enraged={bossEnraged}
          phaseName={getBossPhaseName()}
        />
      )}

      {/* Room Info */}
      <RoomInfoPanel
        dungeonType={dungeonType}
        dungeonLevel={dungeonLevel}
        currentRoom={currentRoom}
        progress={progress}
        enemiesRemaining={enemiesRemaining}
        inCombat={inCombat}
      />

      {/* Loot Summary */}
      <LootSummaryPanel
        goldCollected={goldCollected}
        xpGained={xpGained}
        lootCount={loot.length}
      />

      {/* Retreat Button */}
      {!inCombat && status !== DUNGEON_STATES.CLEARED && (
        <button
          onClick={handleRetreat}
          style={{
            position: 'fixed',
            bottom: '100px',
            right: '20px',
            background: 'linear-gradient(135deg, #7f1d1d, #991b1b)',
            border: '2px solid #dc2626',
            borderRadius: '10px',
            padding: '10px 20px',
            color: '#fff',
            fontSize: '0.9rem',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            zIndex: 1500,
            transition: 'transform 0.2s, box-shadow 0.2s'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'scale(1.05)';
            e.target.style.boxShadow = '0 0 15px rgba(220, 38, 38, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'scale(1)';
            e.target.style.boxShadow = 'none';
          }}
        >
          <span>🏃</span>
          <span>Retreat</span>
        </button>
      )}

      {/* Dungeon Cleared Overlay */}
      {status === DUNGEON_STATES.CLEARED && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3000
          }}
        >
          <div
            style={{
              background: 'linear-gradient(135deg, #1e293b, #0f172a)',
              border: '3px solid #4ade80',
              borderRadius: '20px',
              padding: '30px 50px',
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏆</div>
            <h2 style={{ color: '#4ade80', marginBottom: '16px', fontSize: '1.8rem' }}>
              Dungeon Cleared!
            </h2>
            <div style={{ color: '#94a3b8', marginBottom: '20px' }}>
              <p>Gold: {goldCollected}</p>
              <p>XP: {xpGained}</p>
              <p>Items: {loot.length}</p>
            </div>
            <button
              onClick={handleRetreat}
              style={{
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                border: 'none',
                borderRadius: '10px',
                padding: '12px 30px',
                color: '#fff',
                fontSize: '1rem',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Return to Settlement
            </button>
          </div>
        </div>
      )}

      {/* CSS for pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </>
  );
});

export default DungeonHUD;
