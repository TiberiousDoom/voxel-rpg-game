import React, { useEffect, useRef, useState, useCallback, useLayoutEffect } from 'react';
import {
  Heart,
  Zap,
  Package,
  Home,
  TrendingUp,
  X,
  Shield,
  Hammer,
  AlertCircle,
  Star,
  /* Swords, */
  Sparkles,
} from 'lucide-react';

// Lightweight polyfill for React's proposed useEvent API
// Creates a stable function whose current implementation is always fresh.
function useEvent(fn) {
  const ref = useRef(fn);
  useLayoutEffect(() => { ref.current = fn; });
  return useCallback((...args) => ref.current?.(...args), []);
}

// ===== Constants =====
const MAP_WIDTH = 2500;
const MAP_HEIGHT = 2000;
const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 600;

export default function App() {
  // ===== Refs =====
  const canvasRef = useRef(null);
  // Placeholders kept for future work (commented to satisfy CI lint):
  // const gameLoopRef = useRef(null);
  const spawnTimerRef = useRef(0);
  const bossTimerRef = useRef(0);
  // const regenTimerRef = useRef(0);

  // ===== Core State =====
  const [gameState, setGameState] = useState('intro'); // 'intro' | 'playing' | 'gameover'

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
    speed: 1.5,
    facingAngle: 0,
    defense: 0,
    critChance: 5,
    critDamage: 150,
    dodgeChance: 5,
    skillPoints: 0,
  });

  const [equipment, setEquipment] = useState({ weapon: null, armor: null, accessory: null });

  const [inventory, setInventory] = useState({
    gold: 100,
    essence: 5,
    crystals: 3,
    potions: 3,
    items: [],
    materials: { wood: 10, iron: 5, leather: 8, crystal: 2 },
  });

  const [skills, setSkills] = useState({
    combat: {
      powerStrike: { level: 0, maxLevel: 5, cost: 1, bonus: 5, desc: 'Increases damage by 5% per level' },
      criticalHit: { level: 0, maxLevel: 5, cost: 1, bonus: 3, desc: 'Increases crit chance by 3% per level' },
      deadlyBlow: { level: 0, maxLevel: 3, cost: 2, bonus: 10, desc: 'Increases crit damage by 10% per level' },
    },
    magic: {
      manaPool: { level: 0, maxLevel: 5, cost: 1, bonus: 20, desc: 'Increases max mana by 20 per level' },
      spellPower: { level: 0, maxLevel: 5, cost: 1, bonus: 10, desc: 'Increases spell damage by 10% per level' },
      fastCasting: { level: 0, maxLevel: 3, cost: 2, bonus: 15, desc: 'Reduces spell cooldowns by 15% per level' },
    },
    defense: {
      ironSkin: { level: 0, maxLevel: 5, cost: 1, bonus: 2, desc: 'Increases defense by 2 per level' },
      vitality: { level: 0, maxLevel: 5, cost: 1, bonus: 25, desc: 'Increases max health by 25 per level' },
      evasion: { level: 0, maxLevel: 5, cost: 1, bonus: 2, desc: 'Increases dodge chance by 2% per level' },
    },
    utility: {
      swiftness: { level: 0, maxLevel: 3, cost: 2, bonus: 0.2, desc: 'Increases movement speed by 0.2 per level' },
      fortune: { level: 0, maxLevel: 5, cost: 1, bonus: 15, desc: 'Increases gold/loot drops by 15% per level' },
      regeneration: { level: 0, maxLevel: 3, cost: 2, bonus: 0.5, desc: 'Regenerate 0.5 HP/sec per level' },
    },
  });

  // Placeholder: setter not used yet; keep data but silence lint.
  const [recipes /* , setRecipes */] = useState([
    { id: 'iron_sword', name: 'Iron Sword', type: 'weapon', result: { name: 'Iron Sword', damage: 8, type: 'weapon' }, materials: { iron: 5, wood: 2 } },
    { id: 'steel_sword', name: 'Steel Sword', type: 'weapon', result: { name: 'Steel Sword', damage: 15, type: 'weapon' }, materials: { iron: 10, crystal: 1 } },
    { id: 'leather_armor', name: 'Leather Armor', type: 'armor', result: { name: 'Leather Armor', defense: 5, type: 'armor' }, materials: { leather: 8 } },
    { id: 'iron_armor', name: 'Iron Armor', type: 'armor', result: { name: 'Iron Armor', defense: 10, type: 'armor' }, materials: { iron: 15, leather: 5 } },
    { id: 'health_potion', name: 'Health Potion', type: 'consumable', result: { type: 'potion', amount: 3 }, materials: { essence: 2, crystal: 1 } },
  ]);

  const [spells, setSpells] = useState([
    { id: 'fireball', name: 'Fireball', cost: 15, damage: 25, unlocked: true, cooldown: 0, maxCooldown: 60 },
    { id: 'lightning', name: 'Lightning', cost: 25, damage: 40, unlocked: false, cooldown: 0, maxCooldown: 90 },
    { id: 'heal', name: 'Heal', cost: 30, heal: 40, unlocked: false, cooldown: 0, maxCooldown: 120 },
    { id: 'meteor', name: 'Meteor', cost: 50, damage: 80, unlocked: false, cooldown: 0, maxCooldown: 180 },
  ]);

  const [base, setBase] = useState({ built: false, x: 1000, y: 1000, structures: [] });

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
  const [buildMode, setBuildMode] = useState(null); // {type, name, cost}

  const [message, setMessage] = useState('');
  const [notifications, setNotifications] = useState([]);
  // Unused placeholder for now; keep commented to pass CI.
  // const [quests, setQuests] = useState([
  //   { id: 1, title: 'First Blood', desc: 'Defeat 10 enemies', progress: 0, goal: 10, reward: 50, complete: false },
  //   { id: 2, title: 'Dungeon Delver', desc: 'Clear a dungeon', progress: 0, goal: 1, reward: 100, complete: false },
  //   { id: 3, title: 'Boss Slayer', desc: 'Defeat a boss', progress: 0, goal: 1, reward: 200, complete: false },
  // ]);

  // ===== Mirror Refs (fresh reads inside stable handlers) =====
  const keysRef = useRef(keys);
  const mousePosRef = useRef(mousePos);
  const playerRef = useRef(player);
  const enemiesRef = useRef(enemies);
  const bossesRef = useRef(bosses);
  const projectilesRef = useRef(projectiles);
  const particlesRef = useRef(particles);
  const lootRef = useRef(loot);
  const dungeonsRef = useRef(dungeons);
  const exitInProgressRef = useRef(false);
  const reentryLockRef = useRef(0);
  const spawnPauseRef = useRef(0);
  const skillsRef = useRef(skills);
  const cameraRef = useRef(camera);
  const buildModeRef = useRef(buildMode);
  const showInventoryRef = useRef(showInventory);
  const showBaseRef = useRef(showBase);
  const showSkillsRef = useRef(showSkills);
  const showCraftingRef = useRef(showCrafting);

  useEffect(() => { keysRef.current = keys; }, [keys]);
  useEffect(() => { mousePosRef.current = mousePos; }, [mousePos]);
  useEffect(() => { playerRef.current = player; }, [player]);
  useEffect(() => { enemiesRef.current = enemies; }, [enemies]);
  useEffect(() => { bossesRef.current = bosses; }, [bosses]);
  useEffect(() => { projectilesRef.current = projectiles; }, [projectiles]);
  useEffect(() => { particlesRef.current = particles; }, [particles]);
  useEffect(() => { lootRef.current = loot; }, [loot]);
  useEffect(() => { dungeonsRef.current = dungeons; }, [dungeons]);
  useEffect(() => { skillsRef.current = skills; }, [skills]);
  useEffect(() => { cameraRef.current = camera; }, [camera]);
  useEffect(() => { buildModeRef.current = buildMode; }, [buildMode]);
  useEffect(() => { showInventoryRef.current = showInventory; }, [showInventory]);
  useEffect(() => { showBaseRef.current = showBase; }, [showBase]);
  useEffect(() => { showSkillsRef.current = showSkills; }, [showSkills]);
  useEffect(() => { showCraftingRef.current = showCrafting; }, [showCrafting]);

  // ===== Utilities =====
  const showMessage = (msg) => {
    setMessage(msg);
    window.setTimeout(() => setMessage(''), 3000);
  };

  const showNotification = (msg, type = 'info') => {
    const id = Math.random();
    setNotifications((prev) => [...prev, { id, msg, type }]);
    window.setTimeout(() => setNotifications((prev) => prev.filter((n) => n.id !== id)), 4000);
  };

  const getSkillBonus = (category, skillName, baseValue = 0) => {
    const skill = skills[category]?.[skillName];
    if (!skill) return baseValue;
    return baseValue + skill.level * skill.bonus;
  };

  // Unused in this version; keep commented to pass CI.
  // const getTotalDamage = () => {
  //   let dmg = playerRef.current.damage + (equipment.weapon?.damage || 0);
  //   const ps = getSkillBonus('combat', 'powerStrike', 0);
  //   return Math.floor(dmg * (1 + ps / 100));
  // };
  const getTotalCritChance = () => playerRef.current.critChance + getSkillBonus('combat', 'criticalHit', 0);
  const getTotalCritDamage = () => playerRef.current.critDamage + getSkillBonus('combat', 'deadlyBlow', 0);
  const getTotalDodge = () => playerRef.current.dodgeChance + getSkillBonus('defense', 'evasion', 0);
  const getTotalSpeed = () => playerRef.current.speed + getSkillBonus('utility', 'swiftness', 0);

  // ===== World Init =====
  useEffect(() => {
    // terrain
    const t = [];
    for (let x = 0; x < MAP_WIDTH / 20; x++) {
      for (let y = 0; y < MAP_HEIGHT / 20; y++) {
        const noise = Math.sin(x * 0.08) * Math.cos(y * 0.08) + Math.sin(x * 0.2) * 0.3;
        let type = 'grass';
        if (noise > 0.6) type = 'forest';
        else if (noise < -0.4) type = 'water';
        else if (Math.random() > 0.97) type = 'rock';
        t.push({ x: x * 20, y: y * 20, type });
      }
    }
    setTerrain(t);

    // dungeons
    const ds = [];
    for (let i = 0; i < 5; i++) ds.push({ id: i, x: 300 + i * 450, y: 300 + (i % 2) * 800, cleared: false, enemies: [] });
    setDungeons(ds);
  }, []);

  // ===== Actions =====
  const drinkPotion = () => {
    const p = playerRef.current;
    if (inventory.potions > 0 && p.health < p.maxHealth) {
      setPlayer((pp) => ({ ...pp, health: Math.min(pp.maxHealth, pp.health + 50) }));
      setInventory((inv) => ({ ...inv, potions: inv.potions - 1 }));
      showMessage('Health restored!');
    }
  };

  // Placeholder kept commented for now to pass CI.
  // const updateQuest = (questId, progress) => { /* wired in later PR */ };

  const craftItem = (recipe) => {
    const has = Object.entries(recipe.materials).every(([m, amt]) => (inventory.materials[m] || 0) >= amt);
    if (!has) return showMessage('Not enough materials!');
    setInventory((prev) => {
      const mats = { ...prev.materials };
      Object.entries(recipe.materials).forEach(([m, amt]) => (mats[m] -= amt));
      const next = { ...prev, materials: mats };
      if (recipe.type === 'consumable') next.potions += recipe.result.amount;
      else next.items = [...prev.items, { ...recipe.result, type: recipe.type, id: Math.random() }];
      return next;
    });
    showMessage(`Crafted ${recipe.name}!`);
  };

  const createParticles = (x, y, color, count) => {
    const arr = [];
    for (let i = 0; i < count; i++) arr.push({ x, y, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4, life: 30, color });
    setParticles((prev) => [...prev, ...arr].slice(-200));
  };

  const castSpell = (index) => {
    const s = spells[index];
    const p = playerRef.current;
    if (!s || !s.unlocked || s.cooldown > 0 || p.mana < s.cost) return;
    const mp = mousePosRef.current;
    const ang = Math.atan2(mp.y - p.y, mp.x - p.x);
    if (s.id === 'heal') {
      createParticles(p.x, p.y, '#00ff00', 15);
      setPlayer((pp) => ({ ...pp, health: Math.min(pp.maxHealth, pp.health + s.heal), mana: pp.mana - s.cost }));
    } else {
      const spb = getSkillBonus('magic', 'spellPower', 0);
      const total = Math.floor(s.damage * (1 + spb / 100));
      const proj = { id: Math.random(), x: p.x, y: p.y, vx: Math.cos(ang) * 8, vy: Math.sin(ang) * 8, damage: total + (equipment.weapon?.damage || 0), type: s.id, life: 100 };
      setProjectiles((prev) => [...prev, proj]);
      setPlayer((pp) => ({ ...pp, mana: pp.mana - s.cost }));
    }
    const cdr = getSkillBonus('magic', 'fastCasting', 0);
    const cd = Math.floor(s.maxCooldown * (1 - cdr / 100));
    setSpells((prev) => prev.map((sp, i) => (i === index ? { ...sp, cooldown: cd } : sp)));
  };

  const dropLoot = (x, y, isBoss = false) => {
    const fortune = getSkillBonus('utility', 'fortune', 0);
    const luck = 1 + fortune / 100;
    const table = isBoss
      ? [
          { type: 'gold', value: Math.floor((50 + Math.random() * 50) * luck), chance: 1 },
          { type: 'essence', value: 3, chance: 1 },
          { type: 'potion', value: 2, chance: 1 },
          { type: 'material', mat: 'iron', value: 5, chance: 1 },
          { type: 'material', mat: 'crystal', value: 2, chance: 1 },
          { type: 'weapon', value: { name: 'Legendary Blade', damage: 20 }, chance: 0.5 },
          { type: 'armor', value: { name: 'Dragon Scale Armor', defense: 15 }, chance: 0.5 },
        ]
      : [
          { type: 'gold', value: Math.floor((5 + Math.random() * 15) * luck), chance: 1 },
          { type: 'essence', value: 1, chance: 0.3 },
          { type: 'potion', value: 1, chance: 0.15 },
          { type: 'material', mat: 'wood', value: 2, chance: 0.4 },
          { type: 'material', mat: 'leather', value: 1, chance: 0.3 },
          { type: 'material', mat: 'iron', value: 1, chance: 0.2 },
          { type: 'weapon', value: { name: 'Iron Sword', damage: 5 }, chance: 0.05 },
          { type: 'armor', value: { name: 'Leather Armor', defense: 3 }, chance: 0.05 },
        ];
    const drops = table.filter((it) => Math.random() < it.chance).map((it) => ({ id: Math.random(), x, y, type: it.type, value: it.value, mat: it.mat, life: 2400 }));
    setLoot((prev) => [...prev, ...drops]);
  };

  const pickupLoot = (item) => {
    if (item.type === 'gold') {
      setInventory((inv) => ({ ...inv, gold: inv.gold + item.value }));
      showMessage(`+${item.value} gold`);
    } else if (item.type === 'essence') {
      setInventory((inv) => ({ ...inv, essence: inv.essence + item.value }));
      showMessage(`+${item.value} essence`);
    } else if (item.type === 'potion') {
      setInventory((inv) => ({ ...inv, potions: inv.potions + item.value }));
      showMessage(`+${item.value} potion`);
    } else if (item.type === 'material') {
      setInventory((inv) => ({ ...inv, materials: { ...inv.materials, [item.mat]: (inv.materials[item.mat] || 0) + item.value } }));
      showMessage(`+${item.value} ${item.mat}`);
    } else if (item.type === 'weapon' || item.type === 'armor') {
      setInventory((inv) => ({ ...inv, items: [...inv.items, { ...item.value, type: item.type, id: Math.random() }] }));
      showMessage(`Found: ${item.value.name}!`);
    }
  };

  const equipItem = (item) => {
    if (item.type === 'weapon') {
      const old = equipment.weapon;
      setEquipment((e) => ({ ...e, weapon: item }));
      if (old) setInventory((inv) => ({ ...inv, items: [...inv.items, old] }));
      setInventory((inv) => ({ ...inv, items: inv.items.filter((i) => i.id !== item.id) }));
      showMessage(`Equipped: ${item.name}`);
    } else if (item.type === 'armor') {
      const old = equipment.armor;
      setEquipment((e) => ({ ...e, armor: item }));
      if (old) setInventory((inv) => ({ ...inv, items: [...inv.items, old] }));
      setInventory((inv) => ({ ...inv, items: inv.items.filter((i) => i.id !== item.id) }));
      setPlayer((p) => ({ ...p, defense: item.defense }));
      showMessage(`Equipped: ${item.name}`);
    }
  };

  const placeStructure = (worldX, worldY) => {
    const bm = buildModeRef.current;
    if (!bm) return;
    const cost = bm.cost;
    if (inventory.gold < cost.gold || inventory.essence < cost.essence) return showMessage('Not enough resources!');
    setInventory((inv) => ({ ...inv, gold: inv.gold - cost.gold, essence: inv.essence - cost.essence }));
    setBase((b) => ({ ...b, structures: [...b.structures, { type: bm.type, x: worldX, y: worldY, id: Math.random() }] }));
    showMessage(`${bm.name} built!`);
  };

  const enterDungeon = (d) => {
    if (d.cleared) return showMessage('This dungeon has been cleared!');
    setInDungeon(d.id);
    showNotification('Entering dungeon... Press E near entrance to exit', 'warning');
    const dungeonEnemies = [];
    for (let i = 0; i < 10; i++)
      dungeonEnemies.push({
        id: Math.random(),
        x: d.x + 50 + Math.random() * 300,
        y: d.y + 50 + Math.random() * 300,
        spawnX: d.x + 50,
        spawnY: d.y + 50,
        health: 80 + playerRef.current.level * 15,
        maxHealth: 80 + playerRef.current.level * 15,
        damage: 8 + playerRef.current.level * 3,
        speed: 0.75,
        xp: 30,
        type: 'dungeon_monster',
        state: 'roaming',
        roamAngle: Math.random() * Math.PI * 2,
        aggroSource: null,
      });
    setEnemies((prev) => [...prev, ...dungeonEnemies]);
  };

  const exitDungeon = () => {
    setInDungeon(null);
    showMessage('Exited dungeon');
  };

  const gainXP = (amt) => {
    setPlayer((prev) => {
      const newXP = prev.xp + amt;
      if (newXP >= prev.xpToNext) {
        const nl = prev.level + 1;
        showNotification(`Level Up! You are now level ${nl}`, 'success');
        if (nl === 3) setSpells((s) => s.map((sp) => (sp.id === 'lightning' ? { ...sp, unlocked: true } : sp)));
        if (nl === 5) setSpells((s) => s.map((sp) => (sp.id === 'heal' ? { ...sp, unlocked: true } : sp)));
        if (nl === 8) setSpells((s) => s.map((sp) => (sp.id === 'meteor' ? { ...sp, unlocked: true } : sp)));
        return {
          ...prev,
          level: nl,
          xp: newXP - prev.xpToNext,
          xpToNext: Math.floor(prev.xpToNext * 1.5),
          maxHealth: prev.maxHealth + 20,
          health: prev.maxHealth + 20,
          maxMana: prev.maxMana + 15,
          mana: prev.maxMana + 15,
          damage: prev.damage + 5,
          skillPoints: prev.skillPoints + 2,
        };
      }
      return { ...prev, xp: newXP };
    });
  };
  const upgradeSkill = (category, skillName) => {
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
  };
  // ===== Input Handlers (stable via useEvent) =====
  const onKeyDown = useEvent((e) => {
    const k = e.key;
    const lower = k.toLowerCase();
    setKeys((prev) => ({ ...prev, [lower]: true }));

    if (k === 'i' || k === 'I') {
      setShowInventory((prev) => {
        const next = !prev;
        if (next) {
          setShowSkills(false);
          setShowCrafting(false);
        }
        return next;
      });
      setShowSkills(false);
      setShowCrafting(false);
    }
    if (k === 'k' || k === 'K') {
      setShowSkills((prev) => {
        const next = !prev;
        if (next) {
          setShowInventory(false);
          setShowCrafting(false);
        }
        return next;
      });
      setShowInventory(false);
      setShowCrafting(false);
    }
    if (k === 'c' || k === 'C') {
      setShowCrafting((prev) => {
        const next = !prev;
        if (next) {
          setShowInventory(false);
          setShowSkills(false);
        }
        return next;
      });
      setShowInventory(false);
      setShowSkills(false);
    }
    if (k === 'b' || k === 'B') {
      setShowBase((prev) => {
        if (!prev) setBuildMode(null);
        return !prev;
      });
    }
    if (k === 'h' || k === 'H') drinkPotion();

    if (k === 'e' || k === 'E') {
      if (reentryLockRef.current > 0) return;
      const id = inDungeon;
      const p = playerRef.current;
      if (id !== null) {
        const d = dungeons.find((dd) => dd.id === id);
        if (d) {
          const dist = Math.hypot(p.x - d.x, p.y - d.y);
          if (dist < 150) exitDungeon();
        }
      } else {
        dungeons.forEach((d) => {
          const dist = Math.hypot(p.x - d.x, p.y - d.y);
          if (dist < 80) enterDungeon(d);
        });
      }
    }

    if (k === 'Escape') {
      setShowInventory(false);
      setShowBase(false);
      setShowSkills(false);
      setShowCrafting(false);
      setBuildMode(null);
    }

    if (k >= '1' && k <= '4') castSpell(parseInt(k, 10) - 1);
  });

  const onKeyUp = useEvent((e) => setKeys((prev) => ({ ...prev, [e.key.toLowerCase()]: false })));

  const onMouseMove = useEvent((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const cam = cameraRef.current;
    setMousePos({ x: cx + cam.x, y: cy + cam.y });
  });

  const onCanvasClick = useEvent((e) => {
    const baseOpen = showBaseRef.current;
    const invOpen = showInventoryRef.current;
    const skillsOpen = showSkillsRef.current;
    const craftOpen = showCraftingRef.current;
    if (gameState === 'playing' && !invOpen && !baseOpen && !skillsOpen && !craftOpen) castSpell(0);
    else if (baseOpen && buildModeRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const cam = cameraRef.current;
      const worldX = e.clientX - rect.left + cam.x;
      const worldY = e.clientY - rect.top + cam.y;
      placeStructure(worldX, worldY);
    }
  });

  // Subscribe once (stable via useEvent shim)
  useEffect(() => {
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    c.addEventListener('mousemove', onMouseMove);
    c.addEventListener('click', onCanvasClick);
    return () => {
      c.removeEventListener('mousemove', onMouseMove);
      c.removeEventListener('click', onCanvasClick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Camera follow
  useEffect(() => {
    setCamera({
      x: Math.max(0, Math.min(player.x - CANVAS_WIDTH / 2, MAP_WIDTH - CANVAS_WIDTH)),
      y: Math.max(0, Math.min(player.y - CANVAS_HEIGHT / 2, MAP_HEIGHT - CANVAS_HEIGHT)),
    });
  }, [player.x, player.y]);

  // ===== Main Loop (PR1: purity + single-pass updates) =====
  const tick = useEvent(() => {
    const t = showBaseRef.current ? 0.1 : 0.25; // time multiplier

    // decay the small locks every frame
    if (reentryLockRef.current > 0) reentryLockRef.current -= 1;
    if (spawnPauseRef.current > 0) spawnPauseRef.current = Math.max(0, spawnPauseRef.current - t);

    // --- player movement ---
    const totalSpeed = getTotalSpeed();
     const k = keysRef.current;
    setPlayer((prev) => {
      let newX = prev.x;
      let newY = prev.y;
      let mx = 0;
      let my = 0;
      if (k['w']) my -= 1;
      if (k['s']) my += 1;
      if (k['a']) mx -= 1;
      if (k['d']) mx += 1;
      if (mx !== 0 && my !== 0) {
        const mag = Math.hypot(mx, my);
        mx = (mx / mag) * totalSpeed;
        my = (my / mag) * totalSpeed;
      } else {
        mx *= totalSpeed;
        my *= totalSpeed;
      }
      newX = Math.max(20, Math.min(MAP_WIDTH - 20, newX + mx));
      newY = Math.max(20, Math.min(MAP_HEIGHT - 20, newY + my));
      const mp = mousePosRef.current;
      const angle = Math.atan2(mp.y - prev.y, mp.x - prev.x);
      const regen = getSkillBonus('utility', 'regeneration', 0) * t * 0.016;
      const next = {
        ...prev,
        x: newX,
        y: newY,
        facingAngle: angle,
        mana: Math.min(prev.maxMana, prev.mana + 0.2 * t),
        health: Math.min(prev.maxHealth, prev.health + regen),
      };
      if (next.health <= 0) setGameState('gameover');
      return next;
    });

    // --- compute next projectiles (pure) ---
    const nextProjectiles = projectilesRef.current
      .map((pr) => ({ ...pr, x: pr.x + pr.vx * t, y: pr.y + pr.vy * t, life: pr.life - 1 }))
      .filter((pr) => pr.life > 0);

    // --- loot lifetime & pickup (pure) ---
    setLoot((prev) => {
      const p = playerRef.current;
      const next = [];
      for (const it of prev) {
        const d = Math.hypot(p.x - it.x, p.y - it.y);
        if (d < 30) { pickupLoot(it); continue; }
        const life = it.life - 1;
        if (life > 0) next.push({ ...it, life });
      }
      return next.slice(-50);
    });

    // --- spells cooldown ---
    setSpells((prev) => prev.map((s) => ({ ...s, cooldown: Math.max(0, s.cooldown - t) })));

    // --- spawn enemies ---
    spawnTimerRef.current += t;
    if (spawnTimerRef.current > 240 && inDungeon === null && enemiesRef.current.length < 10) {
      spawnTimerRef.current = 0;
      const sx = Math.random() * MAP_WIDTH;
      const sy = Math.random() * MAP_HEIGHT;
      const types = ['demon', 'shadow', 'beast', 'wraith', 'golem'];
      const type = types[Math.floor(Math.random() * types.length)];
      let stats = { health: 50, damage: 5, speed: 0.8, xp: 20 };
      if (type === 'wraith') stats = { health: 30, damage: 8, speed: 1.2, xp: 25 };
      if (type === 'golem') stats = { health: 100, damage: 10, speed: 0.6, xp: 40 };
      setEnemies((prev) => [
        ...prev,
        {
          id: Math.random(),
          x: sx,
          y: sy,
          spawnX: sx,
          spawnY: sy,
          health: stats.health + playerRef.current.level * 10,
          maxHealth: stats.health + playerRef.current.level * 10,
          damage: stats.damage + playerRef.current.level * 2,
          speed: stats.speed,
          xp: stats.xp,
          type,
          state: 'roaming',
          roamAngle: Math.random() * Math.PI * 2,
          aggroSource: null,
        },
      ]);
    }

    // --- boss spawn (unchanged) ---
    bossTimerRef.current += t;
    if (bossTimerRef.current > 1800 && bossesRef.current.length === 0 && inDungeon === null) {
      bossTimerRef.current = 0;
      const bx = Math.random() * MAP_WIDTH;
      const by = Math.random() * MAP_HEIGHT;
      setBosses([
        {
          id: Math.random(),
          x: bx,
          y: by,
          health: 500 + playerRef.current.level * 100,
          maxHealth: 500 + playerRef.current.level * 100,
          damage: 20 + playerRef.current.level * 5,
          speed: 1.5,
          type: 'boss',
          state: 'idle',
          attackCooldown: 0,
          specialCooldown: 0,
          aggroSource: null,
        },
      ]);
      showNotification('⚠️ A powerful boss has appeared!', 'warning');
    }

    // --- enemy AI (pure transform) ---
    const aiEnemies = enemiesRef.current.map((enemy) => {
      const p = playerRef.current;
      const dx = p.x - enemy.x;
      const dy = p.y - enemy.y;
      const dist = Math.hypot(dx, dy);
      let newX = enemy.x;
      let newY = enemy.y;
      let newState = enemy.state;
      let roamAngle = enemy.roamAngle;
      let aggroSource = enemy.aggroSource;
      const detection = enemy.state === 'hunting' ? 800 : 400;
      if (aggroSource) {
        newState = 'hunting';
        const adx = aggroSource.x - enemy.x;
        const ady = aggroSource.y - enemy.y;
        const ad = Math.hypot(adx, ady);
        if (ad < 50) {
          aggroSource = null; newState = 'roaming';
        } else {
          newX += (adx / ad) * enemy.speed * 1.3 * t;
          newY += (ady / ad) * enemy.speed * 1.3 * t;
        }
      } else if (dist < detection) {
        newState = 'chasing';
        newX += (dx / dist) * enemy.speed * t;
        newY += (dy / dist) * enemy.speed * t;
        if (dist < 30) {
          const dodgeRoll = Math.random() * 100;
          if (dodgeRoll > getTotalDodge()) {
            setPlayer((p) => {
              const actual = Math.max(1, enemy.damage - p.defense);
              return { ...p, health: p.health - actual * 0.1 * t };
            });
          } else {
            createParticles(p.x, p.y, '#ffff00', 5);
          }
        }
      } else {
        newState = 'roaming';
        const ds = Math.hypot(enemy.x - enemy.spawnX, enemy.y - enemy.spawnY);
        if (ds > 150 || Math.random() < 0.02) roamAngle = Math.random() * Math.PI * 2;
        newX += Math.cos(roamAngle) * enemy.speed * 0.5 * t;
        newY += Math.sin(roamAngle) * enemy.speed * 0.5 * t;
      }
      return { ...enemy, x: newX, y: newY, state: newState, roamAngle, aggroSource };
    });

    // --- projectile/enemy collisions (pure, single pass) ---
    const collidedEnemies = [];
    for (const e of aiEnemies) {
      let health = e.health;
      let dead = false;
      for (const pr of nextProjectiles) {
        const d = Math.hypot(pr.x - e.x, pr.y - e.y);
        if (d < 20) {
          const crit = Math.random() * 100 < getTotalCritChance();
          const dmg = Math.floor(pr.damage * (crit ? getTotalCritDamage() / 100 : 1));
          health -= dmg;
          createParticles(e.x, e.y, crit ? '#ffdd00' : '#ff6600', crit ? 12 : 6);
          if (health <= 0) { dead = true; break; }
        }
      }
      if (dead) {
        gainXP(e.xp);
        dropLoot(e.x, e.y, false);
      } else {
        collidedEnemies.push({ ...e, health });
      }
    }

    // --- particles life (pure) ---
    setParticles((prev) => prev.map((pa) => ({ ...pa, x: pa.x + pa.vx, y: pa.y + pa.vy, life: pa.life - 1 })).filter((pa) => pa.life > 0));

    // --- commit results once ---
    setEnemies(collidedEnemies);
    // --- detect dungeon clear, reward, and auto-exit (one-shot guarded) ---
    if (inDungeon !== null && !exitInProgressRef.current) {
        const anyDungeonEnemy = collidedEnemies.some(e => e.type === 'dungeon_monster');
        if (!anyDungeonEnemy) {
            exitInProgressRef.current = true;

            // 1) mark cleared
            setDungeons(ds => ds.map(d => d.id === inDungeon ? { ...d, cleared: true } : d));

            // 2) reward
            setInventory(inv => ({ ...inv, gold: inv.gold + 100 }));

            // 3) teleport to the portal and exit
            const d = dungeonsRef.current?.find(dd => dd.id === inDungeon);
            if (d) {
                // (optional) auto-collect nearby dungeon loot (radius ~400 around the portal)
                const near = (L) => Math.hypot(L.x - d.x, L.y - d.y) < 400;
                lootRef.current.filter(near).forEach(pickupLoot);
                setLoot(prev => prev.filter(L => !near(L)));

                // nudge off the ring center so the player isn't stuck on the portal stroke
                setPlayer(p => ({ ...p, x: d.x + 24, y: d.y + 24 }));
            }

            setInDungeon(null);
            reentryLockRef.current = 30;     // ~0.5s @60fps
            spawnPauseRef.current = 240;     // ~4s @60fps
            showNotification('Dungeon cleared! +100 gold — exiting...', 'success');

            setTimeout(() => { exitInProgressRef.current = false; }, 500);
            // TODO: updateQuest(2, 1); // Dungeon Delver (when quests are re-enabled)
        }
    }

    setProjectiles(nextProjectiles);

    // draw
    draw();
  });

  useEffect(() => {
    if (gameState !== 'playing') return;
    let raf;
    const loop = () => {
      tick();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState]);

  // ===== Drawing =====
  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const cam = cameraRef.current;
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // background
    ctx.fillStyle = '#0b1021';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // terrain tiles (clipped to viewport for perf)
    const tiles = terrain;
    for (let i = 0; i < tiles.length; i++) {
      const t = tiles[i];
      const sx = t.x - cam.x;
      const sy = t.y - cam.y;
      if (sx < -20 || sy < -20 || sx > CANVAS_WIDTH + 20 || sy > CANVAS_HEIGHT + 20) continue;
      if (t.type === 'grass') ctx.fillStyle = '#17381a';
      else if (t.type === 'forest') ctx.fillStyle = '#0f2b13';
      else if (t.type === 'water') ctx.fillStyle = '#0c2340';
      else ctx.fillStyle = '#2b2b2b';
      ctx.fillRect(sx, sy, 20, 20);
    }

    // base structures
    base.structures.forEach((s) => {
      ctx.fillStyle = '#553311';
      ctx.fillRect(s.x - cam.x - 10, s.y - cam.y - 10, 20, 20);
    });

    // draw dungeon portals
    dungeons.forEach((d) => {
        if (inDungeon !== null && d.id !== inDungeon) return; // hide other portals while inside

        ctx.strokeStyle = d.cleared ? '#888' : '#9933ff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(d.x - cam.x, d.y - cam.y, 16, 0, Math.PI * 2);
        ctx.stroke();
    });


    // enemies
    enemies.forEach((e) => {
      ctx.fillStyle = '#9b1c1c';
      ctx.beginPath();
      ctx.arc(e.x - cam.x, e.y - cam.y, 10, 0, Math.PI * 2);
      ctx.fill();
      // hp bar
      ctx.fillStyle = '#300';
      ctx.fillRect(e.x - cam.x - 12, e.y - cam.y - 18, 24, 4);
      ctx.fillStyle = '#f33';
      ctx.fillRect(e.x - cam.x - 12, e.y - cam.y - 18, 24 * (e.health / e.maxHealth), 4);
    });

    // bosses
    bosses.forEach((b) => {
      ctx.fillStyle = '#6b21a8';
      ctx.beginPath();
      ctx.arc(b.x - cam.x, b.y - cam.y, 16, 0, Math.PI * 2);
      ctx.fill();
    });

    // projectiles
    projectiles.forEach((p) => {
      ctx.fillStyle = p.type === 'fireball' ? '#ff6600' : p.type === 'lightning' ? '#88ccff' : '#ff99ff';
      ctx.beginPath();
      ctx.arc(p.x - cam.x, p.y - cam.y, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    // particles
    particles.forEach((pa) => {
      ctx.globalAlpha = Math.max(0.1, pa.life / 30);
      ctx.fillStyle = pa.color;
      ctx.fillRect(pa.x - cam.x, pa.y - cam.y, 2, 2);
      ctx.globalAlpha = 1;
    });

    // player
    const p = playerRef.current;
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(p.x - cam.x, p.y - cam.y, 10, 0, Math.PI * 2);
    ctx.fill();

    // player facing line
    ctx.strokeStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(p.x - cam.x, p.y - cam.y);
    ctx.lineTo(p.x - cam.x + Math.cos(p.facingAngle) * 18, p.y - cam.y + Math.sin(p.facingAngle) * 18);
    ctx.stroke();

    // loot
    loot.forEach((l) => {
      ctx.fillStyle = l.type === 'gold' ? '#ffd700' : l.type === 'essence' ? '#66ffff' : l.type === 'potion' ? '#ff3366' : '#cccccc';
      ctx.fillRect(l.x - cam.x - 3, l.y - cam.y - 3, 6, 6);
    });

    // HUD bars
    drawHUD(ctx);
  };

  const drawHUD = (ctx) => {
    const p = playerRef.current;
    // Health bar
    ctx.fillStyle = '#222';
    ctx.fillRect(16, 16, 240, 16);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(16, 16, 240 * (p.health / p.maxHealth), 16);
    // Mana bar
    ctx.fillStyle = '#222';
    ctx.fillRect(16, 40, 240, 12);
    ctx.fillStyle = '#60a5fa';
    ctx.fillRect(16, 40, 240 * (p.mana / p.maxMana), 12);

    // Level and XP
    ctx.fillStyle = '#fff';
    ctx.font = '12px monospace';
    ctx.fillText(`Lvl ${p.level}  XP ${p.xp}/${p.xpToNext}`, 16, 66);

    // Quick UI hints
    ctx.fillStyle = '#bbb';
    ctx.fillText('I=Inventory  K=Skills  C=Crafting  B=Base  H=Potion  1-4=Spells  E=Enter/Exit', 16, CANVAS_HEIGHT - 12);
  };

  // ===== UI Components (inline for simplicity) =====
  const Panel = ({ title, icon: Icon, children, onClose }) => (
    <div style={styles.panel}>
      <div style={styles.panelHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {Icon && <Icon size={18} />}
          <strong>{title}</strong>
        </div>
        <button onClick={onClose} style={styles.iconBtn} aria-label="Close"><X size={16} /></button>
      </div>
      <div style={styles.panelBody}>{children}</div>
    </div>
  );

  // ===== Render =====
  return (
    <div style={styles.app}>
      {/* Top HUD / Stats strip */}
      <div style={styles.topBar}>
        <div style={styles.stat}><Heart size={16} /> {player.health}/{player.maxHealth}</div>
        <div style={styles.stat}><Zap size={16} /> {player.mana}/{player.maxMana}</div>
        <div style={styles.stat}><Shield size={16} /> DEF {player.defense}</div>
        <div style={styles.stat}><Star size={16} /> LVL {player.level}</div>
        <div style={styles.stat}><TrendingUp size={16} /> XP {player.xp}/{player.xpToNext}</div>
        <div style={{ flex: 1 }} />
        <div style={styles.stat}><Package size={16} /> {inventory.gold}g / {inventory.essence}e / {inventory.potions}p</div>
      </div>

      {/* Canvas */}
      <div style={styles.canvasWrap}>
        <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} style={styles.canvas} />

        {/* Intro overlay */}
        {gameState === 'intro' && (
          <div style={styles.overlay}>
            <h1 style={{ margin: 0 }}>Voxel RPG</h1>
            <p>The wound burns with power. Press Start to begin.</p>
            <button style={styles.primaryBtn} onClick={() => { setGameState('playing'); showNotification('Your journey begins...', 'info'); }}>Start</button>
          </div>
        )}
        {/* Game Over overlay */}
        {gameState === 'gameover' && (
          <div style={styles.overlay}>
            <h1 style={{ margin: 0 }}>You Died</h1>
            <button style={styles.primaryBtn} onClick={() => window.location.reload()}>Restart</button>
          </div>
        )}
      </div>

      {/* Bottom actions */}
      <div style={styles.bottomBar}>
        <button style={styles.btn} onClick={() => setShowInventory((v) => !v)}><Package size={16} /> Inventory</button>
        <button style={styles.btn} onClick={() => setShowBase((v) => !v)}><Home size={16} /> Base</button>
        <button style={styles.btn} onClick={() => setShowSkills((v) => !v)}><TrendingUp size={16} /> Skills</button>
        <button style={styles.btn} onClick={() => setShowCrafting((v) => !v)}><Hammer size={16} /> Crafting</button>
        <div style={{ flex: 1 }} />
        <button style={styles.btn} onClick={() => castSpell(0)}><Sparkles size={16} /> Cast</button>
      </div>

      {/* Panels */}
      {showInventory && (
        <Panel title="Inventory" icon={Package} onClose={() => setShowInventory(false)}>
          <div style={styles.sectionTitle}>Items</div>
          <div style={styles.rowWrap}>
            {inventory.items.length === 0 && <div style={{ opacity: 0.7 }}>Empty</div>}
            {inventory.items.map((it) => (
              <button key={it.id} style={styles.itemBtn} onClick={() => equipItem(it)}>
                {it.type === 'weapon' ? '⚔️' : '🛡️'} {it.name} {it.damage ? `(DMG ${it.damage})` : it.defense ? `(DEF ${it.defense})` : ''}
              </button>
            ))}
          </div>
          <div style={styles.sectionTitle}>Materials</div>
          <div style={styles.rowWrap}>
            {Object.entries(inventory.materials).map(([k, v]) => (
              <div key={k} style={styles.pill}>{k}: {v}</div>
            ))}
          </div>
        </Panel>
      )}

      {showSkills && (
        <Panel title="Skills" icon={TrendingUp} onClose={() => setShowSkills(false)}>
          <div style={styles.rowWrap}>
            {Object.entries(skills).map(([cat, list]) => (
              <div key={cat} style={{ minWidth: 240 }}>
                <div style={styles.sectionTitle}>{cat.toUpperCase()}</div>
                {Object.entries(list).map(([name, s]) => (
                  <div key={name} style={styles.skillRow}>
                    <div>
                      <strong>{name}</strong>
                      <div style={{ fontSize: 12, opacity: 0.8 }}>{s.desc}</div>
                    </div>
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={styles.pill}>Lv {s.level}/{s.maxLevel}</div>
                      <button
                        disabled={player.skillPoints < s.cost || s.level >= s.maxLevel}
                        style={styles.smallBtn}
                        onClick={() => upgradeSkill(cat, name)}
                      >+{s.cost}</button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 8, opacity: 0.8 }}>Skill Points: {player.skillPoints}</div>
        </Panel>
      )}

      {showCrafting && (
        <Panel title="Crafting" icon={Hammer} onClose={() => setShowCrafting(false)}>
          <div style={styles.col}>
            {recipes.map((r) => (
              <div key={r.id} style={styles.skillRow}>
                <div>
                  <strong>{r.name}</strong> <span style={{ opacity: 0.8 }}>({r.type})</span>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>Materials: {Object.entries(r.materials).map(([m, a]) => `${m}:${a}`).join(', ')}</div>
                </div>
                <button style={styles.smallBtn} onClick={() => craftItem(r)}>Craft</button>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {showBase && (
        <Panel title="Base" icon={Home} onClose={() => setShowBase(false)}>
          {!base.built ? (
            <button
              style={styles.primaryBtn}
              onClick={() => {
                setBase((b) => ({ ...b, built: true }));
                showMessage('Base established!');
              }}
            >Establish Base</button>
          ) : (
            <div style={styles.col}>
              <div style={styles.sectionTitle}>Build Structures</div>
              <div style={styles.rowWrap}>
                {[
                  { type: 'turret', name: 'Turret', cost: { gold: 25, essence: 1 } },
                  { type: 'forge', name: 'Forge', cost: { gold: 40, essence: 2 } },
                  { type: 'altar', name: 'Altar', cost: { gold: 30, essence: 3 } },
                ].map((b) => (
                  <button
                    key={b.type}
                    style={buildMode?.type === b.type ? styles.itemBtnActive : styles.itemBtn}
                    onClick={() => setBuildMode(b)}
                  >{b.name} — {b.cost.gold}g/{b.cost.essence}e</button>
                ))}
              </div>
            </div>
          )}
        </Panel>
      )}

      {/* Notifications */}
      <div style={styles.toasts}>
        {notifications.map((n) => (
          <div key={n.id} style={{ ...styles.toast, ...(n.type === 'success' ? styles.toastSuccess : n.type === 'warning' ? styles.toastWarn : {}) }}>
            {n.type === 'warning' && <AlertCircle size={14} style={{ marginRight: 6 }} />}
            {n.msg}
          </div>
        ))}
      </div>

      {/* Message bubble */}
      {message && <div style={styles.message}>{message}</div>}
    </div>
  );
}


// ===== Styles =====
const styles = {
  app: { fontFamily: 'system-ui, Segoe UI, Roboto, sans-serif', color: '#e5e7eb', background: '#0b1021', minHeight: '100vh', display: 'flex', flexDirection: 'column' },
  topBar: { display: 'flex', alignItems: 'center', gap: 16, padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.25)', position: 'sticky', top: 0, zIndex: 5 },
  stat: { display: 'inline-flex', alignItems: 'center', gap: 6, opacity: 0.95 },
  canvasWrap: { position: 'relative', alignSelf: 'center', marginTop: 12, boxShadow: '0 6px 24px rgba(0,0,0,0.35)', borderRadius: 12, overflow: 'hidden' },
  canvas: { display: 'block', background: '#070b16', border: '1px solid rgba(255,255,255,0.08)' },
  bottomBar: { display: 'flex', alignItems: 'center', gap: 8, padding: 12 },
  btn: { display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.08)', color: '#e5e7eb', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' },
  primaryBtn: { background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, padding: '10px 14px', cursor: 'pointer', boxShadow: '0 4px 14px rgba(37,99,235,0.35)' },
  smallBtn: { background: 'rgba(255,255,255,0.12)', color: 'white', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 6, padding: '6px 10px', cursor: 'pointer' },
  panel: { position: 'fixed', right: 16, top: 76, width: 420, maxHeight: '70vh', overflow: 'auto', background: 'rgba(17,24,39,0.92)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, boxShadow: '0 12px 28px rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)', zIndex: 10 },
  panelHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)' },
  panelBody: { padding: 12 },
  iconBtn: { background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' },
  overlay: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, background: 'rgba(0,0,0,0.55)' },
  rowWrap: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  col: { display: 'flex', flexDirection: 'column', gap: 8 },
  itemBtn: { background: 'rgba(255,255,255,0.06)', color: 'inherit', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '8px 10px', cursor: 'pointer' },
  itemBtnActive: { background: 'rgba(37,99,235,0.2)', color: 'inherit', border: '1px solid rgba(37,99,235,0.45)', borderRadius: 8, padding: '8px 10px', cursor: 'pointer' },
  sectionTitle: { fontWeight: 700, opacity: 0.9, margin: '4px 0' },
  skillRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '8px 6px', borderBottom: '1px dashed rgba(255,255,255,0.08)' },
  pill: { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 999, padding: '2px 8px', fontSize: 12 },
  toasts: { position: 'fixed', left: 16, bottom: 16, display: 'flex', flexDirection: 'column', gap: 8 },
  toast: { background: 'rgba(31,41,55,0.92)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '8px 12px' },
  toastSuccess: { borderColor: 'rgba(16,185,129,0.6)' },
  toastWarn: { borderColor: 'rgba(234,179,8,0.6)' },
  message: { position: 'fixed', top: 76, left: '50%', transform: 'translateX(-50%)', background: 'rgba(17,24,39,0.92)', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)' },
};
