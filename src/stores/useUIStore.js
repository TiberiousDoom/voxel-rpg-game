/**
 * useUIStore.js - Centralized UI state management
 *
 * Manages all UI-related state including:
 * - Active panel state
 * - Panel height
 * - Debug mode
 * - Clean mode (distraction-free)
 * - Mobile menu state
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Panel types for the new UI system
 */
export const PANEL_TYPES = {
  BUILD: 'build',
  INVENTORY: 'inventory',
  NPCS: 'npcs',
  RESOURCES: 'resources',
  CRAFTING: 'crafting',
  QUESTS: 'quests',
  STATS: 'stats',
  SETTINGS: 'settings',
  DEBUG: 'debug',
  CHARACTER: 'character',
  EXPEDITIONS: 'expeditions',
  DEFENSE: 'defense',
};

/**
 * Panel height states
 */
export const PANEL_HEIGHTS = {
  COLLAPSED: 'collapsed',
  HALF: 'half',
  FULL: 'full',
};

/**
 * Navigation tab configuration
 */
export const NAV_TABS = [
  { id: PANEL_TYPES.BUILD, label: 'Build', icon: 'Hammer', shortcut: 'B' },
  { id: PANEL_TYPES.INVENTORY, label: 'Inventory', icon: 'Package', shortcut: 'I' },
  { id: PANEL_TYPES.NPCS, label: 'NPCs', icon: 'Users', shortcut: 'N' },
  { id: PANEL_TYPES.RESOURCES, label: 'Resources', icon: 'Coins', shortcut: 'R' },
  { id: PANEL_TYPES.QUESTS, label: 'Quests', icon: 'Scroll', shortcut: 'Q' },
];

/**
 * Overflow menu items (accessible via "More" tab)
 */
export const OVERFLOW_ITEMS = [
  { id: PANEL_TYPES.STATS, label: 'Statistics', icon: 'BarChart3' },
  { id: PANEL_TYPES.CHARACTER, label: 'Character', icon: 'User' },
  { id: PANEL_TYPES.EXPEDITIONS, label: 'Expeditions', icon: 'Compass' },
  { id: PANEL_TYPES.DEFENSE, label: 'Defense', icon: 'Shield' },
  { id: PANEL_TYPES.CRAFTING, label: 'Crafting', icon: 'Wrench' },
  { id: PANEL_TYPES.SETTINGS, label: 'Settings', icon: 'Settings' },
  { id: PANEL_TYPES.DEBUG, label: 'Debug', icon: 'Bug', devOnly: true },
];

/**
 * UI Store
 */
const useUIStore = create(
  persist(
    (set, get) => ({
      // Panel State
      activePanel: null,
      panelHeight: PANEL_HEIGHTS.HALF,
      previousPanel: null,

      // UI Modes
      isCleanMode: false,
      isDebugMode: false,
      isMobileMenuOpen: false,
      isOverflowMenuOpen: false,

      // Selection State
      selectedBuildingId: null,
      selectedNpcId: null,

      // Notification State
      hasUnreadNotifications: false,
      notificationCount: 0,

      // Actions - Panel Management
      openPanel: (panelId, height = PANEL_HEIGHTS.HALF) => {
        const current = get().activePanel;
        set({
          activePanel: panelId,
          panelHeight: height,
          previousPanel: current !== panelId ? current : get().previousPanel,
          isMobileMenuOpen: false,
          isOverflowMenuOpen: false,
        });
      },

      closePanel: () => {
        set({
          activePanel: null,
          isOverflowMenuOpen: false,
        });
      },

      togglePanel: (panelId) => {
        const { activePanel, openPanel, closePanel } = get();
        if (activePanel === panelId) {
          closePanel();
        } else {
          openPanel(panelId);
        }
      },

      setPanelHeight: (height) => {
        set({ panelHeight: height });
      },

      togglePanelHeight: () => {
        const { panelHeight } = get();
        const newHeight = panelHeight === PANEL_HEIGHTS.FULL
          ? PANEL_HEIGHTS.HALF
          : PANEL_HEIGHTS.FULL;
        set({ panelHeight: newHeight });
      },

      goBack: () => {
        const { previousPanel, openPanel, closePanel } = get();
        if (previousPanel) {
          openPanel(previousPanel);
        } else {
          closePanel();
        }
      },

      // Actions - UI Modes
      toggleCleanMode: () => {
        set((state) => ({
          isCleanMode: !state.isCleanMode,
          activePanel: state.isCleanMode ? state.activePanel : null,
        }));
      },

      setCleanMode: (enabled) => {
        set({
          isCleanMode: enabled,
          activePanel: enabled ? null : get().activePanel,
        });
      },

      toggleDebugMode: () => {
        set((state) => ({ isDebugMode: !state.isDebugMode }));
      },

      setDebugMode: (enabled) => {
        set({ isDebugMode: enabled });
      },

      // Actions - Mobile Menu
      toggleMobileMenu: () => {
        set((state) => ({
          isMobileMenuOpen: !state.isMobileMenuOpen,
          isOverflowMenuOpen: false,
        }));
      },

      closeMobileMenu: () => {
        set({ isMobileMenuOpen: false });
      },

      // Actions - Overflow Menu
      toggleOverflowMenu: () => {
        set((state) => ({
          isOverflowMenuOpen: !state.isOverflowMenuOpen,
        }));
      },

      closeOverflowMenu: () => {
        set({ isOverflowMenuOpen: false });
      },

      // Actions - Selection
      setSelectedBuilding: (buildingId) => {
        set({ selectedBuildingId: buildingId });
      },

      setSelectedNpc: (npcId) => {
        set({ selectedNpcId: npcId });
      },

      clearSelection: () => {
        set({
          selectedBuildingId: null,
          selectedNpcId: null,
        });
      },

      // Actions - Notifications
      setNotificationCount: (count) => {
        set({
          notificationCount: count,
          hasUnreadNotifications: count > 0,
        });
      },

      clearNotifications: () => {
        set({
          notificationCount: 0,
          hasUnreadNotifications: false,
        });
      },

      // Keyboard Shortcut Handler
      handleKeyboardShortcut: (key) => {
        const { isCleanMode, toggleCleanMode, openPanel, closePanel, activePanel } = get();

        // Backtick toggles clean mode
        if (key === '`') {
          toggleCleanMode();
          return true;
        }

        // ESC closes panel or exits clean mode
        if (key === 'Escape') {
          if (activePanel) {
            closePanel();
            return true;
          }
          if (isCleanMode) {
            toggleCleanMode();
            return true;
          }
        }

        // Tab shortcuts (B, I, N, R, Q)
        if (!isCleanMode) {
          const tab = NAV_TABS.find(t => t.shortcut?.toLowerCase() === key.toLowerCase());
          if (tab) {
            if (activePanel === tab.id) {
              closePanel();
            } else {
              openPanel(tab.id);
            }
            return true;
          }
        }

        return false;
      },
    }),
    {
      name: 'ui-store',
      partialize: (state) => ({
        // Only persist these values
        isDebugMode: state.isDebugMode,
        panelHeight: state.panelHeight,
      }),
    }
  )
);

export default useUIStore;
