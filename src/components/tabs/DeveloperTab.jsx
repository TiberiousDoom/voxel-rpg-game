/**
 * DeveloperTab.jsx - Developer testing tools tab
 *
 * Provides testing tools for:
 * - Spawning monsters
 * - Testing AI behavior
 * - Managing monsters
 * - Mobile-friendly debug interface
 */

import React, { useState } from 'react';
import { Monster } from '../../entities/Monster.js';
import useGameStore from '../../stores/useGameStore.js';
import './DeveloperTab.css';

function DeveloperTab() {
  const { enemies, spawnMonster, removeMonster } = useGameStore();
  const [selectedType, setSelectedType] = useState('SLIME');
  const [selectedModifier, setSelectedModifier] = useState(null);
  const [spawnDistance, setSpawnDistance] = useState(5);
  const [monsterLevel, setMonsterLevel] = useState(1);

  // Monster type configurations
  const monsterTypes = [
    { id: 'SLIME', name: 'Slime', icon: '🟢', color: '#00ff00' },
    { id: 'GOBLIN', name: 'Goblin', icon: '👺', color: '#8B4513' },
    { id: 'WOLF', name: 'Wolf', icon: '🐺', color: '#666666' },
    { id: 'SKELETON', name: 'Skeleton', icon: '💀', color: '#EEEEEE' },
    { id: 'ORC', name: 'Orc', icon: '👹', color: '#2d5016' }
  ];

  // Monster modifier configurations
  const monsterModifiers = [
    { id: null, name: 'None', icon: '⚪', color: '#888888' },
    { id: 'ELITE', name: 'Elite', icon: '⭐', color: '#ffaa00' },
    { id: 'FAST', name: 'Swift', icon: '💨', color: '#00ffff' },
    { id: 'TANK', name: 'Armored', icon: '🛡️', color: '#888888' },
    { id: 'BERSERKER', name: 'Berserker', icon: '🔥', color: '#ff0000' }
  ];

  // Get player position from gameStore (fallback to center)
  const getPlayerPosition = () => {
    // For now, default to center of map since player might not be in store
    return { x: 25, z: 25 };
  };

  // Spawn single monster
  const handleSpawnMonster = (type) => {
    try {
      const playerPos = getPlayerPosition();

      // Calculate random position near player
      const angle = Math.random() * Math.PI * 2;
      const distance = spawnDistance;
      const x = playerPos.x + Math.cos(angle) * distance;
      const z = playerPos.z + Math.sin(angle) * distance;

      const monster = new Monster(type, { x, z }, { level: monsterLevel, modifier: selectedModifier });
      spawnMonster(monster);
      const modText = selectedModifier ? ` ${selectedModifier}` : '';
      console.log(`✅ Spawned${modText} ${type} (Level ${monsterLevel}) at (${x.toFixed(1)}, ${z.toFixed(1)})`);
    } catch (error) {
      console.error('❌ Failed to spawn monster:', error);
    }
  };

  // Spawn monster circle
  const handleSpawnCircle = (type, count = 5) => {
    try {
      const playerPos = getPlayerPosition();
      const radius = spawnDistance;

      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const x = playerPos.x + Math.cos(angle) * radius;
        const z = playerPos.z + Math.sin(angle) * radius;

        const monster = new Monster(type, { x, z }, { level: monsterLevel, modifier: selectedModifier });
        spawnMonster(monster);
      }
      const modText = selectedModifier ? ` ${selectedModifier}` : '';
      console.log(`✅ Spawned ${count}x${modText} ${type} in circle (Level ${monsterLevel})`);
    } catch (error) {
      console.error('❌ Failed to spawn monster circle:', error);
    }
  };

  // Clear all monsters
  const handleClearMonsters = () => {
    const count = enemies.length;
    enemies.forEach(monster => removeMonster(monster.id));
    console.log(`✅ Cleared ${count} monsters`);
  };

  // Spawn test scenario
  const handleTestAI = (type) => {
    try {
      const playerPos = getPlayerPosition();
      // Spawn monster 15 tiles away to test aggro range
      const monster = new Monster(type,
        { x: playerPos.x + 15, z: playerPos.z },
        { level: monsterLevel, modifier: selectedModifier }
      );
      spawnMonster(monster);
      const modText = selectedModifier ? ` ${selectedModifier}` : '';
      console.log(`✅ AI Test: Spawned${modText} ${type} 15 tiles away (aggro test)`);
    } catch (error) {
      console.error('❌ Failed to spawn test monster:', error);
    }
  };

  // Spawn patrolling monster
  const handleSpawnPatrol = (type) => {
    try {
      const playerPos = getPlayerPosition();
      const x = playerPos.x + spawnDistance;
      const z = playerPos.z;

      const monster = new Monster(type, { x, z }, { level: monsterLevel, modifier: selectedModifier });

      // Create square patrol path
      const pathSize = 5;
      monster.patrolPath = [
        { x: x, z: z },
        { x: x + pathSize, z: z },
        { x: x + pathSize, z: z + pathSize },
        { x: x, z: z + pathSize }
      ];

      monster.currentWaypointIndex = 0;

      spawnMonster(monster);
      const modText = selectedModifier ? ` ${selectedModifier}` : '';
      console.log(`✅ Spawned patrolling${modText} ${type} (Level ${monsterLevel}) at (${x.toFixed(1)}, ${z.toFixed(1)})`);
      console.log(`   Path: ${pathSize}x${pathSize} square`);
    } catch (error) {
      console.error('❌ Failed to spawn patrol monster:', error);
    }
  };

  return (
    <div className="developer-tab">
      {/* Monster Info Section */}
      <div className="dev-section">
        <div className="dev-header">
          <span className="dev-icon">🎮</span>
          <h3>Monster System</h3>
        </div>
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">Active Monsters</span>
            <span className="info-value">{enemies.length}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Alive</span>
            <span className="info-value green">{enemies.filter(m => m.alive).length}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Dead</span>
            <span className="info-value red">{enemies.filter(m => !m.alive).length}</span>
          </div>
        </div>
      </div>

      {/* Monster Type Selection */}
      <div className="dev-section">
        <div className="dev-header">
          <span className="dev-icon">👹</span>
          <h3>Select Monster Type</h3>
        </div>
        <div className="monster-type-grid">
          {monsterTypes.map(type => (
            <button
              key={type.id}
              className={`monster-type-button ${selectedType === type.id ? 'selected' : ''}`}
              onClick={() => setSelectedType(type.id)}
              style={{ '--monster-color': type.color }}
            >
              <span className="monster-icon">{type.icon}</span>
              <span className="monster-name">{type.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Monster Modifier Selection */}
      <div className="dev-section">
        <div className="dev-header">
          <span className="dev-icon">✨</span>
          <h3>Select Modifier (Optional)</h3>
        </div>
        <div className="monster-modifier-grid">
          {monsterModifiers.map(mod => (
            <button
              key={mod.id || 'none'}
              className={`monster-modifier-button ${selectedModifier === mod.id ? 'selected' : ''}`}
              onClick={() => setSelectedModifier(mod.id)}
              style={{ '--modifier-color': mod.color }}
            >
              <span className="modifier-icon">{mod.icon}</span>
              <span className="modifier-name">{mod.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Spawn Settings */}
      <div className="dev-section">
        <div className="dev-header">
          <span className="dev-icon">⚙️</span>
          <h3>Spawn Settings</h3>
        </div>
        <div className="settings-grid">
          <div className="setting-item">
            <label className="setting-label">
              Distance: {spawnDistance} tiles
            </label>
            <input
              type="range"
              min="3"
              max="20"
              value={spawnDistance}
              onChange={(e) => setSpawnDistance(parseInt(e.target.value))}
              className="setting-slider"
            />
          </div>
          <div className="setting-item">
            <label className="setting-label">
              Level: {monsterLevel}
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={monsterLevel}
              onChange={(e) => setMonsterLevel(parseInt(e.target.value))}
              className="setting-slider"
            />
          </div>
        </div>
      </div>

      {/* Spawn Actions */}
      <div className="dev-section">
        <div className="dev-header">
          <span className="dev-icon">✨</span>
          <h3>Spawn Actions</h3>
        </div>
        <div className="action-grid">
          <button
            className="dev-action-button primary"
            onClick={() => handleSpawnMonster(selectedType)}
          >
            <span className="action-icon">➕</span>
            <div className="action-info">
              <span className="action-label">Spawn One</span>
              <span className="action-description">Single {selectedType.toLowerCase()}</span>
            </div>
          </button>

          <button
            className="dev-action-button secondary"
            onClick={() => handleSpawnCircle(selectedType, 5)}
          >
            <span className="action-icon">⭕</span>
            <div className="action-info">
              <span className="action-label">Spawn Circle</span>
              <span className="action-description">5x {selectedType.toLowerCase()}</span>
            </div>
          </button>

          <button
            className="dev-action-button tertiary"
            onClick={() => handleSpawnCircle(selectedType, 10)}
          >
            <span className="action-icon">🔵</span>
            <div className="action-info">
              <span className="action-label">Spawn Wave</span>
              <span className="action-description">10x {selectedType.toLowerCase()}</span>
            </div>
          </button>

          <button
            className="dev-action-button warning"
            onClick={() => handleTestAI(selectedType)}
          >
            <span className="action-icon">🧪</span>
            <div className="action-info">
              <span className="action-label">Test AI</span>
              <span className="action-description">Aggro range test</span>
            </div>
          </button>

          <button
            className="dev-action-button info"
            onClick={() => handleSpawnPatrol(selectedType)}
          >
            <span className="action-icon">🚶</span>
            <div className="action-info">
              <span className="action-label">Spawn Patrol</span>
              <span className="action-description">Patrolling {selectedType.toLowerCase()}</span>
            </div>
          </button>
        </div>
      </div>

      {/* Management Actions */}
      <div className="dev-section">
        <div className="dev-header">
          <span className="dev-icon">🔧</span>
          <h3>Management</h3>
        </div>
        <div className="action-grid compact">
          <button
            className="dev-action-button-small danger"
            onClick={handleClearMonsters}
            disabled={enemies.length === 0}
          >
            <span className="action-icon-small">🗑️</span>
            <span className="action-label-small">Clear All</span>
          </button>
        </div>
      </div>

      {/* Active Monsters List */}
      {enemies.length > 0 && (
        <div className="dev-section">
          <div className="dev-header">
            <span className="dev-icon">📋</span>
            <h3>Active Monsters</h3>
          </div>
          <div className="monster-list">
            {enemies.slice(0, 10).map(monster => (
              <div key={monster.id} className="monster-item">
                <div className="monster-item-info">
                  <span className="monster-item-type">{monster.type}</span>
                  <span className="monster-item-stats">
                    Lv.{monster.level} • HP: {Math.floor(monster.health)}/{monster.maxHealth}
                  </span>
                  <span className={`monster-item-state ${monster.aiState.toLowerCase()}`}>
                    {monster.aiState}
                  </span>
                </div>
                <button
                  className="monster-item-remove"
                  onClick={() => removeMonster(monster.id)}
                  title="Remove monster"
                >
                  ✕
                </button>
              </div>
            ))}
            {enemies.length > 10 && (
              <div className="monster-list-more">
                +{enemies.length - 10} more...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="dev-section">
        <div className="dev-header">
          <span className="dev-icon">💡</span>
          <h3>Tips</h3>
        </div>
        <div className="tips-list">
          <div className="tip-item">
            <span className="tip-icon">🎯</span>
            <span className="tip-text">Monsters spawn at set distance from player</span>
          </div>
          <div className="tip-item">
            <span className="tip-icon">🚶</span>
            <span className="tip-text">Patrol monsters walk in a square until player gets close</span>
          </div>
          <div className="tip-item">
            <span className="tip-icon">⚔️</span>
            <span className="tip-text">Walk close to trigger aggro and combat</span>
          </div>
          <div className="tip-item">
            <span className="tip-icon">🏃</span>
            <span className="tip-text">Move away to test chase AI behavior</span>
          </div>
          <div className="tip-item">
            <span className="tip-icon">💚</span>
            <span className="tip-text">Goblins will flee at low health (30%)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DeveloperTab;
