import React, { useState, useEffect } from 'react';
import { MapPin, Treasure, CheckCircle, Search } from 'lucide-react';

/**
 * Structure type icons and colors
 */
const STRUCTURE_THEME = {
  temple: { icon: '⛩️', color: '#FFD700', name: 'Temple' },
  ruins: { icon: '🏛️', color: '#8B7355', name: 'Ancient Ruins' },
  tower: { icon: '🗼', color: '#4682B4', name: 'Tower' },
  dungeon: { icon: '🏰', color: '#8B008B', name: 'Dungeon' },
  shrine: { icon: '⛪', color: '#87CEEB', name: 'Shrine' },
  village: { icon: '🏘️', color: '#8B4513', name: 'Village' },
  camp: { icon: '⛺', color: '#A0522D', name: 'Camp' },
  fort: { icon: '🏯', color: '#696969', name: 'Fort' },
};

/**
 * Chest type colors
 */
const CHEST_THEME = {
  common: { color: '#9CA3AF', name: 'Common', glow: '#9CA3AF40' },
  rare: { color: '#3B82F6', name: 'Rare', glow: '#3B82F640' },
  epic: { color: '#8B5CF6', name: 'Epic', glow: '#8B5CF640' },
  legendary: { color: '#F59E0B', name: 'Legendary', glow: '#F59E0B80' },
};

/**
 * StructureExplorationUI Component
 * Displays structure discoveries, chest locations, and exploration progress
 *
 * Phase 3 Integration: Structure Exploration System UI
 */
const StructureExplorationUI = ({ terrainSystem, playerPosition }) => {
  const [discoveries, setDiscoveries] = useState([]);
  const [nearbyChests, setNearbyChests] = useState([]);
  const [recentLoot, setRecentLoot] = useState([]);

  // Set up event listeners for structure interactions
  useEffect(() => {
    if (!terrainSystem) return;

    const interactionSystem = terrainSystem.getStructureInteractionSystem?.();
    if (!interactionSystem) return;

    // Listen for structure discoveries
    const onDiscovery = ({ structure, player }) => {
      const theme = STRUCTURE_THEME[structure.type] || STRUCTURE_THEME.ruins;
      setDiscoveries(prev => [
        ...prev,
        {
          id: Date.now(),
          structureId: structure.id,
          type: structure.type,
          name: theme.name,
          icon: theme.icon,
          color: theme.color,
          timestamp: Date.now(),
        },
      ]);

      // Auto-dismiss after 8 seconds
      setTimeout(() => {
        setDiscoveries(prev => prev.filter(d => d.id !== Date.now()));
      }, 8000);
    };

    // Listen for chest opened
    const onChestOpened = ({ chest, loot, player }) => {
      if (loot && loot.length > 0) {
        setRecentLoot(prev => [
          ...prev,
          {
            id: Date.now(),
            chestId: chest.id,
            chestType: chest.type,
            loot,
            timestamp: Date.now(),
          },
        ]);

        // Auto-dismiss after 6 seconds
        setTimeout(() => {
          setRecentLoot(prev => prev.filter(l => l.id !== Date.now()));
        }, 6000);
      }
    };

    interactionSystem.on('onStructureDiscovered', onDiscovery);
    interactionSystem.on('onChestOpened', onChestOpened);

    return () => {
      // Cleanup handled by system
    };
  }, [terrainSystem]);

  // Update nearby chests
  useEffect(() => {
    if (!terrainSystem || !playerPosition) return;

    const interactionSystem = terrainSystem.getStructureInteractionSystem?.();
    if (!interactionSystem) return;

    const updateNearbyChests = () => {
      const position = {
        x: Math.floor(playerPosition[0]),
        z: Math.floor(playerPosition[2]),
      };

      const chests = interactionSystem.getNearbyChests(position, 10); // 10 tile radius
      setNearbyChests(chests.filter(c => !c.opened).slice(0, 5)); // Show up to 5 unopened chests
    };

    updateNearbyChests();
    const interval = setInterval(updateNearbyChests, 1000);

    return () => clearInterval(interval);
  }, [terrainSystem, playerPosition]);

  const dismissDiscovery = (id) => {
    setDiscoveries(prev => prev.filter(d => d.id !== id));
  };

  const dismissLoot = (id) => {
    setRecentLoot(prev => prev.filter(l => l.id !== id));
  };

  return (
    <>
      {/* Discovery Notifications */}
      {discoveries.map((discovery, idx) => (
        <div
          key={discovery.id}
          style={{
            position: 'fixed',
            top: `${20 + idx * 100}px`,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0, 0, 0, 0.95)',
            border: `2px solid ${discovery.color}`,
            borderRadius: '12px',
            padding: '20px',
            zIndex: 1800,
            minWidth: '320px',
            boxShadow: `0 0 30px ${discovery.color}60`,
            animation: 'slideDown 0.5s ease-out',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '15px',
            }}
          >
            <span style={{ fontSize: '2rem' }}>{discovery.icon}</span>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '5px',
                }}
              >
                <MapPin size={16} color={discovery.color} />
                <span style={{ color: discovery.color, fontSize: '0.85rem', fontWeight: 'bold' }}>
                  LOCATION DISCOVERED
                </span>
              </div>
              <div style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 'bold' }}>
                {discovery.name}
              </div>
            </div>
            <button
              onClick={() => dismissDiscovery(discovery.id)}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '4px',
                padding: '6px 12px',
                color: '#fff',
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </div>
        </div>
      ))}

      {/* Loot Notifications */}
      {recentLoot.map((lootDrop, idx) => (
        <div
          key={lootDrop.id}
          style={{
            position: 'fixed',
            bottom: `${20 + idx * 180}px`,
            right: '20px',
            background: 'rgba(0, 0, 0, 0.95)',
            border: `2px solid ${CHEST_THEME[lootDrop.chestType]?.color || '#9CA3AF'}`,
            borderRadius: '12px',
            padding: '15px',
            zIndex: 1800,
            minWidth: '280px',
            maxWidth: '320px',
            boxShadow: `0 0 30px ${CHEST_THEME[lootDrop.chestType]?.glow || '#9CA3AF40'}`,
            animation: 'slideUp 0.5s ease-out',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '12px',
            }}
          >
            <Treasure size={24} color={CHEST_THEME[lootDrop.chestType]?.color || '#9CA3AF'} />
            <div style={{ flex: 1 }}>
              <div
                style={{
                  color: CHEST_THEME[lootDrop.chestType]?.color || '#9CA3AF',
                  fontSize: '0.85rem',
                  fontWeight: 'bold',
                }}
              >
                {CHEST_THEME[lootDrop.chestType]?.name || 'Common'} CHEST OPENED
              </div>
            </div>
            <button
              onClick={() => dismissLoot(lootDrop.id)}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 8px',
                color: '#fff',
                fontSize: '0.75rem',
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </div>

          <div
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '8px',
              padding: '12px',
              maxHeight: '120px',
              overflowY: 'auto',
            }}
          >
            {lootDrop.loot.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  color: '#fff',
                  fontSize: '0.85rem',
                  marginBottom: '6px',
                  padding: '4px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: '4px',
                }}
              >
                <span>
                  {item.icon || '📦'} {item.name || item.type}
                </span>
                {item.quantity > 1 && (
                  <span
                    style={{
                      color: '#4dabf7',
                      fontWeight: 'bold',
                      fontSize: '0.8rem',
                    }}
                  >
                    ×{item.quantity}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Nearby Chests Indicator */}
      {nearbyChests.length > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: '20px',
            left: '20px',
            background: 'rgba(26, 26, 46, 0.95)',
            border: '2px solid #4dabf7',
            borderRadius: '12px',
            padding: '15px',
            zIndex: 1500,
            minWidth: '240px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.6)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '12px',
              paddingBottom: '10px',
              borderBottom: '1px solid rgba(77, 171, 247, 0.3)',
            }}
          >
            <Search size={18} color="#4dabf7" />
            <span style={{ color: '#4dabf7', fontSize: '0.9rem', fontWeight: 'bold' }}>
              NEARBY CHESTS
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {nearbyChests.map((chest, idx) => {
              const theme = CHEST_THEME[chest.type] || CHEST_THEME.common;
              const distance = chest.distance.toFixed(1);

              return (
                <div
                  key={chest.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '6px',
                    border: `1px solid ${theme.color}30`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Treasure size={16} color={theme.color} />
                    <span style={{ color: theme.color, fontSize: '0.85rem', fontWeight: 'bold' }}>
                      {theme.name}
                    </span>
                  </div>
                  <span style={{ color: '#cbd5e0', fontSize: '0.75rem' }}>
                    {distance}m {distance < 2 ? '(Press E)' : ''}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <style>
        {`
          @keyframes slideDown {
            from {
              opacity: 0;
              transform: translateX(-50%) translateY(-20px);
            }
            to {
              opacity: 1;
              transform: translateX(-50%) translateY(0);
            }
          }

          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>
    </>
  );
};

export default StructureExplorationUI;
