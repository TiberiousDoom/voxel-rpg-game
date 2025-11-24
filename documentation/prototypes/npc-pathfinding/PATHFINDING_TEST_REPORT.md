# NPC Pathfinding Performance Test Results

**Date**: 2025-11-09T02:02:31.095Z

## Summary

### Test: 50 NPCs

**Result**: ✓ PASS

| Metric | Value |
|--------|-------|
| Average FPS | 6262.2 |
| Min FPS | 79.3 |
| Max FPS | 9514.5 |
| Average Frame Time | 0.16ms |
| Pathfinding Time | 0.02ms |
| Movement Time | 0.13ms |
| Distance Traveled | 41853.55 cells |
| Stuck Recoveries | 0 |

### Test: 100 NPCs

**Result**: ✓ PASS

| Metric | Value |
|--------|-------|
| Average FPS | 3997.8 |
| Min FPS | 121.9 |
| Max FPS | 19625.9 |
| Average Frame Time | 0.25ms |
| Pathfinding Time | 0.01ms |
| Movement Time | 0.22ms |
| Distance Traveled | 83809.82 cells |
| Stuck Recoveries | 0 |

## Verdict

✓ **ALL TESTS PASSED**

The NPC pathfinding prototype meets all performance requirements:
- 50 NPCs run at 6262.2 FPS (target: 60)
- 100 NPCs run at 3997.8 FPS (target: 30)