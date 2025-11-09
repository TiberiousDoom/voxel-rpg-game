# Formulas & Calculation Reference

## Overview

This document provides explicit pseudocode for all major game calculations. These formulas are the source of truth for implementation. All game systems reference these calculations.

---

## 1. PRODUCTION TICK SYSTEM

Every 5 seconds, the production system executes in this order:

```pseudocode
FUNCTION productionTick():
  FOR EACH building IN world.buildings:
    IF building.type IN PRODUCTION_BUILDINGS:
      // Step 1: Get base production from building config
      baseRate = BUILDING_CONFIG[building.type].productionRate

      // Step 2: Calculate multipliers (capped at 2.0x hard ceiling)
      multiplier = calculateMultiplier(building)

      // Step 3: Calculate actual production this tick
      productionThisTick = baseRate * multiplier

      // Step 4: Award resources
      IF building.type == FARM:
        food = food + productionThisTick
      ELSE IF building.type == WORKSHOP:
        items = items + productionThisTick
      ...
    END IF
  END FOR

  // Step 5: Apply NPC consumption
  totalConsumption = applyNPCConsumption()

  // Step 6: Apply storage overflow
  applyStorageOverflow()
END FUNCTION
```

### Production Timing: Arrival Mid-Tick

```pseudocode
// NPC assignment arrival times affect production THIS tick
FUNCTION calculateFarmProduction(farm, npcCount):
  // Tick starts at t=0, ends at t=5000ms
  baseRate = 1.0  // food per 5-second tick

  IF npcCount == 0:
    return baseRate * 0.5  // 50% efficiency without NPC
  ELSE:
    // NPC arrived at some point during tick
    // Average to 100% efficiency (could optimize to weighted arrival time)
    return baseRate * 1.0 * calculateMorale()
  END IF
END FUNCTION
```

---

## 2. MULTIPLIER STACKING (Hard Cap: 2.0x)

Multipliers stack in THIS exact order. The hard cap of 2.0x applies across all multipliers combined.

```pseudocode
FUNCTION calculateMultiplier(building):
  multiplier = 1.0  // Start at 100%

  // Step 1: NPC Skill Multiplier (max +50%)
  IF building.assignedNPC != null:
    skillBonus = 1.0 + (npc.skill * 0.5)  // 0-50% based on skill 0-100
    skillBonus = min(skillBonus, 1.5)      // Cap at 1.5x
    multiplier = multiplier * skillBonus
  END IF

  // Step 2: Zone Bonus (max +15%)
  zone = world.getZoneAt(building.position)
  zoneBonus = 1.0 + zone.productionBonus  // e.g., +0.15 for Agricultural zone
  multiplier = multiplier * zoneBonus

  // Step 3: Aura Bonus (max +5%, strongest only)
  auras = world.getAurasAt(building.position)
  strongestAura = getStrongestAura(auras)  // Only ONE aura applies
  IF strongestAura != null:
    auraBonus = 1.0 + strongestAura.bonus  // +0.05
    multiplier = multiplier * auraBonus
  END IF

  // Step 4: Technology Bonus (max +30%)
  techLevel = player.getTechLevel()
  techBonus = 1.0 + (techLevel * 0.30)   // 0-30% based on tech 0-1
  techBonus = min(techBonus, 1.3)         // Cap at 1.3x
  multiplier = multiplier * techBonus

  // Step 5: Morale Multiplier (±10%)
  moraleMultiplier = calculateMoraleMultiplier()  // 0.9 to 1.1
  multiplier = multiplier * moraleMultiplier

  // Step 6: HARD CAP at 2.0x
  multiplier = min(multiplier, 2.0)

  RETURN multiplier
END FUNCTION
```

### Morale Multiplier Calculation

```pseudocode
FUNCTION calculateMoraleMultiplier():
  town = player.getActiveTown()

  // Base multiplier = 1.0 (100% production)
  baseMult = 1.0

  // Morale ranges from -100 to +100
  // -100 morale = -10% production (0.9x)
  // 0 morale = 0% modifier (1.0x)
  // +100 morale = +10% production (1.1x)

  morale = calculateTownMorale()  // -100 to +100

  moraleMultiplier = 1.0 + (morale / 1000.0)  // Convert to 0.9-1.1 range

  RETURN moraleMultiplier
END FUNCTION
```

---

## 3. MORALE CALCULATION

Town morale is a composite of four factors. Recalculated every production tick.

```pseudocode
FUNCTION calculateTownMorale():
  town = player.getActiveTown()
  npcs = world.getAllNPCs()

  IF npcs.length == 0:
    RETURN 0  // No NPCs = neutral morale
  END IF

  // Factor 1: Average NPC Happiness (40% weight)
  totalHappiness = 0
  FOR EACH npc IN npcs:
    totalHappiness = totalHappiness + npc.happiness  // 0-100
  END FOR
  avgHappiness = totalHappiness / npcs.length
  happinessFactor = (avgHappiness / 100.0) * 100.0  // Convert to -100 to +100
  happinessFactor = happinessFactor - 50  // Center at 50 = 0 morale
  // Range: -50 (0% happiness) to +50 (100% happiness)

  // Factor 2: Housing Utilization (30% weight)
  // Ideal: 70-85% occupied. Below 50% or above 95% reduces morale
  housing = world.getTotalHousingCapacity()
  currentNPCs = npcs.length
  occupancy = (currentNPCs / housing) * 100.0

  IF occupancy < 50:
    housingFactor = -50  // Too empty = -50 morale
  ELSE IF occupancy >= 50 AND occupancy <= 85:
    housingFactor = (occupancy - 50) * (100.0 / 35.0) - 50  // Linear from -50 to +50
  ELSE IF occupancy > 85:
    housingFactor = 50 - ((occupancy - 85) * (150.0 / 15.0))  // Linear down to -100
  END IF
  // Range: -50 to +50

  // Factor 3: Food Reserves (20% weight)
  // Ideal: 3+ days of food. Below 1 day or above 2 weeks affects morale
  currentFood = player.resources.food
  NPCCount = npcs.length
  dailyConsumption = NPCCount * 0.5 * 1440  // minutes per day
  foodDays = currentFood / dailyConsumption

  IF foodDays < 0.5:
    foodFactor = -50  // Starvation imminent
  ELSE IF foodDays >= 0.5 AND foodDays <= 7:
    foodFactor = ((foodDays - 0.5) / 6.5) * 100.0 - 50  // Linear from -50 to +50
  ELSE IF foodDays > 7:
    foodFactor = 50  // More than enough food
  END IF
  // Range: -50 to +50

  // Factor 4: Territory Expansion Progress (10% weight)
  // Each expansion completed = +10 morale (capped at +50)
  expansionCount = town.expansionCount
  expansionFactor = min(expansionCount * 10.0, 50.0)
  // Range: 0 to +50

  // Composite: Weighted average
  townMorale = (happinessFactor * 0.40) + (housingFactor * 0.30) + (foodFactor * 0.20) + (expansionFactor * 0.10)

  // Clamp to -100 to +100
  townMorale = max(min(townMorale, 100.0), -100.0)

  RETURN townMorale  // -100 to +100
END FUNCTION
```

### NPC Happiness Calculation

```pseudocode
FUNCTION updateNPCHappiness(npc):
  npc.happiness = 50  // Start at neutral

  // Job assignment bonus
  IF npc.assignedBuilding != null:
    buildingType = npc.assignedBuilding.type
    preferredRole = npc.preferredRole

    IF buildingType == preferredRole:
      npc.happiness = npc.happiness + 5  // Preferred job
    ELSE IF isComplementaryRole(buildingType, preferredRole):
      npc.happiness = npc.happiness + 2  // Related role
    ELSE:
      npc.happiness = npc.happiness - 1  // Wrong job
    END IF
  ELSE:
    npc.happiness = npc.happiness - 1  // Idle penalty (minimal)
  END IF

  // Food status
  town = world.getTown(npc.townId)
  foodReserves = town.resources.food
  NPCCount = world.getNPCCountInTown(npc.townId)
  foodPerNPC = foodReserves / NPCCount

  IF foodPerNPC > 50:
    // Plenty of food
    npc.happiness = npc.happiness + 5
  ELSE IF foodPerNPC > 10:
    // Normal
    npc.happiness = npc.happiness + 0
  ELSE IF foodPerNPC > 1:
    // Low food
    npc.happiness = npc.happiness - 3
  ELSE:
    // Starving
    npc.happiness = npc.happiness - 10
  END IF

  // Housing bonus
  currentHousing = world.getHousingUtilization(npc.townId)
  IF currentHousing < 60:
    npc.happiness = npc.happiness + 3  // Spacious
  ELSE IF currentHousing < 90:
    npc.happiness = npc.happiness + 0  // Normal
  ELSE:
    npc.happiness = npc.happiness - 5  // Cramped
  END IF

  // Clamp to 0-100
  npc.happiness = max(min(npc.happiness, 100), 0)
END FUNCTION
```

---

## 4. NPC ASSIGNMENT PRIORITY

When multiple NPCs are available and multiple buildings need workers, assignment follows this priority order:

```pseudocode
FUNCTION assignNPCsToBuildings():
  unassignedNPCs = world.getAllUnassignedNPCs()
  buildingsNeedingWorkers = world.getBuildingsWithOpenSlots()

  FOR EACH unassignedNPC IN unassignedNPCs:
    bestBuilding = null
    bestPriority = -1

    FOR EACH building IN buildingsNeedingWorkers:
      priority = 0

      // Priority 1: Role Match (strongest signal)
      IF isRoleMatch(unassignedNPC, building):
        priority = priority + 1000
      END IF

      // Priority 2: Idle Time (NPCs idle longer get assigned first)
      idleSeconds = currentTime - unassignedNPC.lastAssignmentTime
      priority = priority + idleSeconds

      // Priority 3: Proximity (NPCs closer to building preferred)
      distance = getDistance(unassignedNPC.position, building.position)
      priority = priority + (1000.0 - distance)  // Inverted so closer = higher

      // Priority 4: NPC ID (for tie-breaking consistency)
      priority = priority + (1000.0 / unassignedNPC.id)

      IF priority > bestPriority:
        bestPriority = priority
        bestBuilding = building
      END IF
    END FOR

    IF bestBuilding != null:
      assignNPC(unassignedNPC, bestBuilding)
    END IF
  END FOR
END FUNCTION
```

---

## 5. NPC FOOD CONSUMPTION

Every production tick, NPCs consume resources based on their status.

```pseudocode
FUNCTION applyNPCConsumption():
  town = player.getActiveTown()
  npcs = world.getAllNPCsInTown(town.id)

  totalConsumption = 0

  FOR EACH npc IN npcs:
    IF npc.status == WORKING:
      // Working NPCs consume 0.5 food per minute
      // Tick is 5 seconds = 1/12 minute
      consumptionThisTick = 0.5 / 12.0  // ~0.0417 food per tick
      totalConsumption = totalConsumption + consumptionThisTick
    ELSE IF npc.status == IDLE:
      // Idle NPCs consume 0.1 food per minute (minimal)
      consumptionThisTick = 0.1 / 12.0  // ~0.0083 food per tick
      totalConsumption = totalConsumption + consumptionThisTick
    END IF
  END FOR

  // Apply consumption to resources
  town.resources.food = town.resources.food - totalConsumption

  // Check for starvation
  IF town.resources.food < 0:
    // Negative food: NPCs start dying
    handleStarvation(town)
  END IF

  RETURN totalConsumption
END FUNCTION

FUNCTION handleStarvation(town):
  npcs = world.getAllNPCsInTown(town.id)
  food = town.resources.food

  // Each NPC costs 0.5 food/min to keep alive
  // If food < required, random NPCs die

  requiredFood = npcs.length * 0.5 / 12.0  // Per tick

  IF food < 0:
    // Calculate starvation deaths
    deathsThisTick = ceil(abs(food) / requiredFood)

    FOR i FROM 1 TO deathsThisTick:
      randomNPC = npcs[random(0, npcs.length - 1)]
      world.killNPC(randomNPC)
      npcs.remove(randomNPC)
    END FOR

    town.resources.food = 0
  END IF
END FUNCTION
```

---

## 6. TERRITORY EXPANSION COST

Territory expansion follows an exponential cost curve to gate late-game expansion.

```pseudocode
FUNCTION calculateExpansionCost(expansionNumber):
  // Expansion costs: 1st=150, 2nd=225, 3rd=337, ..., 10th=3845
  // Formula: cost(n) = 100 * (1.5^n)

  baseCost = 100.0
  multiplier = 1.5

  cost = baseCost * pow(multiplier, expansionNumber)

  // Round to nearest 5
  cost = round(cost / 5.0) * 5.0

  RETURN cost
END FUNCTION

// Examples:
// Expansion 1: 100 * 1.5^1 = 150
// Expansion 2: 100 * 1.5^2 = 225
// Expansion 3: 100 * 1.5^3 = 337
// Expansion 5: 100 * 1.5^5 = 759
// Expansion 10: 100 * 1.5^10 = 5766 (truncated to actual config)

FUNCTION expandTerritory(territoryId, targetRadius):
  territory = world.getTerritory(territoryId)
  currentRadius = territory.radius

  IF targetRadius <= currentRadius:
    RETURN { success: false, error: "Target radius must be larger" }
  END IF

  // Calculate expansions needed
  expansionsNeeded = 0
  FOR i FROM territory.expansionCount + 1:
    maxRadiusAtExpansion = BASE_TERRITORY_RADIUS + (i * RADIUS_PER_EXPANSION)
    IF maxRadiusAtExpansion >= targetRadius:
      expansionsNeeded = i - territory.expansionCount
      BREAK
    END IF
  END FOR

  // Calculate total cost
  totalCost = 0
  FOR i FROM territory.expansionCount + 1 TO territory.expansionCount + expansionsNeeded:
    totalCost = totalCost + calculateExpansionCost(i)
  END FOR

  // Check if player can afford
  IF player.resources.gold < totalCost:
    RETURN { success: false, error: "Insufficient resources", needed: totalCost }
  END IF

  // Apply cooldown check (2 hours between expansions)
  timeSinceLastExpansion = currentTime - territory.lastExpansionTime
  IF timeSinceLastExpansion < 7200000:  // 2 hours in milliseconds
    RETURN { success: false, error: "Expansion cooldown not ready" }
  END IF

  // Check tier gate
  currentTier = player.getCurrentTier()
  maxExpansionsForTier = getMaxExpansionsForTier(currentTier)
  IF territory.expansionCount + expansionsNeeded > maxExpansionsForTier:
    RETURN { success: false, error: "Tier doesn't unlock this expansion" }
  END IF

  // Execute expansion
  player.resources.gold = player.resources.gold - totalCost
  territory.radius = targetRadius
  territory.expansionCount = territory.expansionCount + expansionsNeeded
  territory.lastExpansionTime = currentTime

  RETURN { success: true, radius: targetRadius }
END FUNCTION
```

---

## 7. STORAGE CAPACITY CALCULATION

Storage is calculated from storage buildings and modified by upgrades.

```pseudocode
FUNCTION calculateTotalStorageCapacity(buildings, upgrades):
  baseCapacity = 0

  FOR EACH building IN buildings:
    IF building.type == STORAGE_BUILDING:
      baseCapacity = baseCapacity + 500
    ELSE IF building.type == CHEST:
      baseCapacity = baseCapacity + 100
    ELSE IF building.type == WAREHOUSE:
      baseCapacity = baseCapacity + 1000
    END IF
  END FOR

  // Apply upgrades
  capacityMultiplier = 1.0
  IF upgrades.contains(EXPANDED_STORAGE):
    capacityMultiplier = capacityMultiplier + 0.2  // +20%
  END IF
  IF upgrades.contains(REINFORCED_STORAGE):
    capacityMultiplier = capacityMultiplier + 0.3  // +30% (stacks to 1.5x)
  END IF

  totalCapacity = baseCapacity * capacityMultiplier

  RETURN totalCapacity
END FUNCTION

FUNCTION checkStorageOverflow():
  town = player.getActiveTown()

  totalCapacity = calculateTotalStorageCapacity(
    world.getBuildingsInTerritory(town.territoryId),
    town.completedUpgrades
  )

  currentUsage = calculateInventorySize(town.resources)

  IF currentUsage > totalCapacity:
    overflow = currentUsage - totalCapacity

    // Try to dump overflow resources in order of priority
    FOR EACH resourceType IN [LEAST_VALUABLE, ..., MOST_VALUABLE]:
      IF town.resources[resourceType] > 0:
        amountToDump = min(town.resources[resourceType], overflow)
        town.resources[resourceType] = town.resources[resourceType] - amountToDump
        overflow = overflow - amountToDump

        IF overflow <= 0:
          BREAK
        END IF
      END IF
    END FOR

    // Log overflow event
    logEvent("Storage overflow, dumped " + (currentUsage - totalCapacity) + " resources")
  END IF
END FUNCTION
```

---

## 8. TIER PROGRESSION REQUIREMENTS (AND Gates)

All requirements must be met simultaneously to advance to next tier.

```pseudocode
FUNCTION canProgressToTier(targetTier, currentProgress):
  requirements = TIER_PROGRESSION_REQUIREMENTS[targetTier]

  // All checks must pass (AND gate, not OR)

  // Check 1: Total resources spent
  IF currentProgress.totalResourcesSpent < requirements.conditions.totalResourcesSpent:
    RETURN { canProgress: false, reason: "Insufficient resources spent" }
  END IF

  // Check 2: Buildings required
  FOR EACH buildingReq IN requirements.conditions.buildingsRequired:
    buildingType = buildingReq.building
    minCount = buildingReq.minCount
    actualCount = countBuildingsOfType(buildingType)

    IF actualCount < minCount:
      RETURN { canProgress: false, reason: buildingType + " count insufficient" }
    END IF
  END FOR

  // Check 3: Time requirement
  IF currentProgress.playtimeSeconds < requirements.conditions.timeRequired:
    RETURN { canProgress: false, reason: "Not enough playtime" }
  END IF

  // Check 4: NPCs acquired (if requirement exists)
  IF requirements.conditions.npcsRequired != null:
    IF world.getAllNPCs().length < requirements.conditions.npcsRequired:
      RETURN { canProgress: false, reason: "Insufficient NPCs" }
    END IF
  END IF

  // All checks passed
  RETURN { canProgress: true }
END FUNCTION

// Example: PERMANENT tier requirements
// {
//   nextTier: "TOWN",
//   description: "Establish a permanent settlement",
//   conditions: {
//     buildingsRequired: [
//       { building: "WALL", minCount: 1 },
//       { building: "STORAGE_BUILDING", minCount: 1 },
//       { building: "FARM", minCount: 1 }
//     ],
//     totalResourcesSpent: 6000,
//     timeRequired: 900,  // 15 minutes in seconds
//     npcsRequired: 5
//   }
// }
```

---

## 9. SKILL LEVEL PROGRESSION

NPCs gain skills through work. Skills enhance production.

```pseudocode
FUNCTION updateNPCSkills(npc, deltaTime):
  IF npc.status != WORKING:
    RETURN  // Only gain skills while working
  END IF

  building = world.getBuilding(npc.assignedBuildingId)
  skillGainRate = BUILDING_CONFIG[building.type].skillGainRate  // e.g., 0.1 per tick

  // Increase skill for assigned building type
  npc.skills[building.type] = npc.skills[building.type] + skillGainRate

  // Cap at 100
  npc.skills[building.type] = min(npc.skills[building.type], 100)

  // Check for level milestones
  IF npc.skills[building.type] == 25:
    npc.skillLevels[building.type] = TRAINED
    logEvent(npc.name + " is now Trained at " + building.type)
  ELSE IF npc.skills[building.type] == 50:
    npc.skillLevels[building.type] = EXPERT
    logEvent(npc.name + " is now Expert at " + building.type)
  ELSE IF npc.skills[building.type] == 100:
    npc.skillLevels[building.type] = MASTER
    logEvent(npc.name + " is now Master at " + building.type)
  END IF
END FUNCTION

// Skill level production multipliers
FUNCTION getSkillMultiplier(npc, buildingType):
  skillLevel = npc.skillLevels[buildingType]

  IF skillLevel == NOVICE:
    RETURN 0.5  // 50% efficiency
  ELSE IF skillLevel == TRAINED:
    RETURN 0.75  // 75% efficiency
  ELSE IF skillLevel == EXPERT:
    RETURN 1.0  // 100% efficiency
  ELSE IF skillLevel == MASTER:
    RETURN 1.5  // 150% efficiency
  ELSE:
    RETURN 0.5  // Default to novice
  END IF
END FUNCTION
```

---

## 10. BUILDING CONSTRUCTION TIME

Buildings take time to construct. Time increases with tier.

```pseudocode
FUNCTION calculateBuildTime(buildingType):
  config = BUILDING_CONFIG[buildingType]
  baseBuildTime = config.buildTime  // in seconds

  // Modifiers
  // - Multiple workers: -10% per additional worker (min 50% of base)
  // - Morale: ±10% based on town morale
  // - Technology: -5% per tech level (min 50% of base)

  RETURN baseBuildTime
END FUNCTION

FUNCTION progressConstruction(building, deltaTime):
  IF building.status != UNDER_CONSTRUCTION:
    RETURN
  END IF

  buildTime = calculateBuildTime(building.type)
  building.constructionProgress = building.constructionProgress + deltaTime

  IF building.constructionProgress >= buildTime:
    building.status = COMPLETED
    building.constructionProgress = buildTime
    logEvent(building.type + " completed!")

    // Award completion bonuses
    applyBuildingCompletionBonuses(building)
  END IF
END FUNCTION
```

---

## 11. CRAFTING RECIPES & COSTS

Crafting converts materials into items.

```pseudocode
FUNCTION canCraftItem(recipeId, inventory):
  recipe = CRAFTING_RECIPES[recipeId]

  IF recipe == null:
    RETURN { canCraft: false, reason: "Recipe not found" }
  END IF

  // Check all required materials
  missingMaterials = {}

  FOR EACH material IN recipe.materials:
    required = material.amount
    available = inventory.materials[material.type] ?? 0

    IF available < required:
      missingMaterials[material.type] = required - available
    END IF
  END FOR

  IF missingMaterials.size > 0:
    RETURN { canCraft: false, missingMaterials: missingMaterials }
  END IF

  RETURN { canCraft: true, recipe: recipe }
END FUNCTION

FUNCTION executeCraft(recipeId, inventory):
  result = canCraftItem(recipeId, inventory)

  IF !result.canCraft:
    RETURN result
  END IF

  recipe = result.recipe

  // Consume materials
  FOR EACH material IN recipe.materials:
    inventory.materials[material.type] = inventory.materials[material.type] - material.amount
  END FOR

  // Produce item
  inventory.items[recipe.output] = (inventory.items[recipe.output] ?? 0) + recipe.outputAmount

  // Production time
  // Can craft multiple items in workshop queue

  RETURN { success: true, item: recipe.output, amount: recipe.outputAmount }
END FUNCTION
```

---

## 12. BOUNDARY CALCULATIONS

For territory and building placement validation.

```pseudocode
FUNCTION isPositionInTerritory(position, territoryCenter, radius):
  distance = getDistance(position, territoryCenter)
  RETURN distance <= radius
END FUNCTION

FUNCTION getDistance(pos1, pos2):
  // 3D Euclidean distance
  dx = pos1.x - pos2.x
  dy = pos1.y - pos2.y
  dz = pos1.z - pos2.z

  distance = sqrt(dx*dx + dy*dy + dz*dz)
  RETURN distance
END FUNCTION

FUNCTION getBuildingsInRadius(center, radius):
  buildings = []

  FOR EACH building IN world.buildings:
    IF isPositionInTerritory(building.position, center, radius):
      buildings.push(building)
    END IF
  END FOR

  RETURN buildings
END FUNCTION
```

---

## Summary Table: Production per 5-Second Tick

All base rates (before multipliers):

| Building | Base Rate | Notes |
|----------|-----------|-------|
| CAMPFIRE | 5 wood/tick | SURVIVAL tier only |
| FARM | 1 food/tick | Standard production |
| WORKSHOP | 1 item/tick | Requires materials |
| STORAGE_BUILDING | 0 (utility) | +500 capacity |
| HOUSE | 0 (utility) | +10 NPC capacity |
| WATCHTOWER | 0 (utility) | +10 vision range |
| BARRACKS | 0 (utility) | Defensive building |
| MARKETPLACE | 0 (utility) | Trade hub |

---

## Summary Table: Resource Consumption per 5-Second Tick

| Type | Rate | Notes |
|------|------|-------|
| NPC (Working) | 0.5 food/min ÷ 12 = 0.0417/tick | Assigned to building |
| NPC (Idle) | 0.1 food/min ÷ 12 = 0.0083/tick | Not assigned |
| Building Decay | TBD | Post-MVP system |
| NPC Death (Starvation) | Triggered when food < 0 | Kills random NPCs |

---

## Testing These Formulas

Each formula should be unit tested independently:

- [ ] Production tick simulation: 5 ticks = 25 seconds real time
- [ ] Multiplier stacking: Verify hard cap at 2.0x with all 5 multipliers active
- [ ] Morale calculation: Test with 10, 50, 100 NPCs at various happiness levels
- [ ] NPC consumption: Verify 1 FARM feeds ~28 other NPCs
- [ ] Territory expansion: Verify cost(10) = 3845 resources
- [ ] Storage overflow: Verify excess resources dumped in priority order
- [ ] Tier progression: Verify all AND gates block advancement correctly
- [ ] Skill progression: Verify Master level NPCs produce 1.5x base rate
- [ ] Crafting: Verify recipe requirements block invalid crafts
