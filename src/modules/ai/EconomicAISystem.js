/**
 * EconomicAISystem.js - Dynamic Economy Simulation
 *
 * Features:
 * - Supply and demand-based pricing
 * - Merchant behaviors and trade routes
 * - Market simulation with regional variations
 * - Seasonal price fluctuations
 * - Event-driven market effects
 *
 * Integrates with:
 * - MaterialCraftingSystem for production
 * - SeasonalEventSystem for price modifiers
 */

/**
 * Item categories
 */
export const ItemCategory = {
  FOOD: 'FOOD',
  MATERIALS: 'MATERIALS',
  WEAPONS: 'WEAPONS',
  ARMOR: 'ARMOR',
  TOOLS: 'TOOLS',
  CRAFTED: 'CRAFTED',
  RARE: 'RARE',
  LUXURY: 'LUXURY'
};

/**
 * Season price modifiers
 */
export const SeasonPriceModifiers = {
  SPRING: {
    FOOD: 1.2,      // Scarce before harvest
    MATERIALS: 1.0,
    WEAPONS: 1.0,
    TOOLS: 1.1      // Farming tools in demand
  },
  SUMMER: {
    FOOD: 0.9,      // Fresh produce available
    MATERIALS: 1.0,
    WEAPONS: 1.0,
    TOOLS: 0.9
  },
  AUTUMN: {
    FOOD: 0.7,      // Harvest abundance
    MATERIALS: 0.9,
    WEAPONS: 1.0,
    TOOLS: 0.8
  },
  WINTER: {
    FOOD: 1.4,      // Scarce, preserved food expensive
    MATERIALS: 1.2, // Hard to gather
    WEAPONS: 1.1,
    TOOLS: 1.0
  }
};

/**
 * Weather price modifiers
 */
export const WeatherPriceModifiers = {
  CLEAR: 1.0,
  RAIN: { FOOD: 1.1, MATERIALS: 1.1 },
  STORM: { FOOD: 1.3, MATERIALS: 1.2 },
  DROUGHT: { FOOD: 1.5, MATERIALS: 1.0 }
};

/**
 * Default base prices for items
 */
const DEFAULT_BASE_PRICES = {
  // Food
  bread: { price: 5, category: ItemCategory.FOOD },
  meat: { price: 12, category: ItemCategory.FOOD },
  fish: { price: 8, category: ItemCategory.FOOD },
  vegetables: { price: 4, category: ItemCategory.FOOD },
  fruit: { price: 6, category: ItemCategory.FOOD },

  // Materials
  wood: { price: 3, category: ItemCategory.MATERIALS },
  stone: { price: 4, category: ItemCategory.MATERIALS },
  iron_ore: { price: 15, category: ItemCategory.MATERIALS },
  gold_ore: { price: 50, category: ItemCategory.MATERIALS },
  leather: { price: 10, category: ItemCategory.MATERIALS },
  cloth: { price: 8, category: ItemCategory.MATERIALS },

  // Weapons
  sword: { price: 80, category: ItemCategory.WEAPONS },
  bow: { price: 60, category: ItemCategory.WEAPONS },
  axe: { price: 40, category: ItemCategory.WEAPONS },
  dagger: { price: 30, category: ItemCategory.WEAPONS },

  // Tools
  pickaxe: { price: 25, category: ItemCategory.TOOLS },
  hammer: { price: 20, category: ItemCategory.TOOLS },
  fishing_rod: { price: 15, category: ItemCategory.TOOLS }
};

/**
 * Market data for a location
 */
class MarketData {
  constructor(locationId, config = {}) {
    this.locationId = locationId;
    this.name = config.name || 'Market';

    // Supply and demand for each item
    this.supply = new Map();  // itemId -> quantity
    this.demand = new Map();  // itemId -> demand factor (1.0 = normal)

    // Price history
    this.priceHistory = new Map(); // itemId -> Array<{price, timestamp}>

    // Merchant inventory restocking
    this.lastRestock = Date.now();
    this.restockInterval = config.restockInterval || 3600000; // 1 hour

    // Market specialization
    this.specialization = config.specialization || null; // e.g., 'WEAPONS'
    this.specializationBonus = config.specializationBonus || 0.8; // 20% cheaper

    // Initialize default supply
    this._initializeSupply(config.initialSupply);
  }

  _initializeSupply(initialSupply = {}) {
    for (const [itemId, quantity] of Object.entries(initialSupply)) {
      this.supply.set(itemId, quantity);
      this.demand.set(itemId, 1.0);
    }
  }

  /**
   * Get current supply of an item
   */
  getSupply(itemId) {
    return this.supply.get(itemId) || 0;
  }

  /**
   * Get current demand factor
   */
  getDemand(itemId) {
    return this.demand.get(itemId) || 1.0;
  }

  /**
   * Modify supply
   */
  modifySupply(itemId, amount) {
    const current = this.supply.get(itemId) || 0;
    this.supply.set(itemId, Math.max(0, current + amount));

    // Adjust demand based on supply changes
    this._adjustDemand(itemId);
  }

  /**
   * Adjust demand based on supply
   * @private
   */
  _adjustDemand(itemId) {
    const supply = this.getSupply(itemId);

    // Low supply = high demand, high supply = low demand
    let demand;
    if (supply <= 5) {
      demand = 1.5; // Scarce
    } else if (supply <= 20) {
      demand = 1.2;
    } else if (supply <= 50) {
      demand = 1.0; // Normal
    } else if (supply <= 100) {
      demand = 0.8;
    } else {
      demand = 0.6; // Surplus
    }

    this.demand.set(itemId, demand);
  }

  /**
   * Record price for history
   */
  recordPrice(itemId, price) {
    if (!this.priceHistory.has(itemId)) {
      this.priceHistory.set(itemId, []);
    }

    const history = this.priceHistory.get(itemId);
    history.push({ price, timestamp: Date.now() });

    // Keep only last 100 entries
    if (history.length > 100) {
      history.shift();
    }
  }

  /**
   * Get price trend
   * @returns {string} 'rising', 'falling', 'stable'
   */
  getPriceTrend(itemId) {
    const history = this.priceHistory.get(itemId);
    if (!history || history.length < 2) return 'stable';

    const recent = history.slice(-5);
    if (recent.length < 2) return 'stable';

    const first = recent[0].price;
    const last = recent[recent.length - 1].price;
    const change = (last - first) / first;

    if (change > 0.1) return 'rising';
    if (change < -0.1) return 'falling';
    return 'stable';
  }

  toJSON() {
    return {
      locationId: this.locationId,
      name: this.name,
      supply: Object.fromEntries(this.supply),
      demand: Object.fromEntries(this.demand),
      specialization: this.specialization,
      lastRestock: this.lastRestock
    };
  }

  static fromJSON(data) {
    const market = new MarketData(data.locationId, {
      name: data.name,
      specialization: data.specialization
    });
    market.supply = new Map(Object.entries(data.supply || {}));
    market.demand = new Map(Object.entries(data.demand || {}));
    market.lastRestock = data.lastRestock;
    return market;
  }
}

/**
 * Merchant AI data
 */
class Merchant {
  constructor(config = {}) {
    this.id = config.id || `merchant_${Date.now()}`;
    this.name = config.name || 'Merchant';
    this.position = config.position || { x: 0, z: 0 };
    this.homeMarket = config.homeMarket || null;
    this.currentMarket = config.homeMarket || null;

    // Inventory
    this.inventory = new Map(); // itemId -> quantity
    this.gold = config.gold || 1000;

    // Trade preferences
    this.specialization = config.specialization || null;
    this.buyPriceModifier = config.buyPriceModifier || 0.7; // Buy at 70% of sell price
    this.sellPriceModifier = config.sellPriceModifier || 1.0;

    // Trade route
    this.tradeRoute = config.tradeRoute || []; // Array of marketIds
    this.currentRouteIndex = 0;

    // State
    this.state = 'IDLE'; // IDLE, TRAVELING, TRADING
    this.currentPath = null;
    this.reputation = new Map(); // entityId -> reputation value
  }

  /**
   * Get buy price for an item
   */
  getBuyPrice(itemId, basePrice) {
    return Math.floor(basePrice * this.buyPriceModifier);
  }

  /**
   * Get sell price for an item
   */
  getSellPrice(itemId, basePrice) {
    return Math.floor(basePrice * this.sellPriceModifier);
  }

  /**
   * Get inventory count
   */
  getInventory(itemId) {
    return this.inventory.get(itemId) || 0;
  }

  /**
   * Modify inventory
   */
  modifyInventory(itemId, amount) {
    const current = this.getInventory(itemId);
    if (current + amount < 0) return false;
    this.inventory.set(itemId, current + amount);
    return true;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      position: this.position,
      homeMarket: this.homeMarket,
      currentMarket: this.currentMarket,
      inventory: Object.fromEntries(this.inventory),
      gold: this.gold,
      specialization: this.specialization,
      tradeRoute: this.tradeRoute,
      state: this.state
    };
  }

  static fromJSON(data) {
    const merchant = new Merchant(data);
    merchant.inventory = new Map(Object.entries(data.inventory || {}));
    return merchant;
  }
}

/**
 * EconomicAISystem class
 */
export class EconomicAISystem {
  /**
   * Create economic AI system
   * @param {Object} options - Configuration
   */
  constructor(options = {}) {
    // Item definitions
    this.basePrices = { ...DEFAULT_BASE_PRICES, ...options.basePrices };

    // Markets
    this.markets = new Map(); // marketId -> MarketData

    // Merchants
    this.merchants = new Map(); // merchantId -> Merchant

    // Player reputation with merchants
    this.playerReputation = new Map(); // merchantId -> reputation value

    // Current game state
    this.currentSeason = 'SUMMER';
    this.currentWeather = 'CLEAR';
    this.activeEvents = [];

    // Configuration
    this.config = {
      reputationDecay: 0.001, // Per hour
      maxReputation: 100,
      minReputation: -100,
      reputationPriceEffect: 0.002, // 0.2% per reputation point
      merchantUpdateInterval: 60000 // 1 minute
    };

    // Statistics
    this.stats = {
      transactionsCompleted: 0,
      totalGoldExchanged: 0,
      priceUpdates: 0
    };

    // Event listeners
    this.listeners = [];
  }

  /**
   * Register a market
   * @param {string} marketId - Market ID
   * @param {Object} config - Market configuration
   */
  registerMarket(marketId, config = {}) {
    const market = new MarketData(marketId, config);
    this.markets.set(marketId, market);
    return market;
  }

  /**
   * Get market data
   * @param {string} marketId - Market ID
   * @returns {MarketData|null}
   */
  getMarket(marketId) {
    return this.markets.get(marketId) || null;
  }

  /**
   * Register a merchant
   * @param {Object} config - Merchant configuration
   * @returns {Merchant}
   */
  registerMerchant(config = {}) {
    const merchant = new Merchant(config);
    this.merchants.set(merchant.id, merchant);
    this.playerReputation.set(merchant.id, 0);
    return merchant;
  }

  /**
   * Get merchant
   * @param {string} merchantId - Merchant ID
   * @returns {Merchant|null}
   */
  getMerchant(merchantId) {
    return this.merchants.get(merchantId) || null;
  }

  /**
   * Set game state
   * @param {Object} gameState - Current game state
   */
  setGameState(gameState) {
    if (gameState.season) this.currentSeason = gameState.season;
    if (gameState.weather) this.currentWeather = gameState.weather;
    if (gameState.events) this.activeEvents = gameState.events;
  }

  /**
   * Calculate item price at a market
   * @param {string} itemId - Item ID
   * @param {string} marketId - Market ID
   * @param {Object} options - Price options
   * @returns {number} Calculated price
   */
  calculatePrice(itemId, marketId, options = {}) {
    const itemData = this.basePrices[itemId];
    if (!itemData) return 0;

    let price = itemData.price;
    const category = itemData.category;

    // Apply market supply/demand
    const market = this.markets.get(marketId);
    if (market) {
      const demandFactor = market.getDemand(itemId);
      price *= demandFactor;

      // Apply specialization bonus
      if (market.specialization === category) {
        price *= market.specializationBonus;
      }
    }

    // Apply seasonal modifier
    const seasonMod = SeasonPriceModifiers[this.currentSeason];
    if (seasonMod && seasonMod[category]) {
      price *= seasonMod[category];
    }

    // Apply weather modifier
    const weatherMod = WeatherPriceModifiers[this.currentWeather];
    if (typeof weatherMod === 'object' && weatherMod[category]) {
      price *= weatherMod[category];
    }

    // Apply event modifiers
    for (const event of this.activeEvents) {
      if (event.priceModifiers && event.priceModifiers[category]) {
        price *= event.priceModifiers[category];
      }
    }

    // Apply reputation modifier for player
    if (options.forPlayer && options.merchantId) {
      const reputation = this.playerReputation.get(options.merchantId) || 0;
      price *= 1 - (reputation * this.config.reputationPriceEffect);
    }

    // Record price history
    if (market) {
      market.recordPrice(itemId, Math.floor(price));
    }

    this.stats.priceUpdates++;
    return Math.max(1, Math.floor(price));
  }

  /**
   * Execute a buy transaction (player buys from merchant)
   * @param {string} merchantId - Merchant ID
   * @param {string} itemId - Item ID
   * @param {number} quantity - Quantity to buy
   * @param {Object} player - Player data with gold
   * @returns {Object} Transaction result
   */
  buyFromMerchant(merchantId, itemId, quantity, player) {
    const merchant = this.merchants.get(merchantId);
    if (!merchant) {
      return { success: false, reason: 'merchant_not_found' };
    }

    // Check merchant inventory
    const available = merchant.getInventory(itemId);
    if (available < quantity) {
      return { success: false, reason: 'insufficient_stock', available };
    }

    // Calculate price
    const unitPrice = this.calculatePrice(itemId, merchant.currentMarket, {
      forPlayer: true,
      merchantId
    });
    const totalPrice = unitPrice * quantity;

    // Check player gold
    if (player.gold < totalPrice) {
      return { success: false, reason: 'insufficient_gold', required: totalPrice };
    }

    // Execute transaction
    merchant.modifyInventory(itemId, -quantity);
    merchant.gold += totalPrice;

    // Update market supply
    const market = this.markets.get(merchant.currentMarket);
    if (market) {
      market.modifySupply(itemId, -quantity);
    }

    // Increase reputation slightly
    this._modifyReputation(merchantId, 1);

    this.stats.transactionsCompleted++;
    this.stats.totalGoldExchanged += totalPrice;

    this._emitEvent('purchase', {
      merchantId,
      itemId,
      quantity,
      totalPrice,
      unitPrice
    });

    return {
      success: true,
      itemId,
      quantity,
      unitPrice,
      totalPrice
    };
  }

  /**
   * Execute a sell transaction (player sells to merchant)
   * @param {string} merchantId - Merchant ID
   * @param {string} itemId - Item ID
   * @param {number} quantity - Quantity to sell
   * @returns {Object} Transaction result
   */
  sellToMerchant(merchantId, itemId, quantity) {
    const merchant = this.merchants.get(merchantId);
    if (!merchant) {
      return { success: false, reason: 'merchant_not_found' };
    }

    // Calculate buy price (what merchant pays)
    const sellPrice = this.calculatePrice(itemId, merchant.currentMarket, {
      forPlayer: true,
      merchantId
    });
    const buyPrice = Math.floor(sellPrice * merchant.buyPriceModifier);
    const totalPrice = buyPrice * quantity;

    // Check merchant gold
    if (merchant.gold < totalPrice) {
      return { success: false, reason: 'merchant_broke', available: merchant.gold };
    }

    // Execute transaction
    merchant.modifyInventory(itemId, quantity);
    merchant.gold -= totalPrice;

    // Update market supply
    const market = this.markets.get(merchant.currentMarket);
    if (market) {
      market.modifySupply(itemId, quantity);
    }

    // Increase reputation slightly
    this._modifyReputation(merchantId, 1);

    this.stats.transactionsCompleted++;
    this.stats.totalGoldExchanged += totalPrice;

    this._emitEvent('sale', {
      merchantId,
      itemId,
      quantity,
      totalPrice,
      unitPrice: buyPrice
    });

    return {
      success: true,
      itemId,
      quantity,
      unitPrice: buyPrice,
      totalPrice
    };
  }

  /**
   * Negotiate price
   * @param {string} merchantId - Merchant ID
   * @param {string} itemId - Item ID
   * @param {number} proposedPrice - Player's proposed price
   * @param {boolean} isBuying - True if player is buying
   * @returns {Object} Negotiation result
   */
  negotiate(merchantId, itemId, proposedPrice, isBuying = true) {
    const merchant = this.merchants.get(merchantId);
    if (!merchant) {
      return { success: false, reason: 'merchant_not_found' };
    }

    const basePrice = this.calculatePrice(itemId, merchant.currentMarket, {
      forPlayer: true,
      merchantId
    });

    const reputation = this.playerReputation.get(merchantId) || 0;

    // Calculate acceptable range based on reputation
    const reputationFactor = Math.max(0, reputation) / 100;
    const minAcceptable = isBuying ?
      basePrice * (0.85 - reputationFactor * 0.1) : // Buying: 85-95% of base
      basePrice * (0.6 + reputationFactor * 0.1);   // Selling: 60-70% of base
    const maxAcceptable = isBuying ?
      basePrice * 1.2 :
      basePrice * 0.9;

    if (isBuying) {
      // Player wants lower price
      if (proposedPrice >= minAcceptable) {
        return { success: true, acceptedPrice: Math.floor(proposedPrice), reason: 'accepted' };
      }
      // Counter-offer
      const counterOffer = Math.floor((proposedPrice + basePrice) / 2);
      return { success: false, counterOffer, reason: 'counter_offer' };
    } else {
      // Player wants higher price
      if (proposedPrice <= maxAcceptable) {
        return { success: true, acceptedPrice: Math.floor(proposedPrice), reason: 'accepted' };
      }
      const counterOffer = Math.floor((proposedPrice + basePrice * 0.7) / 2);
      return { success: false, counterOffer, reason: 'counter_offer' };
    }
  }

  /**
   * Modify player reputation with merchant
   * @private
   */
  _modifyReputation(merchantId, change) {
    const current = this.playerReputation.get(merchantId) || 0;
    const newRep = Math.max(
      this.config.minReputation,
      Math.min(this.config.maxReputation, current + change)
    );
    this.playerReputation.set(merchantId, newRep);
  }

  /**
   * Get player reputation with merchant
   * @param {string} merchantId - Merchant ID
   * @returns {number}
   */
  getPlayerReputation(merchantId) {
    return this.playerReputation.get(merchantId) || 0;
  }

  /**
   * Update all markets and merchants
   * @param {number} deltaTime - Time since last update (ms)
   */
  update(deltaTime) {
    // Update markets (restock)
    for (const market of this.markets.values()) {
      const timeSinceRestock = Date.now() - market.lastRestock;
      if (timeSinceRestock >= market.restockInterval) {
        this._restockMarket(market);
        market.lastRestock = Date.now();
      }
    }

    // Update merchant AI
    for (const merchant of this.merchants.values()) {
      this._updateMerchant(merchant, deltaTime);
    }
  }

  /**
   * Restock a market
   * @private
   */
  _restockMarket(market) {
    // Add random supply to each item
    for (const [itemId, itemData] of Object.entries(this.basePrices)) {
      const baseSupply = 10 + Math.floor(Math.random() * 20);

      // Specialization bonus
      let supply = baseSupply;
      if (market.specialization === itemData.category) {
        supply *= 2;
      }

      market.modifySupply(itemId, supply);
    }

    this._emitEvent('marketRestocked', { marketId: market.locationId });
  }

  /**
   * Update merchant AI
   * @private
   */
  _updateMerchant(merchant, deltaTime) {
    if (merchant.state === 'TRAVELING' && merchant.tradeRoute.length > 0) {
      // Move to next market in route
      merchant.currentRouteIndex =
        (merchant.currentRouteIndex + 1) % merchant.tradeRoute.length;
      merchant.currentMarket = merchant.tradeRoute[merchant.currentRouteIndex];
      merchant.state = 'TRADING';

      this._emitEvent('merchantArrived', {
        merchantId: merchant.id,
        marketId: merchant.currentMarket
      });
    }
  }

  /**
   * Get market price list
   * @param {string} marketId - Market ID
   * @returns {Object} Item prices
   */
  getMarketPrices(marketId) {
    const prices = {};
    for (const itemId of Object.keys(this.basePrices)) {
      prices[itemId] = this.calculatePrice(itemId, marketId);
    }
    return prices;
  }

  /**
   * Get market supply list
   * @param {string} marketId - Market ID
   * @returns {Object} Item supplies
   */
  getMarketSupply(marketId) {
    const market = this.markets.get(marketId);
    if (!market) return {};

    const supply = {};
    for (const [itemId, quantity] of market.supply) {
      supply[itemId] = quantity;
    }
    return supply;
  }

  /**
   * Add event listener
   */
  addListener(listener) {
    this.listeners.push(listener);
  }

  /**
   * Remove event listener
   */
  removeListener(listener) {
    const index = this.listeners.indexOf(listener);
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Emit event
   * @private
   */
  _emitEvent(type, data) {
    for (const listener of this.listeners) {
      try {
        listener(type, data);
      } catch (error) {
        console.error('[EconomicAISystem] Listener error:', error);
      }
    }
  }

  /**
   * Get statistics
   */
  getStatistics() {
    return {
      ...this.stats,
      marketCount: this.markets.size,
      merchantCount: this.merchants.size
    };
  }

  /**
   * Serialize to JSON
   */
  toJSON() {
    const markets = {};
    for (const [id, market] of this.markets) {
      markets[id] = market.toJSON();
    }

    const merchants = {};
    for (const [id, merchant] of this.merchants) {
      merchants[id] = merchant.toJSON();
    }

    return {
      markets,
      merchants,
      playerReputation: Object.fromEntries(this.playerReputation),
      currentSeason: this.currentSeason,
      currentWeather: this.currentWeather
    };
  }

  /**
   * Load from JSON
   */
  fromJSON(data) {
    this.markets.clear();
    this.merchants.clear();
    this.playerReputation.clear();

    if (data.markets) {
      for (const marketData of Object.values(data.markets)) {
        this.markets.set(marketData.locationId, MarketData.fromJSON(marketData));
      }
    }

    if (data.merchants) {
      for (const merchantData of Object.values(data.merchants)) {
        this.merchants.set(merchantData.id, Merchant.fromJSON(merchantData));
      }
    }

    if (data.playerReputation) {
      for (const [id, rep] of Object.entries(data.playerReputation)) {
        this.playerReputation.set(id, rep);
      }
    }

    this.currentSeason = data.currentSeason || 'SUMMER';
    this.currentWeather = data.currentWeather || 'CLEAR';
  }
}

export { MarketData, Merchant };
export default EconomicAISystem;
