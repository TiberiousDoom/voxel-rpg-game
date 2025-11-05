import React, { useState, useEffect, useRef, useCallback } from ‘react’;
import { Heart, Zap, Package, Home, TrendingUp, X, Shield, Hammer, AlertCircle, Save, Upload } from ‘lucide-react’;

const VoxelRPG = () => {
const canvasRef = useRef(null);
const [gameState, setGameState] = useState(‘intro’);
const [player, setPlayer] = useState({
x: 1000,
y: 1000,
health: 100,
maxHealth: 100,
mana: 100,
maxMana: 100,
level: 1,
xp: 0,
xpToNext: 100,
damage: 10,
speed: 3,
facingAngle: 0,
defense: 0
});

const [equipment, setEquipment] = useState({
weapon: null,
armor: null,
accessory: null
});

const [inventory, setInventory] = useState({
gold: 100,
essence: 5,
crystals: 3,
potions: 3,
items: []
});

const [spells, setSpells] = useState([
{ id: ‘fireball’, name: ‘Fireball’, cost: 15, damage: 25, unlocked: true, cooldown: 0 },
{ id: ‘lightning’, name: ‘Lightning’, cost: 25, damage: 40, unlocked: false, cooldown: 0 },
{ id: ‘heal’, name: ‘Heal’, cost: 30, heal: 40, unlocked: false, cooldown: 0 },
{ id: ‘meteor’, name: ‘Meteor’, cost: 50, damage: 80, unlocked: false, cooldown: 0 }
]);

const [base, setBase] = useState({
built: false,
x: 1000,
y: 1000,
structures: []
});

const [enemies, setEnemies] = useState([]);
const [bosses, setBosses] = useState([]);
const [projectiles, setProjectiles] = useState([]);
const [particles, setParticles] = useState([]);
const [loot, setLoot] = useState([]);
const [terrain, setTerrain] = useState([]);
const [dungeons, setDungeons] = useState([]);
const [inDungeon, setInDungeon] = useState(null);
const [keys, setKeys] = useState({});
const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
const [camera, setCamera] = useState({ x: 0, y: 0 });
const [showInventory, setShowInventory] = useState(false);
const [showBase, setShowBase] = useState(false);
const [buildMode, setBuildMode] = useState(null);
const [message, setMessage] = useState(’’);
const [notifications, setNotifications] = useState([]);
const [quests, setQuests] = useState([
{ id: 1, title: ‘First Blood’, desc: ‘Defeat 10 enemies’, progress: 0, goal: 10, reward: 50, complete: false },
{ id: 2, title: ‘Dungeon Delver’, desc: ‘Clear a dungeon’, progress: 0, goal: 1, reward: 100, complete: false },
{ id: 3, title: ‘Boss Slayer’, desc: ‘Defeat a boss’, progress: 0, goal: 1, reward: 200, complete: false }
]);

const spawnTimerRef = useRef(0);
const bossTimerRef = useRef(0);
const autoSaveTimerRef = useRef(0);

const MAP_WIDTH = 2500;
const MAP_HEIGHT = 2000;
const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 600;

// Save game function
const saveGame = useCallback(() => {
const saveData = {
player,
equipment,
inventory,
spells,
base,
dungeons,
quests,
inDungeon,
spawnTimer: spawnTimerRef.current,
bossTimer: bossTimerRef.current,
timestamp: Date.now(),
version: ‘1.0’
};

```
try {
  localStorage.setItem('voxelRPG_save', JSON.stringify(saveData));
  showNotification('Game saved successfully!', 'success');
  return true;
} catch (error) {
  showNotification('Failed to save game!', 'warning');
  console.error('Save error:', error);
  return false;
}
```

}, [player, equipment, inventory, spells, base, dungeons, quests, inDungeon]);

// Load game function
const loadGame = useCallback(() => {
try {
const saved = localStorage.getItem(‘voxelRPG_save’);
if (!saved) {
showNotification(‘No save file found!’, ‘warning’);
return false;
}

```
  const data = JSON.parse(saved);
  
  // Validate save data
  if (!data.version || !data.player) {
    showNotification('Invalid save file!', 'warning');
    return false;
  }
  
  // Restore all state
  setPlayer(data.player);
  setEquipment(data.equipment);
  setInventory(data.inventory);
  setSpells(data.spells);
  setBase(data.base);
  setDungeons(data.dungeons);
  setQuests(data.quests);
  setInDungeon(data.inDungeon || null);
  spawnTimerRef.current = data.spawnTimer || 0;
  bossTimerRef.current = data.bossTimer || 0;
  
  // Clear transient state
  setEnemies([]);
  setBosses([]);
  setProjectiles([]);
  setParticles([]);
  setLoot([]);
  
  setGameState('playing');
  showNotification('Game loaded successfully!', 'success');
  
  const saveDate = new Date(data.timestamp);
  console.log(`Game loaded from ${saveDate.toLocaleDateString()} ${saveDate.toLocaleTimeString()}`);
  return true;
} catch (error) {
  showNotification('Failed to load game!', 'warning');
  console.error('Load error:', error);
  return false;
}
```

}, []);

// Show notification function
const showNotification = useCallback((text, type = ‘info’) => {
const id = Math.random();
setNotifications(prev => […prev, { id, text, type }]);
setTimeout(() => {
setNotifications(prev => prev.filter(n => n.id !== id));
}, 3000);
}, []);

// Show message function
const showMessage = useCallback((text) => {
setMessage(text);
setTimeout(() => setMessage(’’), 2000);
}, []);

// Initialize terrain and dungeons
useEffect(() => {
const newTerrain = [];
for (let i = 0; i < 200; i++) {
const type = Math.random() < 0.7 ? ‘grass’ : Math.random() < 0.5 ? ‘forest’ : Math.random() < 0.5 ? ‘water’ : ‘rock’;
newTerrain.push({
x: Math.random() * MAP_WIDTH,
y: Math.random() * MAP_HEIGHT,
type,
size: 40 + Math.random() * 40
});
}
setTerrain(newTerrain);

```
const dungeonCount = 5;
const newDungeons = [];
for (let i = 0; i < dungeonCount; i++) {
  newDungeons.push({
    id: i,
    x: 200 + (i * 400) + Math.random() * 200,
    y: 200 + Math.random() * (MAP_HEIGHT - 400),
    cleared: false
  });
}
setDungeons(newDungeons);
```

}, []);

const getTotalSpeed = useCallback(() => {
let speed = player.speed;
if (equipment.weapon?.bonus === ‘speed’) speed += 1;
if (equipment.armor?.bonus === ‘speed’) speed += 0.5;
return speed;
}, [player.speed, equipment.weapon, equipment.armor]);

const getTotalCritChance = useCallback(() => {
let crit = 0;
if (equipment.weapon?.bonus === ‘crit’) crit += 0.2;
if (equipment.accessory?.bonus === ‘crit’) crit += 0.15;
return crit;
}, [equipment.weapon, equipment.accessory]);

const getTotalCritDamage = useCallback(() => {
let critDmg = 1.5;
if (equipment.weapon?.bonus === ‘critDamage’) critDmg += 0.5;
return critDmg;
}, [equipment.weapon]);

const getTotalDodge = useCallback(() => {
let dodge = 0;
if (equipment.armor?.bonus === ‘dodge’) dodge += 0.15;
if (equipment.accessory?.bonus === ‘dodge’) dodge += 0.1;
return dodge;
}, [equipment.armor, equipment.accessory]);

const getSkillBonus = useCallback((type) => {
// Placeholder for skill tree bonuses
return 0;
}, []);

const gainXP = useCallback((amount) => {
setPlayer(prev => {
const newXP = prev.xp + amount;
if (newXP >= prev.xpToNext) {
const newLevel = prev.level + 1;
showNotification(`⭐ Level Up! Now level ${newLevel}`, ‘success’);
return {
…prev,
level: newLevel,
xp: newXP - prev.xpToNext,
xpToNext: Math.floor(prev.xpToNext * 1.5),
maxHealth: prev.maxHealth + 20,
health: prev.maxHealth + 20,
maxMana: prev.maxMana + 10,
mana: prev.maxMana + 10,
damage: prev.damage + 2
};
}
return { …prev, xp: newXP };
});
}, [showNotification]);

const updateQuest = useCallback((type, amount = 1) => {
setQuests(prev => prev.map(q => {
if (q.complete) return q;

```
  let shouldUpdate = false;
  if (type === 'enemy' && q.id === 1) shouldUpdate = true;
  if (type === 'dungeon' && q.id === 2) shouldUpdate = true;
  if (type === 'boss' && q.id === 3) shouldUpdate = true;
  
  if (shouldUpdate) {
    const newProgress = q.progress + amount;
    if (newProgress >= q.goal) {
      showNotification(`✓ Quest Complete: ${q.title}! +${q.reward} gold`, 'success');
      setInventory(prev => ({ ...prev, gold: prev.gold + q.reward }));
      return { ...q, progress: q.goal, complete: true };
    }
    return { ...q, progress: newProgress };
  }
  return q;
}));
```

}, [showNotification]);

const dropLoot = useCallback((x, y, type) => {
const lootTypes = {
normal: { gold: 5 + Math.floor(Math.random() * 10), essence: Math.random() < 0.3 ? 1 : 0 },
elite: { gold: 15 + Math.floor(Math.random() * 20), essence: 1 + Math.floor(Math.random() * 2), crystals: Math.random() < 0.2 ? 1 : 0 },
boss: { gold: 50 + Math.floor(Math.random() * 50), essence: 5, crystals: 2, potion: Math.random() < 0.5 ? 1 : 0 }
};

```
const lootData = lootTypes[type] || lootTypes.normal;

setLoot(prev => [...prev, {
  id: Math.random(),
  x, y,
  ...lootData
}]);
```

}, []);

const pickupLoot = useCallback((lootItem) => {
setInventory(prev => ({
…prev,
gold: prev.gold + (lootItem.gold || 0),
essence: prev.essence + (lootItem.essence || 0),
crystals: prev.crystals + (lootItem.crystals || 0),
potions: prev.potions + (lootItem.potion || 0)
}));
setLoot(prev => prev.filter(l => l.id !== lootItem.id));
}, []);

const castSpell = useCallback((spellIndex) => {
const spell = spells[spellIndex];
if (!spell || !spell.unlocked || spell.cooldown > 0 || player.mana < spell.cost) return;

```
setPlayer(prev => ({ ...prev, mana: prev.mana - spell.cost }));

if (spell.id === 'heal') {
  setPlayer(prev => ({ ...prev, health: Math.min(prev.maxHealth, prev.health + spell.heal) }));
  showMessage('Health restored!');
} else {
  const dx = mousePos.x - player.x;
  const dy = mousePos.y - player.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);
  
  setProjectiles(prev => [...prev, {
    id: Math.random(),
    x: player.x,
    y: player.y,
    vx: (dx / distance) * 10,
    vy: (dy / distance) * 10,
    damage: spell.damage + player.damage + getSkillBonus('spellPower'),
    type: spell.id,
    lifetime: 0,
    angle
  }]);
}

setSpells(prev => prev.map((s, i) => 
  i === spellIndex ? { ...s, cooldown: 60 } : s
));
```

}, [spells, player.mana, player.x, player.y, player.damage, mousePos, getSkillBonus, showMessage]);

const drinkPotion = useCallback(() => {
setInventory(prev => {
if (prev.potions > 0 && player.health < player.maxHealth) {
setPlayer(p => ({ …p, health: Math.min(p.maxHealth, p.health + 50) }));
showMessage(‘Health restored!’);
return { …prev, potions: prev.potions - 1 };
}
return prev;
});
}, [player.health, player.maxHealth, showMessage]);

const enterDungeon = useCallback((dungeon) => {
setInDungeon(dungeon.id);
setEnemies([]);
setBosses([]);

```
for (let i = 0; i < 10; i++) {
  const angle = (Math.PI * 2 * i) / 10;
  const distance = 200 + Math.random() * 200;
  setEnemies(prev => [...prev, {
    id: Math.random(),
    x: dungeon.x + Math.cos(angle) * distance,
    y: dungeon.y + Math.sin(angle) * distance,
    spawnX: dungeon.x + Math.cos(angle) * distance,
    spawnY: dungeon.y + Math.sin(angle) * distance,
    health: 50 + player.level * 15,
    maxHealth: 50 + player.level * 15,
    damage: 10 + player.level * 3,
    speed: 2,
    xp: 30,
    type: 'elite',
    state: 'roaming',
    roamAngle: angle,
    aggroSource: null
  }]);
}

showMessage('Entered the dungeon!');
```

}, [player.level, showMessage]);

const exitDungeon = useCallback(() => {
const currentDungeon = dungeons.find(d => d.id === inDungeon);
if (currentDungeon && enemies.length === 0) {
setDungeons(prev => prev.map(d =>
d.id === inDungeon ? { …d, cleared: true } : d
));
updateQuest(‘dungeon’);
showNotification(‘✓ Dungeon cleared!’, ‘success’);
}
setInDungeon(null);
setEnemies([]);
setBosses([]);
showMessage(‘Exited the dungeon!’);
}, [inDungeon, dungeons, enemies.length, updateQuest, showNotification, showMessage]);

const placeStructure = useCallback((worldX, worldY) => {
if (!buildMode) return;

```
const structure = buildingOptions.find(b => b.type === buildMode);
if (!structure) return;

if (inventory.gold >= structure.cost.gold && inventory.essence >= structure.cost.essence) {
  setBase(prev => ({
    ...prev,
    built: true,
    structures: [...prev.structures, {
      type: buildMode,
      x: worldX,
      y: worldY,
      health: 100
    }]
  }));
  
  setInventory(prev => ({
    ...prev,
    gold: prev.gold - structure.cost.gold,
    essence: prev.essence - structure.cost.essence
  }));
  
  showMessage(`${structure.name} built!`);
} else {
  showMessage('Not enough resources!');
}
```

}, [buildMode, inventory.gold, inventory.essence, showMessage]);

// Keyboard input handler
useEffect(() => {
const handleKeyDown = (e) => {
setKeys(prev => ({ …prev, [e.key.toLowerCase()]: true }));

```
  if (e.key === 'i' || e.key === 'I') setShowInventory(prev => !prev);
  if (e.key === 'b' || e.key === 'B') {
    setShowBase(prev => !prev);
    if (!showBase) setBuildMode(null);
  }
  if (e.key === 'h' || e.key === 'H') {
    drinkPotion();
  }
  if (e.key === 'e' || e.key === 'E') {
    if (inDungeon !== null) {
      const dungeon = dungeons.find(d => d.id === inDungeon);
      if (dungeon) {
        const dist = Math.sqrt(Math.pow(player.x - dungeon.x, 2) + Math.pow(player.y - dungeon.y, 2));
        if (dist < 150) {
          exitDungeon();
        }
      }
    } else {
      dungeons.forEach(dungeon => {
        const dist = Math.sqrt(Math.pow(player.x - dungeon.x, 2) + Math.pow(player.y - dungeon.y, 2));
        if (dist < 80) {
          enterDungeon(dungeon);
        }
      });
    }
  }
  if (e.key === 'Escape') {
    setShowInventory(false);
    setShowBase(false);
    setBuildMode(null);
  }
  if (e.key >= '1' && e.key <= '4') castSpell(parseInt(e.key) - 1);
};

const handleKeyUp = (e) => {
  setKeys(prev => ({ ...prev, [e.key.toLowerCase()]: false }));
};

window.addEventListener('keydown', handleKeyDown);
window.addEventListener('keyup', handleKeyUp);

return () => {
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('keyup', handleKeyUp);
};
```

}, [showBase, inDungeon, dungeons, player.x, player.y, castSpell, enterDungeon, exitDungeon, drinkPotion]);

// Mouse input handler
useEffect(() => {
const canvas = canvasRef.current;
if (!canvas) return;

```
const handleMouseMove = (e) => {
  const rect = canvas.getBoundingClientRect();
  const canvasX = e.clientX - rect.left;
  const canvasY = e.clientY - rect.top;
  
  setMousePos({
    x: canvasX + camera.x,
    y: canvasY + camera.y
  });
};

const handleClick = (e) => {
  if (gameState === 'playing' && !showInventory && !showBase) {
    castSpell(0);
  } else if (buildMode && showBase) {
    const rect = canvas.getBoundingClientRect();
    const worldX = (e.clientX - rect.left) + camera.x;
    const worldY = (e.clientY - rect.top) + camera.y;
    placeStructure(worldX, worldY);
  }
};

canvas.addEventListener('mousemove', handleMouseMove);
canvas.addEventListener('click', handleClick);

return () => {
  canvas.removeEventListener('mousemove', handleMouseMove);
  canvas.removeEventListener('click', handleClick);
};
```

}, [gameState, camera, buildMode, showBase, showInventory, castSpell, placeStructure]);

// Camera follow player
useEffect(() => {
setCamera({
x: Math.max(0, Math.min(player.x - CANVAS_WIDTH / 2, MAP_WIDTH - CANVAS_WIDTH)),
y: Math.max(0, Math.min(player.y - CANVAS_HEIGHT / 2, MAP_HEIGHT - CANVAS_HEIGHT))
});
}, [player.x, player.y]);

// Main game loop
useEffect(() => {
if (gameState !== ‘playing’) return;

```
const timeMultiplier = showBase ? 0.2 : 1;

const gameLoop = () => {
  // Auto-save every 30 seconds
  autoSaveTimerRef.current += 1;
  if (autoSaveTimerRef.current > 1800) { // 30 seconds at 60fps
    autoSaveTimerRef.current = 0;
    saveGame();
  }

  setPlayer(prev => {
    let newX = prev.x;
    let newY = prev.y;
    let newAngle = prev.facingAngle;
    
    const totalSpeed = getTotalSpeed() * timeMultiplier;
    
    if (keys.w) newY -= totalSpeed;
    if (keys.s) newY += totalSpeed;
    if (keys.a) newX -= totalSpeed;
    if (keys.d) newX += totalSpeed;
    
    if (keys.w || keys.s || keys.a || keys.d) {
      const dx = newX - prev.x;
      const dy = newY - prev.y;
      if (dx !== 0 || dy !== 0) {
        newAngle = Math.atan2(dy, dx);
      }
    }
    
    newX = Math.max(20, Math.min(MAP_WIDTH - 20, newX));
    newY = Math.max(20, Math.min(MAP_HEIGHT - 20, newY));
    
    let newHealth = prev.health;
    let newMana = Math.min(prev.maxMana, prev.mana + 0.1);
    
    if (newHealth <= 0) {
      setGameState('gameover');
    }
    
    return {
      ...prev,
      x: newX,
      y: newY,
      facingAngle: newAngle,
      health: newHealth,
      mana: newMana
    };
  });
  
  setSpells(prev => prev.map(spell => ({
    ...spell,
    cooldown: Math.max(0, spell.cooldown - 1)
  })));
  
  setProjectiles(prev => prev.filter(p => {
    const newLifetime = p.lifetime + 1;
    return newLifetime < 120;
  }).map(p => ({
    ...p,
    x: p.x + p.vx,
    y: p.y + p.vy,
    lifetime: p.lifetime + 1
  })));
  
  setParticles(prev => prev.filter(p => {
    const newLifetime = p.lifetime + 1;
    return newLifetime < p.maxLifetime;
  }).map(p => ({
    ...p,
    x: p.x + p.vx,
    y: p.y + p.vy,
    lifetime: p.lifetime + 1,
    opacity: 1 - (p.lifetime / p.maxLifetime)
  })));
  
  spawnTimerRef.current += timeMultiplier;
  if (spawnTimerRef.current > 180 && enemies.length < 20 && inDungeon === null) {
    spawnTimerRef.current = 0;
    
    const spawnDistance = 400 + Math.random() * 200;
    const spawnAngle = Math.random() * Math.PI * 2;
    const spawnX = Math.max(50, Math.min(MAP_WIDTH - 50, player.x + Math.cos(spawnAngle) * spawnDistance));
    const spawnY = Math.max(50, Math.min(MAP_HEIGHT - 50, player.y + Math.sin(spawnAngle) * spawnDistance));
    
    const type = Math.random() < 0.7 ? 'normal' : 'elite';
    const stats = type === 'elite' 
      ? { health: 80, damage: 15, speed: 2.5, xp: 30 }
      : { health: 50, damage: 10, speed: 2, xp: 15 };
    
    setEnemies(prev => [...prev, {
      id: Math.random(),
      x: spawnX,
      y: spawnY,
      spawnX,
      spawnY,
      health: stats.health + player.level * 10,
      maxHealth: stats.health + player.level * 10,
      damage: stats.damage + player.level * 2,
      speed: stats.speed,
      xp: stats.xp,
      type,
      state: 'roaming',
      roamAngle: Math.random() * Math.PI * 2,
      aggroSource: null
    }]);
  }
  
  bossTimerRef.current += timeMultiplier;
  if (bossTimerRef.current > 1800 && bosses.length === 0 && inDungeon === null) {
    bossTimerRef.current = 0;
    
    const bossX = Math.random() * MAP_WIDTH;
    const bossY = Math.random() * MAP_HEIGHT;
    
    setBosses([{
      id: Math.random(),
      x: bossX,
      y: bossY,
      health: 500 + player.level * 100,
      maxHealth: 500 + player.level * 100,
      damage: 20 + player.level * 5,
      speed: 1.5,
      type: 'boss',
      state: 'idle',
      attackCooldown: 0,
      aggroSource: null
    }]);
    
    showNotification('⚠️ A powerful boss has appeared!', 'warning');
  }
  
  setEnemies(prev => prev.map(enemy => {
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const distToPlayer = Math.sqrt(dx * dx + dy * dy);
    
    let newX = enemy.x;
    let newY = enemy.y;
    let newState = enemy.state;
    let roamAngle = enemy.roamAngle;
    let aggroSource = enemy.aggroSource;
    
    const detectionRange = enemy.state === 'hunting' ? 800 : 400;
    
    if (aggroSource) {
      newState = 'hunting';
      const aggroDx = aggroSource.x - enemy.x;
      const aggroDy = aggroSource.y - enemy.y;
      const aggroDist = Math.sqrt(aggroDx * aggroDx + aggroDy * aggroDy);
      
      if (aggroDist > 1000) {
        aggroSource = null;
        newState = 'returning';
      } else {
        const angle = Math.atan2(aggroDy, aggroDx);
        newX += Math.cos(angle) * enemy.speed * timeMultiplier;
        newY += Math.sin(angle) * enemy.speed * timeMultiplier;
      }
    } else if (distToPlayer < detectionRange) {
      newState = 'hunting';
      const angle = Math.atan2(dy, dx);
      newX += Math.cos(angle) * enemy.speed * timeMultiplier;
      newY += Math.sin(angle) * enemy.speed * timeMultiplier;
    } else if (newState === 'returning') {
      const returnDx = enemy.spawnX - enemy.x;
      const returnDy = enemy.spawnY - enemy.y;
      const returnDist = Math.sqrt(returnDx * returnDx + returnDy * returnDy);
      
      if (returnDist < 20) {
        newState = 'roaming';
        roamAngle = Math.random() * Math.PI * 2;
      } else {
        const angle = Math.atan2(returnDy, returnDx);
        newX += Math.cos(angle) * enemy.speed * timeMultiplier;
        newY += Math.sin(angle) * enemy.speed * timeMultiplier;
      }
    } else {
      if (Math.random() < 0.02) {
        roamAngle = Math.random() * Math.PI * 2;
      }
      newX += Math.cos(roamAngle) * enemy.speed * 0.5 * timeMultiplier;
      newY += Math.sin(roamAngle) * enemy.speed * 0.5 * timeMultiplier;
    }
    
    newX = Math.max(20, Math.min(MAP_WIDTH - 20, newX));
    newY = Math.max(20, Math.min(MAP_HEIGHT - 20, newY));
    
    return {
      ...enemy,
      x: newX,
      y: newY,
      state: newState,
      roamAngle,
      aggroSource
    };
  }));
  
  setBosses(prev => prev.map(boss => {
    const dx = player.x - boss.x;
    const dy = player.y - boss.y;
    const distToPlayer = Math.sqrt(dx * dx + dy * dy);
    
    let newX = boss.x;
    let newY = boss.y;
    let newState = boss.state;
    let newCooldown = Math.max(0, boss.attackCooldown - 1);
    let aggroSource = boss.aggroSource;
    
    if (aggroSource) {
      newState = 'hunting';
      const aggroDx = aggroSource.x - boss.x;
      const aggroDy = aggroSource.y - boss.y;
      const aggroDist = Math.sqrt(aggroDx * aggroDx + aggroDy * aggroDy);
      
      if (aggroDist > 1500) {
        aggroSource = null;
        newState = 'idle';
      } else {
        const angle = Math.atan2(aggroDy, aggroDx);
        
        if (aggroDist > 100) {
          newX += Math.cos(angle) * boss.speed * timeMultiplier;
          newY += Math.sin(angle) * boss.speed * timeMultiplier;
        }
        
        if (newCooldown === 0 && Math.random() < 0.1) {
          setProjectiles(p => [...p, {
            id: Math.random(),
            x: boss.x,
            y: boss.y,
            vx: Math.cos(angle) * 8,
            vy: Math.sin(angle) * 8,
            damage: boss.damage,
            type: 'boss',
            lifetime: 0,
            angle
          }]);
          newCooldown = 60;
        }
      }
    } else if (distToPlayer < 600) {
      newState = 'hunting';
      const angle = Math.atan2(dy, dx);
      
      if (distToPlayer > 100) {
        newX += Math.cos(angle) * boss.speed * timeMultiplier;
        newY += Math.sin(angle) * boss.speed * timeMultiplier;
      }
      
      if (newCooldown === 0 && Math.random() < 0.1) {
        setProjectiles(p => [...p, {
          id: Math.random(),
          x: boss.x,
          y: boss.y,
          vx: Math.cos(angle) * 8,
          vy: Math.sin(angle) * 8,
          damage: boss.damage,
          type: 'boss',
          lifetime: 0,
          angle
        }]);
        newCooldown = 60;
      }
    }
    
    newX = Math.max(20, Math.min(MAP_WIDTH - 20, newX));
    newY = Math.max(20, Math.min(MAP_HEIGHT - 20, newY));
    
    return {
      ...boss,
      x: newX,
      y: newY,
      state: newState,
      attackCooldown: newCooldown,
      aggroSource
    };
  }));
  
  projectiles.forEach(proj => {
    enemies.forEach(enemy => {
      const dx = proj.x - enemy.x;
      const dy = proj.y - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < 25) {
        let damage = proj.damage;
        const critChance = getTotalCritChance();
        const isCrit = Math.random() < critChance;
        
        if (isCrit) {
          damage *= getTotalCritDamage();
        }
        
        const newHealth = enemy.health - damage;
        
        if (newHealth <= 0) {
          gainXP(enemy.xp);
          dropLoot(enemy.x, enemy.y, enemy.type);
          updateQuest('enemy');
          setEnemies(prev => prev.filter(e => e.id !== enemy.id));
        } else {
          setEnemies(prev => prev.map(e => 
            e.id === enemy.id 
              ? { ...e, health: newHealth, aggroSource: { x: player.x, y: player.y } }
              : e
          ));
        }
        
        setProjectiles(prev => prev.filter(p => p.id !== proj.id));
        
        for (let i = 0; i < 5; i++) {
          setParticles(prev => [...prev, {
            id: Math.random(),
            x: proj.x,
            y: proj.y,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            color: isCrit ? '#ff0' : '#f80',
            size: isCrit ? 6 : 4,
            lifetime: 0,
            maxLifetime: 20,
            opacity: 1
          }]);
        }
      }
    });
    
    bosses.forEach(boss => {
      const dx = proj.x - boss.x;
      const dy = proj.y - boss.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < 40) {
        let damage = proj.damage;
        const critChance = getTotalCritChance();
        const isCrit = Math.random() < critChance;
        
        if (isCrit) {
          damage *= getTotalCritDamage();
        }
        
        const newHealth = boss.health - damage;
        
        if (newHealth <= 0) {
          gainXP(200);
          dropLoot(boss.x, boss.y, 'boss');
          updateQuest('boss');
          setBosses(prev => prev.filter(b => b.id !== boss.id));
          showNotification('🏆 Boss defeated!', 'success');
        } else {
          setBosses(prev => prev.map(b => 
            b.id === boss.id 
              ? { ...b, health: newHealth, aggroSource: { x: player.x, y: player.y } }
              : b
          ));
        }
        
        setProjectiles(prev => prev.filter(p => p.id !== proj.id));
        
        for (let i = 0; i < 8; i++) {
          setParticles(prev => [...prev, {
            id: Math.random(),
            x: proj.x,
            y: proj.y,
            vx: (Math.random() - 0.5) * 5,
            vy: (Math.random() - 0.5) * 5,
            color: isCrit ? '#ff0' : '#f80',
            size: isCrit ? 8 : 6,
            lifetime: 0,
            maxLifetime: 25,
            opacity: 1
          }]);
        }
      }
    });
    
    if (proj.type === 'boss') {
      const dx = proj.x - player.x;
      const dy = proj.y - player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < 20) {
        const dodgeChance = getTotalDodge();
        if (Math.random() > dodgeChance) {
          const damageReduction = player.defense * 0.01;
          const actualDamage = Math.max(1, Math.floor(proj.damage * (1 - damageReduction)));
          
          setPlayer(prev => ({
            ...prev,
            health: prev.health - actualDamage
          }));
          
          showNotification(`-${actualDamage} HP`, 'warning');
        } else {
          showNotification('Dodged!', 'success');
        }
        
        setProjectiles(prev => prev.filter(p => p.id !== proj.id));
      }
    }
  });
  
  enemies.forEach(enemy => {
    const dx = enemy.x - player.x;
    const dy = enemy.y - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist < 25) {
      const dodgeChance = getTotalDodge();
      if (Math.random() > dodgeChance && Math.random() < 0.05) {
        const damageReduction = player.defense * 0.01;
        const actualDamage = Math.max(1, Math.floor(enemy.damage * (1 - damageReduction)));
        
        setPlayer(prev => ({
          ...prev,
          health: prev.health - actualDamage
        }));
      }
    }
  });
  
  bosses.forEach(boss => {
    const dx = boss.x - player.x;
    const dy = boss.y - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist < 40) {
      const dodgeChance = getTotalDodge();
      if (Math.random() > dodgeChance && Math.random() < 0.03) {
        const damageReduction = player.defense * 0.01;
        const actualDamage = Math.max(1, Math.floor(boss.damage * (1 - damageReduction)));
        
        setPlayer(prev => ({
          ...prev,
          health: prev.health - actualDamage
        }));
      }
    }
  });
  
  loot.forEach(lootItem => {
    const dx = lootItem.x - player.x;
    const dy = lootItem.y - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist < 30) {
      pickupLoot(lootItem);
    }
  });
};

let lastTime = performance.now();

const animate = (currentTime) => {
  const deltaTime = (currentTime - lastTime) / 16.67;
  lastTime = currentTime;
  
  if (deltaTime < 3) {
    gameLoop();
  }
  
  requestAnimationFrame(animate);
};

const animationId = requestAnimationFrame(animate);

return () => {
  cancelAnimationFrame(animationId);
};
```

}, [
gameState,
keys,
mousePos,
player.x,
player.y,
player.level,
player.defense,
showBase,
bosses.length,
inDungeon,
dungeons,
gainXP,
pickupLoot,
updateQuest,
saveGame,
getTotalSpeed,
getTotalCritChance,
getTotalCritDamage,
getTotalDodge,
dropLoot,
showNotification,
enemies,
projectiles,
loot,
bosses
]);

// Render loop
useEffect(() => {
const canvas = canvasRef.current;
if (!canvas) return;

```
const ctx = canvas.getContext('2d');
ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

const minX = camera.x - 20;
const maxX = camera.x + CANVAS_WIDTH + 20;
const minY = camera.y - 20;
const maxY = camera.y + CANVAS_HEIGHT + 20;

const terrainByType = { grass: [], forest: [], water: [], rock: [] };
terrain.forEach(tile => {
  if (tile.x + tile.size >= minX && tile.x - tile.size <= maxX &&
      tile.y + tile.size >= minY && tile.y - tile.size <= maxY) {
    terrainByType[tile.type].push(tile);
  }
});

Object.entries(terrainByType).forEach(([type, tiles]) => {
  const colors = { grass: '#2a4', forest: '#152', water: '#28c', rock: '#666' };
  ctx.fillStyle = colors[type];
  tiles.forEach(tile => {
    ctx.beginPath();
    ctx.arc(tile.x - camera.x, tile.y - camera.y, tile.size, 0, Math.PI * 2);
    ctx.fill();
  });
});

dungeons.forEach(dungeon => {
  if (dungeon.x >= minX && dungeon.x <= maxX && dungeon.y >= minY && dungeon.y <= maxY) {
    ctx.fillStyle = dungeon.cleared ? '#666' : '#333';
    ctx.fillRect(dungeon.x - camera.x - 40, dungeon.y - camera.y - 40, 80, 80);
    ctx.strokeStyle = dungeon.cleared ? '#888' : '#c80';
    ctx.lineWidth = 4;
    ctx.strokeRect(dungeon.x - camera.x - 40, dungeon.y - camera.y - 40, 80, 80);
    
    if (inDungeon !== dungeon.id) {
      ctx.fillStyle = '#fff';
      ctx.font = '16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(dungeon.cleared ? 'CLEARED' : 'DUNGEON', dungeon.x - camera.x, dungeon.y - camera.y);
    }
  }
});

if (base.built) {
  ctx.fillStyle = '#840';
  ctx.fillRect(base.x - camera.x - 30, base.y - camera.y - 30, 60, 60);
  ctx.strokeStyle = '#c60';
  ctx.lineWidth = 3;
  ctx.strokeRect(base.x - camera.x - 30, base.y - camera.y - 30, 60, 60);
}

base.structures.forEach(structure => {
  if (structure.x >= minX && structure.x <= maxX && structure.y >= minY && structure.y <= maxY) {
    ctx.fillStyle = structure.type === 'wall' ? '#666' : structure.type === 'tower' ? '#c44' : '#4a8';
    ctx.fillRect(structure.x - camera.x - 15, structure.y - camera.y - 15, 30, 30);
  }
});

loot.forEach(item => {
  if (item.x >= minX && item.x <= maxX && item.y >= minY && item.y <= maxY) {
    ctx.fillStyle = '#fc0';
    ctx.beginPath();
    ctx.arc(item.x - camera.x, item.y - camera.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
});

enemies.forEach(enemy => {
  if (enemy.x >= minX && enemy.x <= maxX && enemy.y >= minY && enemy.y <= maxY) {
    ctx.fillStyle = enemy.type === 'elite' ? '#c44' : '#f44';
    ctx.fillRect(enemy.x - camera.x - 15, enemy.y - camera.y - 15, 30, 30);
    
    const healthPercent = enemy.health / enemy.maxHealth;
    ctx.fillStyle = '#f00';
    ctx.fillRect(enemy.x - camera.x - 15, enemy.y - camera.y - 20, 30, 3);
    ctx.fillStyle = '#0f0';
    ctx.fillRect(enemy.x - camera.x - 15, enemy.y - camera.y - 20, 30 * healthPercent, 3);
  }
});

bosses.forEach(boss => {
  if (boss.x >= minX && boss.x <= maxX && boss.y >= minY && boss.y <= maxY) {
    ctx.fillStyle = '#a0f';
    ctx.fillRect(boss.x - camera.x - 30, boss.y - camera.y - 30, 60, 60);
    ctx.strokeStyle = '#f0f';
    ctx.lineWidth = 4;
    ctx.strokeRect(boss.x - camera.x - 30, boss.y - camera.y - 30, 60, 60);
    
    const healthPercent = boss.health / boss.maxHealth;
    ctx.fillStyle = '#f00';
    ctx.fillRect(boss.x - camera.x - 30, boss.y - camera.y - 40, 60, 5);
    ctx.fillStyle = '#0f0';
    ctx.fillRect(boss.x - camera.x - 30, boss.y - camera.y - 40, 60 * healthPercent, 5);
  }
});

ctx.save();
ctx.translate(player.x - camera.x, player.y - camera.y);
ctx.rotate(player.facingAngle);
ctx.fillStyle = '#4af';
ctx.fillRect(-15, -15, 30, 30);
ctx.fillStyle = '#6cf';
ctx.beginPath();
ctx.moveTo(15, 0);
ctx.lineTo(25, -5);
ctx.lineTo(25, 5);
ctx.closePath();
ctx.fill();
ctx.restore();

projectiles.forEach(proj => {
  if (proj.x >= minX && proj.x <= maxX && proj.y >= minY && proj.y <= maxY) {
    ctx.save();
    ctx.translate(proj.x - camera.x, proj.y - camera.y);
    ctx.rotate(proj.angle);
    
    if (proj.type === 'fireball') {
      ctx.fillStyle = '#f80';
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();
    } else if (proj.type === 'lightning') {
      ctx.strokeStyle = '#ff0';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-10, 0);
      ctx.lineTo(10, 0);
      ctx.stroke();
    } else if (proj.type === 'meteor') {
      ctx.fillStyle = '#f40';
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
    } else if (proj.type === 'boss') {
      ctx.fillStyle = '#a0f';
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.restore();
  }
});

particles.forEach(particle => {
  if (particle.x >= minX && particle.x <= maxX && particle.y >= minY && particle.y <= maxY) {
    ctx.fillStyle = particle.color;
    ctx.globalAlpha = particle.opacity;
    ctx.beginPath();
    ctx.arc(particle.x - camera.x, particle.y - camera.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
});
```

}, [camera, terrain, dungeons, base, loot, enemies, bosses, player, projectiles, particles, inDungeon]);

if (gameState === ‘intro’) {
return (
<div className="w-full h-screen bg-gradient-to-b from-blue-900 to-purple-900 flex items-center justify-center">
<div className="text-center text-white max-w-2xl p-8">
<h1 className="text-6xl font-bold mb-8 text-yellow-300">⚔️ Voxel RPG ⚔️</h1>
<p className="text-xl mb-8">Explore dungeons, defeat enemies, and build your base!</p>
<div className="space-y-4">
<button
onClick={() => setGameState(‘playing’)}
className=“bg-green-600 hover:bg-green-700 text-white text-2xl px-12 py-4 rounded-lg transition-colors w-full”
>
New Game
</button>
<button
onClick={() => {
if (loadGame()) {
// Game state will be set by loadGame
}
}}
className=“bg-blue-600 hover:bg-blue-700 text-white text-2xl px-12 py-4 rounded-lg transition-colors w-full”
>
Load Game
</button>
</div>
<div className="mt-8 text-left bg-black bg-opacity-50 p-6 rounded-lg">
<h3 className="text-xl font-bold mb-4 text-yellow-300">Controls:</h3>
<p><strong>WASD:</strong> Move</p>
<p><strong>Mouse:</strong> Aim & Click to cast fireball</p>
<p><strong>1-4:</strong> Cast spells</p>
<p><strong>H:</strong> Drink health potion</p>
<p><strong>I:</strong> Inventory</p>
<p><strong>B:</strong> Base building</p>
<p><strong>E:</strong> Enter/Exit dungeons</p>
<p><strong>ESC:</strong> Close menus</p>
</div>
</div>
</div>
);
}

if (gameState === ‘gameover’) {
return (
<div className="w-full h-screen bg-gradient-to-b from-gray-900 to-red-900 flex items-center justify-center">
<div className="text-center text-white max-w-2xl p-8">
<h1 className="text-5xl font-bold mb-6 text-red-300">The Darkness Prevails</h1>
<p className="text-xl mb-4">Level Reached: {player.level}</p>
<p className="text-xl mb-4">Gold Collected: {inventory.gold}</p>
<button
onClick={() => window.location.reload()}
className=“bg-red-600 hover:bg-red-700 text-white text-2xl px-12 py-4 rounded-lg transition-colors”
>
Try Again
</button>
</div>
</div>
);
}

const buildingOptions = [
{ type: ‘wall’, name: ‘Wall’, cost: { gold: 20, essence: 0 }, icon: Shield },
{ type: ‘tower’, name: ‘Tower’, cost: { gold: 50, essence: 2 }, icon: AlertCircle },
{ type: ‘workshop’, name: ‘Workshop’, cost: { gold: 100, essence: 5 }, icon: Hammer }
];

return (
<div className="w-full h-screen bg-gray-900 relative overflow-hidden">
<canvas
ref={canvasRef}
width={CANVAS_WIDTH}
height={CANVAS_HEIGHT}
className=“absolute inset-0 m-auto border-4 border-gray-700”
style={{ imageRendering: ‘pixelated’ }}
/>

```
  <div className="absolute top-4 left-4 bg-black bg-opacity-75 p-4 rounded-lg text-white space-y-2">
    <div className="flex items-center gap-2">
      <Heart className="w-5 h-5 text-red-500" />
      <div className="w-48 h-6 bg-gray-700 rounded overflow-hidden">
        <div 
          className="h-full bg-red-500 transition-all"
          style={{ width: `${(player.health / player.maxHealth) * 100}%` }}
        />
      </div>
      <span className="text-sm">{Math.floor(player.health)}/{player.maxHealth}</span>
    </div>
    
    <div className="flex items-center gap-2">
      <Zap className="w-5 h-5 text-blue-500" />
      <div className="w-48 h-6 bg-gray-700 rounded overflow-hidden">
        <div 
          className="h-full bg-blue-500 transition-all"
          style={{ width: `${(player.mana / player.maxMana) * 100}%` }}
        />
      </div>
      <span className="text-sm">{Math.floor(player.mana)}/{player.maxMana}</span>
    </div>
    
    <div className="flex items-center gap-2">
      <TrendingUp className="w-5 h-5 text-yellow-500" />
      <div className="w-48 h-6 bg-gray-700 rounded overflow-hidden">
        <div 
          className="h-full bg-yellow-500 transition-all"
          style={{ width: `${(player.xp / player.xpToNext) * 100}%` }}
        />
      </div>
      <span className="text-sm">Lvl {player.level}</span>
    </div>
    
    <div className="pt-2 border-t border-gray-600 text-sm">
      <p>Gold: {inventory.gold}</p>
      <p>Essence: {inventory.essence}</p>
      <p>Crystals: {inventory.crystals}</p>
    </div>
    
    <button
      onClick={saveGame}
      className="w-full mt-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded flex items-center justify-center gap-2"
    >
      <Save className="w-4 h-4" />
      Save Game
    </button>
  </div>
  
  <div className="absolute top-4 right-4 bg-black bg-opacity-75 p-4 rounded-lg text-white space-y-2">
    <h3 className="font-bold mb-2">Spells:</h3>
    {spells.map((spell, i) => (
      <div 
        key={spell.id}
        className={`flex items-center justify-between gap-4 p-2 rounded ${
          !spell.unlocked ? 'opacity-50' : 
          spell.cooldown > 0 ? 'bg-gray-700' : 
          player.mana >= spell.cost ? 'bg-blue-900' : 'bg-red-900'
        }`}
      >
        <span className="text-sm">[{i + 1}] {spell.name}</span>
        <span className="text-xs">{spell.cost} ⚡</span>
        {spell.cooldown > 0 && (
          <span className="text-xs text-yellow-400">{Math.ceil(spell.cooldown / 60)}s</span>
        )}
      </div>
    ))}
  </div>
  
  <div className="absolute bottom-4 left-4 bg-black bg-opacity-75 p-4 rounded-lg text-white">
    <h3 className="font-bold mb-2">Quests:</h3>
    {quests.filter(q => !q.complete).slice(0, 3).map(quest => (
      <div key={quest.id} className="mb-2">
        <p className="text-sm font-semibold">{quest.title}</p>
        <div className="w-48 h-2 bg-gray-700 rounded overflow-hidden mt-1">
          <div 
            className="h-full bg-yellow-500"
            style={{ width: `${(quest.progress / quest.goal) * 100}%` }}
          />
        </div>
        <p className="text-xs text-gray-400">{quest.progress}/{quest.goal}</p>
      </div>
    ))}
  </div>
  
  {message && (
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black bg-opacity-90 px-8 py-4 rounded-lg text-white text-2xl font-bold">
      {message}
    </div>
  )}
  
  {notifications.map(notif => (
    <div 
      key={notif.id}
      className={`absolute top-20 right-4 px-6 py-3 rounded-lg text-white font-semibold ${
        notif.type === 'success' ? 'bg-green-600' :
        notif.type === 'warning' ? 'bg-yellow-600' :
        'bg-blue-600'
      }`}
    >
      {notif.text}
    </div>
  ))}
  
  {showInventory && (
    <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
      <div className="bg-gray-800 p-8 rounded-lg max-w-2xl w-full text-white">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold flex items-center gap-2">
            <Package className="w-8 h-8" />
            Inventory
          </h2>
          <button onClick={() => setShowInventory(false)} className="text-white hover:text-gray-300">
            <X className="w-8 h-8" />
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="text-xl font-bold mb-4">Resources</h3>
            <div className="space-y-2">
              <p>Gold: {inventory.gold}</p>
              <p>Essence: {inventory.essence}</p>
              <p>Crystals: {inventory.crystals}</p>
              <p>Potions: {inventory.potions}</p>
            </div>
          </div>
          
          <div>
            <h3 className="text-xl font-bold mb-4">Equipment</h3>
            <div className="space-y-2">
              <div>
                <p className="font-semibold">Weapon:</p>
                <p className="text-gray-400">{equipment.weapon?.name || 'None'}</p>
              </div>
              <div>
                <p className="font-semibold">Armor:</p>
                <p className="text-gray-400">{equipment.armor?.name || 'None'}</p>
              </div>
              <div>
                <p className="font-semibold">Accessory:</p>
                <p className="text-gray-400">{equipment.accessory?.name || 'None'}</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-6 pt-6 border-t border-gray-600">
          <h3 className="text-xl font-bold mb-4">Stats</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <p>Level: {player.level}</p>
            <p>Damage: {player.damage}</p>
            <p>Speed: {getTotalSpeed().toFixed(1)}</p>
            <p>Defense: {player.defense}</p>
            <p>Crit Chance: {(getTotalCritChance() * 100).toFixed(0)}%</p>
            <p>Dodge: {(getTotalDodge() * 100).toFixed(0)}%</p>
          </div>
        </div>
      </div>
    </div>
  )}
  
  {showBase && (
    <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
      <div className="bg-gray-800 p-8 rounded-lg max-w-2xl w-full text-white">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold flex items-center gap-2">
            <Home className="w-8 h-8" />
            Base Building
          </h2>
          <button onClick={() => { setShowBase(false); setBuildMode(null); }} className="text-white hover:text-gray-300">
            <X className="w-8 h-8" />
          </button>
        </div>
        
        <div className="mb-6">
          <p className="text-gray-400 mb-4">Build structures to defend your base</p>
          <div className="grid grid-cols-1 gap-4">
            {buildingOptions.map(option => {
              const Icon = option.icon;
              return (
                <button
                  key={option.type}
                  onClick={() => setBuildMode(option.type)}
                  className={`p-4 rounded-lg flex items-center justify-between ${
                    buildMode === option.type ? 'bg-blue-700' : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-6 h-6" />
                    <span className="font-semibold">{option.name}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-yellow-400">{option.cost.gold}g</span>
                    {option.cost.essence > 0 && (
                      <span className="text-purple-400 ml-2">{option.cost.essence}e</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        
        {buildMode && (
          <div className="bg-blue-900 bg-opacity-50 p-4 rounded-lg">
            <p className="text-center">Click on the map to place {buildingOptions.find(b => b.type === buildMode)?.name}</p>
          </div>
        )}
      </div>
    </div>
  )}
</div>
```

);
};

export default VoxelRPG;