/**
 * LeftSidebar.jsx - Left sidebar with tabbed navigation
 *
 * Tabs:
 * - Resources: Visual bars + production rates
 * - NPCs: Cards with combat info
 * - Stats: Population, morale, tier progress
 * - Achievements: Recently unlocked, progress bars
 */

import React from 'react';
import TabbedSidebar from './TabbedSidebar';
import ResourcePanel from './ResourcePanel';
import NPCPanel from './NPCPanel';
import StatsTab from './tabs/StatsTab';
import AchievementPanel from './AchievementPanel';
import { useGame } from '../context/GameContext';

function LeftSidebar({
  resources,
  npcs,
  buildings,
  onAssignNPC,
  onUnassignNPC,
  onAutoAssign
}) {
  const { gameManager } = useGame();

  // Get achievement system
  const achievementSystem = gameManager?.orchestrator?.achievementSystem;

  // Define tabs
  const tabs = [
    {
      id: 'resources',
      label: 'Resources',
      icon: '💰',
      badge: null,
      content: (
        <ResourcePanel
          resources={resources}
          production={{}}
          consumption={{}}
          capacity={{}}
        />
      )
    },
    {
      id: 'npcs',
      label: 'NPCs',
      icon: '👥',
      badge: npcs.filter(npc => !npc.assignedBuilding && !npc.assignedBuildingId && !npc.isDead).length || null,
      content: (
        <NPCPanel
          npcs={npcs}
          buildings={buildings}
          onAssignNPC={onAssignNPC}
          onUnassignNPC={onUnassignNPC}
          onAutoAssign={onAutoAssign}
        />
      )
    },
    {
      id: 'stats',
      label: 'Stats',
      icon: '📊',
      badge: null,
      content: <StatsTab />
    },
    {
      id: 'achievements',
      label: 'Achievements',
      icon: '🏆',
      badge: achievementSystem?.getUnlockedAchievements()?.length > 0 || false,
      content: (
        <AchievementPanel
          achievementSystem={achievementSystem}
        />
      )
    }
  ];

  return (
    <TabbedSidebar
      tabs={tabs}
      side="left"
      storageKey="leftSidebarTab"
      defaultTab="resources"
      className="left-sidebar"
    />
  );
}

export default LeftSidebar;
