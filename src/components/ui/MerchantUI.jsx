/**
 * MerchantUI.jsx - Merchant trading interface
 *
 * Features:
 * - View merchant inventory
 * - Buy items from merchant
 * - Sell items to merchant
 * - Dynamic pricing based on economy
 */

import React, { useState, useCallback } from 'react';
import useGameStore from '../../stores/useGameStore.js';
import './MerchantUI.css';

/**
 * MerchantUI component
 * @param {Object} props
 * @param {Object} props.merchant - Merchant data from EconomicAISystem
 * @param {Function} props.onClose - Close callback
 * @param {Function} props.onTrade - Trade callback (merchantId, action, item, quantity)
 */
function MerchantUI({ merchant, onClose, onTrade }) {
  const [selectedTab, setSelectedTab] = useState('buy'); // 'buy' or 'sell'
  const [selectedItem, setSelectedItem] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [tradeMessage, setTradeMessage] = useState(null);

  // Get player inventory and gold from game store
  const playerGold = useGameStore(state => state.resources?.gold || 0);
  const playerInventory = useGameStore(state => state.inventory || []);
  const addGold = useGameStore(state => state.addResource);
  const removeGold = useGameStore(state => state.removeResource);

  // Get merchant inventory
  const merchantInventory = merchant?.inventory || [];
  const merchantGold = merchant?.gold || 0;
  const merchantName = merchant?.name || 'Merchant';

  /**
   * Calculate buy price for an item
   */
  const getBuyPrice = useCallback((item) => {
    const basePrice = item.basePrice || item.price || 10;
    // Merchants sell at 120% of base price
    return Math.ceil(basePrice * 1.2);
  }, []);

  /**
   * Calculate sell price for an item
   */
  const getSellPrice = useCallback((item) => {
    const basePrice = item.basePrice || item.price || 10;
    // Merchants buy at 60% of base price
    return Math.floor(basePrice * 0.6);
  }, []);

  /**
   * Handle buy transaction
   */
  const handleBuy = useCallback(() => {
    if (!selectedItem) return;

    const totalCost = getBuyPrice(selectedItem) * quantity;

    if (playerGold < totalCost) {
      setTradeMessage({ type: 'error', text: 'Not enough gold!' });
      return;
    }

    if ((selectedItem.quantity || 1) < quantity) {
      setTradeMessage({ type: 'error', text: 'Merchant doesn\'t have enough stock!' });
      return;
    }

    // Execute trade
    if (onTrade) {
      const result = onTrade(merchant.id, 'buy', selectedItem, quantity);
      if (result?.success) {
        setTradeMessage({ type: 'success', text: `Bought ${quantity}x ${selectedItem.name} for ${totalCost} gold` });
        setSelectedItem(null);
        setQuantity(1);
      } else {
        setTradeMessage({ type: 'error', text: result?.error || 'Trade failed!' });
      }
    }
  }, [selectedItem, quantity, playerGold, getBuyPrice, onTrade, merchant?.id]);

  /**
   * Handle sell transaction
   */
  const handleSell = useCallback(() => {
    if (!selectedItem) return;

    const totalValue = getSellPrice(selectedItem) * quantity;

    if ((selectedItem.quantity || 1) < quantity) {
      setTradeMessage({ type: 'error', text: 'You don\'t have enough items!' });
      return;
    }

    if (merchantGold < totalValue) {
      setTradeMessage({ type: 'error', text: 'Merchant doesn\'t have enough gold!' });
      return;
    }

    // Execute trade
    if (onTrade) {
      const result = onTrade(merchant.id, 'sell', selectedItem, quantity);
      if (result?.success) {
        setTradeMessage({ type: 'success', text: `Sold ${quantity}x ${selectedItem.name} for ${totalValue} gold` });
        setSelectedItem(null);
        setQuantity(1);
      } else {
        setTradeMessage({ type: 'error', text: result?.error || 'Trade failed!' });
      }
    }
  }, [selectedItem, quantity, merchantGold, getSellPrice, onTrade, merchant?.id]);

  /**
   * Render item grid
   */
  const renderItemGrid = () => {
    const items = selectedTab === 'buy' ? merchantInventory : playerInventory;

    if (items.length === 0) {
      return (
        <div className="merchant-items-empty">
          {selectedTab === 'buy' ? 'Merchant has no items for sale' : 'You have no items to sell'}
        </div>
      );
    }

    return (
      <div className="merchant-items-grid">
        {items.map((item, index) => (
          <div
            key={item.id || index}
            className={`merchant-item ${selectedItem?.id === item.id ? 'selected' : ''}`}
            onClick={() => {
              setSelectedItem(item);
              setQuantity(1);
            }}
          >
            <div className="item-icon">{item.icon || '📦'}</div>
            <div className="item-name">{item.name}</div>
            <div className="item-price">
              {selectedTab === 'buy' ? getBuyPrice(item) : getSellPrice(item)} 💰
            </div>
            {item.quantity > 1 && (
              <div className="item-quantity">x{item.quantity}</div>
            )}
          </div>
        ))}
      </div>
    );
  };

  /**
   * Render selected item details
   */
  const renderItemDetails = () => {
    if (!selectedItem) {
      return (
        <div className="merchant-details-empty">
          Select an item to view details
        </div>
      );
    }

    const price = selectedTab === 'buy' ? getBuyPrice(selectedItem) : getSellPrice(selectedItem);
    const totalPrice = price * quantity;
    const maxQuantity = selectedItem.quantity || 1;

    return (
      <div className="merchant-item-details">
        <div className="detail-header">
          <span className="detail-icon">{selectedItem.icon || '📦'}</span>
          <h3>{selectedItem.name}</h3>
        </div>

        {selectedItem.description && (
          <p className="detail-description">{selectedItem.description}</p>
        )}

        <div className="detail-stats">
          {selectedItem.damage && (
            <div className="stat-item">
              <span className="stat-label">Damage:</span>
              <span className="stat-value">+{selectedItem.damage}</span>
            </div>
          )}
          {selectedItem.defense && (
            <div className="stat-item">
              <span className="stat-label">Defense:</span>
              <span className="stat-value">+{selectedItem.defense}</span>
            </div>
          )}
          {selectedItem.healing && (
            <div className="stat-item">
              <span className="stat-label">Healing:</span>
              <span className="stat-value">+{selectedItem.healing}</span>
            </div>
          )}
        </div>

        <div className="detail-price">
          <span className="price-label">
            {selectedTab === 'buy' ? 'Buy Price:' : 'Sell Price:'}
          </span>
          <span className="price-value">{price} 💰 each</span>
        </div>

        <div className="detail-quantity">
          <label>Quantity:</label>
          <div className="quantity-controls">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
            >
              -
            </button>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Math.min(maxQuantity, Math.max(1, parseInt(e.target.value) || 1)))}
              min={1}
              max={maxQuantity}
            />
            <button
              onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
              disabled={quantity >= maxQuantity}
            >
              +
            </button>
          </div>
          <span className="quantity-max">Max: {maxQuantity}</span>
        </div>

        <div className="detail-total">
          <span className="total-label">Total:</span>
          <span className="total-value">{totalPrice} 💰</span>
        </div>

        <button
          className={`btn-trade ${selectedTab === 'buy' ? 'btn-buy' : 'btn-sell'}`}
          onClick={selectedTab === 'buy' ? handleBuy : handleSell}
        >
          {selectedTab === 'buy' ? `Buy for ${totalPrice} gold` : `Sell for ${totalPrice} gold`}
        </button>
      </div>
    );
  };

  return (
    <div className="merchant-overlay">
      <div className="merchant-ui">
        {/* Header */}
        <div className="merchant-header">
          <div className="merchant-info">
            <span className="merchant-avatar">🧙</span>
            <div>
              <h1>{merchantName}</h1>
              <span className="merchant-gold">Merchant Gold: {merchantGold} 💰</span>
            </div>
          </div>
          <div className="player-gold">
            <span>Your Gold: {playerGold} 💰</span>
          </div>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>

        {/* Trade Message */}
        {tradeMessage && (
          <div className={`trade-message ${tradeMessage.type}`}>
            {tradeMessage.text}
            <button onClick={() => setTradeMessage(null)}>×</button>
          </div>
        )}

        {/* Tabs */}
        <div className="merchant-tabs">
          <button
            className={`tab ${selectedTab === 'buy' ? 'active' : ''}`}
            onClick={() => {
              setSelectedTab('buy');
              setSelectedItem(null);
            }}
          >
            Buy ({merchantInventory.length})
          </button>
          <button
            className={`tab ${selectedTab === 'sell' ? 'active' : ''}`}
            onClick={() => {
              setSelectedTab('sell');
              setSelectedItem(null);
            }}
          >
            Sell ({playerInventory.length})
          </button>
        </div>

        {/* Content */}
        <div className="merchant-content">
          <div className="merchant-items">
            {renderItemGrid()}
          </div>
          <div className="merchant-details">
            {renderItemDetails()}
          </div>
        </div>
      </div>
    </div>
  );
}

export default MerchantUI;
