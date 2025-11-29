/**
 * UIManager - Manages game UI panels and HUD
 *
 * Handles panel visibility, modal stacking, and tooltips.
 */

import type { GameSystem } from '@core/GameEngine';
import { getEventBus } from '@core/EventBus';
import { PanelType } from '@core/types';
import type { UIState, Vector2, GameTime } from '@core/types';

// ============================================================================
// UIManager Implementation
// ============================================================================

export class UIManager implements GameSystem {
  public readonly name = 'UIManager';

  private state: UIState = {
    activePanels: new Set([PanelType.HUD]),
    modalStack: [],
    tooltipContent: null,
    tooltipPosition: null,
  };

  // Panel render callbacks
  private panelRenderers: Map<PanelType, () => void> = new Map();

  // UI element update callbacks (for external rendering systems)
  private updateCallbacks: Set<(state: UIState) => void> = new Set();

  /**
   * Initialize the UI manager
   */
  public initialize(): void {
    const eventBus = getEventBus();

    // Listen for panel events from other systems
    eventBus.on('ui:tooltipShow', (event) => {
      this.showTooltip(event.content, event.position);
    });

    eventBus.on('ui:tooltipHide', () => {
      this.hideTooltip();
    });

    console.log('[UIManager] Initialized');
  }

  /**
   * Update - notify render callbacks
   */
  public update(_deltaTime: number, _gameTime: GameTime): void {
    // Notify all update callbacks
    for (const callback of this.updateCallbacks) {
      callback(this.state);
    }
  }

  // ============================================================================
  // Panel Management
  // ============================================================================

  /**
   * Open a panel
   */
  public openPanel(panel: PanelType, modal = false): void {
    if (this.isPanelOpen(panel)) {
      return;
    }

    this.state.activePanels.add(panel);

    if (modal) {
      this.state.modalStack.push(panel);
    }

    const eventBus = getEventBus();
    eventBus.emit('ui:panelOpened', { panel });
  }

  /**
   * Close a panel
   */
  public closePanel(panel: PanelType): void {
    if (!this.isPanelOpen(panel)) {
      return;
    }

    this.state.activePanels.delete(panel);

    // Remove from modal stack if present
    const modalIndex = this.state.modalStack.indexOf(panel);
    if (modalIndex !== -1) {
      this.state.modalStack.splice(modalIndex, 1);
    }

    const eventBus = getEventBus();
    eventBus.emit('ui:panelClosed', { panel });
  }

  /**
   * Toggle a panel
   */
  public togglePanel(panel: PanelType, modal = false): void {
    if (this.isPanelOpen(panel)) {
      this.closePanel(panel);
    } else {
      this.openPanel(panel, modal);
    }
  }

  /**
   * Check if a panel is open
   */
  public isPanelOpen(panel: PanelType): boolean {
    return this.state.activePanels.has(panel);
  }

  /**
   * Close the topmost modal
   */
  public closeTopModal(): boolean {
    if (this.state.modalStack.length === 0) {
      return false;
    }

    const topModal = this.state.modalStack.pop()!;
    this.state.activePanels.delete(topModal);

    const eventBus = getEventBus();
    eventBus.emit('ui:panelClosed', { panel: topModal });

    return true;
  }

  /**
   * Close all modals
   */
  public closeAllModals(): void {
    while (this.closeTopModal()) {
      // Continue until all modals closed
    }
  }

  /**
   * Get the topmost modal panel
   */
  public getTopModal(): PanelType | null {
    if (this.state.modalStack.length === 0) {
      return null;
    }
    return this.state.modalStack[this.state.modalStack.length - 1];
  }

  /**
   * Check if any modal is open
   */
  public hasOpenModal(): boolean {
    return this.state.modalStack.length > 0;
  }

  // ============================================================================
  // Tooltip Management
  // ============================================================================

  /**
   * Show a tooltip
   */
  public showTooltip(content: string, position: Vector2): void {
    this.state.tooltipContent = content;
    this.state.tooltipPosition = { ...position };
  }

  /**
   * Hide the tooltip
   */
  public hideTooltip(): void {
    this.state.tooltipContent = null;
    this.state.tooltipPosition = null;
  }

  /**
   * Check if tooltip is visible
   */
  public isTooltipVisible(): boolean {
    return this.state.tooltipContent !== null;
  }

  /**
   * Get tooltip content
   */
  public getTooltipContent(): string | null {
    return this.state.tooltipContent;
  }

  /**
   * Get tooltip position
   */
  public getTooltipPosition(): Vector2 | null {
    return this.state.tooltipPosition;
  }

  // ============================================================================
  // Render Callback Management
  // ============================================================================

  /**
   * Register a panel renderer
   */
  public registerPanelRenderer(panel: PanelType, renderer: () => void): void {
    this.panelRenderers.set(panel, renderer);
  }

  /**
   * Unregister a panel renderer
   */
  public unregisterPanelRenderer(panel: PanelType): void {
    this.panelRenderers.delete(panel);
  }

  /**
   * Register an update callback
   */
  public onUpdate(callback: (state: UIState) => void): () => void {
    this.updateCallbacks.add(callback);
    return () => this.updateCallbacks.delete(callback);
  }

  // ============================================================================
  // State Access
  // ============================================================================

  /**
   * Get all active panels
   */
  public getActivePanels(): ReadonlySet<PanelType> {
    return this.state.activePanels;
  }

  /**
   * Get the modal stack
   */
  public getModalStack(): readonly PanelType[] {
    return this.state.modalStack;
  }

  /**
   * Get the full UI state
   */
  public getState(): Readonly<UIState> {
    return this.state;
  }

  /**
   * Cleanup
   */
  public destroy(): void {
    this.state.activePanels.clear();
    this.state.modalStack = [];
    this.panelRenderers.clear();
    this.updateCallbacks.clear();
    console.log('[UIManager] Destroyed');
  }
}
