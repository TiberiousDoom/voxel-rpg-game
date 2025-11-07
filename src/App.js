import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Heart, Zap, Package, Home, TrendingUp, X, Shield, Hammer, AlertCircle, Save, Star, Sparkles, Swords, Users, Award, Moon, Sun } from 'lucide-react';
import { SpatialHash } from './utils/SpatialHash';
import { ObjectPool } from './utils/ObjectPool';
import { audioManager } from './utils/AudioManager';
import packageJson from '../package.json';

const VoxelRPG = () => {
const canvasRef = useRef(null);
const [gameState, setGameState] = useState('intro');
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
defense: 0,
critChance: 5,
critDamage: 150,
dodgeChance: 5,
skillPoints: 0
});

const [equipment, setEquipment] = useState({
weapon: null,
armor: null,
helmet: null,
gloves: null,
boots: null,
ring1: null,
ring2: null,
amulet: null,
offhand: null
});

const [inventory, setInventory] = useState({
gold: 100,
essence: 5,
crystals: 3,
potions: 3,
items: [],
materials: { wood: 10, iron: 5, leather: 8, crystal: 2 }
});

const [recipes] = useState([
{
  id: 'iron_sword',
  name: 'Iron Sword',
  type: 'weapon',
  result: { name: 'Iron Sword', damage: 8, type: 'weapon' },
  materials: { iron: 5, wood: 2 }
},
{
  id: 'steel_sword',
  name: 'Steel Sword',
  type: 'weapon',
  result: { name: 'Steel Sword', damage: 15, type: 'weapon' },
  materials: { iron: 10, crystal: 1 }
},
{
  id: 'leather_armor',
  name: 'Leather Armor',
  type: 'armor',
  result: { name: 'Leather Armor', defense: 5, type: 'armor' },
  materials: { leather: 8 }
},
{
  id: 'iron_armor',
  name: 'Iron Armor',
  type: 'armor',
  result: { name: 'Iron Armor', defense: 10, type: 'armor' },
  materials: { iron: 15, leather: 5 }
},
{
  id: 'health_potion',
  name: 'Health Potion',
  type: 'consumable',
  result: { type: 'potion', amount: 3 },
  materials: { essence: 2, crystal: 1 }
}
]);

const [skills, setSkills] = useState({
combat: {
  powerStrike: { level: 0, maxLevel: 5, cost: 1, bonus: 5, desc: 'Increases damage by 5% per level' },
  criticalHit: { level: 0, maxLevel: 5, cost: 1, bonus: 3, desc: 'Increases crit chance by 3% per level' },
  deadlyBlow: { level: 0, maxLevel: 3, cost: 2, bonus: 10, desc: 'Increases crit damage by 10% per level' }
},
magic: {
  manaPool: { level: 0, maxLevel: 5, cost: 1, bonus: 20, desc: 'Increases max mana by 20 per level' },
  spellPower: { level: 0, maxLevel: 5, cost: 1, bonus: 10, desc: 'Increases spell damage by 10% per level' },
  fastCasting: { level: 0, maxLevel: 3, cost: 2, bonus: 15, desc: 'Reduces spell cooldowns by 15% per level' }
},
defense: {
  ironSkin: { level: 0, maxLevel: 5, cost: 1, bonus: 2, desc: 'Increases defense by 2 per level' },
  vitality: { level: 0, maxLevel: 5, cost: 1, bonus: 25, desc: 'Increases max health by 25 per level' },
  evasion: { level: 0, maxLevel: 5, cost: 1, bonus: 2, desc: 'Increases dodge chance by 2% per level' }
},
utility: {
  swiftness: { level: 0, maxLevel: 3, cost: 2, bonus: 0.2, desc: 'Increases movement speed by 0.2 per level' },
  fortune: { level: 0, maxLevel: 5, cost: 1, bonus: 15, desc: 'Increases gold/loot drops by 15% per level' },
  regeneration: { level: 0, maxLevel: 3, cost: 2, bonus: 0.5, desc: 'Regenerate 0.5 HP/sec per level' }
}
});

const [spells, setSpells] = useState([
{ id: 'fireball', name: 'Fireball', cost: 15, damage: 25, unlocked: true, cooldown: 0, type: 'projectile' },
{ id: 'lightning', name: 'Lightning', cost: 25, damage: 40, unlocked: false, cooldown: 0, type: 'projectile' },
{ id: 'heal', name: 'Heal', cost: 30, heal: 40, unlocked: false, cooldown: 0, type: 'self' },
{ id: 'meteor', name: 'Meteor', cost: 50, damage: 80, unlocked: false, cooldown: 0, type: 'projectile' },
{ id: 'frostnova', name: 'Frost Nova', cost: 40, damage: 30, unlocked: false, cooldown: 0, type: 'aoe', radius: 150, slow: 0.5 },
{ id: 'chainlightning', name: 'Chain Lightning', cost: 35, damage: 25, unlocked: false, cooldown: 0, type: 'chain', chains: 5 },
{ id: 'poisoncloud', name: 'Poison Cloud', cost: 45, damage: 5, unlocked: false, cooldown: 0, type: 'aoe', radius: 100, duration: 180 },
{ id: 'shield', name: 'Shield', cost: 30, unlocked: false, cooldown: 0, type: 'buff', duration: 300, effect: 'defense', value: 20 },
{ id: 'haste', name: 'Haste', cost: 25, unlocked: false, cooldown: 0, type: 'buff', duration: 240, effect: 'speed', value: 2 },
{ id: 'healbeam', name: 'Heal Beam', cost: 2, heal: 1, unlocked: false, cooldown: 0, type: 'channeled' }
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
const [showSkills, setShowSkills] = useState(false);
const [showCrafting, setShowCrafting] = useState(false);
const [buildMode, setBuildMode] = useState(null);
const [message, setMessage] = useState('');
const [notifications, setNotifications] = useState([]);
const [isTouchDevice, setIsTouchDevice] = useState(false);
const [joystickActive, setJoystickActive] = useState(false);
const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 });
const [leftJoystickTouchId, setLeftJoystickTouchId] = useState(null);
const [joystickRightActive, setJoystickRightActive] = useState(false);
const [joystickRightPos, setJoystickRightPos] = useState({ x: 0, y: 0 });
const [rightJoystickTouchId, setRightJoystickTouchId] = useState(null);
const [chargeLevel, setChargeLevel] = useState(0);
const [sprintActive, setSprintActive] = useState(false);
const [showMobileMenu, setShowMobileMenu] = useState(false);
const [canvasSize, setCanvasSize] = useState({ width: 1000, height: 1200 });
const [quests, setQuests] = useState([
{ id: 1, title: 'First Blood', desc: 'Defeat 10 enemies', progress: 0, goal: 10, reward: 50, complete: false },
{ id: 2, title: 'Dungeon Delver', desc: 'Clear a dungeon', progress: 0, goal: 1, reward: 100, complete: false },
{ id: 3, title: 'Boss Slayer', desc: 'Defeat a boss', progress: 0, goal: 1, reward: 200, complete: false }
]);

// NEW ENHANCED FEATURES STATE
const [playerClass, setPlayerClass] = useState(null); // 'warrior', 'mage', 'rogue'
const [activeBuffs, setActiveBuffs] = useState([]); // {type, duration, value}
const [damageNumbers, setDamageNumbers] = useState([]); // {x, y, value, life, type}
const [screenShake, setScreenShake] = useState({ x: 0, y: 0, intensity: 0 });
const [comboCounter, setComboCounter] = useState({ count: 0, timer: 0 });
const [aoeEffects, setAoeEffects] = useState([]); // {x, y, radius, type, life}
// const [biome, setBiome] = useState('forest'); // FUTURE: forest, desert, tundra
const [pet, setPet] = useState(null); // {type: 'wolf'|'fairy', x, y, health, ability}
const [achievements, setAchievements] = useState([
  { id: 'kill_100', title: 'Slayer', desc: 'Kill 100 enemies', progress: 0, goal: 100, complete: false, reward: 'Wolf Pet' },
  { id: 'reach_level_10', title: 'Veteran', desc: 'Reach level 10', progress: 0, goal: 10, complete: false, reward: '500 Gold' },
  { id: 'collect_1000_gold', title: 'Wealthy', desc: 'Collect 1000 gold', progress: 0, goal: 1000, complete: false, reward: 'Fairy Pet' }
]);
const [timeOfDay, setTimeOfDay] = useState(0); // 0-1440 (24 hours in game minutes)
// FUTURE FEATURES - Ready to implement
// const [npcs, setNpcs] = useState([]); // {id, type, x, y, name, dialogue}
// const [showShop, setShowShop] = useState(false);
// const [showEnchanting, setShowEnchanting] = useState(false);
// const [showPetMenu, setShowPetMenu] = useState(false);
// const [selectedNpc, setSelectedNpc] = useState(null);
const [showAchievements, setShowAchievements] = useState(false);

const gameLoopRef = useRef(null);
const spawnTimerRef = useRef(0);
const bossTimerRef = useRef(0);
const autoSaveTimerRef = useRef(0);
const spatialHashRef = useRef(new SpatialHash(100));
const projectilePoolRef = useRef(null);
const particlePoolRef = useRef(null);

const MAP_WIDTH = 2500;
const MAP_HEIGHT = 2000;
const CANVAS_WIDTH = canvasSize.width;
const CANVAS_HEIGHT = canvasSize.height;

// Initialize object pools and audio on mount
useEffect(() => {
  // Initialize audio manager
  audioManager.init();

  // Initialize projectile pool
  projectilePoolRef.current = new ObjectPool(
    () => ({ id: 0, x: 0, y: 0, vx: 0, vy: 0, damage: 0, type: '', life: 0, sourceX: 0, sourceY: 0 }),
    (obj, data) => Object.assign(obj, data, { id: Math.random() })
  );

  // Initialize particle pool
  particlePoolRef.current = new ObjectPool(
    () => ({ x: 0, y: 0, vx: 0, vy: 0, life: 0, color: '' }),
    (obj, data) => Object.assign(obj, data)
  );
}, []);

// Utility functions - defined first so other hooks can reference them
const showMessage = useCallback((msg) => {
setMessage(msg);
setTimeout(() => setMessage(''), 3000);
}, []);

const showNotification = useCallback((msg, type = 'info') => {
const id = Math.random();
setNotifications(prev => [...prev, { id, msg, type }]);
setTimeout(() => {
setNotifications(prev => prev.filter(n => n.id !== id));
}, 4000);
}, []);

// NEW HELPER FUNCTIONS FOR ENHANCED FEATURES

const createDamageNumber = useCallback((x, y, value, type = 'damage') => {
  setDamageNumbers(prev => [...prev, {
    id: Math.random(),
    x, y,
    value,
    life: 60,
    type // 'damage', 'heal', 'crit'
  }]);
}, []);

const triggerScreenShake = useCallback((intensity = 10) => {
  setScreenShake({
    x: (Math.random() - 0.5) * intensity,
    y: (Math.random() - 0.5) * intensity,
    intensity
  });
  setTimeout(() => setScreenShake({ x: 0, y: 0, intensity: 0 }), 100);
}, []);

const updateCombo = useCallback(() => {
  setComboCounter(prev => ({
    count: prev.count + 1,
    timer: 180 // 3 seconds at 60fps
  }));
}, []);

const checkAchievement = useCallback((id, progress) => {
  setAchievements(prev => prev.map(ach => {
    if (ach.id === id && !ach.complete) {
      const newProgress = ach.progress + progress;
      if (newProgress >= ach.goal) {
        showNotification(`🏆 Achievement Unlocked: ${ach.title}!`, 'success');
        audioManager.play('levelup');

        // Grant rewards
        if (ach.reward === 'Wolf Pet') {
          setPet({ type: 'wolf', x: player.x + 50, y: player.y, health: 100, maxHealth: 100, damage: 10 });
        } else if (ach.reward === 'Fairy Pet') {
          setPet({ type: 'fairy', x: player.x + 50, y: player.y, health: 50, maxHealth: 50, healAmount: 2 });
        } else if (ach.reward.includes('Gold')) {
          const gold = parseInt(ach.reward);
          setInventory(inv => ({ ...inv, gold: inv.gold + gold }));
        }

        return { ...ach, progress: newProgress, complete: true };
      }
      return { ...ach, progress: newProgress };
    }
    return ach;
  }));
}, [player.x, player.y, showNotification]);

const applyBuff = useCallback((buffType, duration, value) => {
  setActiveBuffs(prev => [...prev, { type: buffType, duration, value, id: Math.random() }]);
  audioManager.play('heal');
}, []);

const getClassBonus = useCallback((stat) => {
  if (!playerClass) return 0;

  const bonuses = {
    warrior: { health: 50, damage: 10, defense: 5 },
    mage: { mana: 50, spellPower: 1.3, cooldownReduction: 0.8 },
    rogue: { speed: 0.5, critChance: 15, dodgeChance: 10 }
  };

  return bonuses[playerClass]?.[stat] || 0;
}, [playerClass]);

// Skill helper functions
const getSkillBonus = (category, skillName, baseValue = 0) => {
const skill = skills[category]?.[skillName];
if (!skill) return baseValue;
return baseValue + skill.level * skill.bonus;
};

const getTotalDamage = () => {
let dmg = player.damage + (equipment.weapon?.damage || 0);
const ps = getSkillBonus('combat', 'powerStrike', 0);
return Math.floor(dmg * (1 + ps / 100));
};

// eslint-disable-next-line react-hooks/exhaustive-deps
const getTotalCritChance = useCallback(() => player.critChance + getSkillBonus('combat', 'criticalHit', 0), [player.critChance]);
// eslint-disable-next-line react-hooks/exhaustive-deps
const getTotalCritDamage = useCallback(() => player.critDamage + getSkillBonus('combat', 'deadlyBlow', 0), [player.critDamage]);
// eslint-disable-next-line react-hooks/exhaustive-deps
const getTotalDodge = useCallback(() => player.dodgeChance + getSkillBonus('defense', 'evasion', 0), [player.dodgeChance]);
// eslint-disable-next-line react-hooks/exhaustive-deps
const getTotalSpeed = useCallback(() => player.speed + getSkillBonus('utility', 'swiftness', 0), [player.speed]);

const upgradeSkill = useCallback((category, skillName) => {
const skill = skills[category]?.[skillName];

if (!skill || player.skillPoints < skill.cost || skill.level >= skill.maxLevel) {
  showMessage('Cannot upgrade skill!');
  return;
}

setPlayer(prev => ({ ...prev, skillPoints: prev.skillPoints - skill.cost }));

setSkills(prev => ({
  ...prev,
  [category]: {
    ...prev[category],
    [skillName]: {
      ...prev[category][skillName],
      level: prev[category][skillName].level + 1
    }
  }
}));

// Apply immediate stat changes
if (category === 'magic' && skillName === 'manaPool') {
  setPlayer(prev => ({
    ...prev,
    maxMana: prev.maxMana + skill.bonus,
    mana: prev.mana + skill.bonus
  }));
}
if (category === 'defense' && skillName === 'vitality') {
  setPlayer(prev => ({
    ...prev,
    maxHealth: prev.maxHealth + skill.bonus,
    health: prev.health + skill.bonus
  }));
}
if (category === 'defense' && skillName === 'ironSkin') {
  setPlayer(prev => ({ ...prev, defense: prev.defense + skill.bonus }));
}

showMessage(`${skillName} upgraded!`);
}, [skills, player.skillPoints, showMessage]);

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
version: '1.0'
};

try {
  localStorage.setItem('voxelRPG_save', JSON.stringify(saveData));
  showNotification('Game saved successfully!', 'success');
  return true;
} catch (error) {
  showNotification('Failed to save game!', 'warning');
  console.error('Save error:', error);
  return false;
}

}, [player, equipment, inventory, spells, base, dungeons, quests, inDungeon, showNotification]);

// Load game function
const loadGame = useCallback(() => {
try {
const saved = localStorage.getItem('voxelRPG_save');
if (!saved) {
showNotification('No save file found!', 'warning');
return false;
}

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
  showMessage(`Loaded save from ${saveDate.toLocaleString()}`);
  
  return true;
} catch (error) {
  showNotification('Failed to load game!', 'warning');
  console.error('Load error:', error);
  return false;
}

}, [showMessage, showNotification]);

// Check for existing save on mount
useEffect(() => {
const saved = localStorage.getItem('voxelRPG_save');
if (saved) {
try {
const data = JSON.parse(saved);
const saveDate = new Date(data.timestamp);
// eslint-disable-next-line no-console
console.log(`Found save from ${saveDate.toLocaleString()}`);
} catch (error) {
// eslint-disable-next-line no-console
console.error('Error reading save:', error);
}
}
}, []);

useEffect(() => {
const newTerrain = [];
for (let x = 0; x < MAP_WIDTH / 20; x++) {
for (let y = 0; y < MAP_HEIGHT / 20; y++) {
const noise = Math.sin(x * 0.08) * Math.cos(y * 0.08) + Math.sin(x * 0.2) * 0.3;
let type = 'grass';
if (noise > 0.6) type = 'forest';
else if (noise < -0.4) type = 'water';
else if (Math.random() > 0.97) type = 'rock';

    newTerrain.push({ x: x * 20, y: y * 20, type });
  }
}
setTerrain(newTerrain);

const newDungeons = [];
for (let i = 0; i < 5; i++) {
  newDungeons.push({
    id: i,
    x: 300 + i * 450,
    y: 300 + (i % 2) * 800,
    cleared: false,
    enemies: []
  });
}
setDungeons(newDungeons);

}, []);

const startGame = () => {
setGameState('playing');
showNotification('Your journey begins... The wound burns with power.', 'info');
};

const castSpell = useCallback((index) => {
setSpells(prev => {
const spell = prev[index];
if (!spell || !spell.unlocked || spell.cooldown > 0) return prev;

  setPlayer(p => {
    if (p.mana < spell.cost) return p;

    const angle = Math.atan2(mousePos.y - p.y, mousePos.x - p.x);
    const spellPowerBonus = getClassBonus('spellPower') || 1;

    // PROJECTILE SPELLS (Fireball, Lightning, Meteor)
    if (spell.type === 'projectile') {
      audioManager.play('fireball');
      setEquipment(eq => {
        const proj = {
          id: Math.random(),
          x: p.x,
          y: p.y,
          vx: Math.cos(angle) * 8,
          vy: Math.sin(angle) * 8,
          damage: Math.floor((spell.damage + (eq.weapon?.damage || 0)) * spellPowerBonus),
          type: spell.id,
          life: 60,
          sourceX: p.x,
          sourceY: p.y
        };
        setProjectiles(projs => [...projs, proj]);
        return eq;
      });
    }

    // SELF-HEAL
    else if (spell.id === 'heal') {
      showMessage('You feel rejuvenated!');
      createParticles(p.x, p.y, '#00ff00', 15);
      audioManager.play('heal');
      createDamageNumber(p.x, p.y, `+${spell.heal}`, 'heal');
      return { ...p, health: Math.min(p.maxHealth, p.health + spell.heal), mana: p.mana - spell.cost };
    }

    // AOE SPELLS (Frost Nova, Poison Cloud)
    else if (spell.type === 'aoe') {
      audioManager.play('explosion');
      triggerScreenShake(15);
      createParticles(p.x, p.y, spell.id === 'frostnova' ? '#00ffff' : '#00ff00', 30);

      // Create AoE effect visual
      setAoeEffects(effects => [...effects, {
        id: Math.random(),
        x: p.x,
        y: p.y,
        radius: spell.radius,
        type: spell.id,
        life: spell.duration || 60,
        damage: Math.floor(spell.damage * spellPowerBonus),
        slow: spell.slow
      }]);

      // Immediate damage to nearby enemies
      setEnemies(enemies => enemies.map(enemy => {
        const dist = Math.sqrt(Math.pow(enemy.x - p.x, 2) + Math.pow(enemy.y - p.y, 2));
        if (dist < spell.radius) {
          createDamageNumber(enemy.x, enemy.y, Math.floor(spell.damage * spellPowerBonus), 'damage');
          updateCombo();

          // Apply slow effect for Frost Nova
          if (spell.id === 'frostnova') {
            enemy.slowed = spell.slow;
            enemy.slowDuration = 120;
          }

          return { ...enemy, health: enemy.health - Math.floor(spell.damage * spellPowerBonus) };
        }
        return enemy;
      }));
    }

    // CHAIN LIGHTNING
    else if (spell.type === 'chain') {
      audioManager.play('fireball');

      // Calculate chain targets without setState in loop
      setEnemies(currentEnemies => {
        const chainTargets = [];
        const chainedIds = new Set();
        let targetPos = { x: p.x, y: p.y };

        // Find all chain targets
        for (let i = 0; i < spell.chains; i++) {
          const nearestEnemy = currentEnemies
            .filter(e => !chainedIds.has(e.id))
            // eslint-disable-next-line no-loop-func
            .reduce((nearest, enemy) => {
              const dist = Math.sqrt(Math.pow(enemy.x - targetPos.x, 2) + Math.pow(enemy.y - targetPos.y, 2));
              if (!nearest || dist < nearest.dist) {
                return { enemy, dist };
              }
              return nearest;
            }, null);

          if (nearestEnemy && nearestEnemy.dist < 200) {
            chainTargets.push(nearestEnemy.enemy);
            chainedIds.add(nearestEnemy.enemy.id);
            targetPos = { x: nearestEnemy.enemy.x, y: nearestEnemy.enemy.y };
          } else {
            break; // No more valid targets
          }
        }

        // Apply effects to all chained enemies
        chainTargets.forEach(target => {
          createParticles(target.x, target.y, '#ffff00', 10);
          createDamageNumber(target.x, target.y, Math.floor(spell.damage * spellPowerBonus), 'damage');
          updateCombo();
        });

        // Apply damage to all chained enemies at once
        return currentEnemies.map(e =>
          chainedIds.has(e.id)
            ? { ...e, health: e.health - Math.floor(spell.damage * spellPowerBonus) }
            : e
        );
      });
    }

    // BUFF SPELLS (Shield, Haste)
    else if (spell.type === 'buff') {
      applyBuff(spell.effect, spell.duration, spell.value);
      createParticles(p.x, p.y, spell.id === 'shield' ? '#4169e1' : '#ffd700', 20);
      showMessage(`${spell.name} activated!`);
    }

    // CHANNELED SPELLS (Heal Beam)
    else if (spell.type === 'channeled') {
      // Channeled spells are handled per-frame in game loop
      // Just consume mana here
    }

    return { ...p, mana: p.mana - spell.cost };
  });

  // Apply cooldown with class bonus
  const baseCooldown = 60;
  const cooldownMod = getClassBonus('cooldownReduction') || 1;
  return prev.map((s, i) => i === index ? { ...s, cooldown: Math.floor(baseCooldown * cooldownMod) } : s);
});

}, [mousePos.y, mousePos.x, showMessage, getClassBonus, createDamageNumber, triggerScreenShake, updateCombo, applyBuff]);

const createParticles = (x, y, color, count) => {
const newParticles = [];
for (let i = 0; i < count; i++) {
newParticles.push({
x, y,
vx: (Math.random() - 0.5) * 4,
vy: (Math.random() - 0.5) * 4,
life: 30,
color
});
}
setParticles(prev => [...prev, ...newParticles]);
};

const dropLoot = (x, y, isBoss = false) => {
const lootTable = isBoss ? [
{ type: 'gold', value: 50 + Math.floor(Math.random() * 50), chance: 1 },
{ type: 'essence', value: 3, chance: 1 },
{ type: 'potion', value: 2, chance: 1 },
{ type: 'weapon', value: { name: 'Legendary Blade', damage: 20 }, chance: 0.5 },
{ type: 'armor', value: { name: 'Dragon Scale Armor', defense: 15 }, chance: 0.5 }
] : [
{ type: 'gold', value: 5 + Math.floor(Math.random() * 15), chance: 1 },
{ type: 'essence', value: 1, chance: 0.3 },
{ type: 'potion', value: 1, chance: 0.15 },
{ type: 'weapon', value: { name: 'Iron Sword', damage: 5 }, chance: 0.05 },
{ type: 'armor', value: { name: 'Leather Armor', defense: 3 }, chance: 0.05 }
];

lootTable.forEach(item => {
  if (Math.random() < item.chance) {
    setLoot(prev => [...prev, {
      id: Math.random(),
      x, y,
      type: item.type,
      value: item.value,
      life: 600
    }]);
  }
});

};

const pickupLoot = useCallback((item) => {
if (item.type === 'gold') {
setInventory(prev => ({ ...prev, gold: prev.gold + item.value }));
showMessage(`+${item.value} gold`);
} else if (item.type === 'essence') {
setInventory(prev => ({ ...prev, essence: prev.essence + item.value }));
showMessage(`+${item.value} essence`);
} else if (item.type === 'potion') {
setInventory(prev => ({ ...prev, potions: prev.potions + item.value }));
showMessage(`+${item.value} potion`);
} else if (item.type === 'weapon' || item.type === 'armor') {
setInventory(prev => ({
...prev,
items: [...prev.items, { ...item.value, type: item.type, id: Math.random() }]
}));
showMessage(`Found: ${item.value.name}!`);
}
}, [showMessage]);

const equipItem = (item) => {
if (item.type === 'weapon') {
const oldWeapon = equipment.weapon;
setEquipment(prev => ({ ...prev, weapon: item }));
if (oldWeapon) {
setInventory(prev => ({ ...prev, items: [...prev.items, oldWeapon] }));
}
setInventory(prev => ({ ...prev, items: prev.items.filter(i => i.id !== item.id) }));
showMessage(`Equipped: ${item.name}`);
} else if (item.type === 'armor') {
const oldArmor = equipment.armor;
setEquipment(prev => ({ ...prev, armor: item }));
if (oldArmor) {
setInventory(prev => ({ ...prev, items: [...prev.items, oldArmor] }));
}
setInventory(prev => ({ ...prev, items: prev.items.filter(i => i.id !== item.id) }));
setPlayer(prev => ({ ...prev, defense: item.defense }));
showMessage(`Equipped: ${item.name}`);
}
};

const craftItem = useCallback((recipe) => {
// Check if player has materials
const hasMaterials = Object.entries(recipe.materials).every(([mat, amount]) => {
  return (inventory.materials[mat] || 0) >= amount;
});

if (!hasMaterials) {
  showMessage('Not enough materials!');
  return;
}

// Deduct materials
setInventory(prev => {
  const newMaterials = { ...prev.materials };
  Object.entries(recipe.materials).forEach(([mat, amount]) => {
    newMaterials[mat] -= amount;
  });

  let newInventory = { ...prev, materials: newMaterials };

  // Add crafted item
  if (recipe.type === 'consumable') {
    newInventory.potions += recipe.result.amount;
  } else {
    newInventory.items = [...prev.items, { ...recipe.result, id: Math.random() }];
  }

  return newInventory;
});

showMessage(`Crafted ${recipe.name}!`);
}, [inventory.materials, showMessage]);

const placeStructure = useCallback((worldX, worldY) => {
if (!buildMode) return;

const cost = buildMode.cost;
if (inventory.gold < cost.gold || inventory.essence < cost.essence) {
  showMessage('Not enough resources!');
  return;
}

setInventory(prev => ({
  ...prev,
  gold: prev.gold - cost.gold,
  essence: prev.essence - cost.essence
}));

setBase(prev => ({
  ...prev,
  structures: [...prev.structures, {
    type: buildMode.type,
    x: worldX,
    y: worldY,
    id: Math.random()
  }]
}));

showMessage(`${buildMode.name} built!`);

}, [buildMode, inventory.gold, inventory.essence, showMessage]);

const enterDungeon = useCallback((dungeon) => {
if (dungeon.cleared) {
showMessage('This dungeon has been cleared!');
return;
}

setInDungeon(dungeon.id);
showNotification('Entering dungeon... Press E near entrance to exit', 'warning');

const dungeonEnemies = [];
for (let i = 0; i < 10; i++) {
  dungeonEnemies.push({
    id: Math.random(),
    x: dungeon.x + 50 + Math.random() * 300,
    y: dungeon.y + 50 + Math.random() * 300,
    spawnX: dungeon.x + 50,
    spawnY: dungeon.y + 50,
    health: 80 + player.level * 15,
    maxHealth: 80 + player.level * 15,
    damage: 8 + player.level * 3,
    speed: 1.5,
    xp: 30,
    type: 'dungeon_monster',
    state: 'roaming',
    roamAngle: Math.random() * Math.PI * 2,
    aggroSource: null
  });
}

setEnemies(prev => [...prev, ...dungeonEnemies]);

}, [player.level, showMessage, showNotification]);

const exitDungeon = useCallback(() => {
setInDungeon(null);
showMessage('Exited dungeon');
}, [showMessage]);

const updateQuest = useCallback((questId, progress) => {
setQuests(prev => prev.map(q => {
if (q.id === questId && !q.complete) {
const newProgress = q.progress + progress;
if (newProgress >= q.goal) {
setInventory(inv => ({ ...inv, gold: inv.gold + q.reward }));
showNotification(`Quest Complete: ${q.title}! +${q.reward} gold`, 'success');
return { ...q, progress: newProgress, complete: true };
}
return { ...q, progress: newProgress };
}
return q;
}));
}, [showNotification]);

const gainXP = useCallback((amount) => {
setPlayer(prev => {
const newXP = prev.xp + amount;
if (newXP >= prev.xpToNext) {
const newLevel = prev.level + 1;
showNotification(`Level Up! You are now level ${newLevel}`, 'success');
audioManager.play('levelup');
triggerScreenShake(20);

    // Unlock new spells at various levels
    if (newLevel === 3) {
      setSpells(s => s.map(sp => sp.id === 'lightning' ? { ...sp, unlocked: true } : sp));
      showNotification('New spell unlocked: Lightning!', 'info');
    }
    if (newLevel === 5) {
      setSpells(s => s.map(sp => sp.id === 'heal' ? { ...sp, unlocked: true } : sp));
      showNotification('New spell unlocked: Heal!', 'info');
    }
    if (newLevel === 7) {
      setSpells(s => s.map(sp => sp.id === 'frostnova' ? { ...sp, unlocked: true } : sp));
      showNotification('New spell unlocked: Frost Nova!', 'info');
    }
    if (newLevel === 8) {
      setSpells(s => s.map(sp => sp.id === 'meteor' ? { ...sp, unlocked: true } : sp));
      showNotification('New spell unlocked: Meteor!', 'info');
    }
    if (newLevel === 10) {
      setSpells(s => s.map(sp => (sp.id === 'chainlightning' || sp.id === 'shield') ? { ...sp, unlocked: true } : sp));
      showNotification('New spells unlocked: Chain Lightning & Shield!', 'info');
    }
    if (newLevel === 12) {
      setSpells(s => s.map(sp => (sp.id === 'poisoncloud' || sp.id === 'haste') ? { ...sp, unlocked: true } : sp));
      showNotification('New spells unlocked: Poison Cloud & Haste!', 'info');
    }
    if (newLevel === 15) {
      setSpells(s => s.map(sp => sp.id === 'healbeam' ? { ...sp, unlocked: true } : sp));
      showNotification('New spell unlocked: Heal Beam!', 'info');
    }
    
    return {
      ...prev,
      level: newLevel,
      xp: newXP - prev.xpToNext,
      xpToNext: Math.floor(prev.xpToNext * 1.5),
      maxHealth: prev.maxHealth + 20,
      health: prev.maxHealth + 20,
      maxMana: prev.maxMana + 15,
      mana: prev.maxMana + 15,
      damage: prev.damage + 5,
      skillPoints: prev.skillPoints + 2
    };
  }
  return { ...prev, xp: newXP };
});

}, [showNotification, triggerScreenShake]);

useEffect(() => {
const handleKeyDown = (e) => {
setKeys(prev => ({ ...prev, [e.key.toLowerCase()]: true }));

  if (e.key === 'i' || e.key === 'I') setShowInventory(prev => !prev);
  if (e.key === 'k' || e.key === 'K') setShowSkills(prev => !prev);
  if (e.key === 'c' || e.key === 'C') setShowCrafting(prev => !prev);
  if (e.key === 'b' || e.key === 'B') {
    setShowBase(prev => !prev);
    if (!showBase) setBuildMode(null);
  }
  if (e.key === 'h' || e.key === 'H') {
    setInventory(prev => {
      if (prev.potions > 0 && player.health < player.maxHealth) {
        setPlayer(p => ({ ...p, health: Math.min(p.maxHealth, p.health + 50) }));
        showMessage('Health restored!');
        return { ...prev, potions: prev.potions - 1 };
      }
      return prev;
    });
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

}, [showBase, inDungeon, dungeons, player.x, player.y, player.health, player.maxHealth, inventory.potions, castSpell, enterDungeon, exitDungeon, showMessage]);

// Detect touch device
useEffect(() => {
setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
}, []);

// Responsive canvas sizing
useEffect(() => {
const updateCanvasSize = () => {
  const width = window.innerWidth;
  const height = window.innerHeight;

  if (isTouchDevice) {
    // Mobile: Fill entire viewport - UI elements will overlay
    const availableWidth = width;
    const availableHeight = height;

    setCanvasSize({
      width: Math.floor(availableWidth),
      height: Math.floor(availableHeight)
    });
  } else {
    // Desktop: Fill entire viewport - UI elements will overlay
    const availableWidth = width;
    const availableHeight = height;

    setCanvasSize({
      width: Math.floor(availableWidth),
      height: Math.floor(availableHeight)
    });
  }
};

updateCanvasSize();
window.addEventListener('resize', updateCanvasSize);
window.addEventListener('orientationchange', updateCanvasSize);

// Also update on visibility change (when browser chrome shows/hides)
window.addEventListener('scroll', updateCanvasSize);
document.addEventListener('visibilitychange', updateCanvasSize);

return () => {
  window.removeEventListener('resize', updateCanvasSize);
  window.removeEventListener('orientationchange', updateCanvasSize);
  window.removeEventListener('scroll', updateCanvasSize);
  document.removeEventListener('visibilitychange', updateCanvasSize);
};
}, [isTouchDevice]);

// Virtual joystick handler
useEffect(() => {
if (!joystickActive) {
  // Release all direction keys when joystick is not active
  setKeys(prev => ({
    ...prev,
    w: false,
    a: false,
    s: false,
    d: false
  }));
  return;
}

// Map joystick position to WASD keys
const deadzone = 15;
const dx = joystickPos.x;
const dy = joystickPos.y;

if (Math.abs(dx) < deadzone && Math.abs(dy) < deadzone) {
  setKeys(prev => ({
    ...prev,
    w: false,
    a: false,
    s: false,
    d: false
  }));
} else {
  setKeys(prev => ({
    ...prev,
    w: dy < -deadzone,
    s: dy > deadzone,
    a: dx < -deadzone,
    d: dx > deadzone
  }));
}
}, [joystickActive, joystickPos]);

// Right joystick handler (aiming)
useEffect(() => {
if (!joystickRightActive) {
  return;
}

// Update player facing angle based on right joystick
const deadzone = 15;
const dx = joystickRightPos.x;
const dy = joystickRightPos.y;

if (Math.abs(dx) > deadzone || Math.abs(dy) > deadzone) {
  const angle = Math.atan2(dy, dx);

  // Update player facing angle and mousePos using callbacks to avoid dependencies
  setPlayer(prev => {
    // Update mousePos based on current player position at this moment
    setMousePos({
      x: prev.x + Math.cos(angle) * 100,
      y: prev.y + Math.sin(angle) * 100
    });
    return { ...prev, facingAngle: angle };
  });
}
}, [joystickRightActive, joystickRightPos]);

useEffect(() => {
const canvas = canvasRef.current;
if (!canvas) return;

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
  if (gameState === 'playing' && !showInventory && !showBase && !showSkills && !showCrafting) {
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

}, [gameState, camera, buildMode, showBase, showInventory, showSkills, showCrafting, mousePos.x, mousePos.y, castSpell, placeStructure]);

useEffect(() => {
setCamera({
x: Math.max(0, Math.min(player.x - CANVAS_WIDTH / 2, MAP_WIDTH - CANVAS_WIDTH)),
y: Math.max(0, Math.min(player.y - CANVAS_HEIGHT / 2, MAP_HEIGHT - CANVAS_HEIGHT))
});
}, [player.x, player.y, CANVAS_WIDTH, CANVAS_HEIGHT]);

useEffect(() => {
if (gameState !== 'playing') return;

const timeMultiplier = showBase ? 0.2 : 1;

const gameLoop = () => {
  // Auto-save every 30 seconds
  autoSaveTimerRef.current += 1;
  if (autoSaveTimerRef.current > 1800) { // 30 seconds at 60fps
    autoSaveTimerRef.current = 0;
    saveGame();
  }

  // NEW ENHANCED FEATURES UPDATES

  // Update damage numbers
  setDamageNumbers(prev => prev.map(dmg => ({
    ...dmg,
    y: dmg.y - 1, // Float upward
    life: dmg.life - 1
  })).filter(dmg => dmg.life > 0));

  // Update combo counter
  setComboCounter(prev => {
    if (prev.timer > 0) {
      return { ...prev, timer: prev.timer - timeMultiplier };
    } else if (prev.count > 0) {
      return { count: 0, timer: 0 };
    }
    return prev;
  });

  // Update active buffs
  setActiveBuffs(prev => {
    const updated = prev.map(buff => ({ ...buff, duration: buff.duration - timeMultiplier })).filter(b => b.duration > 0);
    return updated;
  });

  // Apply buff effects to player
  const speedBuff = activeBuffs.find(b => b.type === 'speed');
  const defenseBuff = activeBuffs.find(b => b.type === 'defense');

  // Update AoE effects (poison clouds, etc.)
  setAoeEffects(prev => {
    const updated = prev.map(effect => {
      // Apply damage from poison cloud
      if (effect.type === 'poisoncloud' && effect.life % 30 === 0) {
        setEnemies(enemies => enemies.map(enemy => {
          const dist = Math.sqrt(Math.pow(enemy.x - effect.x, 2) + Math.pow(enemy.y - effect.y, 2));
          if (dist < effect.radius) {
            createDamageNumber(enemy.x, enemy.y, effect.damage, 'damage');
            return { ...enemy, health: enemy.health - effect.damage };
          }
          return enemy;
        }));
      }
      return { ...effect, life: effect.life - timeMultiplier };
    }).filter(e => e.life > 0);
    return updated;
  });

  // Update time of day (24-hour cycle = 1440 minutes, slowed down 10x for better gameplay)
  setTimeOfDay(prev => (prev + 0.01 * timeMultiplier) % 1440);

  // Check achievements
  checkAchievement('reach_level_10', player.level >= 10 ? 1 : 0);
  checkAchievement('collect_1000_gold', inventory.gold >= 1000 ? 1 : 0);

  // Update pet AI if exists
  if (pet) {
    setPet(prev => {
      if (!prev) return null;

      const dx = player.x - prev.x;
      const dy = player.y - prev.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Follow player if too far
      if (dist > 100) {
        return {
          ...prev,
          x: prev.x + (dx / dist) * 2 * timeMultiplier,
          y: prev.y + (dy / dist) * 2 * timeMultiplier
        };
      }

      // Wolf attacks nearby enemies
      if (prev.type === 'wolf') {
        setEnemies(enemies => enemies.map(enemy => {
          const enemyDist = Math.sqrt(Math.pow(enemy.x - prev.x, 2) + Math.pow(enemy.y - prev.y, 2));
          if (enemyDist < 40) {
            createDamageNumber(enemy.x, enemy.y, prev.damage, 'damage');
            return { ...enemy, health: enemy.health - prev.damage * 0.1 * timeMultiplier };
          }
          return enemy;
        }));
      }

      // Fairy heals player
      if (prev.type === 'fairy' && player.health < player.maxHealth && Math.random() < 0.01) {
        setPlayer(p => ({ ...p, health: Math.min(p.maxHealth, p.health + prev.healAmount) }));
        createDamageNumber(player.x, player.y, `+${prev.healAmount}`, 'heal');
      }

      return prev;
    });
  }

  setPlayer(prev => {
    let newX = prev.x;
    let newY = prev.y;

    // Apply sprint multiplier if active + speed buff
    const speedMultiplier = sprintActive ? 2 : 1;
    const buffSpeed = speedBuff ? speedBuff.value : 0;
    const effectiveSpeed = (prev.speed + buffSpeed + getClassBonus('speed')) * speedMultiplier * timeMultiplier;

    if (keys['w']) newY -= effectiveSpeed;
    if (keys['s']) newY += effectiveSpeed;
    if (keys['a']) newX -= effectiveSpeed;
    if (keys['d']) newX += effectiveSpeed;

    newX = Math.max(20, Math.min(MAP_WIDTH - 20, newX));
    newY = Math.max(20, Math.min(MAP_HEIGHT - 20, newY));

    const angle = Math.atan2(mousePos.y - prev.y, mousePos.x - prev.x);
    
    if (prev.health <= 0) {
      setGameState('gameover');
    }
    
    return { ...prev, x: newX, y: newY, facingAngle: angle, mana: Math.min(prev.maxMana, prev.mana + 0.2 * timeMultiplier) };
  });
  
  setLoot(prev => prev.filter(item => {
    const dx = player.x - item.x;
    const dy = player.y - item.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist < 30) {
      pickupLoot(item);
      return false;
    }
    return item.life-- > 0;
  }));
  
  setSpells(prev => prev.map(s => ({ ...s, cooldown: Math.max(0, s.cooldown - timeMultiplier) })));
  
  spawnTimerRef.current += timeMultiplier;
  if (spawnTimerRef.current > 300 && inDungeon === null && enemies.length < 30) {
    spawnTimerRef.current = 0;

    const spawnX = Math.random() * MAP_WIDTH;
    const spawnY = Math.random() * MAP_HEIGHT;

    const types = ['demon', 'shadow', 'beast', 'wraith', 'golem'];
    const type = types[Math.floor(Math.random() * types.length)];

    let stats = { health: 50, damage: 5, speed: 1.2, xp: 20 };
    if (type === 'wraith') stats = { health: 30, damage: 8, speed: 2, xp: 25 };
    if (type === 'golem') stats = { health: 100, damage: 10, speed: 0.8, xp: 40 };

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

    // Apply slow effect
    const slowMultiplier = enemy.slowed ? enemy.slowed : 1;
    const effectiveSpeed = enemy.speed * slowMultiplier;

    const detectionRange = enemy.state === 'hunting' ? 350 : 200;

    if (aggroSource) {
      newState = 'hunting';
      const aggroDx = aggroSource.x - enemy.x;
      const aggroDy = aggroSource.y - enemy.y;
      const aggroDist = Math.sqrt(aggroDx * aggroDx + aggroDy * aggroDy);

      if (aggroDist < 50) {
        aggroSource = null;
        newState = 'roaming';
      } else {
        newX = enemy.x + (aggroDx / aggroDist) * effectiveSpeed * 1.3 * timeMultiplier;
        newY = enemy.y + (aggroDy / aggroDist) * effectiveSpeed * 1.3 * timeMultiplier;
      }
    } else if (distToPlayer < detectionRange) {
      newState = 'chasing';
      newX = enemy.x + (dx / distToPlayer) * effectiveSpeed * timeMultiplier;
      newY = enemy.y + (dy / distToPlayer) * effectiveSpeed * timeMultiplier;
      
      if (distToPlayer < 30) {
        setPlayer(p => {
          const buffDefense = defenseBuff ? defenseBuff.value : 0;
          const totalDefense = p.defense + buffDefense + getClassBonus('defense');
          const actualDamage = Math.max(1, enemy.damage - totalDefense);
          const damageDealt = actualDamage * 0.1 * timeMultiplier;

          // Show damage number and play hit sound occasionally
          if (Math.random() < 0.1) {
            createDamageNumber(p.x, p.y, Math.floor(damageDealt), 'damage');
            audioManager.play('hit');
          }

          return { ...p, health: p.health - damageDealt };
        });
      }
    } else {
      newState = 'roaming';
      
      const distFromSpawn = Math.sqrt(
        Math.pow(enemy.x - enemy.spawnX, 2) + Math.pow(enemy.y - enemy.spawnY, 2)
      );
      
      if (distFromSpawn > 150 || Math.random() < 0.02) {
        roamAngle = Math.random() * Math.PI * 2;
      }

      newX = enemy.x + Math.cos(roamAngle) * effectiveSpeed * 0.5 * timeMultiplier;
      newY = enemy.y + Math.sin(roamAngle) * effectiveSpeed * 0.5 * timeMultiplier;
    }

    // Update slow effect duration and cleanup
    let newSlowDuration = enemy.slowDuration;
    let newSlowed = enemy.slowed;
    if (enemy.slowDuration > 0) {
      newSlowDuration = Math.max(0, enemy.slowDuration - timeMultiplier);
      if (newSlowDuration === 0) {
        newSlowed = undefined;
      }
    }

    const updatedEnemy = { ...enemy, x: newX, y: newY, state: newState, roamAngle, aggroSource };
    if (newSlowDuration !== undefined && newSlowDuration > 0) {
      updatedEnemy.slowDuration = newSlowDuration;
      updatedEnemy.slowed = newSlowed;
    } else {
      delete updatedEnemy.slowDuration;
      delete updatedEnemy.slowed;
    }

    return updatedEnemy;
  }).filter(e => e.health > 0));
  
  setBosses(prev => prev.map(boss => {
    const dx = player.x - boss.x;
    const dy = player.y - boss.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    let aggroSource = boss.aggroSource;
    let newX = boss.x;
    let newY = boss.y;
    
    if (aggroSource) {
      const aggroDx = aggroSource.x - boss.x;
      const aggroDy = aggroSource.y - boss.y;
      const aggroDist = Math.sqrt(aggroDx * aggroDx + aggroDy * aggroDy);
      
      if (aggroDist < 50) {
        aggroSource = null;
      } else {
        newX = boss.x + (aggroDx / aggroDist) * boss.speed * 1.2 * timeMultiplier;
        newY = boss.y + (aggroDy / aggroDist) * boss.speed * 1.2 * timeMultiplier;
      }
    } else if (dist < 600) {
      newX = boss.x + (dx / dist) * boss.speed * timeMultiplier;
      newY = boss.y + (dy / dist) * boss.speed * timeMultiplier;
      
      if (dist < 40) {
        setPlayer(p => {
          const buffDefense = defenseBuff ? defenseBuff.value : 0;
          const totalDefense = p.defense + buffDefense + getClassBonus('defense');
          const actualDamage = Math.max(1, boss.damage - totalDefense);
          const damageDealt = actualDamage * 0.1 * timeMultiplier;

          // Show damage number and effects
          if (Math.random() < 0.15) {
            createDamageNumber(p.x, p.y, Math.floor(damageDealt), 'damage');
            triggerScreenShake(8);
            audioManager.play('hit');
          }

          return { ...p, health: p.health - damageDealt };
        });
      }
    }
    
    return {
      ...boss,
      x: newX,
      y: newY,
      attackCooldown: Math.max(0, boss.attackCooldown - timeMultiplier),
      aggroSource
    };
  }).filter(b => b.health > 0));
  
  setProjectiles(prev => {
    const updated = prev.map(proj => ({
      ...proj,
      x: proj.x + proj.vx * timeMultiplier,
      y: proj.y + proj.vy * timeMultiplier,
      life: proj.life - timeMultiplier
    })).filter(p => p.life > 0 && p.x > 0 && p.x < MAP_WIDTH && p.y > 0 && p.y < MAP_HEIGHT);

    // Build spatial hash for efficient collision detection
    const spatialHash = spatialHashRef.current;
    spatialHash.clear();
    enemies.forEach(enemy => spatialHash.insert(enemy));
    bosses.forEach(boss => spatialHash.insert(boss));

    // Collect all collisions first (batch processing)
    const enemyHits = new Map(); // enemyId -> {damage, aggro, kill}
    const bossHits = new Map(); // bossId -> {damage, aggro, kill}

    updated.forEach(proj => {
      // Check enemy collisions
      const nearbyEnemies = spatialHash.queryRadius(proj.x, proj.y, 100);

      for (const enemy of nearbyEnemies) {
        const dx = proj.x - enemy.x;
        const dy = proj.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 25 && proj.life > 0) {
          proj.life = 0;
          createParticles(enemy.x, enemy.y, '#ff6600', 10);
          audioManager.play('hit');

          const isCrit = Math.random() * 100 < getTotalCritChance();
          const finalDamage = isCrit ? Math.floor(proj.damage * (getTotalCritDamage() / 100)) : proj.damage;
          createDamageNumber(enemy.x, enemy.y, finalDamage, isCrit ? 'crit' : 'damage');
          updateCombo();

          if (isCrit) triggerScreenShake(12);

          enemyHits.set(enemy.id, {
            damage: finalDamage,
            aggroSource: { x: proj.sourceX, y: proj.sourceY }
          });
          break;
        }
      }

      // Check boss collisions
      const nearbyBosses = spatialHash.queryRadius(proj.x, proj.y, 150);

      for (const boss of nearbyBosses) {
        const dx = proj.x - boss.x;
        const dy = proj.y - boss.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 40 && proj.life > 0) {
          proj.life = 0;
          createParticles(boss.x, boss.y, '#ff0000', 15);
          audioManager.play('hit');

          const isCrit = Math.random() * 100 < getTotalCritChance();
          const finalDamage = isCrit ? Math.floor(proj.damage * (getTotalCritDamage() / 100)) : proj.damage;
          createDamageNumber(boss.x, boss.y, finalDamage, isCrit ? 'crit' : 'damage');
          updateCombo();
          triggerScreenShake(isCrit ? 18 : 10);

          bossHits.set(boss.id, {
            damage: finalDamage,
            aggroSource: { x: proj.sourceX, y: proj.sourceY }
          });
          break;
        }
      }
    });

    // Apply all enemy hits in ONE state update
    if (enemyHits.size > 0) {
      setEnemies(enemies => enemies.map(enemy => {
        const hit = enemyHits.get(enemy.id);
        if (!hit) return enemy;

        const newHealth = enemy.health - hit.damage;
        if (newHealth <= 0) {
          gainXP(enemy.xp);
          dropLoot(enemy.x, enemy.y);
          updateQuest(1, 1);
          checkAchievement('kill_100', 1);
          audioManager.play('explosion');

          if (enemy.type === 'dungeon_monster') {
            const dungeon = dungeons.find(d => d.id === inDungeon);
            if (dungeon) {
              const remainingEnemies = enemies.filter(e =>
                e.type === 'dungeon_monster' && e.id !== enemy.id && !enemyHits.has(e.id)
              );
              if (remainingEnemies.length === 0) {
                setDungeons(d => d.map(dun =>
                  dun.id === inDungeon ? { ...dun, cleared: true } : dun
                ));
                updateQuest(2, 1);
                showNotification('Dungeon Cleared! Auto-exiting...', 'success');
                dropLoot(enemy.x, enemy.y, true);
                setTimeout(() => setInDungeon(null), 1000);
              }
            }
          }
          return null;
        }

        return { ...enemy, health: newHealth, aggroSource: hit.aggroSource };
      }).filter(Boolean));
    }

    // Apply all boss hits in ONE state update
    if (bossHits.size > 0) {
      setBosses(bosses => bosses.map(boss => {
        const hit = bossHits.get(boss.id);
        if (!hit) return boss;

        const newHealth = boss.health - hit.damage;
        if (newHealth <= 0) {
          gainXP(200);
          dropLoot(boss.x, boss.y, true);
          updateQuest(3, 1);
          showNotification('🏆 Boss defeated! Legendary loot obtained!', 'success');
          triggerScreenShake(25);
          audioManager.play('explosion');
          return null;
        }

        return { ...boss, health: newHealth, aggroSource: hit.aggroSource };
      }).filter(Boolean));
    }

    return updated;
  });
  
  setParticles(prev => {
    const updated = prev.map(p => ({
      ...p,
      x: p.x + p.vx * timeMultiplier,
      y: p.y + p.vy * timeMultiplier,
      life: p.life - timeMultiplier
    })).filter(p => p.life > 0);
    // Cap particles at 150 to prevent performance degradation
    return updated.length > 150 ? updated.slice(-150) : updated;
  });
};

let lastTime = Date.now();
const targetFrameTime = 1000 / 60; // 60 FPS = ~16.67ms per frame
let accumulator = 0;

const animate = () => {
  const currentTime = Date.now();
  const deltaTime = currentTime - lastTime;
  lastTime = currentTime;

  // Accumulate time
  accumulator += deltaTime;

  // Run game loop at fixed 60 FPS
  while (accumulator >= targetFrameTime) {
    gameLoop();
    accumulator -= targetFrameTime;
  }

  gameLoopRef.current = requestAnimationFrame(animate);
};

gameLoopRef.current = requestAnimationFrame(animate);

return () => {
  if (gameLoopRef.current) {
    cancelAnimationFrame(gameLoopRef.current);
  }
};

}, [gameState, keys, mousePos, player.x, player.y, player.level, player.defense, player.health, player.maxHealth, showBase, bosses.length, inDungeon, dungeons, gainXP, pickupLoot, updateQuest, saveGame, showNotification, sprintActive, activeBuffs, checkAchievement, createDamageNumber, getClassBonus, getTotalCritChance, getTotalCritDamage, inventory.gold, pet, triggerScreenShake, updateCombo, enemies, bosses]);

useEffect(() => {
const canvas = canvasRef.current;
if (!canvas) return;

const ctx = canvas.getContext('2d');
ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

const minX = camera.x - 20;
const maxX = camera.x + CANVAS_WIDTH + 20;
const minY = camera.y - 20;
const maxY = camera.y + CANVAS_HEIGHT + 20;

const terrainByType = { grass: [], forest: [], water: [], rock: [] };
terrain.forEach(tile => {
  if (tile.x < minX || tile.x > maxX || tile.y < minY || tile.y > maxY) return;
  terrainByType[tile.type].push(tile);
});

const drawTerrainType = (tiles, color) => {
  if (tiles.length === 0) return;
  ctx.fillStyle = color;
  tiles.forEach(tile => {
    ctx.fillRect(tile.x - camera.x, tile.y - camera.y, 20, 20);
  });
};

drawTerrainType(terrainByType.grass, '#4a7c4e');
drawTerrainType(terrainByType.forest, '#2d5a3d');
drawTerrainType(terrainByType.water, '#4a6fa5');
drawTerrainType(terrainByType.rock, '#666666');

dungeons.forEach(dungeon => {
  ctx.fillStyle = dungeon.cleared ? '#444444' : '#1a1a2e';
  ctx.fillRect(dungeon.x - camera.x, dungeon.y - camera.y, 100, 100);
  ctx.strokeStyle = dungeon.cleared ? '#666666' : '#8b00ff';
  ctx.lineWidth = 3;
  ctx.strokeRect(dungeon.x - camera.x, dungeon.y - camera.y, 100, 100);
  
  if (!dungeon.cleared && inDungeon !== dungeon.id) {
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('E to Enter', dungeon.x - camera.x + 50, dungeon.y - camera.y - 10);
  }
  
  if (inDungeon === dungeon.id) {
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('E to Exit', dungeon.x - camera.x + 50, dungeon.y - camera.y - 10);
  }
});

if (base.built) {
  ctx.fillStyle = '#8b4513';
  ctx.fillRect(base.x - camera.x - 40, base.y - camera.y - 40, 80, 80);
  ctx.strokeStyle = '#654321';
  ctx.lineWidth = 3;
  ctx.strokeRect(base.x - camera.x - 40, base.y - camera.y - 40, 80, 80);
}

base.structures.forEach(structure => {
  let color = '#8b4513';
  let size = 40;
  
  if (structure.type === 'wall') { color = '#808080'; size = 20; }
  if (structure.type === 'tower') { color = '#4a4a4a'; size = 50; }
  if (structure.type === 'crafting') { color = '#cd853f'; size = 45; }
  
  ctx.fillStyle = color;
  ctx.fillRect(structure.x - camera.x - size/2, structure.y - camera.y - size/2, size, size);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.strokeRect(structure.x - camera.x - size/2, structure.y - camera.y - size/2, size, size);
});

loot.forEach(item => {
  if (item.x < minX || item.x > maxX || item.y < minY || item.y > maxY) return;
  
  let color = '#ffd700';
  if (item.type === 'essence') color = '#8b00ff';
  if (item.type === 'potion') color = '#ff0000';
  if (item.type === 'weapon' || item.type === 'armor') color = '#00ffff';
  
  ctx.fillStyle = color;
  
  if (item.type === 'potion') {
    ctx.beginPath();
    ctx.moveTo(item.x - camera.x, item.y - camera.y - 10);
    ctx.lineTo(item.x - camera.x - 8, item.y - camera.y + 8);
    ctx.lineTo(item.x - camera.x + 8, item.y - camera.y + 8);
    ctx.closePath();
    ctx.fill();
  } else if (item.type === 'weapon' || item.type === 'armor') {
    ctx.fillRect(item.x - camera.x - 8, item.y - camera.y - 8, 16, 16);
  } else {
    ctx.beginPath();
    ctx.arc(item.x - camera.x, item.y - camera.y, 8, 0, Math.PI * 2);
    ctx.fill();
  }
});

particles.forEach(p => {
  if (p.x < minX || p.x > maxX || p.y < minY || p.y > maxY) return;
  ctx.fillStyle = p.color;
  ctx.globalAlpha = p.life / 30;
  ctx.fillRect(p.x - camera.x - 2, p.y - camera.y - 2, 4, 4);
});
ctx.globalAlpha = 1;

projectiles.forEach(proj => {
  if (proj.x < minX || proj.x > maxX || proj.y < minY || proj.y > maxY) return;
  
  let color = '#ff6600';
  if (proj.type === 'lightning') color = '#ffff00';
  if (proj.type === 'meteor') color = '#ff0000';
  
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(proj.x - camera.x, proj.y - camera.y, 6, 0, Math.PI * 2);
  ctx.fill();
});

enemies.forEach(enemy => {
  if (enemy.x < minX - 50 || enemy.x > maxX + 50 || enemy.y < minY - 50 || enemy.y > maxY + 50) return;

  const ex = enemy.x - camera.x;
  const ey = enemy.y - camera.y;

  // Animation timing (using enemy position for variation)
  const enemyAnimTime = Date.now() + enemy.id * 1000; // Offset by ID for variation
  const walkCycle = Math.floor(enemyAnimTime / 200) % 4;
  const floatBob = Math.sin(enemyAnimTime / 400) * 2;

  ctx.save();
  ctx.translate(ex, ey);

  // Draw ANIMATED enemy based on type
  if (enemy.type === 'demon') {
    // Demon: Red horned creature with stomping animation
    const stomp = walkCycle < 2 ? 1 : -1;

    ctx.fillStyle = '#cc0000';
    // Body (bounces with stomp)
    ctx.beginPath();
    ctx.ellipse(0, stomp, 12, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    // Head
    ctx.fillStyle = '#8b0000';
    ctx.beginPath();
    ctx.arc(0, -10 + stomp, 10, 0, Math.PI * 2);
    ctx.fill();
    // Horns (bob with head)
    ctx.fillStyle = '#ff4444';
    ctx.beginPath();
    ctx.moveTo(-8, -15 + stomp);
    ctx.lineTo(-10, -22 + stomp);
    ctx.lineTo(-6, -16 + stomp);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(8, -15 + stomp);
    ctx.lineTo(10, -22 + stomp);
    ctx.lineTo(6, -16 + stomp);
    ctx.fill();
    // Eyes (glowing with flicker)
    const eyeGlow = Math.random() > 0.9 ? 0.5 : 1;
    ctx.globalAlpha = eyeGlow;
    ctx.fillStyle = '#ffff00';
    ctx.fillRect(-5, -12 + stomp, 3, 3);
    ctx.fillRect(2, -12 + stomp, 3, 3);
    ctx.globalAlpha = 1;
  } else if (enemy.type === 'shadow') {
    // Shadow: Dark ghost-like creature with floating animation
    ctx.fillStyle = '#4a0080';
    // Wispy body (floats up and down)
    ctx.globalAlpha = 0.7 + Math.sin(enemyAnimTime / 300) * 0.1;
    ctx.beginPath();
    ctx.ellipse(0, floatBob, 14, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    // Trailing wisps (wave animation)
    ctx.fillStyle = '#6a00a0';
    const wispWave1 = Math.sin(enemyAnimTime / 250) * 3;
    const wispWave2 = Math.sin(enemyAnimTime / 250 + Math.PI) * 3;
    ctx.beginPath();
    ctx.ellipse(-8 + wispWave1, 8 + floatBob, 6, 10, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(8 + wispWave2, 8 + floatBob, 6, 10, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    // Eyes (glow)
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 5;
    ctx.shadowColor = '#ffffff';
    ctx.fillRect(-6, -5 + floatBob, 4, 6);
    ctx.fillRect(2, -5 + floatBob, 4, 6);
    ctx.shadowBlur = 0;
  } else if (enemy.type === 'beast') {
    // Beast: Brown animal-like creature with galloping animation
    const gallopBounce = Math.abs(Math.sin(enemyAnimTime / 150)) * 3;

    ctx.fillStyle = '#804000';
    // Body (bounces with gallop)
    ctx.fillRect(-12, -5 - gallopBounce, 24, 12);
    // Head (bobs with body)
    ctx.fillStyle = '#603000';
    ctx.fillRect(-16, -8 - gallopBounce, 12, 10);
    // Ears (twitch)
    const earTwitch = walkCycle === 0 ? 2 : 0;
    ctx.beginPath();
    ctx.moveTo(-16, -8 - gallopBounce);
    ctx.lineTo(-18, -14 - gallopBounce - earTwitch);
    ctx.lineTo(-14, -10 - gallopBounce);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-8, -8 - gallopBounce);
    ctx.lineTo(-6, -14 - gallopBounce - earTwitch);
    ctx.lineTo(-10, -10 - gallopBounce);
    ctx.fill();
    // Legs (gallop cycle)
    ctx.fillStyle = '#5a2800';
    if (walkCycle % 2 === 0) {
      ctx.fillRect(-10, 7 - gallopBounce, 4, 8);
      ctx.fillRect(-2, 7 - gallopBounce + 2, 4, 6);
      ctx.fillRect(4, 7 - gallopBounce, 4, 8);
    } else {
      ctx.fillRect(-10, 7 - gallopBounce + 2, 4, 6);
      ctx.fillRect(-2, 7 - gallopBounce, 4, 8);
      ctx.fillRect(4, 7 - gallopBounce + 2, 4, 6);
    }
    // Tail (wags)
    const tailWag = Math.sin(enemyAnimTime / 150) * 3;
    ctx.fillStyle = '#804000';
    ctx.fillRect(12, -3 - gallopBounce + tailWag, 8, 4);
  } else if (enemy.type === 'wraith') {
    // Wraith: Purple floating spectral creature with cloak flutter
    const floatHover = Math.sin(enemyAnimTime / 350) * 4;
    const cloakFlutter = Math.sin(enemyAnimTime / 200) * 2;

    ctx.fillStyle = '#9400d3';
    ctx.globalAlpha = 0.8;
    // Floating body with tattered edges (flutter animation)
    ctx.beginPath();
    ctx.moveTo(0, -18 + floatHover);
    ctx.lineTo(-10, -8 + floatHover);
    ctx.lineTo(-12 + cloakFlutter, 5 + floatHover);
    ctx.lineTo(-8 + cloakFlutter, 15 + floatHover);
    ctx.lineTo(-4, 12 + floatHover);
    ctx.lineTo(0, 18 + floatHover);
    ctx.lineTo(4, 12 + floatHover);
    ctx.lineTo(8 - cloakFlutter, 15 + floatHover);
    ctx.lineTo(12 - cloakFlutter, 5 + floatHover);
    ctx.lineTo(10, -8 + floatHover);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    // Hood
    ctx.fillStyle = '#6a008a';
    ctx.beginPath();
    ctx.arc(0, -12 + floatHover, 9, Math.PI, 0, true);
    ctx.fill();
    // Glowing eyes (pulse)
    const eyePulse = 2 + Math.sin(enemyAnimTime / 300) * 0.5;
    ctx.fillStyle = '#ff00ff';
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#ff00ff';
    ctx.beginPath();
    ctx.arc(-4, -12 + floatHover, eyePulse, 0, Math.PI * 2);
    ctx.arc(4, -12 + floatHover, eyePulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  } else if (enemy.type === 'golem') {
    // Golem: Gray rocky bulky creature with slow heavy stomp
    const heavyStomp = walkCycle < 2 ? 2 : 0;
    const shake = walkCycle < 2 ? Math.sin(enemyAnimTime / 100) * 1 : 0;

    ctx.fillStyle = '#696969';
    // Large blocky body
    ctx.fillRect(-14 + shake, -8 + heavyStomp, 28, 20);
    // Head (smaller, embedded)
    ctx.fillStyle = '#505050';
    ctx.fillRect(-10 + shake, -14 + heavyStomp, 20, 10);
    // Rock textures (shift slightly)
    ctx.fillStyle = '#808080';
    ctx.fillRect(-10 + shake, -2 + heavyStomp, 6, 6);
    ctx.fillRect(4 + shake, 2 + heavyStomp, 6, 6);
    ctx.fillRect(-6 + shake, 8 + heavyStomp, 8, 4);
    // Arms (swing)
    const armSwing = walkCycle < 2 ? -2 : 2;
    ctx.fillStyle = '#5a5a5a';
    ctx.fillRect(-18 + shake, -4 + heavyStomp + armSwing, 8, 12);
    ctx.fillRect(10 + shake, -4 + heavyStomp - armSwing, 8, 12);
    // Eyes (glowing cracks pulse)
    const eyePulse = 1 + Math.sin(enemyAnimTime / 400) * 0.3;
    ctx.fillStyle = '#ff6600';
    ctx.shadowBlur = 5;
    ctx.shadowColor = '#ff6600';
    ctx.fillRect(-7 + shake, -10 + heavyStomp, 4 * eyePulse, 4 * eyePulse);
    ctx.fillRect(3 + shake, -10 + heavyStomp, 4 * eyePulse, 4 * eyePulse);
    ctx.shadowBlur = 0;
  } else if (enemy.type === 'dungeon_monster') {
    // Dungeon Monster: Dark magenta elite creature with aggressive animation
    const aggro = Math.sin(enemyAnimTime / 150) * 2;

    ctx.fillStyle = '#8b008b';
    // Menacing body (pulses)
    const bodyPulse = 1 + Math.sin(enemyAnimTime / 300) * 0.1;
    ctx.save();
    ctx.scale(bodyPulse, bodyPulse);
    ctx.fillRect(-15, -10 + aggro, 30, 24);
    ctx.fillStyle = '#6a006a';
    ctx.beginPath();
    ctx.moveTo(-15, -10 + aggro);
    ctx.lineTo(0, -18 + aggro);
    ctx.lineTo(15, -10 + aggro);
    ctx.closePath();
    ctx.fill();
    // Spikes (wiggle)
    ctx.fillStyle = '#ff00ff';
    for (let i = -12; i <= 12; i += 8) {
      const spikeWiggle = Math.sin(enemyAnimTime / 200 + i) * 1;
      ctx.beginPath();
      ctx.moveTo(i - 3 + spikeWiggle, 14 + aggro);
      ctx.lineTo(i + spikeWiggle, 22 + aggro);
      ctx.lineTo(i + 3 + spikeWiggle, 14 + aggro);
      ctx.fill();
    }
    // Eyes (angry glow)
    ctx.fillStyle = '#ff0000';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ff0000';
    ctx.fillRect(-8, -6 + aggro, 5, 5);
    ctx.fillRect(3, -6 + aggro, 5, 5);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // Draw hunting indicator (pulsing)
  if (enemy.state === 'hunting') {
    const huntPulse = 20 + Math.sin(enemyAnimTime / 200) * 2;
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.arc(0, 0, huntPulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  ctx.restore();

  // Health bar
  ctx.fillStyle = '#ff0000';
  ctx.fillRect(ex - 15, ey - 25, 30, 4);
  ctx.fillStyle = '#00ff00';
  ctx.fillRect(ex - 15, ey - 25, 30 * (enemy.health / enemy.maxHealth), 4);
});

bosses.forEach(boss => {
  if (boss.x < minX - 60 || boss.x > maxX + 60 || boss.y < minY - 60 || boss.y > maxY + 60) return;

  const bx = boss.x - camera.x;
  const by = boss.y - camera.y;

  // Boss animation timing
  const bossAnimTime = Date.now();
  const breathe = Math.sin(bossAnimTime / 800) * 3; // Slow breathing
  const heartbeat = Math.sin(bossAnimTime / 300) * 1.5; // Heartbeat pulse
  const armSwing = Math.sin(bossAnimTime / 400) * 4; // Menacing arm movement
  const stomp = Math.floor(bossAnimTime / 500) % 2 === 0 ? 1 : -1; // Stomping

  ctx.save();
  ctx.translate(bx, by + stomp);

  // Enhanced ANIMATED Boss sprite: Massive demonic overlord
  // Main body (breathes)
  ctx.fillStyle = '#8b0000';
  ctx.save();
  const bodyScale = 1 + breathe * 0.01;
  ctx.scale(bodyScale, bodyScale);
  ctx.fillRect(-30, -25, 60, 50);
  ctx.restore();

  // Shoulders/armor plates (shift with breathing)
  ctx.fillStyle = '#660000';
  ctx.fillRect(-36, -28 + breathe * 0.3, 20, 15);
  ctx.fillRect(16, -28 + breathe * 0.3, 20, 15);

  // Head (bobs slightly)
  ctx.fillStyle = '#4a0000';
  ctx.fillRect(-20, -38 + breathe * 0.5, 40, 20);

  // Crown/horns (animated)
  ctx.fillStyle = '#ff0000';
  const hornGlow = 1 + Math.sin(bossAnimTime / 250) * 0.1;
  ctx.save();
  ctx.scale(hornGlow, hornGlow);
  // Left horn
  ctx.beginPath();
  ctx.moveTo(-18, -38 + breathe * 0.5);
  ctx.lineTo(-24, -50 + breathe * 0.5);
  ctx.lineTo(-14, -40 + breathe * 0.5);
  ctx.closePath();
  ctx.fill();
  // Right horn
  ctx.beginPath();
  ctx.moveTo(18, -38 + breathe * 0.5);
  ctx.lineTo(24, -50 + breathe * 0.5);
  ctx.lineTo(14, -40 + breathe * 0.5);
  ctx.closePath();
  ctx.fill();
  // Center horn
  ctx.beginPath();
  ctx.moveTo(-8, -38 + breathe * 0.5);
  ctx.lineTo(0, -48 + breathe * 0.5);
  ctx.lineTo(8, -38 + breathe * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Glowing eyes (intense pulsing)
  ctx.fillStyle = '#ffff00';
  ctx.shadowBlur = 15 + heartbeat;
  ctx.shadowColor = '#ffff00';
  ctx.fillRect(-14, -32 + breathe * 0.5, 8 + heartbeat * 0.5, 8 + heartbeat * 0.5);
  ctx.fillRect(6, -32 + breathe * 0.5, 8 + heartbeat * 0.5, 8 + heartbeat * 0.5);

  // Eye beams occasionally
  if (Math.sin(bossAnimTime / 1000) > 0.7) {
    ctx.strokeStyle = '#ffff00';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.moveTo(-10, -28 + breathe * 0.5);
    ctx.lineTo(-20, -10);
    ctx.moveTo(10, -28 + breathe * 0.5);
    ctx.lineTo(20, -10);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.shadowBlur = 0;

  // Arms (swing menacingly)
  ctx.fillStyle = '#8b0000';
  ctx.fillRect(-42, -15 + armSwing, 16, 30);
  ctx.fillRect(26, -15 - armSwing, 16, 30);

  // Claws (flex)
  ctx.fillStyle = '#ff4444';
  const clawFlex = Math.sin(bossAnimTime / 300) * 2;
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(-42 + i * 5, 15 + armSwing + clawFlex, 3, 10 - clawFlex);
    ctx.fillRect(26 + i * 5, 15 - armSwing + clawFlex, 3, 10 - clawFlex);
  }

  // Legs (stomp)
  ctx.fillStyle = '#660000';
  const legStomp = stomp * 2;
  ctx.fillRect(-20, 25 - legStomp, 14, 20 + legStomp);
  ctx.fillRect(6, 25 + legStomp, 14, 20 - legStomp);

  // Multiple aura layers (menacing presence)
  for (let layer = 0; layer < 3; layer++) {
    const auraRadius = 45 + layer * 10 + Math.sin(bossAnimTime / (200 + layer * 50)) * 5;
    const auraAlpha = 0.3 - layer * 0.08;
    ctx.strokeStyle = layer === 0 ? '#ff0000' : '#8b0000';
    ctx.lineWidth = 3 - layer;
    ctx.globalAlpha = auraAlpha + Math.sin(bossAnimTime / 200) * 0.2;
    ctx.beginPath();
    ctx.arc(0, 0, auraRadius, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Shadow beneath (expands with stomp)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.beginPath();
  ctx.ellipse(0, 50, 40 + Math.abs(stomp) * 5, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // Health bar (larger for boss with pulse effect)
  const healthBarPulse = 1 + Math.sin(bossAnimTime / 300) * 0.05;
  ctx.save();
  ctx.translate(bx, by - 55);
  ctx.scale(healthBarPulse, healthBarPulse);
  ctx.fillStyle = '#ff0000';
  ctx.fillRect(-30, 0, 60, 6);
  ctx.fillStyle = '#00ff00';
  ctx.fillRect(-30, 0, 60 * (boss.health / boss.maxHealth), 6);
  // Health bar border
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.strokeRect(-30, 0, 60, 6);
  ctx.restore();

  // Boss name label (animated)
  const textBob = Math.sin(bossAnimTime / 250) * 2;
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 4;
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  // Glow effect
  ctx.shadowBlur = 10;
  ctx.shadowColor = '#ff0000';
  ctx.strokeText('BOSS', bx, by - 60 + textBob);
  ctx.fillText('BOSS', bx, by - 60 + textBob);
  ctx.shadowBlur = 0;
});

// NEW ENHANCED VISUALS

// Draw AoE effects
aoeEffects.forEach(effect => {
  if (effect.x < minX - effect.radius || effect.x > maxX + effect.radius) return;
  if (effect.y < minY - effect.radius || effect.y > maxY + effect.radius) return;

  ctx.beginPath();
  ctx.arc(effect.x - camera.x - screenShake.x, effect.y - camera.y - screenShake.y, effect.radius, 0, Math.PI * 2);

  if (effect.type === 'frostnova') {
    ctx.fillStyle = `rgba(0, 255, 255, ${effect.life / 60 * 0.3})`;
    ctx.strokeStyle = `rgba(0, 255, 255, ${effect.life / 60 * 0.6})`;
  } else if (effect.type === 'poisoncloud') {
    ctx.fillStyle = `rgba(0, 255, 0, ${effect.life / 180 * 0.2})`;
    ctx.strokeStyle = `rgba(0, 200, 0, ${effect.life / 180 * 0.5})`;
  }

  ctx.lineWidth = 2;
  ctx.fill();
  ctx.stroke();
});

// Draw pet
if (pet) {
  const petColor = pet.type === 'wolf' ? '#8b4513' : '#ff69b4';
  ctx.fillStyle = petColor;
  ctx.fillRect(pet.x - camera.x - screenShake.x - 8, pet.y - camera.y - screenShake.y - 8, 16, 16);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.strokeRect(pet.x - camera.x - screenShake.x - 8, pet.y - camera.y - screenShake.y - 8, 16, 16);
}

// Draw damage numbers
damageNumbers.forEach(dmg => {
  if (dmg.x < minX || dmg.x > maxX || dmg.y < minY || dmg.y > maxY) return;

  ctx.font = dmg.type === 'crit' ? 'bold 20px Arial' : '16px Arial';
  ctx.textAlign = 'center';
  ctx.globalAlpha = dmg.life / 60;

  if (dmg.type === 'crit') {
    ctx.fillStyle = '#ff0000';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeText(dmg.value.toString(), dmg.x - camera.x - screenShake.x, dmg.y - camera.y - screenShake.y);
  } else if (dmg.type === 'heal') {
    ctx.fillStyle = '#00ff00';
  } else {
    ctx.fillStyle = '#ffffff';
  }

  ctx.fillText(dmg.value.toString(), dmg.x - camera.x - screenShake.x, dmg.y - camera.y - screenShake.y);
  ctx.globalAlpha = 1;
});

// Draw player (with screen shake) - Enhanced ANIMATED sprite based on class
ctx.save();
ctx.translate(player.x - camera.x - screenShake.x, player.y - camera.y - screenShake.y);
ctx.rotate(player.facingAngle);

// Animation frame calculation
const animTime = Date.now();
const walkFrame = Math.floor(animTime / 150) % 4; // 4-frame walk cycle
const weaponBob = Math.sin(animTime / 200) * 2; // Smooth bobbing

// Determine class colors and style
let primaryColor = '#3498db';
let secondaryColor = '#2980b9';
let accentColor = '#ffffff';

if (playerClass === 'warrior') {
  primaryColor = '#c0392b'; // Red for warrior
  secondaryColor = '#a93226';
  accentColor = '#95a5a6'; // Gray for armor
} else if (playerClass === 'mage') {
  primaryColor = '#8e44ad'; // Purple for mage
  secondaryColor = '#6c3483';
  accentColor = '#3498db'; // Blue for magic
} else if (playerClass === 'rogue') {
  primaryColor = '#16a085'; // Teal for rogue
  secondaryColor = '#138d75';
  accentColor = '#34495e'; // Dark for stealth
}

// Body bob animation (breathing)
const bodyBob = Math.sin(animTime / 600) * 1;

// Draw body (oval shape with breathing)
ctx.fillStyle = primaryColor;
ctx.beginPath();
ctx.ellipse(0, 2 + bodyBob, 10, 14, 0, 0, Math.PI * 2);
ctx.fill();

// Draw head (bobs with body)
ctx.fillStyle = '#f0c69b'; // Skin tone
ctx.beginPath();
ctx.arc(0, -10 + bodyBob, 8, 0, Math.PI * 2);
ctx.fill();

// Draw helmet/hair based on class (bobs with head)
ctx.fillStyle = secondaryColor;
if (playerClass === 'warrior') {
  // Helmet
  ctx.fillRect(-8, -18 + bodyBob, 16, 8);
  ctx.fillRect(-10, -14 + bodyBob, 20, 4);
} else if (playerClass === 'mage') {
  // Pointed hat (sways slightly)
  const hatSway = Math.sin(animTime / 400) * 1;
  ctx.beginPath();
  ctx.moveTo(-8, -12 + bodyBob);
  ctx.lineTo(hatSway, -22 + bodyBob);
  ctx.lineTo(8, -12 + bodyBob);
  ctx.closePath();
  ctx.fill();
} else if (playerClass === 'rogue') {
  // Hood
  ctx.beginPath();
  ctx.arc(0, -10 + bodyBob, 10, Math.PI, 0);
  ctx.fill();
}

// Draw weapon/tool indicator (animated)
ctx.fillStyle = accentColor;
if (playerClass === 'warrior') {
  // Sword (slashes animation)
  const swordAngle = Math.sin(animTime / 300) * 0.1;
  ctx.save();
  ctx.rotate(swordAngle);
  ctx.fillRect(10, -8 + weaponBob, 12, 4);
  ctx.fillRect(18, -10 + weaponBob, 2, 8);
  ctx.restore();
} else if (playerClass === 'mage') {
  // Staff (glowing orb pulses)
  ctx.fillRect(10, -10 + weaponBob, 2, 20);
  const orbGlow = 4 + Math.sin(animTime / 300) * 1.5;
  ctx.beginPath();
  ctx.arc(11, -12 + weaponBob, orbGlow, 0, Math.PI * 2);
  ctx.fill();
  // Glow effect
  ctx.globalAlpha = 0.3;
  ctx.beginPath();
  ctx.arc(11, -12 + weaponBob, orbGlow + 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
} else if (playerClass === 'rogue') {
  // Dagger (slight twirl)
  const daggerAngle = Math.sin(animTime / 250) * 0.15;
  ctx.save();
  ctx.rotate(daggerAngle);
  ctx.fillRect(10, -6 + weaponBob, 10, 2);
  ctx.fillRect(18, -8 + weaponBob, 2, 6);
  ctx.restore();
} else {
  // Default indicator
  ctx.fillRect(8, -4 + weaponBob, 8, 8);
}

// Draw arms (swing animation)
const armSwing = Math.sin(animTime / 200) * 1;
ctx.fillStyle = primaryColor;
ctx.fillRect(-12, 0 + armSwing, 8, 4);
ctx.fillRect(4, 0 - armSwing, 8, 4);

// Draw legs (walking animation - 4 frames)
ctx.fillStyle = secondaryColor;
if (walkFrame === 0) {
  // Neutral stance
  ctx.fillRect(-6, 12, 5, 8);
  ctx.fillRect(1, 12, 5, 8);
} else if (walkFrame === 1) {
  // Left leg forward, right leg back
  ctx.fillRect(-6, 11, 5, 9);
  ctx.fillRect(1, 13, 5, 7);
} else if (walkFrame === 2) {
  // Neutral stance (mid stride)
  ctx.fillRect(-6, 12, 5, 8);
  ctx.fillRect(1, 12, 5, 8);
} else if (walkFrame === 3) {
  // Right leg forward, left leg back
  ctx.fillRect(-6, 13, 5, 7);
  ctx.fillRect(1, 11, 5, 9);
}

ctx.restore();

// Draw day/night overlay
const hour = Math.floor(timeOfDay / 60);
let nightAlpha = 0;
if (hour >= 20 || hour < 6) {
  nightAlpha = 0.4; // Night
} else if (hour >= 18 || hour < 8) {
  nightAlpha = 0.2; // Dusk/Dawn
}

if (nightAlpha > 0) {
  ctx.fillStyle = `rgba(0, 0, 50, ${nightAlpha})`;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

}, [player, enemies, bosses, projectiles, particles, terrain, base, loot, dungeons, camera, inDungeon, CANVAS_WIDTH, CANVAS_HEIGHT, aoeEffects, pet, damageNumbers, screenShake, timeOfDay, playerClass]);

if (gameState === 'intro') {
// If showing class selection
if (playerClass === 'selecting') {
  return (
    <div className="w-full h-screen bg-gradient-to-b from-gray-900 to-purple-900 flex items-center justify-center">
      <div className="text-center text-white max-w-4xl p-8">
        <h1 className="text-5xl font-bold mb-6 text-purple-300">Choose Your Path</h1>
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div
            onClick={() => {
              setPlayerClass('warrior');
              setPlayer(p => ({ ...p, maxHealth: p.maxHealth + 50, health: p.maxHealth + 50, damage: p.damage + 10, defense: p.defense + 5 }));
              showNotification('Warrior class selected! +50 HP, +10 Damage, +5 Defense', 'success');
            }}
            className="bg-red-900 hover:bg-red-800 p-6 rounded-lg cursor-pointer border-2 border-red-600 transition-all hover:scale-105"
          >
            <Shield size={48} className="mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-2">Warrior</h3>
            <p className="text-sm">+50 HP, +10 Damage, +5 Defense</p>
            <p className="text-xs text-gray-300 mt-2">Masters of melee combat and endurance</p>
          </div>

          <div
            onClick={() => {
              setPlayerClass('mage');
              setPlayer(p => ({ ...p, maxMana: p.maxMana + 50, mana: p.maxMana + 50 }));
              showNotification('Mage class selected! +50 Mana, +30% Spell Power, -20% Cooldowns', 'success');
            }}
            className="bg-blue-900 hover:bg-blue-800 p-6 rounded-lg cursor-pointer border-2 border-blue-600 transition-all hover:scale-105"
          >
            <Sparkles size={48} className="mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-2">Mage</h3>
            <p className="text-sm">+50 Mana, +30% Spell Power</p>
            <p className="text-xs text-gray-300 mt-2">Unleashes devastating magical attacks</p>
          </div>

          <div
            onClick={() => {
              setPlayerClass('rogue');
              setPlayer(p => ({ ...p, speed: p.speed + 0.5, critChance: p.critChance + 15, dodgeChance: p.dodgeChance + 10 }));
              showNotification('Rogue class selected! +0.5 Speed, +15% Crit, +10% Dodge', 'success');
            }}
            className="bg-green-900 hover:bg-green-800 p-6 rounded-lg cursor-pointer border-2 border-green-600 transition-all hover:scale-105"
          >
            <Swords size={48} className="mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-2">Rogue</h3>
            <p className="text-sm">+Speed, +15% Crit, +10% Dodge</p>
            <p className="text-xs text-gray-300 mt-2">Swift assassin with deadly precision</p>
          </div>
        </div>
        <button
          onClick={() => setPlayerClass(null)}
          className="bg-gray-600 hover:bg-gray-700 text-white text-xl px-8 py-4 rounded-lg transition-colors"
        >
          Back to Title
        </button>
      </div>
    </div>
  );
}

// If class selected, show confirmation
if (playerClass && playerClass !== 'selecting') {
  return (
    <div className="w-full h-screen bg-gradient-to-b from-gray-900 to-purple-900 flex items-center justify-center">
      <div className="text-center text-white max-w-4xl p-8">
        <h1 className="text-5xl font-bold mb-6 text-yellow-400">Shovel Monster</h1>
        <p className="text-xl mb-4">
          Armed with nothing but your trusty shovel, venture forth into a world filled with monsters!
        </p>
        <p className="text-xl mb-4">
          Dig, fight, and survive in this epic adventure.
        </p>
        <p className="text-xl mb-6 text-green-300">Class Selected: <span className="font-bold capitalize">{playerClass}</span></p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={startGame}
            className="bg-purple-600 hover:bg-purple-700 text-white text-2xl px-12 py-4 rounded-lg transition-colors"
          >
            Begin Your Journey
          </button>
          <button
            onClick={() => setPlayerClass(null)}
            className="bg-gray-600 hover:bg-gray-700 text-white text-xl px-8 py-4 rounded-lg transition-colors"
          >
            Change Class
          </button>
        </div>
      </div>
    </div>
  );
}

// Title screen with image
return (
  <div className="w-full h-screen bg-gray-900 flex items-center justify-center overflow-hidden">
    <div className="relative w-full h-full max-w-md flex items-center justify-center">
      {/* Title screen background image */}
      <img
        src="/voxel-rpg-game/assets/splash/title-screen.png"
        alt="Shovel Monster Title Screen"
        className="absolute inset-0 w-full h-full object-contain"
      />

      {/* Version number - bottom right corner */}
      <div className="absolute bottom-2 right-2 text-white text-xs opacity-50 font-mono">
        v{packageJson.version}
      </div>

      {/* Clickable button overlays - positioned over the buttons in the image */}
      <div className="absolute inset-0 flex flex-col justify-end pb-4">
        {/* NEW GAME button overlay - positioned at ~65% down */}
        <div
          onClick={() => setPlayerClass('selecting')}
          className="relative mx-auto cursor-pointer hover:opacity-80 transition-opacity"
          style={{
            width: '60%',
            height: '8%',
            marginBottom: '1%'
          }}
          title="New Game"
        >
          {/* Invisible clickable area */}
        </div>

        {/* CONTINUE button overlay - positioned at ~74% down */}
        <div
          onClick={() => {
            if (loadGame()) {
              // Game state set to 'playing' in loadGame
            } else {
              showNotification('No saved game found', 'error');
            }
          }}
          className="relative mx-auto cursor-pointer hover:opacity-80 transition-opacity"
          style={{
            width: '60%',
            height: '8%',
            marginBottom: '1%'
          }}
          title="Continue"
        >
          {/* Invisible clickable area */}
        </div>

        {/* OPTIONS button overlay - positioned at ~83% down */}
        <div
          className="relative mx-auto cursor-not-allowed opacity-50"
          style={{
            width: '60%',
            height: '8%',
            marginBottom: '4%'
          }}
          title="Options (Coming Soon)"
        >
          {/* Invisible clickable area - disabled for now */}
        </div>
      </div>
    </div>
  </div>
);
}

if (gameState === 'gameover') {
return (
<div className="w-full h-screen bg-gradient-to-b from-gray-900 to-red-900 flex items-center justify-center">
<div className="text-center text-white max-w-2xl p-8">
<h1 className="text-5xl font-bold mb-6 text-red-300">The Darkness Prevails</h1>
<p className="text-xl mb-4">Level Reached: {player.level}</p>
<p className="text-xl mb-4">Gold Collected: {inventory.gold}</p>
<button
onClick={() => window.location.reload()}
className="bg-red-600 hover:bg-red-700 text-white text-2xl px-12 py-4 rounded-lg transition-colors"
>
Try Again
</button>
</div>
</div>
);
}

const buildingOptions = [
{ type: 'wall', name: 'Wall', cost: { gold: 20, essence: 0 }, icon: Shield },
{ type: 'tower', name: 'Tower', cost: { gold: 50, essence: 2 }, icon: Home },
{ type: 'crafting', name: 'Crafting Station', cost: { gold: 100, essence: 5 }, icon: Hammer }
];

return (
<div className="w-full h-screen bg-gray-900 flex flex-col items-center justify-center overflow-hidden" style={{ touchAction: 'none' }}>
  {/* Toast Notifications - Top Right */}
  <div className="fixed top-2 right-2 space-y-1 z-50 max-w-xs">
    {notifications.map(notif => (
      <div
        key={notif.id}
        className={`px-3 py-1.5 rounded-md shadow-xl flex items-center gap-1.5 text-xs ${
          notif.type === 'success' ? 'bg-green-600' : notif.type === 'warning' ? 'bg-orange-600' : 'bg-blue-600'
        } text-white`}
      >
        <AlertCircle size={14} />
        <span className="text-xs">{notif.msg}</span>
      </div>
    ))}
  </div>

  {/* Compact Header with Save + Stats */}
  <div className="absolute top-0 left-0 right-0 bg-gray-800 bg-opacity-90 px-2 py-1 flex items-center justify-between z-40">
    {/* Left: Save + Menu */}
    <div className="flex items-center gap-1">
      <button
        onClick={saveGame}
        className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs flex items-center gap-1"
      >
        <Save size={14} />
        <span className="hidden sm:inline">Save</span>
      </button>
      {isTouchDevice && (
        <button
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          className="bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs"
        >
          ☰
        </button>
      )}
    </div>

    {/* Center: Compact Stats */}
    <div className="flex items-center gap-2 text-white text-xs">
      <div className="flex items-center gap-1">
        <Heart size={12} className="text-red-500" />
        <div className="w-16 h-2 bg-gray-700 rounded-full">
          <div className="h-full bg-red-500 rounded-full" style={{ width: `${Math.max(0, (player.health / player.maxHealth) * 100)}%` }} />
        </div>
        <span className="text-[10px]">{Math.floor(player.health)}</span>
      </div>
      <div className="flex items-center gap-1">
        <Zap size={12} className="text-blue-500" />
        <div className="w-16 h-2 bg-gray-700 rounded-full">
          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(player.mana / player.maxMana) * 100}%` }} />
        </div>
        <span className="text-[10px]">{Math.floor(player.mana)}</span>
      </div>
    </div>

    {/* Right: Level + Gold + Class + Time */}
    <div className="flex items-center gap-2 text-white text-xs">
      <div className="flex items-center gap-0.5">
        <TrendingUp size={12} className="text-yellow-500" />
        <span className="text-[10px]">{player.level}</span>
      </div>
      <div className="flex items-center gap-0.5">
        <Package size={12} className="text-yellow-300" />
        <span className="text-[10px]">{inventory.gold}</span>
      </div>
      {playerClass && (
        <div className="flex items-center gap-0.5">
          <Swords size={12} className="text-purple-400" />
          <span className="text-[10px] capitalize">{playerClass}</span>
        </div>
      )}
      <div className="flex items-center gap-0.5">
        {Math.floor(timeOfDay / 60) >= 6 && Math.floor(timeOfDay / 60) < 18 ? (
          <Sun size={12} className="text-yellow-400" />
        ) : (
          <Moon size={12} className="text-blue-300" />
        )}
        <span className="text-[10px]">{String(Math.floor(timeOfDay / 60)).padStart(2, '0')}:{String(Math.floor(timeOfDay % 60)).padStart(2, '0')}</span>
      </div>
    </div>
  </div>

  {/* Combo Counter - Top Center */}
  {comboCounter.count > 0 && (
    <div className="fixed top-12 left-1/2 transform -translate-x-1/2 z-40">
      <div className="bg-orange-600 bg-opacity-90 px-4 py-2 rounded-lg text-white font-bold text-xl shadow-xl border-2 border-yellow-400">
        {comboCounter.count}x COMBO!
      </div>
    </div>
  )}

  {/* Active Buffs - Top Left */}
  {activeBuffs.length > 0 && (
    <div className="fixed top-12 left-2 z-40 flex flex-col gap-1">
      {activeBuffs.map(buff => (
        <div key={buff.id} className="bg-blue-600 bg-opacity-90 px-3 py-1 rounded text-white text-xs flex items-center gap-2">
          <Shield size={14} />
          <span className="capitalize">{buff.type}</span>
          <span className="text-[10px]">{Math.ceil(buff.duration / 60)}s</span>
        </div>
      ))}
    </div>
  )}

  {/* Pet Indicator - Bottom Left */}
  {pet && (
    <div className="fixed bottom-20 left-2 z-40">
      <div className="bg-purple-600 bg-opacity-90 px-3 py-2 rounded-lg text-white text-xs flex items-center gap-2">
        <Users size={14} />
        <span className="capitalize">{pet.type}</span>
        <div className="w-12 h-1 bg-gray-700 rounded-full">
          <div className="h-full bg-green-500 rounded-full" style={{ width: `${(pet.health / pet.maxHealth) * 100}%` }} />
        </div>
      </div>
    </div>
  )}
  
  {/* Game Canvas - Maximized */}
  <canvas
    ref={canvasRef}
    width={CANVAS_WIDTH}
    height={CANVAS_HEIGHT}
    className="border-2 border-purple-500 rounded"
  />

  {/* Desktop: Full menu buttons + spell hotbar */}
  {!isTouchDevice && (
    <>
      <div className="mt-2 flex gap-1.5 text-white flex-wrap justify-center max-w-full px-2">
        {spells.map((spell, i) => (
          <div
            key={spell.id}
            className={`px-2 py-1 rounded text-[10px] whitespace-nowrap ${
              spell.unlocked
                ? spell.cooldown > 0
                  ? 'bg-gray-600'
                  : 'bg-purple-600 hover:bg-purple-700 cursor-pointer'
                : 'bg-gray-800'
            }`}
            onClick={() => spell.unlocked && castSpell(i)}
          >
            <div className="font-semibold">{i + 1}. {spell.name}</div>
            <div className="text-[9px]">
              {spell.unlocked ? spell.cooldown > 0 ? `${Math.ceil(spell.cooldown / 60)}s` : `${spell.cost} mana` : 'Locked'}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2 text-white justify-center flex-wrap">
        <button onClick={() => setShowInventory(prev => !prev)} className={`px-3 py-1 rounded text-xs ${showInventory ? 'bg-purple-600' : 'bg-gray-700 hover:bg-gray-600'}`}>
          <Package size={14} className="inline mr-1" />Inventory
        </button>
        <button onClick={() => setShowSkills(prev => !prev)} className={`px-3 py-1 rounded text-xs ${showSkills ? 'bg-purple-600' : 'bg-gray-700 hover:bg-gray-600'}`}>
          <Star size={14} className="inline mr-1" />Skills
        </button>
        <button onClick={() => setShowCrafting(prev => !prev)} className={`px-3 py-1 rounded text-xs ${showCrafting ? 'bg-purple-600' : 'bg-gray-700 hover:bg-gray-600'}`}>
          <Hammer size={14} className="inline mr-1" />Crafting
        </button>
        <button onClick={() => { setShowBase(prev => !prev); if (showBase) setBuildMode(null); }} className={`px-3 py-1 rounded text-xs ${showBase ? 'bg-purple-600' : 'bg-gray-700 hover:bg-gray-600'}`}>
          <Home size={14} className="inline mr-1" />Base
        </button>
        <button onClick={() => setShowAchievements(prev => !prev)} className={`px-3 py-1 rounded text-xs ${showAchievements ? 'bg-purple-600' : 'bg-gray-700 hover:bg-gray-600'}`}>
          <Award size={14} className="inline mr-1" />Achievements
        </button>
      </div>
      <div className="mt-1 text-white text-center px-2 text-xs">
        WASD: Move | Mouse: Aim | Click/1-10: Cast Spells | H: Potion ({inventory.potions}) | E: Dungeon
      </div>
    </>
  )}

  {/* Message Display */}
  {message && (
    <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-30">
      <p className="text-yellow-300 font-bold text-sm bg-gray-900 bg-opacity-80 px-3 py-1 rounded">{message}</p>
    </div>
  )}

  {/* Mobile Menu Overlay */}
  {showMobileMenu && isTouchDevice && (
    <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center" onClick={() => setShowMobileMenu(false)}>
      <div className="bg-gray-800 rounded-lg p-4 max-w-xs w-full m-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-white font-bold">Menu</h3>
          <X className="text-white cursor-pointer" onClick={() => setShowMobileMenu(false)} size={20} />
        </div>
        <div className="space-y-2">
          <button onClick={() => { setShowInventory(true); setShowMobileMenu(false); }} className="w-full bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded flex items-center gap-2">
            <Package size={16} />Inventory
          </button>
          <button onClick={() => { setShowSkills(true); setShowMobileMenu(false); }} className="w-full bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded flex items-center gap-2">
            <Star size={16} />Skills
          </button>
          <button onClick={() => { setShowCrafting(true); setShowMobileMenu(false); }} className="w-full bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded flex items-center gap-2">
            <Hammer size={16} />Crafting
          </button>
          <button onClick={() => { setShowBase(true); setShowMobileMenu(false); setBuildMode(null); }} className="w-full bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded flex items-center gap-2">
            <Home size={16} />Base Building
          </button>
        </div>
      </div>
    </div>
  )}
  
  {showInventory && (
    <div className="absolute top-20 right-20 bg-gray-800 text-white p-6 rounded-lg border-2 border-purple-500 max-w-md max-h-96 overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Package /> Inventory
        </h3>
        <X className="cursor-pointer" onClick={() => setShowInventory(false)} />
      </div>
      <div className="space-y-2 mb-4">
        <p>💰 Gold: {inventory.gold}</p>
        <p>✨ Magic Essence: {inventory.essence}</p>
        <p>💎 Crystals: {inventory.crystals}</p>
        <p>🧪 Health Potions: {inventory.potions}</p>
      </div>
      
      {equipment.weapon && (
        <div className="mb-2 p-2 bg-gray-700 rounded">
          <p className="text-sm text-yellow-300">Equipped Weapon:</p>
          <p>{equipment.weapon.name} (+{equipment.weapon.damage} damage)</p>
        </div>
      )}
      
      {equipment.armor && (
        <div className="mb-2 p-2 bg-gray-700 rounded">
          <p className="text-sm text-yellow-300">Equipped Armor:</p>
          <p>{equipment.armor.name} (+{equipment.armor.defense} defense)</p>
        </div>
      )}
      
      {inventory.items.length > 0 && (
        <div className="mt-4">
          <h4 className="font-bold mb-2">Items:</h4>
          {inventory.items.map(item => (
            <div key={item.id} className="p-2 bg-gray-700 rounded mb-2 flex justify-between items-center">
              <div>
                <p className="text-sm">{item.name}</p>
                <p className="text-xs text-gray-400">
                  {item.damage && `+${item.damage} damage`}
                  {item.defense && `+${item.defense} defense`}
                </p>
              </div>
              <button 
                onClick={() => equipItem(item)}
                className="bg-green-600 hover:bg-green-700 px-2 py-1 rounded text-xs"
              >
                Equip
              </button>
            </div>
          ))}
        </div>
      )}
      
      <div className="mt-4 border-t border-gray-700 pt-4">
        <h4 className="font-bold mb-2">Quests:</h4>
        {quests.map(quest => (
          <div key={quest.id} className={`p-2 rounded mb-2 ${quest.complete ? 'bg-green-900' : 'bg-gray-700'}`}>
            <p className="text-sm font-bold">{quest.title}</p>
            <p className="text-xs">{quest.desc}</p>
            <p className="text-xs text-gray-400">
              {quest.progress}/{quest.goal} {quest.complete && '✓ Complete'}
            </p>
          </div>
        ))}
      </div>
    </div>
  )}
  
  {showBase && (
    <div className="absolute top-20 left-20 bg-gray-800 text-white p-6 rounded-lg border-2 border-purple-500 max-w-md">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Home /> Base Building
        </h3>
        <X className="cursor-pointer" onClick={() => { setShowBase(false); setBuildMode(null); }} />
      </div>
      
      {!base.built ? (
        <button
          onClick={() => {
            setBase({ ...base, built: true, x: player.x, y: player.y });
            showMessage('Base established!');
          }}
          className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded w-full"
        >
          Build Base Here
        </button>
      ) : (
        <div>
          <p className="mb-4 text-sm text-gray-400">
            Click on a structure below, then click on the map to place it.
          </p>
          
          <div className="space-y-2">
            {buildingOptions.map(option => {
              const Icon = option.icon;
              const canAfford = inventory.gold >= option.cost.gold && inventory.essence >= option.cost.essence;
              
              return (
                <div 
                  key={option.type}
                  className={`p-3 rounded flex justify-between items-center ${
                    buildMode?.type === option.type 
                      ? 'bg-purple-600' 
                      : canAfford 
                        ? 'bg-gray-700 hover:bg-gray-600 cursor-pointer' 
                        : 'bg-gray-900 opacity-50'
                  }`}
                  onClick={() => canAfford && setBuildMode(option)}
                >
                  <div className="flex items-center gap-2">
                    <Icon size={20} />
                    <span>{option.name}</span>
                  </div>
                  <div className="text-xs">
                    <div>{option.cost.gold}g</div>
                    {option.cost.essence > 0 && <div>{option.cost.essence}e</div>}
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="mt-4 p-3 bg-gray-700 rounded">
            <p className="text-sm font-bold mb-2">Your Base:</p>
            <p className="text-xs">Structures: {base.structures.length}</p>
          </div>
        </div>
      )}
    </div>
  )}

  {showCrafting && (
    <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white p-6 rounded-lg border-2 border-purple-500 max-w-2xl max-h-96 overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Hammer /> Crafting
        </h3>
        <X className="cursor-pointer" onClick={() => setShowCrafting(false)} />
      </div>

      <div className="mb-4">
        <h4 className="font-bold mb-2">Materials:</h4>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(inventory.materials).map(([mat, amount]) => (
            <div key={mat} className="p-2 bg-gray-700 rounded text-sm">
              {mat.charAt(0).toUpperCase() + mat.slice(1)}: {amount}
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="font-bold mb-2">Recipes:</h4>
        <div className="space-y-2">
          {recipes.map(recipe => {
            const canCraft = Object.entries(recipe.materials).every(([mat, amount]) =>
              (inventory.materials[mat] || 0) >= amount
            );

            return (
              <div key={recipe.id} className="bg-gray-700 p-3 rounded">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-bold text-sm">{recipe.name}</p>
                    <p className="text-xs text-gray-400 capitalize">{recipe.type}</p>
                    <div className="text-xs mt-1">
                      <p className="text-gray-300">Required:</p>
                      {Object.entries(recipe.materials).map(([mat, amount]) => (
                        <span key={mat} className={`inline-block mr-2 ${
                          (inventory.materials[mat] || 0) >= amount ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {mat}: {amount}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    disabled={!canCraft}
                    onClick={() => craftItem(recipe)}
                    className={`px-3 py-1 rounded text-sm ${
                      canCraft
                        ? 'bg-green-600 hover:bg-green-700 cursor-pointer'
                        : 'bg-gray-600 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    Craft
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  )}

  {showSkills && (
    <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white p-6 rounded-lg border-2 border-purple-500 max-w-4xl max-h-[80vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Star /> Skill Tree - {player.skillPoints} Points Available
        </h3>
        <X className="cursor-pointer" onClick={() => setShowSkills(false)} />
      </div>

      <div className="grid grid-cols-2 gap-6">
        {Object.entries(skills).map(([category, categorySkills]) => (
          <div key={category} className="bg-gray-700 p-4 rounded-lg">
            <h4 className="text-lg font-bold mb-3 capitalize text-purple-300">{category}</h4>
            <div className="space-y-3">
              {Object.entries(categorySkills).map(([skillName, skill]) => (
                <div key={skillName} className="bg-gray-800 p-3 rounded">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold capitalize text-sm">
                        {skillName.replace(/([A-Z])/g, ' $1').trim()}
                      </p>
                      <p className="text-xs text-gray-400">{skill.desc}</p>
                    </div>
                    <span className="text-xs bg-purple-600 px-2 py-1 rounded">
                      {skill.level}/{skill.maxLevel}
                    </span>
                  </div>
                  <button
                    onClick={() => upgradeSkill(category, skillName)}
                    disabled={player.skillPoints < skill.cost || skill.level >= skill.maxLevel}
                    className={`w-full py-2 rounded text-sm ${
                      player.skillPoints >= skill.cost && skill.level < skill.maxLevel
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-gray-600 cursor-not-allowed'
                    }`}
                  >
                    {skill.level >= skill.maxLevel ? 'Max Level' : `Upgrade (${skill.cost} SP)`}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-gray-700 rounded-lg">
        <h4 className="font-bold mb-2">Current Stats:</h4>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p>Damage: {getTotalDamage()}</p>
            <p>Crit Chance: {getTotalCritChance()}%</p>
            <p>Crit Damage: {getTotalCritDamage()}%</p>
          </div>
          <div>
            <p>Defense: {player.defense}</p>
            <p>Dodge: {getTotalDodge()}%</p>
            <p>Speed: {getTotalSpeed().toFixed(1)}</p>
          </div>
          <div>
            <p>HP: {player.maxHealth}</p>
            <p>Mana: {player.maxMana}</p>
          </div>
        </div>
      </div>
    </div>
  )}

  {showAchievements && (
    <div className="absolute top-20 right-20 bg-gray-800 text-white p-6 rounded-lg border-2 border-purple-500 max-w-lg max-h-96 overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Award /> Achievements
        </h3>
        <X className="cursor-pointer" onClick={() => setShowAchievements(false)} />
      </div>

      <div className="space-y-3">
        {achievements.map(ach => (
          <div key={ach.id} className={`p-3 rounded-lg ${ach.complete ? 'bg-green-900 border-2 border-green-500' : 'bg-gray-700'}`}>
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="font-bold text-sm">{ach.title}</p>
                <p className="text-xs text-gray-400">{ach.desc}</p>
              </div>
              {ach.complete && <span className="text-2xl">🏆</span>}
            </div>
            <div className="mb-1">
              <div className="w-full h-2 bg-gray-900 rounded-full">
                <div className="h-full bg-purple-500 rounded-full" style={{ width: `${Math.min(100, (ach.progress / ach.goal) * 100)}%` }} />
              </div>
            </div>
            <div className="flex justify-between text-xs">
              <span>{ach.progress} / {ach.goal}</span>
              <span className="text-yellow-300">Reward: {ach.reward}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )}

  {isTouchDevice && gameState === 'playing' && (
    <>
      {/* Mobile: Spell Hotbar above Right Joystick */}
      <div className="fixed bottom-20 right-2 flex flex-col gap-1 z-40">
        {spells.slice(0, 2).map((spell, i) => (
          <div
            key={spell.id}
            className={`w-12 h-12 rounded flex flex-col items-center justify-center text-white text-[8px] ${
              spell.unlocked
                ? spell.cooldown > 0
                  ? 'bg-gray-600 bg-opacity-80'
                  : 'bg-purple-600 bg-opacity-90'
                : 'bg-gray-800 bg-opacity-70'
            }`}
            onClick={() => spell.unlocked && castSpell(i)}
          >
            <div className="font-bold">{i + 1}</div>
            <div className="text-[7px]">{spell.unlocked ? spell.cooldown > 0 ? `${Math.ceil(spell.cooldown / 60)}s` : spell.name.slice(0, 4) : '🔒'}</div>
          </div>
        ))}
      </div>

      {/* Left Joystick - Movement with Sprint */}
      <div
        className="fixed bottom-2 left-2 w-16 h-16 bg-gray-800 bg-opacity-30 rounded-full border border-purple-500 flex items-center justify-center z-50 select-none"
        style={{
          touchAction: 'none',
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none',
          userSelect: 'none',
          WebkitTouchCallout: 'none',
          WebkitTapHighlightColor: 'transparent'
        }}
        onTouchStart={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const touch = e.changedTouches[0];
          setLeftJoystickTouchId(touch.identifier);
          setJoystickActive(true);
          // Detect force touch for sprint
          setSprintActive((touch.force || 0) > 0.5);
        }}
        onTouchMove={(e) => {
          e.preventDefault();
          e.stopPropagation();
          // Find the touch that belongs to this joystick
          const touch = Array.from(e.touches).find(t => t.identifier === leftJoystickTouchId);
          if (!touch) return;

          const rect = e.currentTarget.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          const dx = touch.clientX - centerX;
          const dy = touch.clientY - centerY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const maxDistance = 27;
          const clampedDistance = Math.min(distance, maxDistance);
          const angle = Math.atan2(dy, dx);
          setJoystickPos({
            x: Math.cos(angle) * clampedDistance,
            y: Math.sin(angle) * clampedDistance
          });
          // Update sprint based on force
          setSprintActive((touch.force || 0) > 0.5);
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setLeftJoystickTouchId(null);
          setJoystickActive(false);
          setJoystickPos({ x: 0, y: 0 });
          setSprintActive(false);
        }}
      >
        <div
          className={`w-8 h-8 rounded-full transition-all pointer-events-none ${
            sprintActive ? 'bg-yellow-500' : 'bg-purple-600'
          }`}
          style={{
            transform: `translate(${joystickPos.x}px, ${joystickPos.y}px)`,
            boxShadow: sprintActive ? '0 0 10px rgba(255, 255, 0, 0.8)' : 'none'
          }}
        />
      </div>

      {/* Right Joystick - Aiming with Charged Fireball */}
      <div
        className="fixed bottom-2 w-16 h-16 bg-gray-800 bg-opacity-30 rounded-full border border-orange-500 flex items-center justify-center z-50 select-none"
        style={{
          right: 'calc(env(safe-area-inset-right, 0px) + 4px)',
          touchAction: 'none',
          position: 'fixed',
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none',
          userSelect: 'none',
          WebkitTouchCallout: 'none',
          WebkitTapHighlightColor: 'transparent'
        }}
        onTouchStart={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const touch = e.changedTouches[0];
          setRightJoystickTouchId(touch.identifier);
          setJoystickRightActive(true);
          const force = touch.force || 0;
          setChargeLevel(Math.min(force * 2, 1)); // Scale force to 0-1
        }}
        onTouchMove={(e) => {
          e.preventDefault();
          e.stopPropagation();
          // Find the touch that belongs to this joystick
          const touch = Array.from(e.touches).find(t => t.identifier === rightJoystickTouchId);
          if (!touch) return;

          const rect = e.currentTarget.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          const dx = touch.clientX - centerX;
          const dy = touch.clientY - centerY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const maxDistance = 27;
          const clampedDistance = Math.min(distance, maxDistance);
          const angle = Math.atan2(dy, dx);
          setJoystickRightPos({
            x: Math.cos(angle) * clampedDistance,
            y: Math.sin(angle) * clampedDistance
          });
          // Update charge level based on force
          const force = touch.force || 0;
          setChargeLevel(Math.min(force * 2, 1));
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          e.stopPropagation();

          // Fire spell based on charge level
          if (chargeLevel > 0.5) {
            // Charged fireball
            castSpell(0);
            setTimeout(() => castSpell(0), 100); // Double cast for charged effect
          } else if (Math.abs(joystickRightPos.x) < 10 && Math.abs(joystickRightPos.y) < 10) {
            // Tap to shoot normal fireball
            castSpell(0);
          }

          setRightJoystickTouchId(null);
          setJoystickRightActive(false);
          setJoystickRightPos({ x: 0, y: 0 });
          setChargeLevel(0);
        }}
      >
        {/* Charge meter circle */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ transform: 'rotate(-90deg)' }}>
          <circle
            cx="32"
            cy="32"
            r="28"
            fill="none"
            stroke="rgba(255, 165, 0, 0.3)"
            strokeWidth="2"
          />
          <circle
            cx="32"
            cy="32"
            r="28"
            fill="none"
            stroke="rgba(255, 165, 0, 1)"
            strokeWidth="2"
            strokeDasharray={`${2 * Math.PI * 28}`}
            strokeDashoffset={`${2 * Math.PI * 28 * (1 - chargeLevel)}`}
            style={{ transition: 'stroke-dashoffset 0.1s' }}
          />
        </svg>
        <div
          className={`w-8 h-8 rounded-full transition-all pointer-events-none ${
            chargeLevel > 0.5 ? 'bg-orange-400' : 'bg-orange-600'
          }`}
          style={{
            transform: `translate(${joystickRightPos.x}px, ${joystickRightPos.y}px)`,
            boxShadow: chargeLevel > 0.5 ? '0 0 15px rgba(255, 165, 0, 0.9)' : 'none'
          }}
        />
      </div>
    </>
  )}
</div>

);
};

export default VoxelRPG;
