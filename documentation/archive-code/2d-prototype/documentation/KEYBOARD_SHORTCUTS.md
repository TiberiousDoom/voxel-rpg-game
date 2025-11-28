# Keyboard Shortcuts Reference

**Last Updated:** 2025-11-15
**WF9: Keyboard Shortcuts & Accessibility**
**Status:** Active

---

## Overview

This document provides a comprehensive reference for all keyboard shortcuts available in the Voxel RPG Game. Keyboard shortcuts enhance gameplay by allowing quick access to common actions without needing to click through menus.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Game Controls](#game-controls)
3. [Building Controls](#building-controls)
4. [NPC Controls](#npc-controls)
5. [Camera Controls](#camera-controls)
6. [UI Controls](#ui-controls)
7. [Customization](#customization)
8. [Accessibility Features](#accessibility-features)

---

## Getting Started

### Viewing Shortcuts

Press **?** (question mark) at any time to view the in-game keyboard shortcuts help modal.

### Important Notes

- **Keyboard shortcuts are disabled when typing in input fields** (search boxes, text inputs, etc.)
- **Shortcuts are case-insensitive** (unless specified otherwise)
- **Modifier keys** (Ctrl, Shift, Alt) may be required for some shortcuts in the future

---

## Game Controls

Control the game's playback state with these shortcuts:

| Shortcut | Action | Description |
|----------|--------|-------------|
| **Space** | Pause/Resume | Toggle between paused and running states (only when game is running) |
| **S** | Save Game | Save the current game to the selected save slot |
| **L** | Load Game | Load a saved game from the selected save slot |

### Usage Examples

```
Press Space → Game pauses
Press Space again → Game resumes

Press S → Game saves to currently selected slot
Press L → Game loads from currently selected slot (if save exists)
```

---

## Building Controls

Quickly place and manage buildings:

| Shortcut | Action | Description |
|----------|--------|-------------|
| **B** | Toggle Build Mode | Enter or exit building placement mode |
| **1** | Select Building 1 | Select the first building type in the menu |
| **2** | Select Building 2 | Select the second building type |
| **3** | Select Building 3 | Select the third building type |
| **4** | Select Building 4 | Select the fourth building type |
| **5** | Select Building 5 | Select the fifth building type |
| **6** | Select Building 6 | Select the sixth building type |
| **7** | Select Building 7 | Select the seventh building type |
| **8** | Select Building 8 | Select the eighth building type |
| **Delete** | Delete Selected | Remove the currently selected building |

### Building Number Reference

The number keys (1-8) correspond to buildings in the order they appear in the build menu. The mapping may vary based on your current tier and available buildings.

---

## NPC Controls

Manage NPCs efficiently:

| Shortcut | Action | Description |
|----------|--------|-------------|
| **N** | Spawn NPC | Spawn a new NPC at a random location |

### Planned NPC Shortcuts (Future)

- **Shift + N**: Spawn NPC with role selection
- **A**: Auto-assign all idle NPCs
- **U**: Unassign selected NPC

---

## Camera Controls

Navigate the game world:

| Shortcut | Action | Description |
|----------|--------|-------------|
| **←** (Left Arrow) | Pan Left | Move camera view to the left |
| **→** (Right Arrow) | Pan Right | Move camera view to the right |
| **↑** (Up Arrow) | Pan Up | Move camera view upward |
| **↓** (Down Arrow) | Pan Down | Move camera view downward |
| **+** (Plus) | Zoom In | Zoom the camera closer to the game world |
| **-** (Minus) | Zoom Out | Zoom the camera farther from the game world |

### Camera Tips

- Hold down arrow keys for continuous panning
- Combine arrow keys for diagonal movement
- Use **+**/**-** for precise zoom control

---

## UI Controls

Interact with the user interface:

| Shortcut | Action | Description |
|----------|--------|-------------|
| **Escape** | Close/Cancel | Close open modals, dialogs, or cancel current action |
| **?** | Show Help | Display the keyboard shortcuts help modal |

### Navigation

- **Tab**: Navigate forward through interactive elements
- **Shift + Tab**: Navigate backward through interactive elements
- **Enter/Space**: Activate buttons and controls when focused

---

## Customization

### Future Customization Support

In future releases, the keyboard shortcuts system will support:

- **Custom key bindings**: Remap any shortcut to your preferred key
- **Keyboard profiles**: Save and switch between different shortcut configurations
- **Import/Export**: Share your custom key bindings with others

### Current Implementation

The current implementation uses the `useKeyboardShortcuts` hook, which supports:

```javascript
// Example: Registering a custom shortcut
registerShortcut('CUSTOM_ACTION', handleAction, {
  key: 'c',
  ctrl: false,
  shift: false,
  alt: false,
  description: 'Custom action'
});
```

---

## Accessibility Features

### Screen Reader Support

All interactive elements include:

- **ARIA labels**: Descriptive labels for screen readers
- **ARIA announcements**: Dynamic content updates announced to screen readers
- **Role descriptions**: Clear context for complex UI components

### Keyboard Navigation

The game is fully navigable via keyboard:

- **Focus indicators**: Visual indication of currently focused element
- **Focus trap**: Modals trap focus for better navigation
- **Logical tab order**: Elements receive focus in a sensible order

### Focus Management

- **Auto-focus**: Modals automatically focus the first interactive element
- **Focus restoration**: Closing modals returns focus to the previously focused element
- **Skip links**: Quick navigation to main content areas (planned)

### Visual Accessibility

- **High contrast mode**: Planned support for high contrast themes
- **Reduced motion**: Respect user's motion preferences (planned)
- **Keyboard shortcut hints**: Visual indicators showing available shortcuts

---

## Architecture Reference

### Components

The keyboard shortcuts system consists of these components:

1. **useKeyboardShortcuts.js** (`src/hooks/`): Core keyboard shortcuts hook
2. **aria-labels.js** (`src/accessibility/`): Centralized ARIA labels
3. **FocusManager.js** (`src/accessibility/`): Focus management utilities
4. **KeyboardShortcutsHelp.jsx** (`src/components/`): In-game shortcuts help modal

### Integration

Components integrate keyboard shortcuts by:

```javascript
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

function MyComponent() {
  const { registerShortcut, unregisterAll } = useKeyboardShortcuts();

  useEffect(() => {
    // Register shortcuts
    registerShortcut('PAUSE_RESUME', handlePauseResume);

    // Cleanup
    return () => unregisterAll();
  }, []);
}
```

### ARIA Labels Usage

```javascript
import { ARIA_LABELS } from '../accessibility/aria-labels';

<button aria-label={ARIA_LABELS.GAME.PAUSE}>
  Pause
</button>
```

---

## Quick Reference Card

Print-friendly quick reference:

```
┌─────────────────────────────────────────────────────────┐
│           VOXEL RPG GAME - KEYBOARD SHORTCUTS           │
├─────────────────────────────────────────────────────────┤
│ GAME CONTROLS                                           │
│   Space .......... Pause/Resume                        │
│   S .............. Save Game                           │
│   L .............. Load Game                           │
│                                                         │
│ BUILDING                                                │
│   B .............. Toggle Build Mode                   │
│   1-8 ............ Select Building Type               │
│   Delete ......... Delete Selected                     │
│                                                         │
│ NPCs                                                    │
│   N .............. Spawn NPC                           │
│                                                         │
│ CAMERA                                                  │
│   Arrow Keys ..... Pan Camera                          │
│   + / - .......... Zoom In/Out                        │
│                                                         │
│ UI                                                      │
│   Escape ......... Close/Cancel                        │
│   ? .............. Show This Help                      │
└─────────────────────────────────────────────────────────┘
```

---

## Troubleshooting

### Shortcuts Not Working

If keyboard shortcuts aren't responding:

1. **Check if focus is in an input field** - Shortcuts are disabled when typing
2. **Verify game is running** - Some shortcuts only work during gameplay
3. **Check browser focus** - Make sure the game window has focus
4. **Reload the page** - Refresh to reinitialize shortcuts

### Conflicts with Browser Shortcuts

Some shortcuts may conflict with browser shortcuts:

- **Ctrl + S**: Browser save (use just **S** for game save)
- **Ctrl + L**: Browser location bar (use just **L** for game load)
- **Ctrl + N**: New browser window (use just **N** for spawn NPC)

The game uses simple key presses (without Ctrl) to avoid these conflicts.

### Screen Reader Issues

If using a screen reader:

1. **Enable ARIA announcements** in your screen reader settings
2. **Use forms mode** when interacting with controls
3. **Tab through elements** to hear their labels and descriptions

---

## Feedback & Suggestions

Have ideas for new shortcuts or accessibility improvements?

- **GitHub Issues**: Report bugs or request features
- **In-game feedback**: Press **?** and use the feedback option (planned)

---

## Version History

- **v1.0** (2025-11-15): Initial implementation with 15+ core shortcuts
  - Game controls (Pause, Save, Load)
  - Building selection (1-8, Delete)
  - NPC spawning (N)
  - Camera controls (Arrows, +/-)
  - UI controls (Escape, ?)
  - Full ARIA label support
  - Focus management system
  - In-game help modal

---

## References

- **WF9 Implementation**: See `documentation/planning/PHASE_4_WORKFLOWS.md`
- **ARIA Labels**: See `src/accessibility/aria-labels.js`
- **Shortcuts Hook**: See `src/hooks/useKeyboardShortcuts.js`
- **Contributing**: See `CONTRIBUTING.md` for code standards

---

**Document Version:** 1.0
**Created:** 2025-11-15
**Maintained By:** Voxel RPG Game Development Team
