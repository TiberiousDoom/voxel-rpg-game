import { create } from 'zustand';

const useGameStore = create((set, get) => ({
  // Game state
  gameState: 'intro', // 'intro', 'playing', 'paused', 'gameOver'

  // Camera state
  camera: {
    rotationAngle: 0, // Horizontal rotation around player
    distance: 20,
    height: 15,
  },

  // Player state
  player: {
    position: [0, 2, 0], // x, y, z in 3D space
    velocity: [0, 0, 0],
    targetPosition: null, // For tap-to-move
    health: 100,
    maxHealth: 100,
    mana: 100,
    maxMana: 100,
    stamina: 100,
    maxStamina: 100,
    level: 1,
    xp: 0,
    xpToNext: 100,
    damage: 10,
    speed: 5,
    facingAngle: 0,
    defense: 0,
    critChance: 5,
    critDamage: 150,
    dodgeChance: 5,
    skillPoints: 0,
    isJumping: false,
    isGrounded: true,
    isDodging: false,
    isBlocking: false,
    potionCooldown: 0,
    comboCount: 0,
    comboTimer: 0,
    isInvincible: false,
    rage: 0,
    maxRage: 100,
    statusEffects: [], // Array of {type, duration, value}
    spellCooldowns: {}, // Track cooldowns per spell id
  },

  // Equipment
  equipment: {
    weapon: null,
    armor: null,
    helmet: null,
    gloves: null,
    boots: null,
    ring1: null,
    ring2: null,
    amulet: null,
    offhand: null,
  },

  // Inventory
  inventory: {
    gold: 100,
    essence: 5,
    crystals: 3,
    potions: 3,
    items: [],
    materials: { wood: 10, iron: 5, leather: 8, crystal: 2 },
  },

  // Enemies
  enemies: [],

  // Projectiles
  projectiles: [],

  // Target markers (for tap-to-move visual feedback)
  targetMarkers: [],

  // Damage numbers (floating damage indicators)
  damageNumbers: [],

  // Loot drops
  lootDrops: [],

  // XP orbs
  xpOrbs: [],

  // Particle effects
  particleEffects: [],

  // Actions
  setGameState: (state) => set({ gameState: state }),

  updateCamera: (updates) =>
    set((state) => ({
      camera: { ...state.camera, ...updates },
    })),

  setPlayerTarget: (targetPosition) =>
    set((state) => ({
      player: { ...state.player, targetPosition },
    })),

  addTargetMarker: (marker) =>
    set((state) => ({
      targetMarkers: [...state.targetMarkers, { ...marker, id: Date.now() }],
    })),

  removeTargetMarker: (id) =>
    set((state) => ({
      targetMarkers: state.targetMarkers.filter((m) => m.id !== id),
    })),

  addDamageNumber: (damageNum) =>
    set((state) => ({
      damageNumbers: [...state.damageNumbers, { ...damageNum, id: Date.now() + Math.random() }],
    })),

  removeDamageNumber: (id) =>
    set((state) => ({
      damageNumbers: state.damageNumbers.filter((d) => d.id !== id),
    })),

  addLootDrop: (loot) =>
    set((state) => ({
      lootDrops: [...state.lootDrops, { ...loot, id: Date.now() + Math.random() }],
    })),

  removeLootDrop: (id) =>
    set((state) => ({
      lootDrops: state.lootDrops.filter((l) => l.id !== id),
    })),

  addXPOrb: (orb) =>
    set((state) => ({
      xpOrbs: [...state.xpOrbs, { ...orb, id: Date.now() + Math.random() }],
    })),

  removeXPOrb: (id) =>
    set((state) => ({
      xpOrbs: state.xpOrbs.filter((o) => o.id !== id),
    })),

  addParticleEffect: (effect) =>
    set((state) => ({
      particleEffects: [...state.particleEffects, { ...effect, id: Date.now() + Math.random() }],
    })),

  removeParticleEffect: (id) =>
    set((state) => ({
      particleEffects: state.particleEffects.filter((p) => p.id !== id),
    })),

  updatePlayer: (updates) =>
    set((state) => ({
      player: { ...state.player, ...updates },
    })),

  setPlayerPosition: (position) =>
    set((state) => ({
      player: { ...state.player, position },
    })),

  dealDamageToPlayer: (damage) =>
    set((state) => {
      // Check invincibility
      if (state.player.isInvincible) {
        return state;
      }

      // Apply blocking damage reduction (75% reduction)
      let finalDamage = damage;
      if (state.player.isBlocking) {
        finalDamage = damage * 0.25;
      }

      // Apply defense reduction
      const defenseReduction = state.player.defense * 0.5;
      finalDamage = Math.max(1, finalDamage - defenseReduction);

      const newHealth = Math.max(0, state.player.health - finalDamage);

      // Gain rage when hit (10 rage per hit)
      const newRage = Math.min(state.player.maxRage, state.player.rage + 10);

      return {
        player: {
          ...state.player,
          health: newHealth,
          rage: newRage,
        },
      };
    }),

  addStatusEffect: (effect) =>
    set((state) => ({
      player: {
        ...state.player,
        statusEffects: [...state.player.statusEffects, effect],
      },
    })),

  removeStatusEffect: (type) =>
    set((state) => ({
      player: {
        ...state.player,
        statusEffects: state.player.statusEffects.filter((e) => e.type !== type),
      },
    })),

  addRage: (amount) =>
    set((state) => ({
      player: {
        ...state.player,
        rage: Math.min(state.player.maxRage, state.player.rage + amount),
      },
    })),

  useRage: (amount) =>
    set((state) => ({
      player: {
        ...state.player,
        rage: Math.max(0, state.player.rage - amount),
      },
    })),

  setSpellCooldown: (spellId, cooldown) =>
    set((state) => ({
      player: {
        ...state.player,
        spellCooldowns: {
          ...state.player.spellCooldowns,
          [spellId]: cooldown,
        },
      },
    })),

  updateSpellCooldowns: (delta) =>
    set((state) => {
      const newCooldowns = { ...state.player.spellCooldowns };
      let hasChanged = false;

      for (const spellId in newCooldowns) {
        if (newCooldowns[spellId] > 0) {
          newCooldowns[spellId] = Math.max(0, newCooldowns[spellId] - delta);
          hasChanged = true;
        }
      }

      if (!hasChanged) return state;

      return {
        player: {
          ...state.player,
          spellCooldowns: newCooldowns,
        },
      };
    }),

  getSpellCooldown: (spellId) => {
    return get().player.spellCooldowns[spellId] || 0;
  },

  healPlayer: (amount) =>
    set((state) => {
      const newHealth = Math.min(
        state.player.maxHealth,
        state.player.health + amount
      );
      return {
        player: { ...state.player, health: newHealth },
      };
    }),

  consumeMana: (amount) =>
    set((state) => {
      const newMana = Math.max(0, state.player.mana - amount);
      return {
        player: { ...state.player, mana: newMana },
      };
    }),

  consumeStamina: (amount) =>
    set((state) => {
      const newStamina = Math.max(0, state.player.stamina - amount);
      return {
        player: { ...state.player, stamina: newStamina },
      };
    }),

  regenStamina: (amount) =>
    set((state) => {
      const newStamina = Math.min(state.player.maxStamina, state.player.stamina + amount);
      return {
        player: { ...state.player, stamina: newStamina },
      };
    }),

  regenMana: (amount) =>
    set((state) => {
      const newMana = Math.min(state.player.maxMana, state.player.mana + amount);
      return {
        player: { ...state.player, mana: newMana },
      };
    }),

  addEnemy: (enemy) =>
    set((state) => ({
      enemies: [...state.enemies, enemy],
    })),

  updateEnemy: (id, updates) =>
    set((state) => ({
      enemies: state.enemies.map((enemy) =>
        enemy.id === id ? { ...enemy, ...updates } : enemy
      ),
    })),

  removeEnemy: (id) =>
    set((state) => ({
      enemies: state.enemies.filter((enemy) => enemy.id !== id),
    })),

  addProjectile: (projectile) =>
    set((state) => ({
      projectiles: [...state.projectiles, projectile],
    })),

  removeProjectile: (id) =>
    set((state) => ({
      projectiles: state.projectiles.filter((proj) => proj.id !== id),
    })),

  addXP: (xp) =>
    set((state) => {
      const newXP = state.player.xp + xp;
      const xpToNext = state.player.xpToNext;

      if (newXP >= xpToNext) {
        // Level up
        const newLevel = state.player.level + 1;
        return {
          player: {
            ...state.player,
            level: newLevel,
            xp: newXP - xpToNext,
            xpToNext: Math.floor(xpToNext * 1.5),
            skillPoints: state.player.skillPoints + 3,
            maxHealth: state.player.maxHealth + 20,
            health: state.player.maxHealth + 20,
            maxMana: state.player.maxMana + 15,
            mana: state.player.maxMana + 15,
            damage: state.player.damage + 2,
          },
        };
      }

      return {
        player: { ...state.player, xp: newXP },
      };
    }),

  addGold: (amount) =>
    set((state) => ({
      inventory: {
        ...state.inventory,
        gold: state.inventory.gold + amount,
      },
    })),

  equipItem: (slot, item) =>
    set((state) => ({
      equipment: { ...state.equipment, [slot]: item },
    })),

  unequipItem: (slot) =>
    set((state) => ({
      equipment: { ...state.equipment, [slot]: null },
    })),

  addItem: (item) =>
    set((state) => ({
      inventory: {
        ...state.inventory,
        items: [...state.inventory.items, item],
      },
    })),

  removeItem: (itemId) =>
    set((state) => ({
      inventory: {
        ...state.inventory,
        items: state.inventory.items.filter((item) => item.id !== itemId),
      },
    })),

  craftItem: (recipe, newMaterials) =>
    set((state) => {
      // Update materials
      const newInventory = {
        ...state.inventory,
        materials: newMaterials,
        items: [...state.inventory.items, { ...recipe, craftedAt: Date.now() }],
      };

      // If consumable, add to potion count or specific type
      if (recipe.type === 'consumable' && recipe.id === 'healthPotion') {
        newInventory.potions = (state.inventory.potions || 0) + 1;
      }

      return {
        inventory: newInventory,
      };
    }),

  applyConsumable: (item) =>
  useConsumable: (item) =>
    set((state) => {
      const updates = {};

      if (item.effect) {
        switch (item.effect.type) {
          case 'heal':
            updates.health = Math.min(state.player.maxHealth, state.player.health + item.effect.value);
            break;
          case 'mana':
            updates.mana = Math.min(state.player.maxMana, state.player.mana + item.effect.value);
            break;
          case 'rage':
            updates.rage = Math.min(state.player.maxRage, state.player.rage + item.effect.value);
            break;
          default:
            break;
        }
      }

      return {
        player: { ...state.player, ...updates },
        inventory: {
          ...state.inventory,
          items: state.inventory.items.filter((i) => i !== item),
        },
      };
    }),

  reset: () =>
    set({
      gameState: 'intro',
      camera: {
        rotationAngle: 0,
        distance: 20,
        height: 15,
      },
      player: {
        position: [0, 2, 0],
        velocity: [0, 0, 0],
        targetPosition: null,
        health: 100,
        maxHealth: 100,
        mana: 100,
        maxMana: 100,
        stamina: 100,
        maxStamina: 100,
        level: 1,
        xp: 0,
        xpToNext: 100,
        damage: 10,
        speed: 5,
        facingAngle: 0,
        defense: 0,
        critChance: 5,
        critDamage: 150,
        dodgeChance: 5,
        skillPoints: 0,
        isJumping: false,
        isGrounded: true,
        spellCooldowns: {},
      },
      enemies: [],
      projectiles: [],
      targetMarkers: [],
      damageNumbers: [],
      lootDrops: [],
      xpOrbs: [],
      particleEffects: [],
    }),
}));

export default useGameStore;
