# Save/Load Versioning & Migration Strategy

## Overview

This document describes how game saves are versioned, migrated between versions, and validated during load. The save system must support adding new features (like NPC system, skill progression, new building types) without breaking existing saves.

---

## Save Format & Versioning

### Version History

```
v1 (MVP): Foundation (buildings) + Resource Economy (tier progression, resources)
          - Buildings with position, type, status, construction progress
          - Resources (gold, wood, stone, food, essence, crystal)
          - Tier progression state
          - No NPC system

v2 (Post-MVP): Add NPC system
          - All v1 data preserved
          - New: NPC list with assignment, skills, morale
          - New: Work slot assignments per building
          - Migration: Existing v1 saves become v2 with empty NPC list

v3 (Future): Territory & Town management
          - Territory definitions, bonuses, expansion count
          - Town statistics (population, happiness, defense, prosperity)
          - Town upgrades completed
          - Migration: Existing saves get default territory at (0,0,0) with existing buildings

v4 (Future): Technology tree & cosmetics
          - Technology unlocked and levels
          - Cosmetic buildings and decorations
          - Town theme selection
```

### Version Detection

```
SAVE FILE STRUCTURE:
{
  version: 2,        // Version number (required)
  timestamp: 1699540000000,  // When saved
  playtime: 3600000,  // Milliseconds played
  currentTier: "PERMANENT",

  buildings: [...],
  resources: {...},
  npcs: [...],      // Empty array in v1 saves

  // Version-specific fields
  territory: {...},  // v3+
  technologies: {...}  // v4+
}
```

---

## Migration Flow

### Loading a Save

```pseudocode
FUNCTION loadSave(saveData):
  // Step 1: Detect version
  version = detectVersion(saveData)

  IF version == null:
    RETURN { success: false, error: "Corrupted save (no version)" }
  END IF

  // Step 2: Validate version
  IF version > CURRENT_VERSION:
    RETURN { success: false, error: "Save from future version, cannot load" }
  END IF

  // Step 3: Migrate if needed
  IF version < CURRENT_VERSION:
    migratedData = migrateFromVersion(saveData, version, CURRENT_VERSION)
    IF migratedData == null:
      RETURN { success: false, error: "Migration failed" }
    END IF
    saveData = migratedData
  END IF

  // Step 4: Validate data structure
  IF !validateSaveData(saveData):
    RETURN { success: false, error: "Invalid save structure" }
  END IF

  // Step 5: Load into game state
  loadGameState(saveData)

  RETURN { success: true, version: saveData.version }
END FUNCTION
```

### Version Detection

```pseudocode
FUNCTION detectVersion(saveData):
  // Explicit version field (preferred)
  IF saveData.version != undefined:
    RETURN saveData.version
  END IF

  // Heuristic detection for v1 saves (no explicit version)
  // v1 saves have buildings but no npcs field
  IF saveData.buildings != undefined AND saveData.npcs == undefined:
    RETURN 1
  END IF

  // Cannot determine version
  RETURN null
END FUNCTION
```

---

## Migration Functions

### v1 → v2: Add NPC System

```pseudocode
FUNCTION migrateV1ToV2(v1SaveData):
  v2SaveData = JSON.parse(JSON.stringify(v1SaveData))  // Deep copy

  // Add version marker
  v2SaveData.version = 2

  // Initialize empty NPC system
  v2SaveData.npcs = []
  v2SaveData.npcIdCounter = 0

  // Initialize work slots for buildings (empty by default)
  FOR EACH building IN v2SaveData.buildings:
    building.assignedNPCId = null  // No assigned NPC yet
    building.workSlots = getWorkSlotsForBuilding(building.type)
  END FOR

  // Initialize skill system (empty)
  v2SaveData.npcSkills = {}

  // Add migration metadata
  v2SaveData.migrations = [
    {
      fromVersion: 1,
      toVersion: 2,
      timestamp: getCurrentTime(),
      action: "Added NPC system"
    }
  ]

  RETURN v2SaveData
END FUNCTION
```

### v2 → v3: Add Territory & Town Management

```pseudocode
FUNCTION migrateV2ToV3(v2SaveData):
  v3SaveData = JSON.parse(JSON.stringify(v2SaveData))

  // Add version marker
  v3SaveData.version = 3

  // Create default territory at origin
  defaultTerritory = {
    id: "territory_1",
    name: "Home Territory",
    center: { x: 0, y: 0, z: 0 },
    radius: 25,
    maxRadius: 75,
    claimedAtTime: v3SaveData.timestamp,
    bonuses: calculateBonusesFromBuildings(v3SaveData.buildings),
    buildingIds: v3SaveData.buildings.map(b => b.id),
    expansionCount: 0,
    lastExpansionTime: 0,
    active: true
  }

  v3SaveData.territory = {
    territories: [defaultTerritory],
    activeTerritoryId: "territory_1"
  }

  // Create default town
  defaultTown = {
    id: "town_1",
    name: "My Town",
    territoryId: "territory_1",
    statistics: {
      population: v3SaveData.npcs.length,
      happiness: 50,
      defense: 0,
      prosperity: 50,
      productionRate: 1.0,
      totalBuildingCount: v3SaveData.buildings.length,
      buildingCounts: calculateBuildingCounts(v3SaveData.buildings)
    },
    upgrades: {},  // Empty
    aesthetics: { elementCount: 0, aestheticRating: 0 },
    level: 1
  }

  v3SaveData.town = {
    towns: [defaultTown],
    activeTownId: "town_1"
  }

  // Update migration history
  v3SaveData.migrations.push({
    fromVersion: 2,
    toVersion: 3,
    timestamp: getCurrentTime(),
    action: "Added territory and town systems"
  })

  RETURN v3SaveData
END FUNCTION
```

### v3 → v4: Add Technology Tree

```pseudocode
FUNCTION migrateV3ToV4(v3SaveData):
  v4SaveData = JSON.parse(JSON.stringify(v3SaveData))

  // Add version marker
  v4SaveData.version = 4

  // Initialize empty technology system
  v4SaveData.technologies = {
    researching: null,
    completed: [],
    unresearched: getAllTechIds()
  }

  // Add migration metadata
  v4SaveData.migrations.push({
    fromVersion: 3,
    toVersion: 4,
    timestamp: getCurrentTime(),
    action: "Added technology system"
  })

  RETURN v4SaveData
END FUNCTION
```

### Generic Chained Migration

```pseudocode
FUNCTION migrateFromVersion(saveData, fromVersion, toVersion):
  currentData = saveData

  FOR i FROM fromVersion TO (toVersion - 1):
    nextVersion = i + 1

    IF nextVersion == 2:
      currentData = migrateV1ToV2(currentData)
    ELSE IF nextVersion == 3:
      currentData = migrateV2ToV3(currentData)
    ELSE IF nextVersion == 4:
      currentData = migrateV3ToV4(currentData)
    ELSE:
      RETURN null  // Unknown migration path
    END IF

    IF currentData == null:
      RETURN null  // Migration failed
    END IF
  END FOR

  RETURN currentData
END FUNCTION
```

---

## Save Data Validation

### Validation Schema

```pseudocode
FUNCTION validateSaveData(saveData):
  // Check required top-level fields
  IF saveData.version == undefined:
    logError("Save missing version")
    RETURN false
  END IF

  IF !isValidVersion(saveData.version):
    logError("Invalid version number: " + saveData.version)
    RETURN false
  END IF

  // Validate buildings
  IF !Array.isArray(saveData.buildings):
    logError("Buildings must be an array")
    RETURN false
  END IF

  FOR EACH building IN saveData.buildings:
    IF !validateBuilding(building):
      logError("Invalid building: " + building.id)
      RETURN false
    END IF
  END FOR

  // Validate resources
  IF saveData.resources == null OR typeof saveData.resources != "object":
    logError("Resources missing or invalid")
    RETURN false
  END IF

  // Validate NPC list (if version >= 2)
  IF saveData.version >= 2:
    IF !Array.isArray(saveData.npcs):
      logError("NPCs must be an array")
      RETURN false
    END IF

    FOR EACH npc IN saveData.npcs:
      IF !validateNPC(npc):
        logError("Invalid NPC: " + npc.id)
        RETURN false
      END IF
    END FOR
  END IF

  // Validate territory (if version >= 3)
  IF saveData.version >= 3:
    IF saveData.territory == null:
      logError("Territory missing in v3+ save")
      RETURN false
    END IF

    FOR EACH territory IN saveData.territory.territories:
      IF !validateTerritory(territory):
        logError("Invalid territory: " + territory.id)
        RETURN false
      END IF
    END FOR
  END IF

  RETURN true
END FUNCTION

FUNCTION validateBuilding(building):
  IF building.id == null OR typeof building.id != "string":
    RETURN false
  END IF

  IF building.type == null OR typeof building.type != "string":
    RETURN false
  END IF

  IF !isValidBuildingType(building.type):
    RETURN false
  END IF

  IF building.position == null OR typeof building.position != "object":
    RETURN false
  END IF

  IF !isValidPosition(building.position):
    RETURN false
  END IF

  IF !["BLUEPRINT", "UNDER_CONSTRUCTION", "COMPLETED", "DAMAGED"].includes(building.status):
    RETURN false
  END IF

  IF typeof building.constructionProgress != "number" OR building.constructionProgress < 0:
    RETURN false
  END IF

  RETURN true
END FUNCTION

FUNCTION validateNPC(npc):
  IF npc.id == null OR typeof npc.id != "string":
    RETURN false
  END IF

  IF npc.name == null OR typeof npc.name != "string":
    RETURN false
  END IF

  IF !["GUARD", "TRADER", "CRAFTER", "SCOUT", "FARMER"].includes(npc.role):
    RETURN false
  END IF

  IF typeof npc.morale != "number" OR npc.morale < 0 OR npc.morale > 100:
    RETURN false
  END IF

  IF npc.skills == null OR typeof npc.skills != "object":
    RETURN false
  END IF

  RETURN true
END FUNCTION

FUNCTION validateTerritory(territory):
  IF territory.id == null OR typeof territory.id != "string":
    RETURN false
  END IF

  IF territory.center == null || !isValidPosition(territory.center):
    RETURN false
  END IF

  IF typeof territory.radius != "number" OR territory.radius <= 0:
    RETURN false
  END IF

  IF typeof territory.maxRadius != "number" OR territory.maxRadius < territory.radius:
    RETURN false
  END IF

  IF typeof territory.expansionCount != "number" OR territory.expansionCount < 0:
    RETURN false
  END IF

  RETURN true
END FUNCTION
```

---

## Save/Load Implementation

### Saving Game State

```pseudocode
FUNCTION saveGame(filename):
  // Gather all game state
  saveData = {
    version: CURRENT_VERSION,  // 2 for MVP
    timestamp: getCurrentTime(),
    playtime: player.getTotalPlaytime(),
    currentTier: player.getCurrentTier(),

    buildings: world.getAllBuildings().map(b => serializeBuilding(b)),
    resources: player.getResources(),
    npcs: world.getAllNPCs().map(n => serializeNPC(n)),

    // Version-specific fields
    territory: world.getTerritory(),
    technologies: player.getTechnologies(),

    // Metadata
    migrations: saveData.migrations ?? []
  }

  // Validate before saving
  IF !validateSaveData(saveData):
    logError("Cannot save: validation failed")
    RETURN false
  END IF

  // Serialize to JSON
  json = JSON.stringify(saveData, null, 2)

  // Write to file
  fileSystem.writeFile(filename, json)

  // Log success
  logEvent("Game saved to " + filename + " (v" + CURRENT_VERSION + ")")

  RETURN true
END FUNCTION
```

### Loading Game State

```pseudocode
FUNCTION loadGame(filename):
  // Read file
  TRY:
    json = fileSystem.readFile(filename)
  CATCH error:
    logError("Cannot read save file: " + error)
    RETURN false
  END TRY

  // Parse JSON
  TRY:
    saveData = JSON.parse(json)
  CATCH error:
    logError("Save file corrupted: " + error)
    RETURN false
  END CATCH

  // Load using standard load function
  result = loadSave(saveData)

  IF result.success:
    logEvent("Game loaded from " + filename + " (migrated to v" + CURRENT_VERSION + ")")
  ELSE:
    logError("Load failed: " + result.error)
  END IF

  RETURN result
END FUNCTION
```

---

## Recovery Strategies

### Corrupted Save Detection

```pseudocode
FUNCTION detectCorruption(saveData):
  issues = []

  // Check for inconsistencies
  IF saveData.buildings.length == 0:
    issues.push("No buildings in save")
  END IF

  IF saveData.resources.gold < 0:
    issues.push("Negative resources detected (soft issue)")
  END IF

  // Check building references
  buildingIds = saveData.buildings.map(b => b.id)
  FOR EACH npc IN saveData.npcs:
    IF npc.assignedBuildingId != null AND !buildingIds.includes(npc.assignedBuildingId):
      issues.push("NPC references missing building: " + npc.assignedBuildingId)
    END IF
  END FOR

  // Check territory references
  IF saveData.version >= 3:
    FOR EACH town IN saveData.town.towns:
      territoryExists = saveData.territory.territories.some(t => t.id == town.territoryId)
      IF !territoryExists:
        issues.push("Town references missing territory: " + town.territoryId)
      END IF
    END FOR
  END IF

  RETURN issues
END FUNCTION

FUNCTION recoverFromCorruption(saveData):
  issues = detectCorruption(saveData)

  FOR EACH issue IN issues:
    IF issue.includes("Negative resources"):
      // Soft issue: fix by clamping to 0
      FOR EACH resource IN saveData.resources:
        IF saveData.resources[resource] < 0:
          saveData.resources[resource] = 0
        END IF
      END FOR
      logWarning("Fixed " + issue)

    ELSE IF issue.includes("references missing"):
      // Hard issue: cannot recover
      logError("Cannot recover: " + issue)
      RETURN false
    END IF
  END FOR

  RETURN true
END FUNCTION
```

### Fallback Strategy

```pseudocode
FUNCTION loadGameWithFallback(filename):
  // Try to load save
  result = loadGame(filename)

  IF result:
    RETURN true
  END IF

  // Save is corrupted
  logWarning("Save corrupted or incompatible")

  // Ask user
  userChoice = showDialog(
    "Save is corrupted. Start new game?"
  )

  IF userChoice == "NO":
    RETURN false
  END IF

  // Start new game
  startNewGame()
  RETURN true
END FUNCTION
```

---

## Testing Migration

### Test Cases

```pseudocode
TEST SUITE: Save/Load System
├── Load v1 save
│   ├── Missing version field (heuristic detection)
│   ├── No NPC field (migrated to v2)
│   └── All buildings preserved
├── Load v2 save
│   ├── Explicit version field
│   ├── NPCs preserved
│   └── No territory (remains null until v3)
├── Load v3 save
│   ├── Territory and town data present
│   ├── Territory bonuses calculated
│   └── Town statistics valid
├── Corruption detection
│   ├── Missing buildings array → reject
│   ├── Negative resources → fix and warn
│   ├── NPC references invalid building → reject
│   └── Territory references invalid town → reject
└── Save versioning
    ├── New save creates v2 format
    ├── Playtime accumulates across loads
    ├── Tier progression preserved
    └── All buildings/NPCs/resources preserved
```

### Test Implementation

```pseudocode
FUNCTION testV1ToV2Migration():
  // Create mock v1 save
  v1Save = {
    buildings: [
      { id: "b1", type: "WALL", position: {x:0,y:0,z:0}, status: "COMPLETED", constructionProgress: 100 }
    ],
    resources: { gold: 100, wood: 50 }
  }

  // Migrate to v2
  v2Save = migrateV1ToV2(v1Save)

  // Assertions
  ASSERT_EQUAL(v2Save.version, 2)
  ASSERT_EQUAL(v2Save.buildings.length, 1)
  ASSERT_EQUAL(v2Save.buildings[0].id, "b1")
  ASSERT_ARRAY(v2Save.npcs, [])
  ASSERT_DEFINED(v2Save.npcIdCounter)
END FUNCTION

FUNCTION testV2ToV3Migration():
  // Create mock v2 save
  v2Save = {
    version: 2,
    buildings: [{ id: "b1", type: "WALL", ... }],
    npcs: [{ id: "n1", name: "Guard1", ... }],
    timestamp: 1699540000000
  }

  // Migrate to v3
  v3Save = migrateV2ToV3(v2Save)

  // Assertions
  ASSERT_EQUAL(v3Save.version, 3)
  ASSERT_DEFINED(v3Save.territory)
  ASSERT_DEFINED(v3Save.town)
  ASSERT_EQUAL(v3Save.territory.territories[0].center, {x:0,y:0,z:0})
  ASSERT_EQUAL(v3Save.town.towns[0].statistics.population, v2Save.npcs.length)
END FUNCTION

FUNCTION testCorruptionDetection():
  // Create corrupted save
  badSave = {
    version: 2,
    buildings: [],  // Empty
    resources: { gold: -50 }  // Negative
  }

  // Detect issues
  issues = detectCorruption(badSave)

  // Assertions
  ASSERT_CONTAINS(issues, "No buildings")
  ASSERT_CONTAINS(issues, "Negative resources")
END FUNCTION
```

---

## Deployment Checklist

Before launching a new version:

- [ ] Migration function written and tested
- [ ] Validation schema updated for new fields
- [ ] Test cases pass for old save files
- [ ] Fallback strategy in place (new game if unrecoverable)
- [ ] Migration history logged in save
- [ ] Version number incremented in code
- [ ] Release notes mention compatibility
- [ ] Backup old save format before release
