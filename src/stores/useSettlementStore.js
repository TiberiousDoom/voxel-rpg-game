/**
 * useSettlementStore.js - Dedicated Zustand store for settlement UI state
 *
 * Keeps settlement-specific UI state separate from useGameStore.
 * Game logic (SettlementModule) writes to this store via refs.
 * UI components read reactively via hooks.
 */

import { create } from 'zustand';

const useSettlementStore = create((set, get) => ({
  // ── Zone state ──────────────────────────────────────────
  zones: [],
  zoneDesignatorActive: false,
  zoneDesignatorType: null,

  // ── Stockpile state ─────────────────────────────────────
  stockpiles: {},

  // ── Construction state ──────────────────────────────────
  constructionSites: [],

  // ── Immigration state ───────────────────────────────────
  attractivenessScore: 0,
  immigrationNextCheck: 0,
  immigrationStats: null,

  // ── Settlement alerts ───────────────────────────────────
  settlementAlerts: [],

  // ── UI selection state ──────────────────────────────────
  selectedNpcId: null,
  selectedBuildingId: null,
  dashboardOpen: false,

  // ── Actions ─────────────────────────────────────────────

  setZones: (zones) => set({ zones }),
  setZoneDesignatorActive: (active, type = null) => set({
    zoneDesignatorActive: active,
    zoneDesignatorType: type,
  }),

  setStockpiles: (stockpiles) => set({ stockpiles }),
  setConstructionSites: (sites) => set({ constructionSites: sites }),

  setAttractiveness: (score) => set({ attractivenessScore: score }),
  setImmigrationNextCheck: (seconds) => set({ immigrationNextCheck: seconds }),
  setImmigrationStats: (stats) => set({ immigrationStats: stats }),

  setSettlementAlerts: (alerts) => set({ settlementAlerts: alerts }),
  addAlert: (alert) => set(state => ({
    settlementAlerts: [...state.settlementAlerts, alert],
  })),
  clearAlerts: () => set({ settlementAlerts: [] }),

  selectNpc: (npcId) => set({ selectedNpcId: npcId }),
  selectBuilding: (buildingId) => set({ selectedBuildingId: buildingId }),
  clearSelection: () => set({ selectedNpcId: null, selectedBuildingId: null }),

  toggleDashboard: () => set(state => ({ dashboardOpen: !state.dashboardOpen })),
  setDashboardOpen: (open) => set({ dashboardOpen: open }),
}));

export default useSettlementStore;
