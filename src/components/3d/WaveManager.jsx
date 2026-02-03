import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import Enemy from './Enemy';

/**
 * WaveManager - Spawns waves of enemies at intervals
 */
const WaveManager = () => {
  const [enemies, setEnemies] = useState([]);
  const [wave, setWave] = useState(1);
  const waveTimer = useRef(0);
  const spawnDelay = 15; // 15 seconds between waves

  useFrame((state, delta) => {
    waveTimer.current += delta;

    // Spawn new wave
    if (waveTimer.current >= spawnDelay) {
      waveTimer.current = 0;
      spawnWave();
    }
  });

  const spawnWave = () => {
    const enemyCount = Math.min(4 + wave, 12); // Max 12 enemies
    const newEnemies = [];

    const enemyTypes = [
      { name: 'Slime', color: '#ff4444' },
      { name: 'Goblin', color: '#88ff44' },
      { name: 'Orc', color: '#ffaa44' },
      { name: 'Skeleton', color: '#eeeeee' },
      { name: 'Demon', color: '#cc00cc' },
    ];

    for (let i = 0; i < enemyCount; i++) {
      const angle = (i / enemyCount) * Math.PI * 2;
      const radius = 20 + Math.random() * 10;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      const typeIndex = Math.min(Math.floor(wave / 2), enemyTypes.length - 1);
      const enemyType = enemyTypes[typeIndex];

      newEnemies.push({
        id: `enemy_${Date.now()}_${i}`,
        position: [x, 5, z],
        name: enemyType.name,
        type: enemyType.name.toLowerCase(),
      });
    }

    setEnemies((prev) => [...prev, ...newEnemies]);
    setWave((prev) => prev + 1);
  };

  const handleEnemyDeath = (id) => {
    setEnemies((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <>
      {enemies.map((enemy) => (
        <Enemy
          key={enemy.id}
          position={enemy.position}
          name={enemy.name}
          type={enemy.type}
          onDeath={() => handleEnemyDeath(enemy.id)}
        />
      ))}
    </>
  );
};

export default WaveManager;
