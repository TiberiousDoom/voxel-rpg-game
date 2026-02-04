import { create } from 'zustand';
import {
  handleMonsterDeath,
  updateLootDrops,
  handleItemPickup,
  calculateEquipmentStats,
  getEquipmentPowerLevel,
  LootStoreHelpers
} from '../systems/LootIntegration';
import {
  getDefaultCharacterData,
  createCharacterActions,
  grantLevelUpPoints,
  calculateDerivedStats,
} from '../modules/character/CharacterSystem';

const useGameStore = create((set, get) => ({
  // Game state
  gameState: 'intro', // 'intro', 'playing', 'paused', 'gameOver'

  // AI System Manager reference (set by GameManager)
  aiSystemManager: null,
  setAISystemManager: (manager) => set({ aiSystemManager: manager }),

  // Camera state
  camera: {
    rotationAngle: 0, // Horizontal rotation around player
    distance: 12, // Zoomed in closer to player (was 20)
    height: 10,  // Lower camera height (was 15)
  },

  // Player state
  player: {
    position: [0, 5, 0], // x, y, z in 3D space - spawn above terrain
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

  // Character system (attributes and skills)
  character: getDefaultCharacterData(),

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

  // Enemies/Monsters
  enemies: [], // Array of Monster instances

  // Wildlife (wild animals)
  wildlife: [], // Array of Wildlife instances

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

  // Monster management
  spawnMonster: (monster) => {
    const state = get();
    // Register with AI system if available
    if (state.aiSystemManager) {
      state.aiSystemManager.registerMonster(monster);
    }
    set((s) => ({
      enemies: [...s.enemies, monster],
    }));
  },

  removeMonster: (id) => {
    const state = get();
    // Unregister from AI system if available
    if (state.aiSystemManager) {
      state.aiSystemManager.unregisterMonster(id);
    }
    set((s) => ({
      enemies: s.enemies.filter((m) => m.id !== id),
    }));
  },

  updateMonster: (id, updates) =>
    set((state) => ({
      enemies: state.enemies.map((m) => {
        if (m.id === id) {
          // Use Object.assign to preserve the Monster class prototype
          Object.assign(m, updates);
        }
        return m;
      }),
    })),

  clearDeadMonsters: () => {
    const state = get();
    // Unregister dead monsters from AI system
    if (state.aiSystemManager) {
      state.enemies.forEach((m) => {
        if (!m.alive) {
          state.aiSystemManager.unregisterMonster(m.id);
        }
      });
    }
    set((s) => ({
      enemies: s.enemies.filter((m) => m.alive),
    }));
  },

  // Attack a monster (player deals damage)
  attackMonster: (monsterId) => {
    const state = get();
    const monster = state.enemies.find(m => m.id === monsterId);

    if (!monster || !monster.alive) {
      return false;
    }

    // Defensive check: ensure monster has takeDamage method
    if (typeof monster.takeDamage !== 'function') {
      console.error('[attackMonster] Monster missing takeDamage method:', monster.id, monster);
      return false;
    }

    // Calculate damage
    const baseDamage = state.player.damage || 10;
    const critRoll = Math.random() * 100;
    const isCrit = critRoll < (state.player.critChance || 5);
    const critMultiplier = isCrit ? (state.player.critDamage || 150) / 100 : 1;
    const finalDamage = Math.floor(baseDamage * critMultiplier);

    // Apply damage to monster
    const killed = monster.takeDamage(finalDamage);

    // Notify AI system of combat damage
    if (state.aiSystemManager) {
      state.aiSystemManager.onCombatEvent({
        type: 'damage',
        attackerId: 'player',
        targetId: monsterId,
        damage: finalDamage,
        position: monster.position
      });
    }

    // Show damage number
    state.addDamageNumber({
      x: monster.position.x,
      z: monster.position.z,
      damage: finalDamage,
      isCrit: isCrit,
      type: 'player'
    });

    // Update monster in store to trigger React update
    set(s => ({
      enemies: [...s.enemies]
    }));

    // If monster died, handle death
    if (killed) {
      // Notify AI system of kill
      if (state.aiSystemManager) {
        state.aiSystemManager.onCombatEvent({
          type: 'kill',
          attackerId: 'player',
          targetId: monsterId,
          position: monster.position
        });
      }
      state.handleMonsterDeath(monster);
    }

    return true;
  },

  // Fire a projectile at a monster (ranged attack with visual)
  // Returns: { success: boolean, reason?: string }
  fireProjectileAtMonster: (monsterId) => {
    const state = get();
    const monster = state.enemies.find(m => m.id === monsterId);

    if (!monster || !monster.alive) {
      return { success: false, reason: 'invalid_target' };
    }

    // Ranged attacks cost mana
    const manaCost = 5;
    if (state.player.mana < manaCost) {
      return { success: false, reason: 'no_mana' };
    }

    // Consume mana
    set(prevState => ({
      player: { ...prevState.player, mana: prevState.player.mana - manaCost }
    }));

    // Get player position
    const playerPos = state.player.position;
    const monsterPos = monster.position;

    // Calculate direction from player to monster
    const dx = monsterPos.x - playerPos[0];
    const dy = (monsterPos.y || 1) - playerPos[1];
    const dz = monsterPos.z - playerPos[2];
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    // Normalize direction
    const direction = [dx / distance, dy / distance, dz / distance];

    // Calculate damage for the projectile
    const baseDamage = state.player.damage || 10;

    // Create projectile
    const projectile = {
      id: `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      position: [playerPos[0], playerPos[1] + 1, playerPos[2]], // Start slightly above player
      direction: direction,
      speed: 25,
      damage: baseDamage,
      color: '#ffaa00', // Orange-yellow for basic attack
      type: 'projectile',
      lifetime: 3,
    };

    state.addProjectile(projectile);

    return { success: true };
  },

  // Handle monster death with loot drops
  handleMonsterDeath: (monster) => {
    const state = get();

    // Create loot drops
    const drops = handleMonsterDeath(monster, (dropVisual) => {
      state.addLootDrop(dropVisual);
    });

    // Add XP from monster
    if (monster.xpReward) {
      state.addXP(monster.xpReward);
    }

    // Track kill for quests (Phase 3: Quest System)
    if (monster.type) {
      try {
        // Dynamic import to avoid circular dependencies
        import('../systems/QuestManager.js').then(({ getQuestManager }) => {
          const questManager = getQuestManager();
          if (questManager) {
            questManager.trackKill(monster.type);
          }
        }).catch(err => {
          // Quest system not loaded yet, ignore
        });
      } catch (err) {
        // Quest system not available
      }
    }

    // Remove dead monster after a delay (for death animation)
    setTimeout(() => {
      state.removeMonster(monster.id);
    }, 2000);

    return drops;
  },

  // Wildlife management
  spawnWildlife: (animal) => {
    const state = get();
    // Register with AI system if available
    if (state.aiSystemManager) {
      state.aiSystemManager.registerWildlife(animal);
    }
    set((s) => ({
      wildlife: [...s.wildlife, animal],
    }));
  },

  removeWildlife: (id) => {
    const state = get();
    // Unregister from AI system if available
    if (state.aiSystemManager) {
      state.aiSystemManager.unregisterWildlife(id);
    }
    set((s) => ({
      wildlife: s.wildlife.filter((w) => w.id !== id),
    }));
  },

  updateWildlife: (id, updates) =>
    set((state) => ({
      wildlife: state.wildlife.map((w) =>
        w.id === id ? { ...w, ...updates } : w
      ),
    })),

  clearDeadWildlife: () => {
    const state = get();
    // Unregister dead wildlife from AI system
    if (state.aiSystemManager) {
      state.wildlife.forEach((w) => {
        if (!w.alive) {
          state.aiSystemManager.unregisterWildlife(w.id);
        }
      });
    }
    set((s) => ({
      wildlife: s.wildlife.filter((w) => w.alive),
    }));
  },

  // Attack wildlife (player deals damage)
  attackWildlife: (wildlifeId) => {
    const state = get();
    const animal = state.wildlife.find(w => w.id === wildlifeId);

    if (!animal || !animal.alive) {
      return false;
    }

    // Calculate damage
    const baseDamage = state.player.damage || 10;
    const critRoll = Math.random() * 100;
    const isCrit = critRoll < (state.player.critChance || 5);
    const critMultiplier = isCrit ? (state.player.critDamage || 150) / 100 : 1;
    const finalDamage = Math.floor(baseDamage * critMultiplier);

    // Apply damage to wildlife
    const killed = animal.takeDamage(finalDamage);

    // Notify AI system of combat
    if (state.aiSystemManager) {
      state.aiSystemManager.onCombatEvent({
        type: 'damage',
        attackerId: 'player',
        targetId: wildlifeId,
        damage: finalDamage,
        position: animal.position
      });
    }

    // Show damage number
    state.addDamageNumber({
      x: animal.position.x,
      z: animal.position.z,
      damage: finalDamage,
      isCrit: isCrit,
      type: 'player'
    });

    // Update wildlife in store to trigger React update
    set(s => ({
      wildlife: [...s.wildlife]
    }));

    // If animal died, handle death
    if (killed) {
      state.handleWildlifeDeath(animal);
    }

    return true;
  },

  // Handle wildlife death with loot drops
  handleWildlifeDeath: (animal) => {
    const state = get();

    // Generate loot drops from wildlife
    const loot = animal.generateLoot();
    loot.forEach(drop => {
      state.addLootDrop({
        x: animal.position.x,
        z: animal.position.z,
        type: 'ITEM',
        item: {
          id: `${drop.type}_${Date.now()}`,
          type: drop.type,
          name: drop.type.charAt(0).toUpperCase() + drop.type.slice(1),
          quantity: drop.quantity,
          icon: '🥩'
        }
      });
    });

    // Add XP from wildlife
    if (animal.xpReward) {
      state.addXP(animal.xpReward);
    }

    // Notify AI system of kill
    if (state.aiSystemManager) {
      state.aiSystemManager.onCombatEvent({
        type: 'kill',
        attackerId: 'player',
        targetId: animal.id,
        position: animal.position
      });
    }

    // Remove dead wildlife after a delay
    setTimeout(() => {
      state.removeWildlife(animal.id);
    }, 2000);
  },

  // Update loot drops in game loop
  updateLootDrops: (playerPos) => {
    const state = get();

    return updateLootDrops(playerPos, (drop) => {
      // Handle gold pickup
      if (drop.type === 'GOLD') {
        state.addGold(drop.gold);
        // Gold picked up
      }
      // Handle item pickup
      else if (drop.type === 'ITEM') {
        const result = handleItemPickup(
          drop.item,
          state.equipment,
          (slot, item) => state.equipItemWithStats(slot, item),
          (item) => state.addItem(item)
        );

        if (result.equipped) {
          // Auto-equipped item
        } else {
          // Added item to inventory
        }

        // Track item collection for quests
        if (drop.item?.type) {
          import('../systems/QuestManager.js').then(({ getQuestManager }) => {
            const questManager = getQuestManager();
            if (questManager?.initialized) {
              questManager.trackCollection(drop.item.type);
            }
          }).catch(() => {});
        }
      }

      // Remove from store
      state.removeLootDrop(drop.id);
    });
  },

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
      enemies: state.enemies.map((enemy) => {
        if (enemy.id === id) {
          // Use Object.assign to preserve class prototype (Monster methods)
          Object.assign(enemy, updates);
        }
        return enemy;
      }),
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
      // Apply skill-based XP multiplier
      const derivedStats = calculateDerivedStats(
        state.character,
        state.player,
        state.equipment
      );
      const xpMultiplier = derivedStats.xpGainMultiplier || 1.0;
      const bonusXP = Math.floor(xp * xpMultiplier);

      const newXP = state.player.xp + bonusXP;
      const xpToNext = state.player.xpToNext;

      if (newXP >= xpToNext) {
        // Level up
        const newLevel = state.player.level + 1;

        // Grant character system points (5 attribute, 2 skill per level)
        const updatedCharacter = grantLevelUpPoints(state.character, newLevel);

        // Calculate new derived stats
        const newDerivedStats = calculateDerivedStats(
          updatedCharacter,
          { ...state.player, level: newLevel },
          state.equipment
        );

        return {
          player: {
            ...state.player,
            level: newLevel,
            xp: newXP - xpToNext,
            xpToNext: Math.floor(xpToNext * 1.5),
            // Update stats with derived values
            maxHealth: newDerivedStats.maxHealth,
            health: newDerivedStats.maxHealth, // Fully heal on level up
            maxMana: newDerivedStats.maxMana,
            mana: newDerivedStats.maxMana, // Fully restore mana on level up
            maxStamina: newDerivedStats.maxStamina,
            stamina: newDerivedStats.maxStamina, // Fully restore stamina on level up
            damage: newDerivedStats.damage,
            defense: newDerivedStats.defense,
            critChance: newDerivedStats.critChance,
            speed: newDerivedStats.speed,
          },
          character: updatedCharacter,
        };
      }

      return {
        player: { ...state.player, xp: newXP },
      };
    }),

  addGold: (amount) =>
    set((state) => {
      // Apply skill-based gold multiplier
      const derivedStats = calculateDerivedStats(
        state.character,
        state.player,
        state.equipment
      );
      const goldMultiplier = 1.0 + (derivedStats.skillEffects?.goldGain || 0);
      const bonusGold = Math.floor(amount * goldMultiplier);

      return {
        inventory: {
          ...state.inventory,
          gold: state.inventory.gold + bonusGold,
        },
      };
    }),

  equipItem: (slot, item) =>
    set((state) => ({
      equipment: { ...state.equipment, [slot]: item },
    })),

  unequipItem: (slot) =>
    set((state) => ({
      equipment: { ...state.equipment, [slot]: null },
    })),

  // Enhanced equipment with stat aggregation
  equipItemWithStats: (slot, item) =>
    set((state) => LootStoreHelpers.equipItemWithStats(state, slot, item)),

  unequipItemWithStats: (slot) =>
    set((state) => LootStoreHelpers.unequipItemWithStats(state, slot)),

  // Get current equipment stats
  getEquipmentStats: () => {
    return calculateEquipmentStats(get().equipment);
  },

  // Get equipment power level
  getEquipmentPowerLevel: () => {
    return getEquipmentPowerLevel(get().equipment);
  },

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

  addMaterial: (materialType, amount) =>
    set((state) => ({
      inventory: {
        ...state.inventory,
        materials: {
          ...state.inventory.materials,
          [materialType]: (state.inventory.materials[materialType] || 0) + amount,
        },
      },
    })),

  removeMaterial: (materialType, amount) =>
    set((state) => {
      const currentAmount = state.inventory.materials[materialType] || 0;
      const newAmount = Math.max(0, currentAmount - amount);

      return {
        inventory: {
          ...state.inventory,
          materials: {
            ...state.inventory.materials,
            [materialType]: newAmount,
          },
        },
      };
    }),

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

  consumeItem: (item) =>
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

  // Respawn player after death
  respawnPlayer: () =>
    set((state) => ({
      player: {
        ...state.player,
        health: state.player.maxHealth,
        mana: state.player.maxMana,
        stamina: state.player.maxStamina,
        position: [0, 5, 0], // Respawn at starting position
        velocity: [0, 0, 0],
        targetPosition: null,
        isInvincible: false,
        isDodging: false,
        isBlocking: false,
      },
      gameState: 'playing', // Resume game
    })),

  reset: () =>
    set({
      gameState: 'intro',
      camera: {
        rotationAngle: 0,
        distance: 12,
        height: 10,
      },
      player: {
        position: [0, 5, 0],
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
      character: getDefaultCharacterData(),
      enemies: [],
      wildlife: [],
      projectiles: [],
      targetMarkers: [],
      damageNumbers: [],
      lootDrops: [],
      xpOrbs: [],
      particleEffects: [],
    }),

  // Character system actions
  ...createCharacterActions(set, get),
}));

export default useGameStore;
