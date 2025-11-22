# Terrain Job System - Phase 4

Terrain job system for designating and executing terrain modification work.

## Components

### Core Classes

- **TerrainJob.js** - Individual terrain job with area, type, priority, workers
- **TerrainJobQueue.js** - Job queue management, priority sorting, assignment
- **JobTimeCalculator.js** - Time estimation based on terrain type and job type
- **TerrainWorkerBehavior.js** - NPC worker AI for terrain jobs

### UI Components

- **TerrainToolsPanel.jsx** - Tool selection UI (flatten, raise, lower, smooth)
- **useJobRenderer.js** - Visual overlays for jobs and selection

## Integration

### GameViewport Integration (✅ Complete)

The following are integrated into `GameViewport.jsx`:

- Terrain job queue initialization
- Job time calculator
- Click & drag selection for terrain areas
- Job creation on mouse release
- Visual job overlays (pending/active jobs)
- Job statistics display
- TerrainToolsPanel UI

### NPC Worker Integration (⚠️ Requires App-Level Integration)

**Status:** Worker behavior system created but not yet integrated.

**Why:** `GameViewport` receives NPCs as a prop array but doesn't have access to `NPCManager`. NPC worker behavior requires:
- Assigning NPCs to jobs
- Pathfinding NPCs to job locations
- Updating job progress based on NPC skills
- Managing worker lifecycle (assign/unassign)

**Integration Location:** Must be integrated where `NPCManager` is accessible (typically `Game.jsx` or app-level component).

**Integration Steps:**

1. Import `TerrainWorkerBehavior` in the component that manages NPCManager:
```javascript
import { TerrainWorkerBehavior } from './modules/terrain-jobs/TerrainWorkerBehavior.js';
```

2. Create worker behavior instance:
```javascript
const workerBehaviorRef = useRef(null);
if (!workerBehaviorRef.current && npcManager && jobQueue) {
  workerBehaviorRef.current = new TerrainWorkerBehavior(npcManager, jobQueue);
}
```

3. Update in game loop:
```javascript
useEffect(() => {
  const gameLoop = () => {
    const deltaTime = (Date.now() - lastUpdateTime.current) / 1000;
    lastUpdateTime.current = Date.now();

    // Update worker behavior
    if (workerBehaviorRef.current) {
      workerBehaviorRef.current.update(deltaTime);
    }

    // Other updates...
  };

  const intervalId = setInterval(gameLoop, 16); // 60 FPS
  return () => clearInterval(intervalId);
}, []);
```

4. Pass jobs to GameViewport for rendering:
```javascript
<GameViewport
  buildings={buildings}
  npcs={npcs}
  jobs={jobQueue.getAllJobs()} // Add this prop
  // ... other props
/>
```

### NPC Skill Integration (✅ Complete)

NPCs now have a `terrain_work` skill (default 1.0):
- Skill affects work speed in `TerrainWorkerBehavior`
- Skill trains while working (0.01% per second)
- Skill can range from 1.0 to 1.5x

**Location:** `src/modules/npc-system/NPCManager.js:40,56`

## Usage

### Creating Terrain Jobs

Jobs are created via click & drag in `GameViewport`:

1. Select a tool (Flatten, Raise, Lower, Smooth)
2. Click & drag to select terrain area
3. Job is created automatically on mouse release
4. Job enters queue based on priority

### Job States

- **PENDING**: Waiting for workers
- **ACTIVE**: Workers assigned and working
- **COMPLETED**: Job finished, terrain modified
- **CANCELLED**: Job cancelled by player

### Job Priority

Priority affects queue order:
- 10 = Urgent (red)
- 7-9 = High (orange)
- 4-6 = Normal (blue)
- 1-3 = Low (gray)

### Worker Assignment

`TerrainWorkerBehavior` automatically:
- Assigns idle NPCs to highest priority jobs
- Navigates NPCs to job locations
- Updates job progress based on NPC count & skills
- Frees NPCs when jobs complete

### Multi-Worker Coordination

Multiple NPCs can work on same job:
- Speed multiplier = skill × √(worker_count)
- Square root provides diminishing returns
- Workers position themselves around job area

## API

### TerrainJobQueue

```javascript
// Add job
const job = jobQueue.addJob({
  type: 'flatten',  // flatten, raise, lower, smooth
  area: { x: 5, z: 5, width: 10, depth: 10 },
  priority: 5  // 1-10
});

// Get jobs
const pendingJobs = jobQueue.getAllJobs({ state: JOB_STATE.PENDING });
const nextJob = jobQueue.getNextJob(npcPosition, npcSkills);

// Manage workers
jobQueue.assignWorker(jobId, npcId);
jobQueue.removeWorker(jobId, npcId);

// Update progress
jobQueue.updateJobProgress(jobId, deltaTimeMs, speedMultiplier);

// Statistics
const stats = jobQueue.getStatistics();
// { pending, active, completed, cancelled, totalJobs }
```

### JobTimeCalculator

```javascript
// Estimate time
const timeMs = calculator.estimateTime('flatten', {
  x: 5, z: 5, width: 10, depth: 10
});

// Format time
const formatted = JobTimeCalculator.formatTime(timeMs);
// "15s", "2m", "1h"

// Get breakdown
const breakdown = calculator.getTimeBreakdown(area);
// { dirtTiles, stoneTiles, waterTiles, totalTime }
```

### TerrainWorkerBehavior

```javascript
// Update (call each frame)
workerBehavior.update(deltaTime);

// Cancel NPC jobs
workerBehavior.cancelNPCJobs(npcId);

// Statistics
const stats = workerBehavior.getStatistics();
// { workersAssigned, activeJobs, assignments: [...] }
```

## Terrain Work Times

Base time per tile:
- **Dirt** (height 4-7): 1.0 seconds
- **Stone** (height > 7): 2.0 seconds
- **Water** (height ≤ 3): 1.5 seconds

Job type modifiers:
- **Flatten**: 0.8x (easier)
- **Smooth**: 0.5x (just reshaping)
- **Raise**: 1.0x (full time)
- **Lower**: 1.0x (full time)

## Future Enhancements

### Phase 4 Remaining Features

- [ ] Player terrain work capability (player can work on jobs manually)
- [ ] Job Management UI panel (list view, cancel/modify)
- [ ] Advanced multi-worker coordination (skill synergies)
- [ ] Job templates/patterns (save & reuse job layouts)

### Phase 5+ Ideas

- [ ] Terrain job automation (auto-assign based on blueprints)
- [ ] Job cost system (resources required for jobs)
- [ ] Job rewards (XP, resources on completion)
- [ ] Terrain job history/undo
- [ ] Job chains (sequential job execution)
- [ ] NPC specialization (terrain work specialists)
- [ ] Tools/equipment system (better tools = faster work)
- [ ] Job hazards (cave-ins, water flooding)

## Testing

Unit tests needed:
- TerrainJob creation and state transitions
- TerrainJobQueue sorting and assignment
- JobTimeCalculator accuracy
- TerrainWorkerBehavior assignment logic

Integration tests needed:
- End-to-end job workflow
- Multi-worker coordination
- Job cancellation and cleanup
- Edge cases (no workers, job conflicts)

## Performance

- Job queue is sorted only when priority changes
- Worker assignment checks run every 1 second (configurable)
- Job progress updates are per-frame but lightweight
- Maximum recommended jobs: 100 active, 500 total

## Known Issues

None currently.

## Contributing

When modifying terrain job system:

1. Update this README
2. Add unit tests for new functionality
3. Test with multiple concurrent jobs
4. Verify NPC pathfinding to job sites
5. Check job statistics accuracy
6. Test on mobile (touch input for selection)
