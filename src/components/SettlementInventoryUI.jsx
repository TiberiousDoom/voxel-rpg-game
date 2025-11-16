/**
 * SettlementInventoryUI - Shared inventory for settlement, player, and NPCs
 * Simplified inventory system with blue glassmorphism theme
 */

import React, { useState, useEffect } from 'react';
import './SettlementInventoryUI.css';

const SettlementInventoryUI = ({ gameManager, isOpen, onClose }) => {
  const [resources, setResources] = useState({});
  const [capacity, setCapacity] = useState(0);
  const [npcInventories, setNPCInventories] = useState([]);

  // Update inventory data
  useEffect(() => {
    if (!isOpen || !gameManager) return;

    const updateInventory = () => {
      try {
        const state = gameManager.getState();

        // Get settlement resources
        if (state.storageManager) {
          setResources(state.storageManager.storage || {});
          setCapacity(state.storageManager.capacity || 0);
        }

        // Get NPC inventories
        if (state.npcManager) {
          const npcs = Array.from(state.npcManager.npcs.values());
          setNPCInventories(npcs.map(npc => ({
            id: npc.id,
            name: npc.name,
            role: npc.role,
            food: npc.inventory?.food || 0,
            items: npc.inventory?.items || []
          })));
        }
      } catch (error) {
        console.error('Error updating inventory:', error);
      }
    };

    updateInventory();
    const interval = setInterval(updateInventory, 1000);
    return () => clearInterval(interval);
  }, [isOpen, gameManager]);

  if (!isOpen) return null;

  const resourceIcons = {
    food: '🌾',
    wood: '🪵',
    stone: '🪨',
    gold: '💰',
    essence: '✨',
    crystal: '💎'
  };

  const resourceColors = {
    food: '#4caf50',
    wood: '#8d6e63',
    stone: '#78909c',
    gold: '#ffd700',
    essence: '#9c27b0',
    crystal: '#00bcd4'
  };

  const totalUsage = Object.values(resources).reduce((sum, val) => sum + val, 0);
  const usagePercent = capacity > 0 ? (totalUsage / capacity) * 100 : 0;

  return (
    <div className="settlement-inventory-overlay" onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className="settlement-inventory-modal">
        {/* Header */}
        <div className="settlement-inventory-header">
          <div className="header-title">
            <span className="title-icon">📦</span>
            <h2>Settlement Inventory</h2>
          </div>
          <button
            className="close-btn"
            onClick={onClose}
            aria-label="Close inventory"
          >
            ✕
          </button>
        </div>

        <div className="settlement-inventory-content">
          {/* Storage Overview */}
          <div className="storage-overview">
            <h3>Shared Storage</h3>
            <div className="capacity-bar-container">
              <div className="capacity-info">
                <span>Usage: {totalUsage} / {capacity}</span>
                <span>{usagePercent.toFixed(0)}%</span>
              </div>
              <div className="capacity-bar">
                <div
                  className="capacity-fill"
                  style={{
                    width: `${Math.min(usagePercent, 100)}%`,
                    background: usagePercent > 90 ? '#f44336' : usagePercent > 70 ? '#ff9800' : '#3b82f6'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Resources Grid */}
          <div className="resources-section">
            <h3>Resources</h3>
            <div className="resources-grid">
              {Object.entries(resources).map(([type, amount]) => (
                <div key={type} className="resource-card">
                  <div
                    className="resource-icon"
                    style={{
                      background: `${resourceColors[type]}20`,
                      border: `2px solid ${resourceColors[type]}40`
                    }}
                  >
                    <span>{resourceIcons[type] || '📦'}</span>
                  </div>
                  <div className="resource-info">
                    <div className="resource-name">{type.charAt(0).toUpperCase() + type.slice(1)}</div>
                    <div
                      className="resource-amount"
                      style={{ color: resourceColors[type] }}
                    >
                      {amount.toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* NPC Inventories */}
          {npcInventories.length > 0 && (
            <div className="npc-inventories-section">
              <h3>NPC Inventories</h3>
              <div className="npc-inventories-list">
                {npcInventories.map(npc => (
                  <div key={npc.id} className="npc-inventory-item">
                    <div className="npc-info">
                      <span className="npc-icon">👤</span>
                      <div>
                        <div className="npc-name">{npc.name}</div>
                        <div className="npc-role">{npc.role}</div>
                      </div>
                    </div>
                    <div className="npc-food">
                      <span className="food-icon">🌾</span>
                      <span className="food-amount">{npc.food}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {Object.keys(resources).length === 0 && npcInventories.length === 0 && (
            <div className="empty-state">
              <span className="empty-icon">📦</span>
              <p>No inventory data available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettlementInventoryUI;
