/**
 * LootSystemExample.jsx - Example component showing loot system integration
 *
 * This file demonstrates:
 * 1. How to handle monster death
 * 2. How to update loot drops in game loop
 * 3. How to display equipment stats
 * 4. How to render loot drops in the world
 *
 * Copy and adapt this code into your actual game components!
 */

import React, { useEffect, useRef } from 'react';
import useGameStore from '../stores/useGameStore';
import { Monster } from '../entities/Monster';

/**
 * Example: Combat System Component
 * Shows how to handle monster death
 */
export function CombatExample() {
  const handleMonsterDeath = useGameStore((state) => state.handleMonsterDeath);

  const testCombat = () => {
    // Create a test monster
    const goblin = new Monster('GOBLIN', { x: 5, z: 5 }, { level: 3 });

    // Simulate combat
    console.log('🗡️ Attacking goblin...');
    goblin.takeDamage(goblin.health + 100); // Kill it

    if (!goblin.alive) {
      console.log('💀 Goblin died!');

      // Handle death - this creates loot drops automatically!
      const drops = handleMonsterDeath(goblin);

      console.log(`💎 Created ${drops.length} loot drops!`);
    }
  };

  return (
    <div>
      <h3>Combat Example</h3>
      <button onClick={testCombat}>Test Monster Death</button>
      <p>Check console for loot drop logs</p>
    </div>
  );
}

/**
 * Example: Game Loop Component
 * Shows how to update loot drops
 */
export function GameLoopExample() {
  const player = useGameStore((state) => state.player);
  const updateLootDrops = useGameStore((state) => state.updateLootDrops);
  const gameLoopRef = useRef();

  useEffect(() => {
    // Game loop - runs every frame
    gameLoopRef.current = setInterval(() => {
      // Update loot drops with player position
      updateLootDrops({
        x: player.position[0],
        z: player.position[2]
      });

      // ... other game updates ...
    }, 1000 / 60); // 60 FPS

    return () => clearInterval(gameLoopRef.current);
  }, [player.position, updateLootDrops]);

  return (
    <div>
      <h3>Game Loop Running</h3>
      <p>Loot drops will be picked up automatically when player is near</p>
      <p>Player Position: ({player.position[0]}, {player.position[2]})</p>
    </div>
  );
}

/**
 * Example: Equipment Stats Display
 * Shows how to display equipment stats
 */
export function EquipmentStatsExample() {
  const equipment = useGameStore((state) => state.equipment);
  const getEquipmentStats = useGameStore((state) => state.getEquipmentStats);
  const powerLevel = useGameStore((state) => state.getEquipmentPowerLevel());

  const stats = getEquipmentStats();

  return (
    <div style={{ padding: '20px', backgroundColor: '#1a1a1a', color: '#fff' }}>
      <h3>Equipment Stats</h3>

      <div style={{ marginBottom: '20px' }}>
        <strong>Power Level: {powerLevel}</strong>
      </div>

      <h4>Equipment Slots:</h4>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        {Object.entries(equipment).map(([slot, item]) => (
          <div key={slot} style={{ padding: '10px', backgroundColor: '#2a2a2a' }}>
            <strong>{slot}:</strong>
            {item ? (
              <div>
                <div>{item.name}</div>
                <div style={{ fontSize: '12px', color: getRarityColor(item.rarity) }}>
                  {item.rarity}
                </div>
              </div>
            ) : (
              <div style={{ color: '#666' }}>Empty</div>
            )}
          </div>
        ))}
      </div>

      <h4 style={{ marginTop: '20px' }}>Total Stats from Equipment:</h4>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
        {Object.entries(stats).map(([stat, value]) => (
          value > 0 && (
            <div key={stat}>
              {formatStatName(stat)}: <span style={{ color: '#4a4' }}>+{value}</span>
            </div>
          )
        ))}
      </div>
    </div>
  );
}

/**
 * Example: Loot Drops Visualization
 * Shows how to render loot drops in the world
 */
export function LootDropsExample() {
  const lootDrops = useGameStore((state) => state.lootDrops);

  return (
    <div style={{ padding: '20px' }}>
      <h3>Active Loot Drops: {lootDrops.length}</h3>

      {lootDrops.length === 0 ? (
        <p style={{ color: '#666' }}>No loot drops currently</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
          {lootDrops.map(drop => (
            <div
              key={drop.id}
              style={{
                padding: '10px',
                backgroundColor: drop.type === 'GOLD' ? '#ffd700' : getRarityColor(drop.rarity),
                color: '#000',
                borderRadius: '5px'
              }}
            >
              {drop.type === 'GOLD' ? (
                <div>
                  <strong>💰 {drop.amount} Gold</strong>
                  <div style={{ fontSize: '12px' }}>
                    Position: ({drop.position.x}, {drop.position.z})
                  </div>
                </div>
              ) : (
                <div>
                  <strong>{drop.name}</strong>
                  <div style={{ fontSize: '12px' }}>{drop.rarity}</div>
                  <div style={{ fontSize: '12px' }}>
                    Position: ({drop.position.x}, {drop.position.z})
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Complete Example - All systems together
 */
export function CompleteLootExample() {
  return (
    <div style={{ padding: '20px', backgroundColor: '#0a0a0a', color: '#fff', minHeight: '100vh' }}>
      <h1>Loot System Integration Example</h1>
      <p>This demonstrates the complete Phase 2 loot system integration</p>

      <div style={{ display: 'grid', gap: '20px', marginTop: '20px' }}>
        {/* Combat */}
        <div style={{ padding: '20px', backgroundColor: '#1a1a1a', borderRadius: '8px' }}>
          <CombatExample />
        </div>

        {/* Equipment Stats */}
        <div style={{ padding: '20px', backgroundColor: '#1a1a1a', borderRadius: '8px' }}>
          <EquipmentStatsExample />
        </div>

        {/* Loot Drops */}
        <div style={{ padding: '20px', backgroundColor: '#1a1a1a', borderRadius: '8px' }}>
          <LootDropsExample />
        </div>

        {/* Game Loop Status */}
        <div style={{ padding: '20px', backgroundColor: '#1a1a1a', borderRadius: '8px' }}>
          <GameLoopExample />
        </div>
      </div>

      <div style={{ marginTop: '40px', padding: '20px', backgroundColor: '#2a2a2a', borderRadius: '8px' }}>
        <h3>Integration Instructions:</h3>
        <ol>
          <li>
            <strong>Monster Death:</strong> Call{' '}
            <code style={{ backgroundColor: '#000', padding: '2px 6px' }}>
              handleMonsterDeath(monster)
            </code>{' '}
            when monster dies
          </li>
          <li>
            <strong>Game Loop:</strong> Call{' '}
            <code style={{ backgroundColor: '#000', padding: '2px 6px' }}>
              updateLootDrops(playerPos)
            </code>{' '}
            every frame
          </li>
          <li>
            <strong>Equipment:</strong> Use{' '}
            <code style={{ backgroundColor: '#000', padding: '2px 6px' }}>
              getEquipmentStats()
            </code>{' '}
            to get total stats
          </li>
        </ol>
        <p style={{ marginTop: '20px' }}>
          See <code>/docs/LOOT_SYSTEM_INTEGRATION.md</code> for full documentation
        </p>
      </div>
    </div>
  );
}

// Utility functions
function getRarityColor(rarity) {
  const colors = {
    COMMON: '#9d9d9d',
    UNCOMMON: '#1eff00',
    RARE: '#0070dd',
    EPIC: '#a335ee',
    LEGENDARY: '#ff8000'
  };
  return colors[rarity] || '#fff';
}

function formatStatName(stat) {
  return stat
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

export default CompleteLootExample;
