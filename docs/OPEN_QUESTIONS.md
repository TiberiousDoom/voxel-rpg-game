# Open Questions

Decisions waiting on the project owner, collected so work can resume later. Each has a proposed default; anything not overridden can start with the default.

_Last updated: 2026-11-11_

## Repository state

- **Branch `claude/sweet-hopper-28hqmt` is not merged into `main`.** It is 4 commits ahead and contains:
  - `5856fe3` Remove dead code (legacy 2D game, module system, unused assets)
  - `3dd60b1` Roadmap & vision audit (`docs/ROADMAP_AUDIT.md`)
  - `3512b92` Unified dev overlay (`src/components/dev/`)
  - `62e8654` Phase 3 detailed plan (`docs/phases/PHASE_3_DETAILED_PLAN.md`)

  Lint, tests and build passed on this branch. **Question:** open a PR and merge it into `main`?
- After the organization transfer, update `package.json` (`homepage: https://TiberiousDoom.github.io/voxel-rpg-game`, `author`, `repository.url`) to the new owner, and re-enable GitHub Pages/Actions on the new repo so `.github/workflows/deploy.yml` deploys. `vite.config.js` `base: '/voxel-rpg-game/'` stays correct if the repo name is unchanged.

## Phase 3 — decisions needed

From [`docs/phases/PHASE_3_DETAILED_PLAN.md`](phases/PHASE_3_DETAILED_PLAN.md#decisions-needed).

| # | Question | Proposed default |
|---|----------|------------------|
| 1 | Finish all Phase 2 leftovers first, or only housing, the NPC schedule and the NPC panel? | Only housing + schedule + NPC panel; dashboard and farming later |
| 2 | Wire in the settlement engine (`SettlementBridge`) before guard/shelter logic? | Yes, if it fits in weeks 1–3 |
| 3 | Permanent NPC death? | No — NPCs are knocked down and recover (or leave if hit again while down) |
| 4 | Enemy navigation: full pathfinding or simple steering? | Steering + breaking through walls; A* only if playtests show stuck raids |
| 5 | Can monsters break blocks? | Only player-placed wood/stone defenses, never terrain |
| 6 | Map scope | Rift list in the pause menu now; real map in Phase 5 |
| 7 | Companion's role | Out of Phase 3; consider the companion rescue story as its own short phase (biggest gap vs. the vision) |

## Phase 3 — open questions

| # | Question | Proposed default |
|---|----------|------------------|
| 1 | Can player spells hurt NPCs? | No; area spells skip NPCs |
| 2 | Do goblins that steal from stockpiles drop the loot when killed? | Yes |
| 3 | "Peaceful builder" mode (no raids, no rift resurgence) — Phase 3 or Phase 5? | Undecided |
| 4 | Do guards use up weapon durability? (Tool durability isn't implemented yet.) | Undecided |
| 5 | NPC recruitment | Defer to Phase 5 trade caravans |

## Known bugs found while planning (not yet fixed)

- **Closed rifts reopen after a reload** — rift state isn't saved; `RiftController` recreates rifts from the seed on load. Fixed by Phase 3 task 3.0.1.
- **The rift anchor is almost never attacked** — `Enemy.jsx` ignores `targetPosition`, and `RiftController`'s anchor-hit check uses each enemy's spawn position instead of `store._enemyPositions`. Fixed by Phase 3 task 3.0.2.

## Other follow-ups from the roadmap audit

See [`docs/ROADMAP_AUDIT.md`](ROADMAP_AUDIT.md) for the full list. The largest: the companion story, weather, quests and skill points exist in code but are never activated or have no UI.
