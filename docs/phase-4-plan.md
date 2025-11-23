# Phase 4: Terrain Work & Job System - Implementation Plan

**Date**: 2025-11-21
**Status**: Planning
**Complexity**: High (job system + worker AI + UI + skill progression)

## Overview

Phase 4 transforms terrain editing from instant API calls into a time-based job system where NPCs and the player character perform terrain work. This adds depth, realism, and gameplay mechanics to terrain modification.

## Core Design Principles

1. **Player Commands, Characters Execute** - Player designates work, NPCs/player perform it
2. **Time-Based Progression** - Different terrain types take different amounts of time
3. **Skill Development** - Workers improve with experience
4. **Cooperative Work** - Multiple workers can accelerate jobs
5. **Priority Management** - Player controls which jobs get done first

## Feature Breakdown

### Feature 1: Terrain Job System (Core)

**Purpose**: Queue and manage terrain modification jobs

**Components**:

**TerrainJobQueue Class**:
```javascript
class TerrainJobQueue {
  constructor() {
    this.jobs = [];           // Array of pending jobs
    this.activeJobs = [];     // Jobs currently being worked on
    this.completedJobs = [];  // Job history
    this.nextJobId = 0;
  }

  addJob(job) {
    // Add job to queue with priority
    // job = { type, area, priority, estimatedTime }
  }

  getNextJob(workerPosition, workerSkills) {
    // Return best job for this worker
    // Consider: priority, distance, worker skill
  }

  assignWorker(jobId, workerId) {
    // Assign worker to job
  }

  updateJobProgress(jobId, deltaTime, workerSkill) {
    // Update job completion percentage
    // Skill affects speed
  }

  completeJob(jobId) {
    // Execute terrain modification
    // Remove from active jobs
    // Add to history
  }
}
```

**TerrainJob Class**:
```javascript
class TerrainJob {
  constructor(options) {
    this.id = options.id;
    this.type = options.type;           // 'flatten', 'raise', 'lower', 'smooth'
    this.area = options.area;           // { x, z, width, depth }
    this.priority = options.priority;   // 1-10 (10 = highest)
    this.targetValue = options.target;  // For raise/lower: amount
    this.state = 'pending';             // 'pending', 'active', 'completed', 'cancelled'
    this.progress = 0;                  // 0-1 (0-100%)
    this.assignedWorkers = [];          // Worker IDs
    this.estimatedTime = 0;             // Milliseconds
    this.actualTime = 0;                // Milliseconds elapsed
    this.createdAt = Date.now();
  }
}
```

**Job Time Calculation**:
```javascript
// Base time per tile (milliseconds)
const TERRAIN_WORK_TIME = {
  dirt: 1000,      // 1 second per dirt tile
  stone: 2000,     // 2 seconds per stone tile (height > 7)
  water: 1500,     // 1.5 seconds per water tile (height ≤ 3)
  flatten: 800,    // 0.8 seconds per tile (easier than digging)
  smooth: 500      // 0.5 seconds per tile (just reshaping)
};

function calculateJobTime(job, terrainSystem) {
  const { area } = job;
  let totalTime = 0;

  for (let z = area.z; z < area.z + area.depth; z++) {
    for (let x = area.x; x < area.x + area.width; x++) {
      const height = terrainSystem.getHeight(x, z);

      // Determine terrain type
      let tileTime;
      if (height > 7) tileTime = TERRAIN_WORK_TIME.stone;
      else if (height <= 3) tileTime = TERRAIN_WORK_TIME.water;
      else tileTime = TERRAIN_WORK_TIME.dirt;

      // Job type modifier
      if (job.type === 'flatten') tileTime *= 0.8;
      if (job.type === 'smooth') tileTime *= 0.5;

      totalTime += tileTime;
    }
  }

  return totalTime;
}
```

**Priority System**:
```javascript
const JOB_PRIORITY = {
  LOW: 1,
  NORMAL: 5,
  HIGH: 8,
  URGENT: 10
};

// Jobs sorted by:
// 1. Priority (descending)
// 2. Creation time (ascending - older first)
// 3. Distance to available worker (ascending - closer first)
```

**Estimated Complexity**: Medium (7-10 hours)
**Files**: `src/modules/terrain-jobs/TerrainJobQueue.js`, `src/modules/terrain-jobs/TerrainJob.js`

---

### Feature 2: Job Designation UI

**Purpose**: Allow player to select areas and designate terrain work

**Components**:

**Terrain Tool Mode**:
```javascript
// Add to GameViewport state
const [terrainToolMode, setTerrainToolMode] = useState(null);
// null, 'flatten', 'raise', 'lower', 'smooth'

const [selectionStart, setSelectionStart] = useState(null);
const [selectionEnd, setSelectionEnd] = useState(null);
```

**Selection Overlay Rendering**:
```javascript
// Render semi-transparent rectangle over selected area
function renderJobSelection(ctx, start, end, toolMode) {
  const color = {
    flatten: 'rgba(255, 255, 0, 0.3)',  // Yellow
    raise: 'rgba(0, 255, 0, 0.3)',      // Green
    lower: 'rgba(255, 0, 0, 0.3)',      // Red
    smooth: 'rgba(0, 150, 255, 0.3)'    // Blue
  }[toolMode];

  ctx.fillStyle = color;
  ctx.fillRect(start.x, start.y, end.x - start.x, end.y - start.y);

  // Draw border
  ctx.strokeStyle = color.replace('0.3', '0.8');
  ctx.lineWidth = 2;
  ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
}
```

**Job Overlay Rendering**:
```javascript
// Render all pending/active jobs
function renderJobOverlays(ctx, jobs, worldToCanvas) {
  for (const job of jobs) {
    const start = worldToCanvas(job.area.x, job.area.z);
    const end = worldToCanvas(
      job.area.x + job.area.width,
      job.area.z + job.area.depth
    );

    // Different colors for pending vs active
    const color = job.state === 'active'
      ? 'rgba(0, 255, 0, 0.2)'
      : 'rgba(255, 255, 255, 0.2)';

    ctx.fillStyle = color;
    ctx.fillRect(start.x, start.y, end.x - start.x, end.y - start.y);

    // Progress bar
    if (job.state === 'active') {
      const barHeight = 4;
      const barY = start.y - 10;
      const barWidth = (end.x - start.x) * job.progress;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(start.x, barY, end.x - start.x, barHeight);

      ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
      ctx.fillRect(start.x, barY, barWidth, barHeight);
    }
  }
}
```

**Terrain Tools Panel**:
```jsx
// New UI component
function TerrainToolsPanel({ onToolSelect, activeTool, onPriorityChange }) {
  return (
    <div className="terrain-tools-panel">
      <h3>Terrain Tools</h3>
      <button
        className={activeTool === 'flatten' ? 'active' : ''}
        onClick={() => onToolSelect('flatten')}
      >
        🏗️ Flatten
      </button>
      <button
        className={activeTool === 'raise' ? 'active' : ''}
        onClick={() => onToolSelect('raise')}
      >
        ⬆️ Raise
      </button>
      <button
        className={activeTool === 'lower' ? 'active' : ''}
        onClick={() => onToolSelect('lower')}
      >
        ⬇️ Lower
      </button>
      <button
        className={activeTool === 'smooth' ? 'active' : ''}
        onClick={() => onToolSelect('smooth')}
      >
        〰️ Smooth
      </button>

      <div className="priority-selector">
        <label>Priority:</label>
        <select onChange={(e) => onPriorityChange(e.target.value)}>
          <option value="1">Low</option>
          <option value="5">Normal</option>
          <option value="8">High</option>
          <option value="10">Urgent</option>
        </select>
      </div>

      <button onClick={() => onToolSelect(null)}>❌ Cancel</button>
    </div>
  );
}
```

**User Flow**:
1. Player clicks "Flatten" button
2. Player clicks and drags on terrain to select area
3. Preview overlay shows selected area and estimated time/cost
4. Player confirms → Job added to queue
5. Visual overlay remains until job completed

**Estimated Complexity**: Medium (8-12 hours)
**Files**: `src/components/TerrainToolsPanel.jsx`, `src/rendering/useJobRenderer.js`, updates to `GameViewport.jsx`

---

### Feature 3: NPC Terrain Worker Integration

**Purpose**: NPCs can work on terrain jobs

**Components**:

**TerrainWorker Behavior** (extends existing NPC system):
```javascript
// Add to NPCManager
class NPCManager {
  assignTerrainWork(npcId, jobId) {
    const npc = this.npcs.get(npcId);
    npc.currentJob = jobId;
    npc.state = 'WORKING_TERRAIN';

    // Pathfind to job location
    const job = terrainJobQueue.getJob(jobId);
    const targetPos = job.area; // Center of work area
    this.pathfindToLocation(npcId, targetPos);
  }

  updateNPC(npc, deltaTime) {
    if (npc.state === 'WORKING_TERRAIN') {
      // If not at job site, move towards it
      if (!this.isAtLocation(npc, npc.currentJob.area)) {
        this.moveAlongPath(npc, deltaTime);
        return;
      }

      // Work on job
      const job = terrainJobQueue.getJob(npc.currentJob);
      const skillMultiplier = this.getSkillMultiplier(npc, 'terrain_work');

      terrainJobQueue.updateJobProgress(
        job.id,
        deltaTime * skillMultiplier,
        npc.skills.terrain_work
      );

      // Animate
      this.playWorkAnimation(npc);

      // Check if job complete
      if (job.progress >= 1.0) {
        this.completeTerrainWork(npc, job);
      }
    }
  }

  completeTerrainWork(npc, job) {
    // Execute terrain modification
    terrainJobQueue.completeJob(job.id);

    // Gain skill experience
    this.gainSkillXP(npc, 'terrain_work', job.estimatedTime / 1000);

    // Find next job or idle
    npc.currentJob = null;
    npc.state = 'IDLE';
    this.assignNextJob(npc);
  }
}
```

**NPC Skill System**:
```javascript
// Add to NPC data structure
npc.skills = {
  terrain_work: 1,  // Level 1-10
  terrain_work_xp: 0
};

function getSkillMultiplier(skillLevel) {
  // Level 1: 1.0x speed (normal)
  // Level 5: 1.5x speed (50% faster)
  // Level 10: 2.0x speed (100% faster)
  return 1.0 + (skillLevel - 1) * 0.11;
}

function gainSkillXP(npc, skill, xpAmount) {
  npc.skills[skill + '_xp'] += xpAmount;

  // Level up every 100 XP
  const xpForNextLevel = npc.skills[skill] * 100;
  if (npc.skills[skill + '_xp'] >= xpForNextLevel) {
    npc.skills[skill]++;
    npc.skills[skill + '_xp'] -= xpForNextLevel;
    console.log(`${npc.name} leveled up ${skill} to ${npc.skills[skill]}!`);
  }
}
```

**Work Animations**:
```javascript
// Animation states for terrain work
const WORK_ANIMATIONS = {
  flatten: 'digging',   // NPC digs with shovel
  raise: 'building',    // NPC places dirt
  lower: 'digging',     // NPC digs
  smooth: 'raking'      // NPC smooths with rake
};

function playWorkAnimation(npc) {
  // Trigger animation based on job type
  // Could be sprite animation, or simple bobbing motion
  const animation = WORK_ANIMATIONS[npc.currentJob.type];
  npc.currentAnimation = animation;
  npc.animationFrame = (npc.animationFrame + 0.1) % 1.0;
}
```

**Auto-Assignment**:
```javascript
// Automatically assign idle workers to jobs
function autoAssignWorkers(terrainJobQueue, npcManager) {
  const idleWorkers = npcManager.getIdleNPCs();

  for (const worker of idleWorkers) {
    const bestJob = terrainJobQueue.getNextJob(
      worker.position,
      worker.skills
    );

    if (bestJob) {
      npcManager.assignTerrainWork(worker.id, bestJob.id);
    }
  }
}

// Call every second or when job added
setInterval(() => autoAssignWorkers(terrainJobQueue, npcManager), 1000);
```

**Estimated Complexity**: High (12-16 hours)
**Files**: Updates to `src/modules/npc-system/NPCManager.js`, new `src/modules/terrain-jobs/TerrainWorkerBehavior.js`

---

### Feature 4: Player Terrain Work

**Purpose**: Player character can also perform terrain work

**Components**:

**Player Work State**:
```javascript
// Add to PlayerEntity
player.currentTerrainJob = null;
player.skills = {
  terrain_work: 1,
  terrain_work_xp: 0
};

function startPlayerWork(jobId) {
  player.currentTerrainJob = jobId;
  player.state = 'WORKING_TERRAIN';

  // Pathfind to job (if needed)
  const job = terrainJobQueue.getJob(jobId);
  // ... pathfinding logic
}
```

**Player Work Controls**:
```jsx
// Show when player near a job
function TerrainJobPrompt({ job, onAccept, onCancel }) {
  return (
    <div className="job-prompt">
      <p>Terrain work available: {job.type}</p>
      <p>Estimated time: {formatTime(job.estimatedTime)}</p>
      <button onClick={onAccept}>Start Working (E)</button>
      <button onClick={onCancel}>Ignore</button>
    </div>
  );
}
```

**Player Work Update**:
```javascript
// In game loop
function updatePlayer(deltaTime) {
  if (player.state === 'WORKING_TERRAIN') {
    const job = terrainJobQueue.getJob(player.currentTerrainJob);

    // Work on job
    const skillMultiplier = getSkillMultiplier(player.skills.terrain_work);
    terrainJobQueue.updateJobProgress(
      job.id,
      deltaTime * skillMultiplier,
      player.skills.terrain_work
    );

    // Gain XP
    gainSkillXP(player, 'terrain_work', deltaTime / 1000);

    // Check completion
    if (job.progress >= 1.0) {
      completePlayerWork(player, job);
    }
  }
}
```

**Skill Display**:
```jsx
// Show in player stats
function PlayerSkills({ player }) {
  const terrainSkill = player.skills.terrain_work;
  const xp = player.skills.terrain_work_xp;
  const xpForNext = terrainSkill * 100;

  return (
    <div className="player-skills">
      <h3>Skills</h3>
      <div className="skill">
        <span>Terrain Work: Level {terrainSkill}</span>
        <div className="xp-bar">
          <div
            className="xp-progress"
            style={{ width: `${(xp / xpForNext) * 100}%` }}
          />
        </div>
        <span>{xp}/{xpForNext} XP</span>
      </div>
    </div>
  );
}
```

**Estimated Complexity**: Medium (6-8 hours)
**Files**: Updates to `src/entities/PlayerEntity.js`, new `src/components/TerrainJobPrompt.jsx`, `src/components/PlayerSkills.jsx`

---

### Feature 5: Multi-Worker Coordination

**Purpose**: Multiple workers can collaborate on same job

**Components**:

**Job Worker Capacity**:
```javascript
// Jobs have max workers based on area size
function getMaxWorkers(job) {
  const area = job.area.width * job.area.depth;

  // 1 worker per 9 tiles (3x3 area)
  return Math.max(1, Math.floor(area / 9));
}

// Example:
// 3x3 job = 1 worker
// 6x6 job = 4 workers
// 10x10 job = 11 workers
```

**Worker Positioning**:
```javascript
// Distribute workers around job perimeter
function getWorkerPosition(job, workerIndex, totalWorkers) {
  const { area } = job;
  const perimeter = 2 * (area.width + area.depth);
  const spacing = perimeter / totalWorkers;
  const position = workerIndex * spacing;

  // Calculate position along perimeter
  if (position < area.width) {
    // Top edge
    return { x: area.x + position, z: area.z };
  } else if (position < area.width + area.depth) {
    // Right edge
    return { x: area.x + area.width, z: area.z + (position - area.width) };
  }
  // ... continue for bottom and left edges
}
```

**Cooperative Progress**:
```javascript
function updateJobProgress(job, deltaTime) {
  let totalSpeedMultiplier = 0;

  // Sum speed multipliers from all workers
  for (const workerId of job.assignedWorkers) {
    const worker = getWorker(workerId);
    const skillMultiplier = getSkillMultiplier(worker.skills.terrain_work);
    totalSpeedMultiplier += skillMultiplier;
  }

  // Progress faster with more workers
  const progressDelta = (deltaTime / job.estimatedTime) * totalSpeedMultiplier;
  job.progress = Math.min(1.0, job.progress + progressDelta);
}
```

**Worker Limit UI**:
```jsx
// Show worker status on job
function JobWorkerDisplay({ job }) {
  const maxWorkers = getMaxWorkers(job);
  const currentWorkers = job.assignedWorkers.length;

  return (
    <div className="job-workers">
      <span>Workers: {currentWorkers}/{maxWorkers}</span>
      {currentWorkers < maxWorkers && (
        <button onClick={() => assignMoreWorkers(job)}>
          Assign More Workers
        </button>
      )}
    </div>
  );
}
```

**Estimated Complexity**: Medium (6-8 hours)
**Files**: Updates to `TerrainJobQueue.js`, `TerrainWorkerBehavior.js`

---

### Feature 6: Job Priority & Management UI

**Purpose**: Player can view, prioritize, and cancel jobs

**Components**:

**Job List Panel**:
```jsx
function TerrainJobListPanel({ jobs, onPriorityChange, onCancel }) {
  const [sortBy, setSortBy] = useState('priority');

  const sortedJobs = [...jobs].sort((a, b) => {
    if (sortBy === 'priority') return b.priority - a.priority;
    if (sortBy === 'time') return a.createdAt - b.createdAt;
    if (sortBy === 'progress') return b.progress - a.progress;
  });

  return (
    <div className="job-list-panel">
      <h3>Terrain Jobs ({jobs.length})</h3>

      <div className="sort-controls">
        <button onClick={() => setSortBy('priority')}>Sort by Priority</button>
        <button onClick={() => setSortBy('time')}>Sort by Time</button>
        <button onClick={() => setSortBy('progress')}>Sort by Progress</button>
      </div>

      <div className="job-list">
        {sortedJobs.map(job => (
          <JobListItem
            key={job.id}
            job={job}
            onPriorityChange={onPriorityChange}
            onCancel={onCancel}
          />
        ))}
      </div>
    </div>
  );
}

function JobListItem({ job, onPriorityChange, onCancel }) {
  return (
    <div className={`job-item ${job.state}`}>
      <div className="job-header">
        <span className="job-type">{job.type}</span>
        <span className="job-area">{job.area.width}x{job.area.depth}</span>
      </div>

      <div className="job-progress">
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${job.progress * 100}%` }}
          />
        </div>
        <span>{Math.floor(job.progress * 100)}%</span>
      </div>

      <div className="job-workers">
        Workers: {job.assignedWorkers.length}/{getMaxWorkers(job)}
      </div>

      <div className="job-controls">
        <select
          value={job.priority}
          onChange={(e) => onPriorityChange(job.id, e.target.value)}
        >
          <option value="1">Low</option>
          <option value="5">Normal</option>
          <option value="8">High</option>
          <option value="10">Urgent</option>
        </select>

        <button onClick={() => onCancel(job.id)}>Cancel</button>
      </div>
    </div>
  );
}
```

**Job Statistics**:
```jsx
function JobStatistics({ jobs, workers }) {
  const pendingJobs = jobs.filter(j => j.state === 'pending').length;
  const activeJobs = jobs.filter(j => j.state === 'active').length;
  const idleWorkers = workers.filter(w => !w.currentJob).length;

  return (
    <div className="job-statistics">
      <div className="stat">
        <span>Pending:</span> {pendingJobs}
      </div>
      <div className="stat">
        <span>Active:</span> {activeJobs}
      </div>
      <div className="stat">
        <span>Idle Workers:</span> {idleWorkers}
      </div>
    </div>
  );
}
```

**Estimated Complexity**: Medium (8-10 hours)
**Files**: `src/components/TerrainJobListPanel.jsx`, `src/components/JobStatistics.jsx`

---

## Integration with Existing Systems

### Building Placement Auto-Flatten Jobs

**When player places building on uneven terrain:**
```javascript
function placeBuildingWithFlatten(building, terrainSystem, jobQueue) {
  const { x, z, width, depth } = building;

  // Check if flatten needed
  const flatCheck = terrainSystem.isRegionFlat(x, z, width, depth, 1);

  if (!flatCheck.flat) {
    // Calculate flatten cost
    const cost = terrainSystem.calculateFlattenCost(x, z, width, depth);

    // Create flatten job automatically
    const job = new TerrainJob({
      type: 'flatten',
      area: { x, z, width, depth },
      priority: 8, // High priority (for building)
      targetValue: cost.targetHeight
    });

    jobQueue.addJob(job);

    // Show message to player
    showNotification(
      `Flatten job created: ${cost.cellsAffected} tiles, ~${formatTime(job.estimatedTime)}`
    );

    // Building placed in "pending" state until flatten complete
    building.state = 'PENDING_FLATTEN';
    building.linkedJobId = job.id;
  }
}
```

### Resource Economy Integration (Optional)

**If you want to add resource costs later:**
```javascript
const TERRAIN_WORK_RESOURCES = {
  flatten: { stamina: 10 },
  raise: { stamina: 15, dirt: 1 },
  lower: { stamina: 15 },
  smooth: { stamina: 5 }
};

function canAffordJob(job, resources) {
  const cost = TERRAIN_WORK_RESOURCES[job.type];
  for (const [resource, amount] of Object.entries(cost)) {
    if (resources[resource] < amount * job.area.width * job.area.depth) {
      return false;
    }
  }
  return true;
}
```

---

## Testing Strategy

### Unit Tests (per feature)

**TerrainJobQueue Tests** (15 tests):
- Add job to queue
- Get next job by priority
- Get next job by distance
- Assign worker to job
- Update job progress
- Complete job
- Cancel job
- Handle multiple workers
- Priority sorting
- Worker skill multipliers

**TerrainWorker Tests** (12 tests):
- Assign NPC to job
- NPC pathfinds to job
- NPC works on job
- NPC completes job
- NPC gains skill XP
- NPC levels up skill
- Multiple NPCs on same job
- NPC switches to higher priority job
- Player works on job
- Player gains XP

**Job UI Tests** (8 tests):
- Render job selection overlay
- Render pending jobs
- Render active jobs with progress
- Update job priority
- Cancel job
- Sort jobs by priority/time/progress
- Display job statistics

### Integration Tests (20 tests)

**Job System Integration**:
```javascript
describe('Phase 4: Terrain Job System Integration', () => {
  test('should create job and assign worker automatically');
  test('should complete job and modify terrain');
  test('should handle multiple workers on one job');
  test('should respect job priority');
  test('should calculate job time based on terrain type');
  test('should apply worker skill multipliers');
  test('should level up worker skills');
  test('should auto-create flatten job for building placement');
  test('should handle job cancellation mid-work');
  test('should reassign workers when job cancelled');
  // ... 10 more tests
});
```

### Performance Tests

- 100 pending jobs: job queue performance
- 50 active jobs with workers: simulation performance
- Job overlay rendering: <2ms per frame
- Worker pathfinding to jobs: <5ms per worker

---

## Technical Architecture

### Module Structure

```
src/modules/terrain-jobs/
├── TerrainJobQueue.js       (Job queue management)
├── TerrainJob.js             (Job data structure)
├── TerrainWorkerBehavior.js  (Worker AI logic)
├── JobTimeCalculator.js      (Time estimation)
└── __tests__/
    ├── TerrainJobQueue.test.js
    ├── TerrainWorkerBehavior.test.js
    └── Phase4Integration.test.js

src/components/
├── TerrainToolsPanel.jsx     (Tool selection UI)
├── TerrainJobListPanel.jsx   (Job management UI)
├── TerrainJobPrompt.jsx      (Player work prompt)
└── PlayerSkills.jsx          (Skill display)

src/rendering/
└── useJobRenderer.js         (Job overlay rendering)
```

### State Management

**Global State** (useGameStore or context):
```javascript
{
  terrainJobs: {
    queue: TerrainJobQueue,
    activeJobs: [],
    completedJobs: []
  },

  terrainTool: {
    mode: null,           // 'flatten', 'raise', etc.
    selection: null,      // {start, end}
    priority: 5
  },

  workers: {
    npcs: Map<id, npc>,
    player: PlayerEntity
  }
}
```

### Event System

**Job Events**:
```javascript
// Emit events for job lifecycle
eventBus.emit('job:created', job);
eventBus.emit('job:started', job);
eventBus.emit('job:progress', { job, progress });
eventBus.emit('job:completed', job);
eventBus.emit('job:cancelled', job);

// Listen for events in UI
eventBus.on('job:completed', (job) => {
  showNotification(`Terrain work completed: ${job.type}`);
  playSoundEffect('job_complete');
});
```

---

## Implementation Timeline

**Total Estimated Time**: 55-70 hours

### Week 1 (20-25 hours)
- Feature 1: Terrain Job System (10 hours)
- Feature 2: Job Designation UI (10-12 hours)
- Unit tests for Features 1-2 (3 hours)

### Week 2 (20-25 hours)
- Feature 3: NPC Worker Integration (12-16 hours)
- Feature 4: Player Terrain Work (6-8 hours)
- Unit tests for Features 3-4 (2-3 hours)

### Week 3 (15-20 hours)
- Feature 5: Multi-Worker Coordination (6-8 hours)
- Feature 6: Job Priority & Management UI (8-10 hours)
- Integration tests (20 tests) (4-6 hours)
- Polish and bug fixes (3-5 hours)

---

## Phase 4 Deliverables

### Code Deliverables
- ✅ TerrainJobQueue system (job management)
- ✅ TerrainWorker AI behavior (NPC/player work)
- ✅ Job designation UI (select and create jobs)
- ✅ Job management UI (view, prioritize, cancel)
- ✅ Multi-worker coordination
- ✅ Skill progression system
- ✅ Visual feedback (overlays, progress bars, animations)
- ✅ Building auto-flatten integration

### Test Deliverables
- ✅ 35+ unit tests (job queue, workers, UI)
- ✅ 20+ integration tests (full job lifecycle)
- ✅ Performance benchmarks
- ✅ 100% test coverage on core systems

### Documentation Deliverables
- ✅ Phase 4 completion report
- ✅ API documentation (TerrainJobQueue, TerrainWorker)
- ✅ User guide (how to use terrain tools)
- ✅ Developer guide (extending job system)

---

## Success Criteria

Phase 4 is complete when:

1. ✅ Player can designate terrain work areas with UI
2. ✅ Jobs are queued with configurable priority
3. ✅ NPCs automatically work on jobs based on priority
4. ✅ Multiple NPCs can work on same job
5. ✅ Player character can also work on jobs
6. ✅ Workers gain skill XP and level up
7. ✅ Visual overlays show pending/active jobs
8. ✅ Progress bars show job completion status
9. ✅ Building placement auto-creates flatten jobs
10. ✅ All tests passing (55+ tests)
11. ✅ Performance targets met (<2ms UI, <5ms pathfinding)
12. ✅ Documentation complete

---

## Future Enhancements (Phase 5+?)

### Possible additions after Phase 4:
- **Resource costs** (dirt, stone, stamina)
- **Tool requirements** (shovel, pickaxe for faster work)
- **Weather effects** (rain slows terrain work)
- **Terrain damage** (erosion creates auto-repair jobs)
- **Advanced skills** (excavation, masonry, landscaping)
- **Job templates** (save and reuse common job patterns)
- **Waypoint systems** (designate multiple jobs at once)

---

## Questions & Decisions Needed

Before starting implementation:

1. **NPC Worker Assignment**: Automatic only, or can player manually assign NPCs to jobs?
   - Suggestion: Automatic by default, with manual override option

2. **Work Animations**: Simple (bobbing motion) or detailed (sprite animations)?
   - Suggestion: Start simple, add sprites later

3. **Skill Caps**: Should skills cap at level 10, or unlimited?
   - Suggestion: Cap at 10 for balance

4. **Job Cancellation**: Refund any progress made, or lose all work?
   - Suggestion: No refund (partial progress lost), more realistic

5. **UI Placement**: Sidebar panel, or floating windows?
   - Suggestion: Sidebar like other game panels (BuildMenu, etc.)

---

## Ready to Start Phase 4?

This plan provides:
- ✅ Complete feature breakdown (6 features)
- ✅ Technical architecture
- ✅ Implementation timeline (3 weeks)
- ✅ Testing strategy (55+ tests)
- ✅ Integration with existing systems
- ✅ Clear success criteria

**Next Steps**:
1. Review and approve this plan
2. Answer the 5 questions above (or go with suggestions)
3. Begin implementation: Feature 1 (Terrain Job System)

**Let me know if you'd like to:**
- Adjust any features
- Add/remove functionality
- Change implementation approach
- Start coding immediately!
