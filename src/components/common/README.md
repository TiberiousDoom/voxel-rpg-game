# Common Components - Modal System

**Created:** 2025-11-15
**Workflow:** WF5 - Modal System & Common Components
**Status:** Complete

## Overview

Reusable UI components for modals, toasts, buttons, and common interactions throughout the application.

## Components

### Modal
Reusable modal dialog with backdrop, animations, and accessibility features.

```jsx
import { Modal, useModal } from './components/common';

function MyComponent() {
  const { isOpen, showModal, hideModal } = useModal();

  const handleOpenModal = () => {
    showModal({
      title: 'Confirm Action',
      content: <ConfirmDialog message="Are you sure?" />,
      onConfirm: handleConfirm,
      size: 'medium'
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={hideModal}
      title="My Modal"
      size="medium"
    >
      <p>Modal content here</p>
    </Modal>
  );
}
```

**Props:**
- `isOpen` (boolean): Whether modal is visible
- `onClose` (function): Close callback
- `title` (string): Modal title
- `children` (ReactNode): Modal content
- `showCloseButton` (boolean): Show close button (default: true)
- `closeOnBackdropClick` (boolean): Close on backdrop click (default: true)
- `closeOnEsc` (boolean): Close on ESC key (default: true)
- `size` (string): 'small', 'medium', 'large' (default: 'medium')

**Features:**
- ✅ Smooth enter/exit animations
- ✅ Focus trap for accessibility
- ✅ ESC key to close
- ✅ Backdrop click to close
- ✅ Portal rendering (outside DOM hierarchy)
- ✅ Prevents body scroll when open

### ConfirmDialog
Pre-built confirmation dialog component.

```jsx
import { ConfirmDialog } from './components/common';

<ConfirmDialog
  message="Delete this building?"
  description="This action cannot be undone."
  onConfirm={handleDelete}
  onCancel={handleCancel}
  confirmText="Delete"
  cancelText="Cancel"
  type="danger"
/>
```

**Props:**
- `message` (string): Confirmation message
- `description` (string): Additional description (optional)
- `onConfirm` (function): Confirm callback
- `onCancel` (function): Cancel callback
- `confirmText` (string): Confirm button text (default: 'Confirm')
- `cancelText` (string): Cancel button text (default: 'Cancel')
- `type` (string): 'danger', 'warning', 'info' (default: 'info')
- `icon` (string): Custom icon (optional)

### Toast / Notification
Toast notification system for temporary messages.

```jsx
import { Toast, useToast } from './components/common';

function MyComponent() {
  const { notifications, showToast, success, error, warning, info } = useToast();

  const handleSuccess = () => {
    success('Operation completed successfully!');
  };

  const handleError = () => {
    error('Something went wrong', 'Error', 4000);
  };

  return (
    <>
      <button onClick={handleSuccess}>Show Success</button>
      <Toast
        notifications={notifications}
        onClose={hideToast}
        position="top-right"
        maxNotifications={5}
      />
    </>
  );
}
```

**Toast Props:**
- `notifications` (array): Array of notification objects
- `onClose` (function): Close callback
- `position` (string): 'top-right', 'top-left', 'bottom-right', 'bottom-left', 'top-center', 'bottom-center' (default: 'top-right')
- `maxNotifications` (number): Max visible notifications (default: 5)

**Notification Props:**
- `id` (string): Notification ID
- `type` (string): 'success', 'error', 'info', 'warning' (default: 'info')
- `message` (string): Notification message
- `title` (string): Notification title (optional)
- `duration` (number): Auto-dismiss duration in ms (0 = no auto-dismiss)
- `icon` (string): Custom icon (optional)
- `showProgress` (boolean): Show progress bar (default: true)

**Features:**
- ✅ Auto-dismiss with timer
- ✅ Stackable notifications
- ✅ Type variants (success, error, info, warning)
- ✅ Position options
- ✅ Progress bar
- ✅ Slide-in animations

### Button
Reusable button component with variants and states.

```jsx
import { Button } from './components/common';

<Button
  variant="primary"
  size="medium"
  onClick={handleClick}
  loading={isLoading}
  disabled={isDisabled}
  icon="🚀"
  iconPosition="left"
>
  Click Me
</Button>
```

**Props:**
- `children` (ReactNode): Button content
- `onClick` (function): Click handler
- `variant` (string): 'primary', 'secondary', 'danger', 'success', 'warning' (default: 'primary')
- `size` (string): 'small', 'medium', 'large' (default: 'medium')
- `disabled` (boolean): Disabled state
- `loading` (boolean): Loading state
- `icon` (string): Icon to display (optional)
- `iconPosition` (string): 'left', 'right' (default: 'left')
- `type` (string): 'button', 'submit', 'reset' (default: 'button')

**Features:**
- ✅ Multiple variants (primary, secondary, danger, success, warning)
- ✅ Loading state with spinner
- ✅ Disabled state
- ✅ Icon support
- ✅ Size variants
- ✅ Ripple effect on click

### IconButton
Icon-only button component.

```jsx
import { IconButton } from './components/common';

<IconButton
  icon="✕"
  onClick={handleClose}
  variant="ghost"
  size="medium"
  ariaLabel="Close panel"
  tooltip="Close"
/>
```

**Props:**
- `icon` (string): Icon to display
- `onClick` (function): Click handler
- `variant` (string): 'primary', 'secondary', 'danger', 'success', 'warning', 'ghost' (default: 'ghost')
- `size` (string): 'small', 'medium', 'large' (default: 'medium')
- `disabled` (boolean): Disabled state
- `loading` (boolean): Loading state
- `ariaLabel` (string): Accessibility label (required)
- `tooltip` (string): Tooltip text (optional)

**Features:**
- ✅ Icon-only display
- ✅ Tooltip support
- ✅ All button variants
- ✅ Accessible (requires ariaLabel)

## Hooks

### useModal
Custom hook for managing modal state.

```jsx
const {
  isOpen,
  modalContent,
  modalProps,
  showModal,
  hideModal,
  handleConfirm,
  handleCancel
} = useModal();
```

**Returns:**
- `isOpen` (boolean): Modal open state
- `modalContent` (ReactNode): Current modal content
- `modalProps` (object): Current modal props
- `showModal(config)` (function): Show modal with config
- `hideModal()` (function): Hide modal
- `handleConfirm()` (function): Handle confirm action
- `handleCancel()` (function): Handle cancel action

### useToast
Custom hook for managing toast notifications.

```jsx
const {
  notifications,
  showToast,
  hideToast,
  clearAll,
  success,
  error,
  info,
  warning
} = useToast();
```

**Returns:**
- `notifications` (array): Current notifications
- `showToast(config)` (function): Show toast with config
- `hideToast(id)` (function): Hide specific toast
- `clearAll()` (function): Clear all toasts
- `success(message, title, duration)` (function): Show success toast
- `error(message, title, duration)` (function): Show error toast
- `info(message, title, duration)` (function): Show info toast
- `warning(message, title, duration)` (function): Show warning toast

## File Structure

```
src/components/common/
├── Modal.jsx                 # Modal component
├── Modal.css                 # Modal styles
├── ConfirmDialog.jsx         # Confirmation dialog
├── ConfirmDialog.css         # Confirmation dialog styles
├── Notification.jsx          # Single notification
├── Notification.css          # Notification styles
├── Toast.jsx                 # Toast container
├── Toast.css                 # Toast container styles
├── Button.jsx                # Button component
├── Button.css                # Button styles
├── IconButton.jsx            # Icon button component
├── IconButton.css            # Icon button styles
├── index.js                  # Export all components
├── __tests__/                # Unit tests
│   ├── Modal.test.js
│   └── Toast.test.js
└── README.md                 # This file

src/hooks/
├── useModal.js               # Modal management hook
└── useToast.js               # Toast management hook
```

## Usage Examples

### Example 1: Delete Confirmation

```jsx
import { Modal, ConfirmDialog, useModal } from './components/common';

function BuildingPanel({ building, onDelete }) {
  const { isOpen, showModal, hideModal, handleConfirm } = useModal();

  const handleDeleteClick = () => {
    showModal({
      title: 'Delete Building',
      content: (
        <ConfirmDialog
          message={`Delete ${building.name}?`}
          description="This action cannot be undone."
          type="danger"
          onConfirm={() => {
            onDelete(building.id);
            hideModal();
          }}
          onCancel={hideModal}
        />
      ),
      size: 'small',
      showCloseButton: false
    });
  };

  return (
    <div>
      <button onClick={handleDeleteClick}>Delete</button>
      <Modal isOpen={isOpen} onClose={hideModal} {...modalProps}>
        {modalContent}
      </Modal>
    </div>
  );
}
```

### Example 2: Success Notification

```jsx
import { Toast, useToast } from './components/common';

function GameControl() {
  const { notifications, success, error, hideToast } = useToast();

  const handleSave = async () => {
    try {
      await saveGame();
      success('Game saved successfully!', 'Save Complete');
    } catch (err) {
      error('Failed to save game', 'Save Error', 4000);
    }
  };

  return (
    <>
      <button onClick={handleSave}>Save Game</button>
      <Toast
        notifications={notifications}
        onClose={hideToast}
        position="top-right"
      />
    </>
  );
}
```

### Example 3: Loading Button

```jsx
import { Button } from './components/common';

function BuildButton({ onBuild, isBuilding }) {
  return (
    <Button
      variant="primary"
      onClick={onBuild}
      loading={isBuilding}
      icon="🏗️"
    >
      {isBuilding ? 'Building...' : 'Build Structure'}
    </Button>
  );
}
```

## Testing

Run unit tests:
```bash
npm test src/components/common/__tests__/
```

Test coverage:
- Modal component: Focus trap, ESC key, backdrop click, accessibility
- Toast system: Auto-dismiss, stacking, type variants, positions
- useModal hook: State management, callbacks
- useToast hook: Add/remove notifications, convenience methods

## Accessibility

All components follow WCAG 2.1 AA standards:

- ✅ **Keyboard Navigation**: All interactive elements accessible via keyboard
- ✅ **Focus Management**: Focus trap in modals, focus restoration
- ✅ **ARIA Attributes**: Proper role, aria-modal, aria-label, aria-live
- ✅ **Screen Reader Support**: Meaningful labels and announcements
- ✅ **Touch Targets**: Minimum 44px touch targets on mobile
- ✅ **Color Contrast**: 4.5:1 ratio for text

## Browser Support

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

## Performance

- **Portal rendering** prevents z-index conflicts
- **Debounced animations** for smooth performance
- **Auto-cleanup** prevents memory leaks
- **Lazy rendering** only when needed

## Future Enhancements

- [ ] Draggable modals
- [ ] Resizable modals
- [ ] Modal stacking (multiple modals)
- [ ] Toast sound effects
- [ ] Toast action buttons
- [ ] Button group component
- [ ] Dropdown button variant

---

**Created by:** Claude (Session: 01LELcQhdmgEieC3MocV2LLt)
**Workflow:** WF5 - Phase 4
**Last Updated:** 2025-11-15
