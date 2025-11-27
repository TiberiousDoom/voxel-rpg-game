# Transfer Bundle

These files are prepared for transfer to a new Unity repository. All JavaScript-specific references have been removed or adapted.

## Contents

```
transfer-bundle/
├── README.md              ← This file
├── CONTRIBUTING.md        ← Adapted for Unity/C#
└── docs/
    ├── VISION.md          ← Game vision (engine-agnostic)
    ├── ROADMAP.md         ← Development plan (Unity-focused)
    └── NPC_SYSTEM_DESIGN.md ← NPC system architecture (engine-agnostic)
```

## How to Use

1. Create your new Unity repository
2. Copy these files to the root of your new repo
3. Update dates and version numbers as needed
4. Customize CONTRIBUTING.md for your specific Unity setup

## File Descriptions

### VISION.md
The creative north star for the game. Completely engine-agnostic. Describes:
- Core pillars and design principles
- World setting and lore
- Player journey from early to late game
- The companion character arc
- NPC philosophy

**Do not modify** the vision without careful consideration—it guides all decisions.

### ROADMAP.md
Development plan updated for Unity. Includes:
- 7 development phases
- Detailed Phase 1 breakdown
- Fundraising strategy (Kickstarter, Early Access, etc.)
- Additional preparation (legal, art, community, etc.)
- Risk assessment and success metrics

### CONTRIBUTING.md
Contributor guide adapted for Unity/C#. Includes:
- Unity project structure
- C# coding standards
- Documentation requirements
- Review process

### NPC_SYSTEM_DESIGN.md
Architecture document for the NPC building system. Engine-agnostic design patterns:
- State machine for worker behavior
- Task management system
- Stockpile, construction, mining, hauling systems
- Performance considerations

Use this as a design reference when implementing in Unity.

## Next Steps

1. Set up Unity project
2. Import these docs
3. Begin Phase 0 (Foundation)
4. Start social media presence
5. Document your journey!

---

*Rise from ruin. Build something worth protecting. You're not alone.*
