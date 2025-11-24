/**
 * ExpeditionsTab.jsx - Expedition management tab
 *
 * Displays:
 * - Party formation interface (ExpeditionPrep)
 * - Active expedition HUD (ExpeditionHUD)
 * - Turn-based combat (ExpeditionCombat)
 * - Loot history
 */

import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import ExpeditionPrep from '../modes/expedition/ExpeditionPrep';
import ExpeditionHUD from '../modes/expedition/ExpeditionHUD';
import ExpeditionCombat from '../modes/expedition/ExpeditionCombat';
import './ExpeditionsTab.css';

function ExpeditionsTab() {
  const { gameManager, managers } = useGame();
  const [expeditionMode, setExpeditionMode] = useState('prep'); // 'prep', 'expedition', 'combat'

  // Get expedition manager
  const expeditionManager = managers?.expeditionManager || gameManager?.orchestrator?.expeditionManager;
  const partyManager = managers?.partyManager;

  // Get active expedition info
  const activeExpedition = expeditionManager?.activeExpedition;
  const activeCombat = activeExpedition?.combat;

  // Get party info
  const party = partyManager?.getActiveParty?.() || [];

  // Handlers for expedition lifecycle
  const handleStartExpedition = (config) => {
    if (expeditionManager) {
      // Actually start the expedition with the provided config
      expeditionManager.startExpedition?.(config);
      setExpeditionMode('expedition');
    }
  };

  const handleExpeditionContinue = () => {
    // Continue to next floor or encounter
    if (expeditionManager) {
      expeditionManager.advanceFloor?.();
    }
  };

  const handleExpeditionRetreat = () => {
    if (expeditionManager) {
      expeditionManager.endExpedition?.();
      setExpeditionMode('prep');
    }
  };

  const handleCombatAction = (action) => {
    if (expeditionManager) {
      expeditionManager.processCombatAction?.(action);
    }
  };

  const handleEndCombat = () => {
    // Combat ended, return to expedition HUD
    setExpeditionMode('expedition');
  };

  const handleCancelPrep = () => {
    // User cancelled prep, do nothing
  };

  // Determine which view to show
  const renderContent = () => {
    // If there's active combat, show combat interface
    if (activeCombat && expeditionMode === 'combat') {
      return (
        <ExpeditionCombat
          combat={activeCombat}
          party={party}
          enemies={activeCombat.enemies || []}
          onAction={handleCombatAction}
          onEndCombat={handleEndCombat}
        />
      );
    }

    // If there's an active expedition, show expedition HUD
    if (activeExpedition && expeditionMode === 'expedition') {
      return (
        <ExpeditionHUD
          expedition={activeExpedition}
          onRetreat={handleExpeditionRetreat}
          onContinue={handleExpeditionContinue}
        />
      );
    }

    // Default: show expedition preparation
    return (
      <ExpeditionPrep
        onStart={handleStartExpedition}
        onCancel={handleCancelPrep}
      />
    );
  };

  return (
    <div className="expeditions-tab">
      {renderContent()}
    </div>
  );
}

export default ExpeditionsTab;
