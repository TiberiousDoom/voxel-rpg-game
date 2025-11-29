# Documentation

**Last Updated:** 2025-11-29
**Purpose:** Project documentation and archives

---

## Current Structure

```
documentation/
├── README.md                   - This file
├── planning/                   - Active planning documents
│   ├── VISION_2D.md
│   ├── ROADMAP_2D.md
│   ├── NPC_SYSTEM_DESIGN_2D.md
│   └── 2D_GAME_IMPLEMENTATION_PLAN.md
├── reports/
│   └── audits/                 - Audit reports
│       └── IMPLEMENTATION_AUDIT_2025-11-29.md
└── archive-code/               - Archived code and documentation
    └── 2d-prototype/           - Complete 2D React prototype archive
```

---

## Active Planning Documents

All planning documents are consolidated in `documentation/planning/`:

| Document | Purpose | Use When |
|----------|---------|----------|
| [VISION_2D.md](planning/VISION_2D.md) | Creative vision, design principles | Understanding **why** decisions are made |
| [ROADMAP_2D.md](planning/ROADMAP_2D.md) | Phase overview, milestones, fundraising | Planning **what** to build and **when** |
| [NPC_SYSTEM_DESIGN_2D.md](planning/NPC_SYSTEM_DESIGN_2D.md) | NPC behavior architecture | Implementing NPC systems |
| [2D_GAME_IMPLEMENTATION_PLAN.md](planning/2D_GAME_IMPLEMENTATION_PLAN.md) | Technical specifications | Implementing **how** to build features |

### Document Relationships

```
VISION_2D.md (Why)
     ↓
ROADMAP_2D.md (What/When)
     ↓
2D_GAME_IMPLEMENTATION_PLAN.md (How) ←→ NPC_SYSTEM_DESIGN_2D.md (NPC Details)
```

---

## Audit Reports

Reports comparing implementation against documentation:

| File | Description | Date |
|------|-------------|------|
| [IMPLEMENTATION_AUDIT_2025-11-29-v2.md](reports/audits/IMPLEMENTATION_AUDIT_2025-11-29-v2.md) | **Mobile compliance audit (v1.2 spec)** | 2025-11-29 |
| [IMPLEMENTATION_AUDIT_2025-11-29.md](reports/audits/IMPLEMENTATION_AUDIT_2025-11-29.md) | Phase 0/1 desktop audit (superseded) | 2025-11-29 |

---

## Archived Content

### 2D React Prototype (`archive-code/2d-prototype/`)

**Archived:** November 2025
**Reason:** Project transitioning to new implementation based on 2D planning documents

The complete React/JavaScript 2D prototype has been archived, including:

| Directory | Description |
|-----------|-------------|
| `src/` | Complete source code (components, systems, rendering, etc.) |
| `scripts/` | Build and generation scripts |
| `tools/` | Sprite generator and utilities |
| `docs/` | Original game vision documents |
| `public/` | React entry HTML and config files |
| `documentation/` | All historical documentation (planning, reports, guides, etc.) |

**Key Documents in Archive:**
- `ARCHITECTURE.md` - System architecture documentation
- `CURRENT_STATUS.md` - Development status at time of archive
- `DEVELOPMENT_GUIDE.md` - Implementation patterns and formulas
- `documentation/planning/` - All previous implementation plans
- `documentation/reports/` - Audit reports and phase completion reports
- `documentation/history/` - Development notes and investigations

**Note:** Game assets remain in `public/assets/` and were NOT archived.

See [archive-code/2d-prototype/README.md](archive-code/2d-prototype/README.md) for restoration instructions.

---

## Root Directory Documents

The following documents remain in the project root:

| Document | Purpose |
|----------|---------|
| **[README.md](../README.md)** | Project overview |
| **[CONTRIBUTING.md](../CONTRIBUTING.md)** | Contribution guidelines |
| **[LICENSE](../LICENSE)** | Project license |

---

**Maintained By:** Project team
