# Contributing Guide

**Last Updated:** November 2025

Thank you for contributing to the Voxel RPG Game! This guide covers code and documentation contributions.

---

## Table of Contents

1. [Required Reading](#required-reading)
2. [Code Contributions](#code-contributions)
3. [Unity Project Standards](#unity-project-standards)
4. [C# Coding Standards](#c-coding-standards)
5. [Documentation Standards](#documentation-standards)
6. [Review Process](#review-process)

---

## Required Reading

Before contributing, please read the **[Game Vision](docs/VISION.md)** document. This is essential for understanding:

- **What we're building:** The core experience and pillars
- **Design principles:** Guidelines that shape every decision
- **NPC philosophy:** Why autonomous helpers matter
- **The world:** Setting, tone, and player journey

All contributions should align with the vision. When in doubt, ask: *"Does this support the promise: Rise from ruin. Build something worth protecting. You're not alone."*

---

## Code Contributions

### Getting Started

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Open the project in Unity** (version specified in ProjectSettings)
4. **Make your changes**
5. **Test thoroughly** in the Unity Editor
6. **Submit a Pull Request**

### Pre-submission Checklist

Before creating a pull request, verify:

- [ ] **No compiler errors** - Project builds without errors
- [ ] **No console warnings** - Address or document any warnings
- [ ] **Tested in Editor** - Feature works as expected
- [ ] **Code follows standards** - See C# Coding Standards below
- [ ] **Documentation updated** - If API or behavior changed
- [ ] **No unintended changes** - Check your diff carefully

---

## Unity Project Standards

### Folder Structure

```
Assets/
├── _Project/              # All project-specific assets
│   ├── Scripts/
│   │   ├── Core/          # Core systems (GameManager, etc.)
│   │   ├── Player/        # Player-related scripts
│   │   ├── NPC/           # NPC AI and behavior
│   │   ├── Building/      # Construction systems
│   │   ├── Voxel/         # Voxel world systems
│   │   ├── Combat/        # Combat systems
│   │   ├── UI/            # UI scripts
│   │   └── Utilities/     # Helper classes
│   ├── Prefabs/
│   ├── Scenes/
│   ├── ScriptableObjects/
│   ├── Materials/
│   ├── Textures/
│   ├── Audio/
│   └── Animations/
├── Plugins/               # Third-party plugins
└── Resources/             # Runtime-loaded assets (use sparingly)
```

### Scene Organization

- Use empty GameObjects as organizational folders
- Name hierarchy objects clearly: `--- MANAGERS ---`, `--- ENVIRONMENT ---`
- Keep prefab instances where possible; avoid scene-only objects

### Prefab Guidelines

- Prefer prefabs over scene objects
- Use prefab variants for variations
- Keep prefabs self-contained when possible

### ScriptableObjects

Use ScriptableObjects for:
- Configuration data (block types, NPC stats, recipes)
- Shared runtime data
- Event channels

---

## C# Coding Standards

### Naming Conventions

```csharp
// Classes: PascalCase
public class VoxelChunk { }

// Interfaces: I + PascalCase
public interface IInteractable { }

// Methods: PascalCase
public void PlaceBlock() { }

// Properties: PascalCase
public int BlockCount { get; private set; }

// Public fields: PascalCase (prefer properties)
public float MoveSpeed;

// Private fields: _camelCase
private int _currentHealth;

// Local variables: camelCase
int blockIndex = 0;

// Constants: UPPER_SNAKE_CASE or PascalCase
public const int MAX_CHUNK_SIZE = 16;

// Enums: PascalCase for type, PascalCase for values
public enum BlockType { Stone, Wood, Air }
```

### Code Organization

```csharp
public class ExampleBehaviour : MonoBehaviour
{
    // 1. Constants
    private const int MaxItems = 100;

    // 2. Serialized fields (Inspector)
    [SerializeField] private float _moveSpeed = 5f;
    [SerializeField] private Transform _targetTransform;

    // 3. Public properties
    public bool IsActive { get; private set; }

    // 4. Private fields
    private int _currentIndex;
    private List<Item> _items;

    // 5. Unity lifecycle methods (in execution order)
    private void Awake() { }
    private void OnEnable() { }
    private void Start() { }
    private void Update() { }
    private void FixedUpdate() { }
    private void LateUpdate() { }
    private void OnDisable() { }
    private void OnDestroy() { }

    // 6. Public methods
    public void Initialize() { }

    // 7. Private methods
    private void UpdatePosition() { }

    // 8. Event handlers
    private void OnPlayerDeath() { }
}
```

### Best Practices

**Do:**
- Use `[SerializeField]` instead of public fields
- Cache component references in `Awake()`
- Use object pooling for frequently spawned objects
- Prefer composition over inheritance
- Use events/delegates for decoupling
- Add XML documentation for public APIs

**Don't:**
- Use `Find()` or `GetComponent()` in `Update()`
- Create garbage in hot paths (Update, FixedUpdate)
- Use magic numbers; define constants
- Leave empty Unity callbacks (they still get called)
- Ignore null checks for external references

### Example: Well-Structured Component

```csharp
using UnityEngine;
using UnityEngine.Events;

namespace VoxelRPG.Building
{
    /// <summary>
    /// Manages a single construction site where NPCs build structures.
    /// </summary>
    public class ConstructionSite : MonoBehaviour
    {
        [Header("Configuration")]
        [SerializeField] private Blueprint _blueprint;
        [SerializeField] private float _buildTimePerBlock = 1f;

        [Header("Events")]
        [SerializeField] private UnityEvent _onConstructionComplete;

        public bool IsComplete { get; private set; }
        public float Progress => _blocksBuilt / (float)_totalBlocks;

        private int _blocksBuilt;
        private int _totalBlocks;

        private void Awake()
        {
            if (_blueprint != null)
            {
                _totalBlocks = _blueprint.BlockCount;
            }
        }

        /// <summary>
        /// Adds progress to the construction site.
        /// </summary>
        /// <param name="amount">Amount of build progress (0-1 per block)</param>
        public void AddBuildProgress(float amount)
        {
            if (IsComplete) return;

            _blocksBuilt += Mathf.FloorToInt(amount);

            if (_blocksBuilt >= _totalBlocks)
            {
                CompleteConstruction();
            }
        }

        private void CompleteConstruction()
        {
            IsComplete = true;
            _onConstructionComplete?.Invoke();
        }
    }
}
```

---

## Documentation Standards

### Code Documentation

Use XML documentation for public APIs:

```csharp
/// <summary>
/// Manages the voxel world, including chunk loading and block operations.
/// </summary>
public class VoxelWorld : MonoBehaviour
{
    /// <summary>
    /// Gets the block at the specified world position.
    /// </summary>
    /// <param name="position">World position to query</param>
    /// <returns>The block type at the position, or Air if out of bounds</returns>
    public BlockType GetBlock(Vector3Int position)
    {
        // Implementation
    }
}
```

### Markdown Documentation

For design documents:
- Use clear headers and sections
- Include diagrams where helpful
- Keep updated as systems change
- Link related documents

### Commit Messages

**Format:**
```
type: Brief description

Longer explanation if needed:
- What changed
- Why it changed
```

**Types:**
- `feat:` New feature
- `fix:` Bug fix
- `refactor:` Code restructuring
- `docs:` Documentation
- `chore:` Maintenance tasks

**Examples:**
```
feat: Add NPC pathfinding to construction sites

fix: Resolve chunk loading race condition

docs: Update building system architecture
```

---

## Review Process

### Pull Request Guidelines

1. **Clear description** of what changed and why
2. **Screenshots/videos** for visual changes
3. **Testing notes** - how to verify the changes work
4. **Link related issues** if applicable

### Review Criteria

Reviewers check for:
- Code follows project standards
- Feature works as described
- No obvious bugs or regressions
- Performance is acceptable
- Code is readable and maintainable

### Approval

PRs need at least one approval before merging. Address all feedback before requesting re-review.

---

## Questions?

- Check existing documentation
- Ask in GitHub Discussions
- Review similar existing code

---

**Version:** 1.0
**Maintained By:** Project maintainers
