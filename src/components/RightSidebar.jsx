/**
 * RightSidebar.jsx - Right sidebar with tabbed navigation
 *
 * Tabs:
 * - Build: Current build menu
 * - Expeditions: Party formation, dungeon selection, loot
 * - Defense: Settlement health, defender stats, raid schedule
 * - Actions: Quick actions (spawn NPC, advance tier, etc.)
 */

import React from 'react';
import TabbedSidebar from './TabbedSidebar';
import BuildMenu from './BuildMenu';
import ExpeditionsTab from './tabs/ExpeditionsTab';
import DefenseTab from './tabs/DefenseTab';
import ActionsTab from './tabs/ActionsTab';
import { useGame } from '../context/GameContext';

function RightSidebar({
  selectedBuildingType,
  onSelectBuilding,
  onSpawnNPC,
  onAdvanceTier,
  onAutoAssignNPCs,
  currentTier,
  buildingConfig,
  placedBuildingCounts
}) {
  const { gameState, gameManager } = useGame();

  // Get expedition and raid info for badges
  const npcs = gameState.npcs || [];
  const onExpedition = npcs.filter(npc => npc.status === 'ON_EXPEDITION').length;
  const raidManager = gameManager?.orchestrator?.raidEventManager;
  const activeRaid = raidManager?.activeRaid;

  // Define tabs
  const tabs = [
    {
      id: 'build',
      label: 'Build',
      icon: '🏗️',
      badge: selectedBuildingType ? true : null,
      content: (
        <BuildMenu
          selectedBuildingType={selectedBuildingType}
          onSelectBuilding={onSelectBuilding}
          onSpawnNPC={onSpawnNPC}
          onAdvanceTier={onAdvanceTier}
          currentTier={currentTier}
          buildingConfig={buildingConfig}
          placedBuildingCounts={placedBuildingCounts}
        />
      )
    },
    {
      id: 'expeditions',
      label: 'Expeditions',
      icon: '⚔️',
      badge: onExpedition || null,
      content: <ExpeditionsTab />
    },
    {
      id: 'defense',
      label: 'Defense',
      icon: '🛡️',
      badge: activeRaid ? true : null,
      content: <DefenseTab />
    },
    {
      id: 'actions',
      label: 'Actions',
      icon: '⚡',
      badge: null,
      content: (
        <ActionsTab
          onSpawnNPC={onSpawnNPC}
          onAdvanceTier={onAdvanceTier}
          onAutoAssignNPCs={onAutoAssignNPCs}
        />
      )
    }
  ];

  return (
    <TabbedSidebar
      tabs={tabs}
      side="right"
      storageKey="rightSidebarTab"
      defaultTab="build"
      className="right-sidebar"
    />
  );
}

export default RightSidebar;
