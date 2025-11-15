/**
 * FocusManager.js - Focus management utilities for accessibility
 *
 * Provides utilities for managing keyboard focus in the application:
 * - Focus trapping in modals/dialogs
 * - Focus restoration when closing overlays
 * - Programmatic focus management
 * - Accessible navigation patterns
 *
 * Usage:
 * import FocusManager from '../accessibility/FocusManager';
 *
 * const focusManager = new FocusManager();
 * focusManager.trapFocus(modalElement);
 */

/**
 * Query selector for all focusable elements
 */
const FOCUSABLE_ELEMENTS_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]'
].join(', ');

/**
 * FocusManager class
 */
class FocusManager {
  constructor() {
    this.focusHistory = [];
    this.trapStack = [];
  }

  /**
   * Get all focusable elements within a container
   * @param {HTMLElement} container - Container element
   * @returns {HTMLElement[]} Array of focusable elements
   */
  getFocusableElements(container) {
    if (!container) return [];

    const elements = Array.from(
      container.querySelectorAll(FOCUSABLE_ELEMENTS_SELECTOR)
    );

    // Filter out elements that are not visible
    return elements.filter(element => {
      return (
        element.offsetWidth > 0 &&
        element.offsetHeight > 0 &&
        window.getComputedStyle(element).visibility !== 'hidden'
      );
    });
  }

  /**
   * Get the first focusable element in a container
   * @param {HTMLElement} container
   * @returns {HTMLElement|null}
   */
  getFirstFocusableElement(container) {
    const elements = this.getFocusableElements(container);
    return elements.length > 0 ? elements[0] : null;
  }

  /**
   * Get the last focusable element in a container
   * @param {HTMLElement} container
   * @returns {HTMLElement|null}
   */
  getLastFocusableElement(container) {
    const elements = this.getFocusableElements(container);
    return elements.length > 0 ? elements[elements.length - 1] : null;
  }

  /**
   * Focus the first focusable element in a container
   * @param {HTMLElement} container
   * @returns {boolean} True if an element was focused
   */
  focusFirst(container) {
    const element = this.getFirstFocusableElement(container);
    if (element) {
      element.focus();
      return true;
    }
    return false;
  }

  /**
   * Focus the last focusable element in a container
   * @param {HTMLElement} container
   * @returns {boolean} True if an element was focused
   */
  focusLast(container) {
    const element = this.getLastFocusableElement(container);
    if (element) {
      element.focus();
      return true;
    }
    return false;
  }

  /**
   * Save the currently focused element to history
   */
  saveFocus() {
    const activeElement = document.activeElement;
    if (activeElement && activeElement !== document.body) {
      this.focusHistory.push(activeElement);
    }
  }

  /**
   * Restore focus to the last saved element
   * @returns {boolean} True if focus was restored
   */
  restoreFocus() {
    const element = this.focusHistory.pop();
    if (element && typeof element.focus === 'function') {
      element.focus();
      return true;
    }
    return false;
  }

  /**
   * Clear focus history
   */
  clearFocusHistory() {
    this.focusHistory = [];
  }

  /**
   * Trap focus within a container (for modals/dialogs)
   * @param {HTMLElement} container - Container to trap focus in
   * @returns {Function} Cleanup function to remove the trap
   */
  trapFocus(container) {
    if (!container) {
      console.warn('FocusManager: Cannot trap focus, no container provided');
      return () => {};
    }

    // Save current focus
    this.saveFocus();

    // Focus first element in container
    this.focusFirst(container);

    // Handle Tab key to trap focus
    const handleKeyDown = (event) => {
      // Only handle Tab key
      if (event.key !== 'Tab') return;

      const focusableElements = this.getFocusableElements(container);
      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      // Shift + Tab (backwards)
      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      }
      // Tab (forwards)
      else {
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    // Add event listener
    container.addEventListener('keydown', handleKeyDown);

    // Add to trap stack
    this.trapStack.push({ container, handleKeyDown });

    // Return cleanup function
    return () => {
      container.removeEventListener('keydown', handleKeyDown);

      // Remove from trap stack
      const index = this.trapStack.findIndex(trap => trap.container === container);
      if (index !== -1) {
        this.trapStack.splice(index, 1);
      }

      // Restore focus
      this.restoreFocus();
    };
  }

  /**
   * Remove all focus traps
   */
  clearAllTraps() {
    this.trapStack.forEach(({ container, handleKeyDown }) => {
      container.removeEventListener('keydown', handleKeyDown);
    });
    this.trapStack = [];
  }

  /**
   * Move focus to a specific element
   * @param {HTMLElement|string} elementOrSelector - Element or selector
   * @returns {boolean} True if focus was moved
   */
  focusElement(elementOrSelector) {
    let element;

    if (typeof elementOrSelector === 'string') {
      element = document.querySelector(elementOrSelector);
    } else {
      element = elementOrSelector;
    }

    if (element && typeof element.focus === 'function') {
      element.focus();
      return true;
    }

    return false;
  }

  /**
   * Check if an element is focusable
   * @param {HTMLElement} element
   * @returns {boolean}
   */
  isFocusable(element) {
    if (!element) return false;

    // Check if element matches focusable selector
    const matches = element.matches(FOCUSABLE_ELEMENTS_SELECTOR);
    if (!matches) return false;

    // Check if element is visible
    return (
      element.offsetWidth > 0 &&
      element.offsetHeight > 0 &&
      window.getComputedStyle(element).visibility !== 'hidden'
    );
  }

  /**
   * Handle arrow key navigation in a list
   * @param {KeyboardEvent} event - Keyboard event
   * @param {HTMLElement[]} items - Array of list items
   * @param {number} currentIndex - Current focused item index
   * @param {Object} options - Navigation options
   * @returns {number} New index after navigation
   */
  handleArrowNavigation(event, items, currentIndex, options = {}) {
    const {
      loop = true,           // Loop to start/end when reaching bounds
      horizontal = false,    // Use left/right arrows instead of up/down
      onNavigate = null      // Callback when navigation occurs
    } = options;

    const keys = horizontal
      ? { prev: 'ArrowLeft', next: 'ArrowRight' }
      : { prev: 'ArrowUp', next: 'ArrowDown' };

    let newIndex = currentIndex;

    // Navigate to previous item
    if (event.key === keys.prev) {
      event.preventDefault();

      if (currentIndex > 0) {
        newIndex = currentIndex - 1;
      } else if (loop) {
        newIndex = items.length - 1;
      }
    }
    // Navigate to next item
    else if (event.key === keys.next) {
      event.preventDefault();

      if (currentIndex < items.length - 1) {
        newIndex = currentIndex + 1;
      } else if (loop) {
        newIndex = 0;
      }
    }
    // Home key - go to first
    else if (event.key === 'Home') {
      event.preventDefault();
      newIndex = 0;
    }
    // End key - go to last
    else if (event.key === 'End') {
      event.preventDefault();
      newIndex = items.length - 1;
    }

    // Focus new item if index changed
    if (newIndex !== currentIndex && items[newIndex]) {
      items[newIndex].focus();

      if (onNavigate) {
        onNavigate(newIndex, currentIndex);
      }
    }

    return newIndex;
  }

  /**
   * Create a roving tabindex manager for a list
   * Implements the roving tabindex pattern for keyboard navigation
   * @param {HTMLElement} container - Container element
   * @param {string} itemSelector - Selector for list items
   * @param {Object} options - Configuration options
   * @returns {Object} Manager API
   */
  createRovingTabIndex(container, itemSelector, options = {}) {
    const {
      horizontal = false,
      onNavigate = null
    } = options;

    let currentIndex = 0;

    const updateTabIndexes = (items, focusedIndex) => {
      items.forEach((item, index) => {
        if (index === focusedIndex) {
          item.setAttribute('tabindex', '0');
        } else {
          item.setAttribute('tabindex', '-1');
        }
      });
    };

    const handleKeyDown = (event) => {
      const items = Array.from(container.querySelectorAll(itemSelector));
      if (items.length === 0) return;

      const newIndex = this.handleArrowNavigation(event, items, currentIndex, {
        loop: true,
        horizontal,
        onNavigate: (newIdx) => {
          currentIndex = newIdx;
          updateTabIndexes(items, newIdx);
          if (onNavigate) {
            onNavigate(newIdx);
          }
        }
      });

      currentIndex = newIndex;
    };

    // Set initial tabindexes
    const items = Array.from(container.querySelectorAll(itemSelector));
    updateTabIndexes(items, 0);

    // Add event listener
    container.addEventListener('keydown', handleKeyDown);

    // Return API
    return {
      destroy: () => {
        container.removeEventListener('keydown', handleKeyDown);
      },
      setIndex: (index) => {
        const items = Array.from(container.querySelectorAll(itemSelector));
        if (index >= 0 && index < items.length) {
          currentIndex = index;
          updateTabIndexes(items, index);
          items[index].focus();
        }
      },
      getCurrentIndex: () => currentIndex
    };
  }
}

// Export singleton instance
const focusManager = new FocusManager();
export default focusManager;

// Also export class for testing or custom instances
export { FocusManager };
