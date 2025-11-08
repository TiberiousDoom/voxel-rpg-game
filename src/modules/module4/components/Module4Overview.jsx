/**
 * Module 4 Overview Component
 *
 * Displays comprehensive overview of Module 4 systems including:
 * - Territory status and expansion
 * - Town statistics and upgrades
 * - NPC population and assignments
 * - Victory conditions and progression
 */

import React, { useMemo } from 'react';
import { useTerritory } from '../stores/useTerritory';
import { useTownManagement } from '../stores/useTownManagement';
import { useNPCSystem } from '../stores/useNPCSystem';
import { useProgressionSystem } from '../stores/useProgressionSystem';

export function Module4Overview() {
  const activeTerritory = useTerritory((state) => state.getActiveTerritory());
  const activeTown = useTownManagement((state) => state.getActiveTown());
  const totalPopulation = useNPCSystem((state) => state.getTotalPopulation());
  const overallProgress = useProgressionSystem((state) => state.getOverallProgress());

  const territoryInfo = useMemo(
    () => (activeTerritory ? useTerritory.getState().getTerritoryInfo(activeTerritory.id) : null),
    [activeTerritory]
  );

  const townStats = useMemo(
    () => (activeTown ? useTownManagement.getState().getTownStatistics(activeTown.id) : null),
    [activeTown]
  );

  if (!activeTerritory || !activeTown) {
    return (
      <div className="module4-overview empty-state">
        <h2>Module 4: Territory & Town Planning</h2>
        <p>Create a territory and town to get started.</p>
      </div>
    );
  }

  return (
    <div className="module4-overview">
      <h2>{activeTown.name}</h2>

      {/* Territory Section */}
      <section className="territory-section">
        <h3>Territory: {activeTerritory.name}</h3>
        {territoryInfo && (
          <div className="territory-info">
            <div className="stat">
              <span className="label">Radius:</span>
              <div className="bar">
                <div
                  className="fill"
                  style={{ width: `${territoryInfo.radiusPercentage}%` }}
                />
              </div>
              <span className="value">
                {territoryInfo.radius} / {territoryInfo.maxRadius} cells
              </span>
            </div>
            <div className="stat">
              <span className="label">Buildings:</span>
              <span className="value">{territoryInfo.buildingCount}</span>
            </div>
            <div className="stat">
              <span className="label">Territory Bonuses:</span>
              <span className="value">{territoryInfo.bonusCount}</span>
            </div>
          </div>
        )}
      </section>

      {/* Town Statistics Section */}
      {townStats && (
        <section className="town-section">
          <h3>Town Statistics</h3>
          <div className="statistics-grid">
            <div className="stat">
              <span className="label">Population</span>
              <span className="value">{totalPopulation}</span>
            </div>
            <div className="stat">
              <span className="label">Happiness</span>
              <div className="bar">
                <div className="fill happy" style={{ width: `${townStats.happiness}%` }} />
              </div>
              <span className="value">{townStats.happiness}%</span>
            </div>
            <div className="stat">
              <span className="label">Defense</span>
              <div className="bar">
                <div className="fill defensive" style={{ width: `${townStats.defense}%` }} />
              </div>
              <span className="value">{townStats.defense}%</span>
            </div>
            <div className="stat">
              <span className="label">Prosperity</span>
              <div className="bar">
                <div className="fill prosperous" style={{ width: `${townStats.prosperity}%` }} />
              </div>
              <span className="value">{townStats.prosperity}%</span>
            </div>
            <div className="stat">
              <span className="label">Total Buildings</span>
              <span className="value">{townStats.totalBuildingCount}</span>
            </div>
            <div className="stat">
              <span className="label">Production Rate</span>
              <span className="value">{townStats.productionRate.toFixed(2)}x</span>
            </div>
          </div>
        </section>
      )}

      {/* Progression Section */}
      <section className="progression-section">
        <h3>Overall Progress</h3>
        <div className="progress-bar">
          <div className="fill" style={{ width: `${overallProgress}%` }} />
        </div>
        <span className="value">{overallProgress}% Complete</span>
      </section>

      {/* Town Level Section */}
      {activeTown && (
        <section className="town-level-section">
          <h3>Town Level</h3>
          <div className="level-display">
            <span className="level">{activeTown.level}</span>
            <span className="label">/ 10</span>
          </div>
        </section>
      )}
    </div>
  );
}

export default Module4Overview;
