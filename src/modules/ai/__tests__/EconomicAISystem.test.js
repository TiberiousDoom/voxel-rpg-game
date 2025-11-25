/**
 * EconomicAISystem.test.js - Comprehensive tests for Economic AI System
 */

import {
  EconomicAISystem,
  MarketData,
  Merchant,
  ItemCategory,
  SeasonPriceModifiers,
  WeatherPriceModifiers
} from '../EconomicAISystem.js';

describe('EconomicAISystem', () => {
  let economy;

  beforeEach(() => {
    economy = new EconomicAISystem();
  });

  // ============================================
  // ENUMS TESTS
  // ============================================

  describe('Enums', () => {
    test('ItemCategory should have all categories', () => {
      expect(ItemCategory.FOOD).toBe('FOOD');
      expect(ItemCategory.MATERIALS).toBe('MATERIALS');
      expect(ItemCategory.WEAPONS).toBe('WEAPONS');
      expect(ItemCategory.ARMOR).toBe('ARMOR');
      expect(ItemCategory.TOOLS).toBe('TOOLS');
      expect(ItemCategory.CRAFTED).toBe('CRAFTED');
      expect(ItemCategory.RARE).toBe('RARE');
      expect(ItemCategory.LUXURY).toBe('LUXURY');
    });

    test('SeasonPriceModifiers should have all seasons', () => {
      expect(SeasonPriceModifiers.SPRING).toBeDefined();
      expect(SeasonPriceModifiers.SUMMER).toBeDefined();
      expect(SeasonPriceModifiers.AUTUMN).toBeDefined();
      expect(SeasonPriceModifiers.WINTER).toBeDefined();
    });

    test('WeatherPriceModifiers should have weather types', () => {
      expect(WeatherPriceModifiers.CLEAR).toBe(1.0);
      expect(WeatherPriceModifiers.RAIN).toBeDefined();
      expect(WeatherPriceModifiers.STORM).toBeDefined();
      expect(WeatherPriceModifiers.DROUGHT).toBeDefined();
    });
  });

  // ============================================
  // SEASON PRICE TESTS
  // ============================================

  describe('Season Price Modifiers', () => {
    test('winter should increase food prices', () => {
      expect(SeasonPriceModifiers.WINTER.FOOD).toBeGreaterThan(1.0);
    });

    test('autumn should decrease food prices (harvest)', () => {
      expect(SeasonPriceModifiers.AUTUMN.FOOD).toBeLessThan(1.0);
    });

    test('spring should increase tool prices', () => {
      expect(SeasonPriceModifiers.SPRING.TOOLS).toBeGreaterThanOrEqual(1.0);
    });
  });

  // ============================================
  // MARKET DATA TESTS
  // ============================================

  describe('MarketData', () => {
    let market;

    beforeEach(() => {
      market = new MarketData('market1', {
        name: 'Test Market',
        initialSupply: { bread: 50, sword: 10 }
      });
    });

    test('should create with config', () => {
      expect(market.locationId).toBe('market1');
      expect(market.name).toBe('Test Market');
    });

    test('should get supply', () => {
      expect(market.getSupply('bread')).toBe(50);
      expect(market.getSupply('unknown')).toBe(0);
    });

    test('should get demand', () => {
      expect(market.getDemand('bread')).toBeDefined();
      expect(market.getDemand('unknown')).toBe(1.0);
    });

    test('should modify supply', () => {
      market.modifySupply('bread', -10);
      expect(market.getSupply('bread')).toBe(40);
    });

    test('should not go below zero supply', () => {
      market.modifySupply('bread', -100);
      expect(market.getSupply('bread')).toBe(0);
    });

    test('should adjust demand based on supply', () => {
      // Low supply = high demand
      market.modifySupply('bread', -45); // Down to 5
      expect(market.getDemand('bread')).toBeGreaterThan(1.0);

      // High supply = low demand
      market.modifySupply('bread', 200); // Up to 205
      expect(market.getDemand('bread')).toBeLessThan(1.0);
    });

    test('should record price history', () => {
      market.recordPrice('bread', 10);
      market.recordPrice('bread', 12);

      const history = market.priceHistory.get('bread');
      expect(history.length).toBe(2);
    });

    test('should limit price history', () => {
      for (let i = 0; i < 150; i++) {
        market.recordPrice('bread', 10 + i);
      }

      const history = market.priceHistory.get('bread');
      expect(history.length).toBe(100);
    });

    test('should get price trend', () => {
      market.recordPrice('bread', 10);
      market.recordPrice('bread', 11);
      market.recordPrice('bread', 13);
      market.recordPrice('bread', 15);
      market.recordPrice('bread', 18);

      expect(market.getPriceTrend('bread')).toBe('rising');
    });

    test('should report stable price trend', () => {
      for (let i = 0; i < 5; i++) {
        market.recordPrice('bread', 10);
      }
      expect(market.getPriceTrend('bread')).toBe('stable');
    });

    test('should report falling price trend', () => {
      market.recordPrice('bread', 20);
      market.recordPrice('bread', 18);
      market.recordPrice('bread', 15);
      market.recordPrice('bread', 12);
      market.recordPrice('bread', 10);

      expect(market.getPriceTrend('bread')).toBe('falling');
    });

    test('should handle specialization', () => {
      const weaponMarket = new MarketData('weapon_market', {
        specialization: ItemCategory.WEAPONS,
        specializationBonus: 0.8
      });

      expect(weaponMarket.specialization).toBe(ItemCategory.WEAPONS);
      expect(weaponMarket.specializationBonus).toBe(0.8);
    });

    test('should serialize to JSON', () => {
      const json = market.toJSON();
      expect(json.locationId).toBe('market1');
      expect(json.name).toBe('Test Market');
      expect(json.supply).toHaveProperty('bread');
    });

    test('should deserialize from JSON', () => {
      const json = market.toJSON();
      const restored = MarketData.fromJSON(json);

      expect(restored.locationId).toBe('market1');
      expect(restored.getSupply('bread')).toBe(50);
    });
  });

  // ============================================
  // MERCHANT TESTS
  // ============================================

  describe('Merchant', () => {
    let merchant;

    beforeEach(() => {
      merchant = new Merchant({
        id: 'merchant1',
        name: 'Test Merchant',
        gold: 1000,
        homeMarket: 'market1'
      });
    });

    test('should create with config', () => {
      expect(merchant.id).toBe('merchant1');
      expect(merchant.name).toBe('Test Merchant');
      expect(merchant.gold).toBe(1000);
    });

    test('should calculate buy price', () => {
      const basePrice = 100;
      const buyPrice = merchant.getBuyPrice('sword', basePrice);
      expect(buyPrice).toBeLessThan(basePrice);
    });

    test('should calculate sell price', () => {
      const basePrice = 100;
      const sellPrice = merchant.getSellPrice('sword', basePrice);
      expect(sellPrice).toBeLessThanOrEqual(basePrice);
    });

    test('should get inventory', () => {
      merchant.inventory.set('bread', 10);
      expect(merchant.getInventory('bread')).toBe(10);
      expect(merchant.getInventory('unknown')).toBe(0);
    });

    test('should modify inventory', () => {
      merchant.inventory.set('bread', 10);
      expect(merchant.modifyInventory('bread', 5)).toBe(true);
      expect(merchant.getInventory('bread')).toBe(15);
    });

    test('should reject negative inventory', () => {
      merchant.inventory.set('bread', 5);
      expect(merchant.modifyInventory('bread', -10)).toBe(false);
      expect(merchant.getInventory('bread')).toBe(5);
    });

    test('should serialize to JSON', () => {
      merchant.inventory.set('sword', 5);
      const json = merchant.toJSON();

      expect(json.id).toBe('merchant1');
      expect(json.gold).toBe(1000);
      expect(json.inventory).toHaveProperty('sword');
    });

    test('should deserialize from JSON', () => {
      merchant.inventory.set('sword', 5);
      const json = merchant.toJSON();
      const restored = Merchant.fromJSON(json);

      expect(restored.id).toBe('merchant1');
      expect(restored.getInventory('sword')).toBe(5);
    });
  });

  // ============================================
  // MARKET REGISTRATION TESTS
  // ============================================

  describe('Market Registration', () => {
    test('should register market', () => {
      const market = economy.registerMarket('market1', {
        name: 'Central Market'
      });

      expect(market).not.toBeNull();
      expect(economy.getMarket('market1')).toBe(market);
    });

    test('should get non-existent market as null', () => {
      expect(economy.getMarket('unknown')).toBeNull();
    });
  });

  // ============================================
  // MERCHANT REGISTRATION TESTS
  // ============================================

  describe('Merchant Registration', () => {
    test('should register merchant', () => {
      const merchant = economy.registerMerchant({
        name: 'Test Merchant',
        gold: 500
      });

      expect(merchant).not.toBeNull();
      expect(economy.getMerchant(merchant.id)).toBe(merchant);
    });

    test('should initialize player reputation', () => {
      const merchant = economy.registerMerchant({ name: 'Test' });
      expect(economy.playerReputation.get(merchant.id)).toBe(0);
    });
  });

  // ============================================
  // PRICE CALCULATION TESTS
  // ============================================

  describe('Price Calculation', () => {
    beforeEach(() => {
      economy.registerMarket('market1', {
        initialSupply: { bread: 50 }
      });
    });

    test('should calculate base price', () => {
      const price = economy.calculatePrice('bread', 'market1');
      expect(price).toBeGreaterThan(0);
    });

    test('should return 0 for unknown item', () => {
      const price = economy.calculatePrice('unknown', 'market1');
      expect(price).toBe(0);
    });

    test('should apply supply/demand modifier', () => {
      const market = economy.getMarket('market1');

      // Normal supply
      const normalPrice = economy.calculatePrice('bread', 'market1');

      // Low supply = higher price
      market.modifySupply('bread', -45);
      const scarcePrice = economy.calculatePrice('bread', 'market1');

      expect(scarcePrice).toBeGreaterThan(normalPrice);
    });

    test('should apply seasonal modifier', () => {
      economy.setGameState({ season: 'SUMMER' });
      const summerPrice = economy.calculatePrice('bread', 'market1');

      economy.setGameState({ season: 'WINTER' });
      const winterPrice = economy.calculatePrice('bread', 'market1');

      expect(winterPrice).toBeGreaterThan(summerPrice);
    });

    test('should apply weather modifier', () => {
      economy.setGameState({ weather: 'CLEAR' });
      const clearPrice = economy.calculatePrice('bread', 'market1');

      economy.setGameState({ weather: 'DROUGHT' });
      const droughtPrice = economy.calculatePrice('bread', 'market1');

      expect(droughtPrice).toBeGreaterThan(clearPrice);
    });

    test('should apply market specialization', () => {
      economy.registerMarket('weapon_market', {
        specialization: ItemCategory.WEAPONS,
        specializationBonus: 0.8
      });

      const normalPrice = economy.calculatePrice('sword', 'market1');
      const specializedPrice = economy.calculatePrice('sword', 'weapon_market');

      expect(specializedPrice).toBeLessThan(normalPrice);
    });

    test('should apply reputation modifier', () => {
      const merchant = economy.registerMerchant({
        name: 'Test',
        homeMarket: 'market1',
        currentMarket: 'market1'
      });

      economy.playerReputation.set(merchant.id, 50);

      const normalPrice = economy.calculatePrice('bread', 'market1');
      const discountedPrice = economy.calculatePrice('bread', 'market1', {
        forPlayer: true,
        merchantId: merchant.id
      });

      expect(discountedPrice).toBeLessThan(normalPrice);
    });

    test('should update price stats', () => {
      economy.calculatePrice('bread', 'market1');
      expect(economy.stats.priceUpdates).toBeGreaterThan(0);
    });
  });

  // ============================================
  // TRANSACTION TESTS
  // ============================================

  describe('Buy Transaction', () => {
    let merchant;

    beforeEach(() => {
      economy.registerMarket('market1', {
        initialSupply: { bread: 50, sword: 10 }
      });
      merchant = economy.registerMerchant({
        name: 'Test Merchant',
        gold: 1000,
        homeMarket: 'market1',
        currentMarket: 'market1'
      });
      merchant.inventory.set('bread', 20);
    });

    test('should buy from merchant', () => {
      const player = { gold: 100 };
      const result = economy.buyFromMerchant(merchant.id, 'bread', 5, player);

      expect(result.success).toBe(true);
      expect(result.quantity).toBe(5);
      expect(result.totalPrice).toBeGreaterThan(0);
    });

    test('should fail if merchant not found', () => {
      const result = economy.buyFromMerchant('unknown', 'bread', 5, { gold: 100 });
      expect(result.success).toBe(false);
      expect(result.reason).toBe('merchant_not_found');
    });

    test('should fail if insufficient stock', () => {
      const result = economy.buyFromMerchant(merchant.id, 'bread', 100, { gold: 10000 });
      expect(result.success).toBe(false);
      expect(result.reason).toBe('insufficient_stock');
    });

    test('should fail if insufficient gold', () => {
      const result = economy.buyFromMerchant(merchant.id, 'bread', 5, { gold: 1 });
      expect(result.success).toBe(false);
      expect(result.reason).toBe('insufficient_gold');
    });

    test('should update merchant inventory and gold', () => {
      const initialGold = merchant.gold;
      const initialStock = merchant.getInventory('bread');

      economy.buyFromMerchant(merchant.id, 'bread', 5, { gold: 1000 });

      expect(merchant.getInventory('bread')).toBe(initialStock - 5);
      expect(merchant.gold).toBeGreaterThan(initialGold);
    });

    test('should update market supply', () => {
      const market = economy.getMarket('market1');
      const initialSupply = market.getSupply('bread');

      economy.buyFromMerchant(merchant.id, 'bread', 5, { gold: 1000 });

      expect(market.getSupply('bread')).toBe(initialSupply - 5);
    });

    test('should increase reputation', () => {
      const initialRep = economy.getPlayerReputation(merchant.id);
      economy.buyFromMerchant(merchant.id, 'bread', 5, { gold: 1000 });

      expect(economy.getPlayerReputation(merchant.id)).toBeGreaterThan(initialRep);
    });

    test('should update transaction stats', () => {
      economy.buyFromMerchant(merchant.id, 'bread', 5, { gold: 1000 });
      expect(economy.stats.transactionsCompleted).toBe(1);
    });
  });

  describe('Sell Transaction', () => {
    let merchant;

    beforeEach(() => {
      economy.registerMarket('market1', {
        initialSupply: { bread: 50 }
      });
      merchant = economy.registerMerchant({
        name: 'Test Merchant',
        gold: 1000,
        homeMarket: 'market1',
        currentMarket: 'market1'
      });
    });

    test('should sell to merchant', () => {
      const result = economy.sellToMerchant(merchant.id, 'bread', 5);

      expect(result.success).toBe(true);
      expect(result.quantity).toBe(5);
      expect(result.totalPrice).toBeGreaterThan(0);
    });

    test('should fail if merchant not found', () => {
      const result = economy.sellToMerchant('unknown', 'bread', 5);
      expect(result.success).toBe(false);
      expect(result.reason).toBe('merchant_not_found');
    });

    test('should fail if merchant has no gold', () => {
      merchant.gold = 0;
      const result = economy.sellToMerchant(merchant.id, 'sword', 10);
      expect(result.success).toBe(false);
      expect(result.reason).toBe('merchant_broke');
    });

    test('should update merchant inventory and gold', () => {
      const initialGold = merchant.gold;
      const initialStock = merchant.getInventory('bread');

      economy.sellToMerchant(merchant.id, 'bread', 5);

      expect(merchant.getInventory('bread')).toBe(initialStock + 5);
      expect(merchant.gold).toBeLessThan(initialGold);
    });

    test('should update market supply', () => {
      const market = economy.getMarket('market1');
      const initialSupply = market.getSupply('bread');

      economy.sellToMerchant(merchant.id, 'bread', 5);

      expect(market.getSupply('bread')).toBe(initialSupply + 5);
    });
  });

  // ============================================
  // NEGOTIATION TESTS
  // ============================================

  describe('Negotiation', () => {
    let merchant;

    beforeEach(() => {
      economy.registerMarket('market1', {
        initialSupply: { sword: 10 }
      });
      merchant = economy.registerMerchant({
        name: 'Test Merchant',
        gold: 1000,
        homeMarket: 'market1',
        currentMarket: 'market1'
      });
    });

    test('should accept fair buy offer', () => {
      const basePrice = economy.calculatePrice('sword', 'market1', {
        forPlayer: true,
        merchantId: merchant.id
      });

      const result = economy.negotiate(merchant.id, 'sword', basePrice, true);
      expect(result.success).toBe(true);
    });

    test('should reject low buy offer with counter', () => {
      const basePrice = economy.calculatePrice('sword', 'market1');
      const lowOffer = basePrice * 0.5;

      const result = economy.negotiate(merchant.id, 'sword', lowOffer, true);
      expect(result.success).toBe(false);
      expect(result.reason).toBe('counter_offer');
      expect(result.counterOffer).toBeGreaterThan(lowOffer);
    });

    test('should accept fair sell offer', () => {
      const basePrice = economy.calculatePrice('sword', 'market1');
      const fairOffer = basePrice * 0.65;

      const result = economy.negotiate(merchant.id, 'sword', fairOffer, false);
      expect(result.success).toBe(true);
    });

    test('should fail for unknown merchant', () => {
      const result = economy.negotiate('unknown', 'sword', 50, true);
      expect(result.success).toBe(false);
      expect(result.reason).toBe('merchant_not_found');
    });

    test('should consider reputation in negotiation', () => {
      economy.playerReputation.set(merchant.id, 100);

      const basePrice = economy.calculatePrice('sword', 'market1');
      const offer = basePrice * 0.8;

      const result = economy.negotiate(merchant.id, 'sword', offer, true);
      expect(result.success).toBe(true);
    });
  });

  // ============================================
  // GAME STATE TESTS
  // ============================================

  describe('Game State', () => {
    test('should update season', () => {
      economy.setGameState({ season: 'WINTER' });
      expect(economy.currentSeason).toBe('WINTER');
    });

    test('should update weather', () => {
      economy.setGameState({ weather: 'STORM' });
      expect(economy.currentWeather).toBe('STORM');
    });

    test('should update events', () => {
      economy.setGameState({ events: [{ type: 'festival' }] });
      expect(economy.activeEvents.length).toBe(1);
    });
  });

  // ============================================
  // UPDATE TESTS
  // ============================================

  describe('Update System', () => {
    test('should update markets', () => {
      const market = economy.registerMarket('market1');
      market.lastRestock = Date.now() - 4000000; // Past restock time

      economy.update(1000);

      // Market should have been restocked
      expect(market.lastRestock).toBeGreaterThan(Date.now() - 1000);
    });

    test('should update merchants', () => {
      const merchant = economy.registerMerchant({
        name: 'Test',
        tradeRoute: ['market1', 'market2'],
        state: 'TRAVELING'
      });

      economy.registerMarket('market1');
      economy.registerMarket('market2');

      economy.update(1000);

      expect(merchant.state).toBe('TRADING');
    });
  });

  // ============================================
  // MARKET INFO TESTS
  // ============================================

  describe('Market Info', () => {
    beforeEach(() => {
      economy.registerMarket('market1', {
        initialSupply: { bread: 50, sword: 10 }
      });
    });

    test('should get market prices', () => {
      const prices = economy.getMarketPrices('market1');
      expect(prices).toHaveProperty('bread');
      expect(prices).toHaveProperty('sword');
    });

    test('should get market supply', () => {
      const supply = economy.getMarketSupply('market1');
      expect(supply.bread).toBe(50);
      expect(supply.sword).toBe(10);
    });

    test('should return empty for unknown market', () => {
      expect(economy.getMarketSupply('unknown')).toEqual({});
    });
  });

  // ============================================
  // EVENT LISTENER TESTS
  // ============================================

  describe('Event Listeners', () => {
    let merchant;

    beforeEach(() => {
      economy.registerMarket('market1', {
        initialSupply: { bread: 50 }
      });
      merchant = economy.registerMerchant({
        name: 'Test',
        gold: 1000,
        homeMarket: 'market1',
        currentMarket: 'market1'
      });
      merchant.inventory.set('bread', 20);
    });

    test('should add listener', () => {
      const listener = jest.fn();
      economy.addListener(listener);
      expect(economy.listeners).toContain(listener);
    });

    test('should remove listener', () => {
      const listener = jest.fn();
      economy.addListener(listener);
      economy.removeListener(listener);
      expect(economy.listeners).not.toContain(listener);
    });

    test('should emit purchase event', () => {
      const listener = jest.fn();
      economy.addListener(listener);
      economy.buyFromMerchant(merchant.id, 'bread', 5, { gold: 1000 });

      expect(listener).toHaveBeenCalledWith('purchase', expect.objectContaining({
        merchantId: merchant.id,
        itemId: 'bread',
        quantity: 5
      }));
    });

    test('should emit sale event', () => {
      const listener = jest.fn();
      economy.addListener(listener);
      economy.sellToMerchant(merchant.id, 'bread', 5);

      expect(listener).toHaveBeenCalledWith('sale', expect.objectContaining({
        merchantId: merchant.id,
        itemId: 'bread',
        quantity: 5
      }));
    });
  });

  // ============================================
  // STATISTICS TESTS
  // ============================================

  describe('Statistics', () => {
    test('should get statistics', () => {
      economy.registerMarket('market1');
      economy.registerMerchant({ name: 'Test' });

      const stats = economy.getStatistics();
      expect(stats.marketCount).toBe(1);
      expect(stats.merchantCount).toBe(1);
    });
  });

  // ============================================
  // SERIALIZATION TESTS
  // ============================================

  describe('Serialization', () => {
    test('should serialize to JSON', () => {
      economy.registerMarket('market1', { initialSupply: { bread: 50 } });
      economy.registerMerchant({ name: 'Test', gold: 500 });
      economy.setGameState({ season: 'WINTER', weather: 'STORM' });

      const json = economy.toJSON();
      expect(json.markets).toHaveProperty('market1');
      expect(json.currentSeason).toBe('WINTER');
      expect(json.currentWeather).toBe('STORM');
    });

    test('should deserialize from JSON', () => {
      const data = {
        markets: {
          market1: {
            locationId: 'market1',
            name: 'Test Market',
            supply: { bread: 50 },
            demand: { bread: 1.0 }
          }
        },
        merchants: {
          merchant1: {
            id: 'merchant1',
            name: 'Test Merchant',
            position: { x: 0, z: 0 },
            inventory: { bread: 10 },
            gold: 500,
            state: 'IDLE'
          }
        },
        playerReputation: { merchant1: 25 },
        currentSeason: 'AUTUMN',
        currentWeather: 'RAIN'
      };

      economy.fromJSON(data);

      expect(economy.getMarket('market1')).not.toBeNull();
      expect(economy.getMerchant('merchant1')).not.toBeNull();
      expect(economy.currentSeason).toBe('AUTUMN');
      expect(economy.getPlayerReputation('merchant1')).toBe(25);
    });
  });

  // ============================================
  // INTEGRATION TESTS
  // ============================================

  describe('Integration Tests', () => {
    test('should simulate economic cycle', () => {
      // Set up market
      const market = economy.registerMarket('town_market', {
        initialSupply: { bread: 100, sword: 20 }
      });

      // Set up merchant
      const merchant = economy.registerMerchant({
        name: 'Town Merchant',
        gold: 2000,
        homeMarket: 'town_market',
        currentMarket: 'town_market'
      });
      merchant.inventory.set('bread', 50);
      merchant.inventory.set('sword', 5);

      // Player buys bread
      const player = { gold: 1000 };
      const buyResult = economy.buyFromMerchant(merchant.id, 'bread', 10, player);
      expect(buyResult.success).toBe(true);

      // Market supply decreases
      expect(market.getSupply('bread')).toBe(90);

      // Price should increase due to lower supply
      const newPrice = economy.calculatePrice('bread', 'town_market');
      expect(newPrice).toBeGreaterThan(0);
    });

    test('should handle seasonal price changes', () => {
      economy.registerMarket('farm_market', {
        initialSupply: { vegetables: 100 }
      });

      // Summer prices (harvest)
      economy.setGameState({ season: 'SUMMER' });
      const summerPrice = economy.calculatePrice('vegetables', 'farm_market');

      // Winter prices (scarcity)
      economy.setGameState({ season: 'WINTER' });
      const winterPrice = economy.calculatePrice('vegetables', 'farm_market');

      // Winter food should be more expensive
      expect(winterPrice).toBeGreaterThan(summerPrice);
    });
  });
});
