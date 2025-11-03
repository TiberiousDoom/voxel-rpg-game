import React, { useState, useEffect, useRef } from 'react';
import { Heart, Zap, Package, Home, TrendingUp, X, Shield, Hammer, AlertCircle, Star, Sparkles } from 'lucide-react';

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
    speed: 1.5,
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
    accessory: null
  });
  
  const [inventory, setInventory] = useState({
    gold: 100,
    essence: 5,
    crystals: 3,
    potions: 3,
    items: [],
    materials: {
      wood: 10,
      iron: 5,
      leather: 8,
      crystal: 2
    }
  });
  
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
  
  const recipes = [
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
  ];
  
  const [spells, setSpells] = useState([
    { id: 'fireball', name: 'Fireball', cost: 15, damage: 25, unlocked: true, cooldown: 0, maxCooldown: 60 },
    { id: 'lightning', name: 'Lightning', cost: 25, damage: 40, unlocked: false, cooldown: 0, maxCooldown: 90 },
    { id: 'heal', name: 'Heal', cost: 30, heal: 40, unlocked: false, cooldown: 0, maxCooldown: 120 },
    { id: 'meteor', name: 'Meteor', cost: 50, damage: 80, unlocked: false, cooldown: 0, maxCooldown: 180 }
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
  const [quests, setQuests] = useState([
    { id: 1, title: 'First Blood', desc: 'Defeat 10 enemies', progress: 0, goal: 10, reward: 50, complete: false },
    { id: 2, title: 'Dungeon Delver', desc: 'Clear a dungeon', progress: 0, goal: 1, reward: 100, complete: false },
    { id: 3, title: 'Boss Slayer', desc: 'Defeat a boss', progress: 0, goal: 1, reward: 200, complete: false }
  ]);
  
  const spawnTimerRef = useRef(0);
  const bossTimerRef = useRef(0);


  const MAP_WIDTH = 2500;
  const MAP_HEIGHT = 2000;
  const CANVAS_WIDTH = 1000;
  const CANVAS_HEIGHT = 600;

  // Calculate total skill bonuses
  const getSkillBonus = (category, skillName, baseValue = 0) => {
    const skill = skills[category]?.[skillName];
    if (!skill) return baseValue;
    return baseValue + (skill.level * skill.bonus);
  };

  const getTotalDamage = () => {
    let damage = player.damage + (equipment.weapon?.damage || 0);
    const powerStrikeBonus = getSkillBonus('combat', 'powerStrike', 0);
    damage *= (1 + powerStrikeBonus / 100);
    return Math.floor(damage);
  };

  const getTotalCritChance = () => {
    return player.critChance + getSkillBonus('combat', 'criticalHit', 0);
  };

  const getTotalCritDamage = () => {
    return player.critDamage + getSkillBonus('combat', 'deadlyBlow', 0);
  };

  const getTotalDodge = () => {
    return player.dodgeChance + getSkillBonus('defense', 'evasion', 0);
  };

  const getTotalSpeed = () => {
    return player.speed + getSkillBonus('utility', 'swiftness', 0);
  };

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

  const showMessage = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  const showNotification = (msg, type = 'info') => {
    const id = Math.random();
    setNotifications(prev => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  };

  const drinkPotion = () => {
    if (inventory.potions > 0 && player.health < player.maxHealth) {
      setPlayer(p => ({ ...p, health: Math.min(p.maxHealth, p.health + 50) }));
      setInventory(prev => ({ ...prev, potions: prev.potions - 1 }));
      showMessage('Health restored!');
    }
  };

  const upgradeSkill = (category, skillName) => {
    const skill = skills[category][skillName];
    
    if (player.skillPoints < skill.cost || skill.level >= skill.maxLevel) {
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

  const craftItem = (recipe) => {
    // Check if player has materials
    const hasMaterials = Object.entries(recipe.materials).every(([mat, amount]) => {
      return inventory.materials[mat] >= amount;
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
  };

  const castSpell = (index) => {
    const spell = spells[index];
    if (!spell || !spell.unlocked || spell.cooldown > 0 || player.mana < spell.cost) return;
    
    const angle = Math.atan2(mousePos.y - player.y, mousePos.x - player.x);
    
    if (spell.id === 'heal') {
      showMessage('You feel rejuvenated!');
      createParticles(player.x, player.y, '#00ff00', 15);
      setPlayer(p => ({ 
        ...p, 
        health: Math.min(p.maxHealth, p.health + spell.heal), 
        mana: p.mana - spell.cost 
      }));
    } else {
      const spellPowerBonus = getSkillBonus('magic', 'spellPower', 0);
      const totalSpellDamage = Math.floor(spell.damage * (1 + spellPowerBonus / 100));
      
      const proj = {
        id: Math.random(),
        x: player.x,
        y: player.y,
        vx: Math.cos(angle) * 8,
        vy: Math.sin(angle) * 8,
        damage: totalSpellDamage + (equipment.weapon?.damage || 0),
        type: spell.id,
        life: 100,
        sourceX: player.x,
        sourceY: player.y
      };
      setProjectiles(prev => [...prev, proj]);
      setPlayer(p => ({ ...p, mana: p.mana - spell.cost }));
    }
    
    const cooldownReduction = getSkillBonus('magic', 'fastCasting', 0);
    const adjustedCooldown = Math.floor(spell.maxCooldown * (1 - cooldownReduction / 100));
    
    setSpells(prev => prev.map((s, i) => 
      i === index ? { ...s, cooldown: adjustedCooldown } : s
    ));
  };

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
  setParticles(prev => {
    const combined = [...prev, ...newParticles];
    // Keep only the most recent 100 particles
    return combined.slice(-100);
  });
};

  const dropLoot = (x, y, isBoss = false) => {
    const fortuneBonus = getSkillBonus('utility', 'fortune', 0);
    const luckMultiplier = 1 + (fortuneBonus / 100);
    
    const lootTable = isBoss ? [
      { type: 'gold', value: Math.floor((50 + Math.random() * 50) * luckMultiplier), chance: 1 },
      { type: 'essence', value: 3, chance: 1 },
      { type: 'potion', value: 2, chance: 1 },
      { type: 'material', mat: 'iron', value: 5, chance: 1 },
      { type: 'material', mat: 'crystal', value: 2, chance: 1 },
      { type: 'weapon', value: { name: 'Legendary Blade', damage: 20 }, chance: 0.5 },
      { type: 'armor', value: { name: 'Dragon Scale Armor', defense: 15 }, chance: 0.5 }
    ] : [
      { type: 'gold', value: Math.floor((5 + Math.random() * 15) * luckMultiplier), chance: 1 },
      { type: 'essence', value: 1, chance: 0.3 },
      { type: 'potion', value: 1, chance: 0.15 },
      { type: 'material', mat: 'wood', value: 2, chance: 0.4 },
      { type: 'material', mat: 'leather', value: 1, chance: 0.3 },
      { type: 'material', mat: 'iron', value: 1, chance: 0.2 },
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
          mat: item.mat,
          life: 2400
        }]);
      }
    });
  };

  const pickupLoot = (item) => {
    if (item.type === 'gold') {
      setInventory(prev => ({ ...prev, gold: prev.gold + item.value }));
      showMessage(`+${item.value} gold`);
    } else if (item.type === 'essence') {
      setInventory(prev => ({ ...prev, essence: prev.essence + item.value }));
      showMessage(`+${item.value} essence`);
    } else if (item.type === 'potion') {
      setInventory(prev => ({ ...prev, potions: prev.potions + item.value }));
      showMessage(`+${item.value} potion`);
    } else if (item.type === 'material') {
      setInventory(prev => ({
        ...prev,
        materials: {
          ...prev.materials,
          [item.mat]: (prev.materials[item.mat] || 0) + item.value
        }
      }));
      showMessage(`+${item.value} ${item.mat}`);
    } else if (item.type === 'weapon' || item.type === 'armor') {
      setInventory(prev => ({ 
        ...prev, 
        items: [...prev.items, { ...item.value, type: item.type, id: Math.random() }] 
      }));
      showMessage(`Found: ${item.value.name}!`);
    }
  };

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

  const placeStructure = (worldX, worldY) => {
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
  };

  const enterDungeon = (dungeon) => {
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
        speed: 0.75,
        xp: 30,
        type: 'dungeon_monster',
        state: 'roaming',
        roamAngle: Math.random() * Math.PI * 2,
        aggroSource: null
      });
    }
    
    setEnemies(prev => [...prev, ...dungeonEnemies]);
  };

  const exitDungeon = () => {
    setInDungeon(null);
    showMessage('Exited dungeon');
  };

  const updateQuest = (questId, progress) => {
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
  };

  const gainXP = (amount) => {
    setPlayer(prev => {
      const newXP = prev.xp + amount;
      if (newXP >= prev.xpToNext) {
        const newLevel = prev.level + 1;
        showNotification(`Level Up! You are now level ${newLevel}`, 'success');
        
        if (newLevel === 3) {
          setSpells(s => s.map(sp => sp.id === 'lightning' ? { ...sp, unlocked: true } : sp));
          showNotification('New spell unlocked: Lightning!', 'info');
        }
        if (newLevel === 5) {
          setSpells(s => s.map(sp => sp.id === 'heal' ? { ...sp, unlocked: true } : sp));
          showNotification('New spell unlocked: Heal!', 'info');
        }
        if (newLevel === 8) {
          setSpells(s => s.map(sp => sp.id === 'meteor' ? { ...sp, unlocked: true } : sp));
          showNotification('New spell unlocked: Meteor!', 'info');
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
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      setKeys(prev => ({ ...prev, [e.key.toLowerCase()]: true }));
      
      if (e.key === 'i' || e.key === 'I') {
        setShowInventory(prev => !prev);
        setShowSkills(false);
        setShowCrafting(false);
      }
      if (e.key === 'k' || e.key === 'K') {
        setShowSkills(prev => !prev);
        setShowInventory(false);
        setShowCrafting(false);
      }
      if (e.key === 'c' || e.key === 'C') {
        setShowCrafting(prev => !prev);
        setShowInventory(false);
        setShowSkills(false);
      }
      if (e.key === 'b' || e.key === 'B') {
        setShowBase(prev => !prev);
        if (!showBase) setBuildMode(null);
      }
      if (e.key === 'h' || e.key === 'H') drinkPotion();
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
        setShowSkills(false);
        setShowCrafting(false);
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
  }, [showBase, inDungeon, dungeons, player, inventory, mousePos]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
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
  }, [gameState, camera, buildMode, showBase, showInventory, showSkills, showCrafting, mousePos, player, spells]);

  useEffect(() => {
    setCamera({
      x: Math.max(0, Math.min(player.x - CANVAS_WIDTH / 2, MAP_WIDTH - CANVAS_WIDTH)),
      y: Math.max(0, Math.min(player.y - CANVAS_HEIGHT / 2, MAP_HEIGHT - CANVAS_HEIGHT))
    });
  }, [player.x, player.y]);

  // Game loop refs - these hold mutable state without triggering re-renders
  const keysRef = useRef({});
  const mousePosRef = useRef(mousePos);
  const playerRef = useRef(player);
  const enemiesRef = useRef(enemies);
  const projectilesRef = useRef(projectiles);
  
  // Keep refs in sync
  useEffect(() => {
    keysRef.current = keys;
  }, [keys]);
  
  useEffect(() => {
    mousePosRef.current = mousePos;
  }, [mousePos]);
  
  useEffect(() => {
    playerRef.current = player;
  }, [player]);
  
  useEffect(() => {
    enemiesRef.current = enemies;
  }, [enemies]);
  
  useEffect(() => {
    projectilesRef.current = projectiles;
  }, [projectiles]);

  // Main game loop - only depends on gameState
  useEffect(() => {
    if (gameState !== 'playing') return;
    
    const timeMultiplier = showBase ? 0.1 : 0.25;
    
    let frameId;
    let lastTime = 0;
    const targetFPS = 60;
    const frameDelay = 1000 / targetFPS;

    const animate = (currentTime) => {
      const deltaTime = currentTime - lastTime;
  
      if (deltaTime >= frameDelay) {
        lastTime = currentTime - (deltaTime % frameDelay);
        
        // Access current state from refs instead of closures
        const currentPlayer = playerRef.current;
        const currentKeys = keysRef.current;
        const currentMousePos = mousePosRef.current;
        const currentEnemies = enemiesRef.current;
        const currentProjectiles = projectilesRef.current;
        
        // Update player position
        const totalSpeed = getTotalSpeed();
        let moveX = 0;
        let moveY = 0;

        if (currentKeys['w']) moveY -= 1;
        if (currentKeys['s']) moveY += 1;
        if (currentKeys['a']) moveX -= 1;
        if (currentKeys['d']) moveX += 1;

        // Normalize diagonal movement
        if (moveX !== 0 && moveY !== 0) {
          const magnitude = Math.sqrt(moveX * moveX + moveY * moveY);
          moveX = (moveX / magnitude) * totalSpeed;
          moveY = (moveY / magnitude) * totalSpeed;
        } else {
          moveX *= totalSpeed;
          moveY *= totalSpeed;
        }

        let newX = currentPlayer.x + moveX;
        let newY = currentPlayer.y + moveY;

        newX = Math.max(20, Math.min(MAP_WIDTH - 20, newX));
        newY = Math.max(20, Math.min(MAP_HEIGHT - 20, newY));
        
        const angle = Math.atan2(currentMousePos.y - currentPlayer.y, currentMousePos.x - currentPlayer.x);
        const regenAmount = getSkillBonus('utility', 'regeneration', 0) * timeMultiplier * 0.016;
        
        setPlayer(prev => ({ 
          ...prev, 
          x: newX, 
          y: newY, 
          facingAngle: angle, 
          mana: Math.min(prev.maxMana, prev.mana + 0.2 * timeMultiplier),
          health: prev.health <= 0 ? prev.health : Math.min(prev.maxHealth, prev.health + regenAmount)
        }));
        
        // Handle loot pickup
        setLoot(prev => prev.filter(item => {
          const dx = newX - item.x;
          const dy = newY - item.y;
          const distSq = dx * dx + dy * dy;
          
          if (distSq < 900) { // 30*30
            pickupLoot(item);
            return false;
          }
          return --item.life > 0;
        }));
      }
      
      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);

    return () => {
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [gameState, showBase]);
  
  // Separate effect for spell cooldowns and enemy/boss spawning/AI
  useEffect(() => {
    if (gameState !== 'playing') return;
    
    const timeMultiplier = showBase ? 0.1 : 0.25;
      
      spawnTimerRef.current += timeMultiplier;
      if (spawnTimerRef.current > 240 && inDungeon === null && enemies.length < 10) {
        spawnTimerRef.current = 0;
        
        const spawnX = Math.random() * MAP_WIDTH;
        const spawnY = Math.random() * MAP_HEIGHT;
        
        const types = ['demon', 'shadow', 'beast', 'wraith', 'golem'];
        const type = types[Math.floor(Math.random() * types.length)];
        
        let stats = { health: 50, damage: 5, speed: 0.8, xp: 20 };
        if (type === 'wraith') stats = { health: 30, damage: 8, speed: 1.2, xp: 25 };
        if (type === 'golem') stats = { health: 100, damage: 10, speed: 0.6, xp: 40 };
        
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
          specialCooldown: 0,
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
          
          if (aggroDist < 50) {
            aggroSource = null;
            newState = 'roaming';
          } else {
            newX = enemy.x + (aggroDx / aggroDist) * enemy.speed * 1.3 * timeMultiplier;
            newY = enemy.y + (aggroDy / aggroDist) * enemy.speed * 1.3 * timeMultiplier;
          }
        } else if (distToPlayer < detectionRange) {
          newState = 'chasing';
          newX = enemy.x + (dx / distToPlayer) * enemy.speed * timeMultiplier;
          newY = enemy.y + (dy / distToPlayer) * enemy.speed * timeMultiplier;
          
          if (distToPlayer < 30) {
            const dodgeRoll = Math.random() * 100;
            if (dodgeRoll > getTotalDodge()) {
              setPlayer(p => {
                const actualDamage = Math.max(1, enemy.damage - p.defense);
                return { ...p, health: p.health - actualDamage * 0.1 * timeMultiplier };
              });
            } else {
              createParticles(player.x, player.y, '#ffff00', 5);
            }
          }
        } else {
          newState = 'roaming';
          
          const distFromSpawn = Math.sqrt(
            Math.pow(enemy.x - enemy.spawnX, 2) + Math.pow(enemy.y - enemy.spawnY, 2)
          );
          
          if (distFromSpawn > 150 || Math.random() < 0.02) {
            roamAngle = Math.random() * Math.PI * 2;
          }
          
          newX = enemy.x + Math.cos(roamAngle) * enemy.speed * 0.5 * timeMultiplier;
          newY = enemy.y + Math.sin(roamAngle) * enemy.speed * 0.5 * timeMultiplier;
        }
        
        return { ...enemy, x: newX, y: newY, state: newState, roamAngle, aggroSource };
      }).filter(e => e.health > 0));
      
      setBosses(prev => prev.map(boss => {
        const dx = player.x - boss.x;
        const dy = player.y - boss.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        let aggroSource = boss.aggroSource;
        let newX = boss.x;
        let newY = boss.y;
        let specialCooldown = Math.max(0, boss.specialCooldown - timeMultiplier);
        
        // Boss special ability
        if (dist < 600 && specialCooldown === 0 && Math.random() < 0.01) {
          specialCooldown = 300; // 5 second cooldown
          const angle = Math.atan2(dy, dx);
          
          // Shoot 3 projectiles in a spread
          for (let i = -1; i <= 1; i++) {
            const spreadAngle = angle + (i * 0.3);
            setProjectiles(projs => [...projs, {
              id: Math.random(),
              x: boss.x,
              y: boss.y,
              vx: Math.cos(spreadAngle) * 5,
              vy: Math.sin(spreadAngle) * 5,
              damage: boss.damage,
              type: 'boss_attack',
              life: 150,
              sourceX: boss.x,
              sourceY: boss.y,
              fromEnemy: true
            }]);
          }
          createParticles(boss.x, boss.y, '#ff0000', 20);
        }
        
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
            const dodgeRoll = Math.random() * 100;
            if (dodgeRoll > getTotalDodge()) {
              setPlayer(p => {
                const actualDamage = Math.max(1, boss.damage - p.defense);
                return { ...p, health: p.health - actualDamage * 0.1 * timeMultiplier };
              });
            } else {
              createParticles(player.x, player.y, '#ffff00', 8);
            }
          }
        }
        
        return {
          ...boss,
          x: newX,
          y: newY,
          attackCooldown: Math.max(0, boss.attackCooldown - timeMultiplier),
          specialCooldown,
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
        
        updated.forEach(proj => {
          // Check player hits from enemy projectiles
          if (proj.fromEnemy) {
            const dx = proj.x - player.x;
            const dy = proj.y - player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < 20) {
              proj.life = 0;
              const dodgeRoll = Math.random() * 100;
              if (dodgeRoll > getTotalDodge()) {
                setPlayer(p => ({ ...p, health: p.health - proj.damage }));
                createParticles(player.x, player.y, '#ff0000', 15);
              } else {
                createParticles(player.x, player.y, '#ffff00', 10);
                showMessage('Dodged!');
              }
            }
            return;
          }
          
          setEnemies(enemies => enemies.map(enemy => {
            const dx = proj.x - enemy.x;
            const dy = proj.y - enemy.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < 25) {
              proj.life = 0;
              
              // Critical hit calculation
              const critRoll = Math.random() * 100;
              const isCrit = critRoll < getTotalCritChance();
              const finalDamage = isCrit ? 
                Math.floor(proj.damage * (getTotalCritDamage() / 100)) : 
                proj.damage;
              
              if (isCrit) {
                createParticles(enemy.x, enemy.y, '#ffff00', 15);
                showMessage('CRITICAL!');
              } else {
                createParticles(enemy.x, enemy.y, '#ff6600', 10);
              }
              
              enemy.aggroSource = { x: proj.sourceX, y: proj.sourceY };
              
              if (enemy.health - finalDamage <= 0) {
                gainXP(enemy.xp);
                dropLoot(enemy.x, enemy.y);
                updateQuest(1, 1);
                
                if (enemy.type === 'dungeon_monster') {
                  const dungeon = dungeons.find(d => d.id === inDungeon);
                  if (dungeon) {
                    const remainingEnemies = enemies.filter(e => 
                      e.type === 'dungeon_monster' && e.id !== enemy.id
                    );
                    if (remainingEnemies.length === 0) {
                      setDungeons(d => d.map(dun => 
                        dun.id === inDungeon ? { ...dun, cleared: true } : dun
                      ));
                      updateQuest(2, 1);
                      showNotification('Dungeon Cleared!', 'success');
                      dropLoot(enemy.x, enemy.y, true);
                    }
                  }
                }
                
                return null;
              }
              
              return { ...enemy, health: enemy.health - finalDamage, aggroSource: { x: proj.sourceX, y: proj.sourceY } };
            }
            return enemy;
          }).filter(Boolean));
          
          setBosses(bosses => bosses.map(boss => {
            const dx = proj.x - boss.x;
            const dy = proj.y - boss.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < 40) {
              proj.life = 0;
              
              const critRoll = Math.random() * 100;
              const isCrit = critRoll < getTotalCritChance();
              const finalDamage = isCrit ? 
                Math.floor(proj.damage * (getTotalCritDamage() / 100)) : 
                proj.damage;
              
              if (isCrit) {
                createParticles(boss.x, boss.y, '#ffff00', 20);
                showMessage('CRITICAL HIT!');
              } else {
                createParticles(boss.x, boss.y, '#ff0000', 15);
              }
              
              boss.aggroSource = { x: proj.sourceX, y: proj.sourceY };
              
              if (boss.health - finalDamage <= 0) {
                gainXP(200);
                dropLoot(boss.x, boss.y, true);
                updateQuest(3, 1);
                showNotification('🏆 Boss defeated! Legendary loot obtained!', 'success');
                return null;
              }
              
              return { ...boss, health: boss.health - finalDamage, aggroSource: { x: proj.sourceX, y: proj.sourceY } };
            }
            return boss;
          }).filter(Boolean));
        });
        
        return updated;
      });
      
      setParticles(prev => prev.map(p => ({
        ...p,
        x: p.x + p.vx * timeMultiplier,
        y: p.y + p.vy * timeMultiplier,
        life: p.life - timeMultiplier
      })).filter(p => p.life > 0));
    };
    
    let frameId;
    let lastTime = 0;
    const targetFPS = 60;
    const frameDelay = 1000 / targetFPS;

    const animate = (currentTime) => {
      frameId = requestAnimationFrame(animate);
  
      const deltaTime = currentTime - lastTime;
  
      if (deltaTime >= frameDelay) {
        lastTime = currentTime - (deltaTime % frameDelay);
        gameLoop();
      }
    };

    frameId = requestAnimationFrame(animate);

    return () => {
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [gameState, keys, mousePos, player.x, player.y, player.level, player.defense, showBase, bosses.length, inDungeon, dungeons, skills]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    const minX = camera.x - 20;
    const maxX = camera.x + CANVAS_WIDTH + 20;
    const minY = camera.y - 20;
    const maxY = camera.y + CANVAS_HEIGHT + 20;
    
    // Pre-filter visible terrain to avoid checking all tiles
    const visibleTiles = terrain.filter(tile => 
      tile.x >= minX && tile.x <= maxX && tile.y >= minY && tile.y <= maxY
    );

    visibleTiles.forEach(tile => {
      let color = '#4a7c4e';
      if (tile.type === 'forest') color = '#2d5a3d';
      if (tile.type === 'water') color = '#4a6fa5';
      if (tile.type === 'rock') color = '#666666';
  
      ctx.fillStyle = color;
      ctx.fillRect(tile.x - camera.x, tile.y - camera.y, 20, 20);
    });
    
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
      let color = '#ffd700';
      if (item.type === 'essence') color = '#8b00ff';
      if (item.type === 'potion') color = '#ff0000';
      if (item.type === 'material') color = '#cd853f';
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
      
      ctx.shadowBlur = 10;
      ctx.shadowColor = color;
      ctx.fill();
      ctx.shadowBlur = 0;
    });
    
    particles.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life / 30;
      ctx.fillRect(p.x - camera.x - 2, p.y - camera.y - 2, 4, 4);
    });
    ctx.globalAlpha = 1;
    
    projectiles.forEach(proj => {
      let color = '#ff6600';
      if (proj.type === 'lightning') color = '#ffff00';
      if (proj.type === 'meteor') color = '#ff0000';
      if (proj.type === 'boss_attack') color = '#8b0000';
      
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(proj.x - camera.x, proj.y - camera.y, proj.fromEnemy ? 8 : 6, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.shadowBlur = 10;
      ctx.shadowColor = color;
      ctx.fill();
      ctx.shadowBlur = 0;
    });
    
    enemies.forEach(enemy => {
      let color = '#cc0000';
      if (enemy.type === 'shadow') color = '#4a0080';
      if (enemy.type === 'beast') color = '#804000';
      if (enemy.type === 'wraith') color = '#9400d3';
      if (enemy.type === 'golem') color = '#696969';
      if (enemy.type === 'dungeon_monster') color = '#8b008b';
      
      ctx.fillStyle = color;
      ctx.fillRect(enemy.x - camera.x - 15, enemy.y - camera.y - 15, 30, 30);
      
      if (enemy.state === 'hunting') {
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        ctx.strokeRect(enemy.x - camera.x - 15, enemy.y - camera.y - 15, 30, 30);
      }
      
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(enemy.x - camera.x - 15, enemy.y - camera.y - 25, 30, 4);
      ctx.fillStyle = '#00ff00';
      ctx.fillRect(enemy.x - camera.x - 15, enemy.y - camera.y - 25, 30 * (enemy.health / enemy.maxHealth), 4);
    });
    
    bosses.forEach(boss => {
      ctx.fillStyle = '#8b0000';
      ctx.fillRect(boss.x - camera.x - 30, boss.y - camera.y - 30, 60, 60);
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 3;
      ctx.strokeRect(boss.x - camera.x - 30, boss.y - camera.y - 30, 60, 60);
      
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(boss.x - camera.x - 30, boss.y - camera.y - 40, 60, 6);
      ctx.fillStyle = '#00ff00';
      ctx.fillRect(boss.x - camera.x - 30, boss.y - camera.y - 40, 60 * (boss.health / boss.maxHealth), 6);
    });
    
    ctx.save();
    ctx.translate(player.x - camera.x, player.y - camera.y);
    ctx.rotate(player.facingAngle);
    ctx.fillStyle = '#3498db';
    ctx.fillRect(-12, -12, 24, 24);
    ctx.fillStyle = '#2980b9';
    ctx.fillRect(-12, -12, 12, 12);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(8, -4, 8, 8);
    ctx.restore();
    
  }, [player, enemies, bosses, projectiles, particles, terrain, base, loot, dungeons, camera, inDungeon]);

  if (gameState === 'intro') {
    return (
      <div className="w-full h-screen bg-gradient-to-b from-gray-900 to-purple-900 flex items-center justify-center">
        <div className="text-center text-white max-w-2xl p-8">
          <h1 className="text-5xl font-bold mb-6 text-purple-300">The Wound of Power</h1>
          <p className="text-xl mb-4">
            In a moment of desperation, you were struck by a being beyond mortal comprehension.
          </p>
          <p className="text-xl mb-4">
            The wound should have killed you... but instead, it awakened something ancient within.
          </p>
          <p className="text-xl mb-8">
            Now, with newfound magical powers, you must defend the realm from the darkness that spreads.
          </p>
          <button
            onClick={startGame}
            className="bg-purple-600 hover:bg-purple-700 text-white text-2xl px-12 py-4 rounded-lg transition-colors"
          >
            Begin Your Journey
          </button>
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
    <div className="w-full h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
      <div className="absolute top-4 right-4 space-y-2 z-10">
        {notifications.map(notif => (
          <div 
            key={notif.id}
            className={`px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 ${
              notif.type === 'success' ? 'bg-green-600' :
              notif.type === 'warning' ? 'bg-orange-600' :
              'bg-blue-600'
            } text-white`}
          >
            <AlertCircle size={20} />
            <span>{notif.msg}</span>
          </div>
        ))}
      </div>
      
      <div className="mb-4 flex gap-6 text-white flex-wrap justify-center">
        <div className="flex items-center gap-2">
          <Heart className="text-red-500" />
          <div className="w-32 h-6 bg-gray-700 rounded">
            <div 
              className="h-full bg-red-500 rounded transition-all"
              style={{ width: `${Math.max(0, (player.health / player.maxHealth) * 100)}%` }}
            />
          </div>
          <span>{Math.floor(Math.max(0, player.health))}/{player.maxHealth}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <Zap className="text-blue-500" />
          <div className="w-32 h-6 bg-gray-700 rounded">
            <div 
              className="h-full bg-blue-500 rounded transition-all"
              style={{ width: `${(player.mana / player.maxMana) * 100}%` }}
            />
          </div>
          <span>{Math.floor(player.mana)}/{player.maxMana}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <TrendingUp className="text-yellow-500" />
          <span>Level {player.level}</span>
          <div className="w-24 h-6 bg-gray-700 rounded">
            <div 
              className="h-full bg-yellow-500 rounded transition-all"
              style={{ width: `${(player.xp / player.xpToNext) * 100}%` }}
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Package className="text-yellow-300" />
          <span>Gold: {inventory.gold}</span>
        </div>
        
        {player.skillPoints > 0 && (
          <div className="flex items-center gap-2 bg-purple-600 px-3 py-1 rounded">
            <Star className="text-yellow-300" />
            <span>Skill Points: {player.skillPoints}</span>
          </div>
        )}
      </div>
      
      <canvas 
        ref={canvasRef} 
        width={CANVAS_WIDTH} 
        height={CANVAS_HEIGHT}
        className="border-4 border-purple-500 rounded-lg"
      />
      
      <div className="mt-4 flex gap-4 text-white">
        {spells.map((spell, i) => (
          <div 
            key={spell.id}
            className={`px-4 py-2 rounded ${
              spell.unlocked 
                ? spell.cooldown > 0 
                  ? 'bg-gray-600' 
                  : 'bg-purple-600 hover:bg-purple-700 cursor-pointer'
                : 'bg-gray-800'
            }`}
            onClick={() => spell.unlocked && castSpell(i)}
          >
            <div className="text-sm">{i + 1}. {spell.name}</div>
            <div className="text-xs">
              {spell.unlocked 
                ? spell.cooldown > 0 
                  ? `${Math.ceil(spell.cooldown / 60)}s` 
                  : `${spell.cost} mana`
                : 'Locked'}
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 text-white text-center">
        <p className="text-sm mb-2">
          WASD: Move | Mouse: Aim | Click/1-4: Cast | H: Potion ({inventory.potions}) | E: Enter/Exit Dungeon
        </p>
        <p className="text-xs">
          I: Inventory | K: Skills | C: Crafting | B: Base
        </p>
        {message && <p className="text-yellow-300 font-bold">{message}</p>}
      </div>
      
      {/* Skill Tree UI */}
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
                <p>Regen: {getSkillBonus('utility', 'regeneration', 0)}/s</p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Crafting UI */}
      {showCrafting && (
        <div className="absolute top-20 right-20 bg-gray-800 text-white p-6 rounded-lg border-2 border-purple-500 max-w-md max-h-[80vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Hammer /> Crafting
            </h3>
            <X className="cursor-pointer" onClick={() => setShowCrafting(false)} />
          </div>
          
          <div className="mb-4 p-3 bg-gray-700 rounded">
            <h4 className="text-sm font-bold mb-2">Materials:</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.entries(inventory.materials).map(([mat, amount]) => (
                <p key={mat} className="capitalize">{mat}: {amount}</p>
              ))}
            </div>
          </div>
          
          <div className="space-y-3">
            {recipes.map(recipe => {
              const canCraft = Object.entries(recipe.materials).every(([mat, amount]) => 
                inventory.materials[mat] >= amount
              );
              
              return (
                <div key={recipe.id} className="bg-gray-700 p-3 rounded">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold text-sm">{recipe.name}</p>
                      <p className="text-xs text-gray-400 capitalize">{recipe.type}</p>
                    </div>
                    <Sparkles className={canCraft ? 'text-green-400' : 'text-gray-500'} size={16} />
                  </div>
                  
                  <div className="mb-2 text-xs">
                    <p className="text-gray-400 mb-1">Required:</p>
                    {Object.entries(recipe.materials).map(([mat, amount]) => (
                      <p key={mat} className={`capitalize ${
                        inventory.materials[mat] >= amount ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {mat}: {inventory.materials[mat]}/{amount}
                      </p>
                    ))}
                  </div>
                  
                  <button
                    onClick={() => craftItem(recipe)}
                    disabled={!canCraft}
                    className={`w-full py-2 rounded text-sm ${
                      canCraft
                        ? 'bg-purple-600 hover:bg-purple-700'
                        : 'bg-gray-600 cursor-not-allowed'
                    }`}
                  >
                    {canCraft ? 'Craft' : 'Insufficient Materials'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Inventory UI */}
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
      
      {/* Base Building UI */}
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
    </div>
  );
};

export default VoxelRPG;
