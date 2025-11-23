import React, { useState, useEffect } from 'react';
import { X, Package } from 'lucide-react';
import useGameStore from '../stores/useGameStore';
import { ITEM_TYPES } from '../data/craftingRecipes';

/**
 * Material definitions - icons and display names for harvested materials
 */
const MATERIAL_INFO = {
  wood: { icon: '🪵', name: 'Wood', color: '#8B4513' },
  stone: { icon: '🪨', name: 'Stone', color: '#808080' },
  iron: { icon: '⚙️', name: 'Iron', color: '#C0C0C0' },
  leather: { icon: '🦴', name: 'Leather', color: '#D2691E' },
  crystal: { icon: '💎', name: 'Crystal', color: '#4FC3F7' },
  fiber: { icon: '🌾', name: 'Fiber', color: '#F0E68C' },
  herb: { icon: '🌿', name: 'Herbs', color: '#90EE90' },
  meat: { icon: '🍖', name: 'Meat', color: '#DC143C' },
  berry: { icon: '🫐', name: 'Berries', color: '#9370DB' },
  mushroom: { icon: '🍄', name: 'Mushrooms', color: '#FF6347' },
};

/**
 * InventoryUI component - Inventory and equipment management
 * Mobile-compatible with responsive layout
 */
const InventoryUI = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileView, setMobileView] = useState('equipment'); // 'equipment' | 'items' | 'materials' | 'details'

  const inventory = useGameStore((state) => state.inventory);
  const equipment = useGameStore((state) => state.equipment);
  const equipItem = useGameStore((state) => state.equipItem);
  const unequipItem = useGameStore((state) => state.unequipItem);
  const removeItem = useGameStore((state) => state.removeItem);
  const consumeItem = useGameStore((state) => state.consumeItem);

  // Get harvested materials
  const materials = inventory.materials || {};

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'i' || e.key === 'I') {
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleEquipItem = (item) => {
    const slotMap = {
      [ITEM_TYPES.WEAPON]: 'weapon',
      [ITEM_TYPES.ARMOR]: 'armor',
      [ITEM_TYPES.HELMET]: 'helmet',
      [ITEM_TYPES.GLOVES]: 'gloves',
      [ITEM_TYPES.BOOTS]: 'boots',
      [ITEM_TYPES.RING]: equipment.ring1 ? 'ring2' : 'ring1',
      [ITEM_TYPES.AMULET]: 'amulet',
      [ITEM_TYPES.OFFHAND]: 'offhand',
    };

    const slot = slotMap[item.type];
    if (slot) {
      equipItem(slot, item);
      removeItem(item.craftedAt);
    }
  };

  const handleUnequipItem = (slot, item) => {
    if (item) {
      unequipItem(slot);
      useGameStore.getState().addItem(item);
    }
  };

  const handleUseConsumable = (item) => {
    consumeItem(item);
    setSelectedItem(null);
  };

  // Mobile navigation helpers
  const handleSelectItem = (item) => {
    setSelectedItem(item);
    if (isMobile) {
      setMobileView('details');
    }
  };

  const handleMobileBack = () => {
    if (mobileView === 'details') {
      setMobileView('items');
      setSelectedItem(null);
    } else if (mobileView === 'items' || mobileView === 'materials') {
      setMobileView('equipment');
    }
  };

  const equipmentSlots = [
    { slot: 'weapon', name: 'Weapon', icon: '⚔️' },
    { slot: 'offhand', name: 'Off-Hand', icon: '🛡️' },
    { slot: 'helmet', name: 'Helmet', icon: '⛑️' },
    { slot: 'armor', name: 'Armor', icon: '🛡️' },
    { slot: 'gloves', name: 'Gloves', icon: '🧤' },
    { slot: 'boots', name: 'Boots', icon: '👢' },
    { slot: 'ring1', name: 'Ring 1', icon: '💍' },
    { slot: 'ring2', name: 'Ring 2', icon: '💍' },
    { slot: 'amulet', name: 'Amulet', icon: '📿' },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(0, 0, 0, 0.85)',
        zIndex: 2000,
        display: 'flex',
        alignItems: isMobile ? 'stretch' : 'center',
        justifyContent: 'center',
        padding: isMobile ? '0' : '20px',
      }}
      onClick={(e) => {
        if (!isMobile && e.target === e.currentTarget) setIsOpen(false);
      }}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          borderRadius: isMobile ? '0' : '20px',
          maxWidth: isMobile ? '100%' : '1200px',
          width: '100%',
          maxHeight: isMobile ? '100%' : '90vh',
          height: isMobile ? '100%' : 'auto',
          overflow: 'hidden',
          border: isMobile ? 'none' : '2px solid #4a5568',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: isMobile ? '15px 20px' : '20px 30px',
            borderBottom: '2px solid #4a5568',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'linear-gradient(90deg, #2d3748, #1a202c)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '15px' }}>
            {isMobile && mobileView !== 'equipment' && (
              <button
                onClick={handleMobileBack}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '1.2rem',
                  minWidth: '44px',
                  minHeight: '44px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  touchAction: 'manipulation',
                }}
              >
                ←
              </button>
            )}
            <Package size={isMobile ? 24 : 32} color="#4dabf7" />
            <h2 style={{ margin: 0, color: '#4dabf7', fontSize: isMobile ? '1.3rem' : '2rem' }}>
              {isMobile ? (
                mobileView === 'equipment' ? 'Equipment' :
                mobileView === 'items' ? 'Items' :
                mobileView === 'materials' ? 'Materials' :
                'Details'
              ) : 'Inventory'}
            </h2>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '8px',
              minWidth: '44px',
              minHeight: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              touchAction: 'manipulation',
            }}
          >
            <X size={isMobile ? 20 : 24} color="#fff" />
          </button>
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Equipment Panel */}
          {(!isMobile || mobileView === 'equipment') && (
          <div
            style={{
              width: isMobile ? '100%' : '350px',
              borderRight: isMobile ? 'none' : '2px solid #4a5568',
              padding: isMobile ? '15px' : '20px',
              background: '#1a202c',
              overflowY: 'auto',
            }}
          >
            <h3 style={{ color: '#fff', marginTop: 0, marginBottom: '15px', fontSize: isMobile ? '1.1rem' : '1rem' }}>Equipment</h3>
            {isMobile && (
              <>
                <button
                  onClick={() => setMobileView('items')}
                  style={{
                    width: '100%',
                    padding: '14px',
                    marginBottom: '10px',
                    background: 'linear-gradient(90deg, #4dabf7, #339af0)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    minHeight: '50px',
                    touchAction: 'manipulation',
                  }}
                >
                  View Items ({inventory.items.length})
                </button>
                <button
                  onClick={() => setMobileView('materials')}
                  style={{
                    width: '100%',
                    padding: '14px',
                    marginBottom: '15px',
                    background: 'linear-gradient(90deg, #8B4513, #A0522D)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    minHeight: '50px',
                    touchAction: 'manipulation',
                  }}
                >
                  View Materials ({Object.values(materials).reduce((sum, amt) => sum + amt, 0)})
                </button>
              </>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
              {equipmentSlots.map(({ slot, name, icon }) => {
                const equippedItem = equipment[slot];
                return (
                  <div
                    key={slot}
                    style={{
                      background: equippedItem ? '#2d3748' : '#1a202c',
                      border: equippedItem ? `2px solid ${equippedItem.rarity?.color || '#4a5568'}` : '2px dashed #4a5568',
                      borderRadius: '8px',
                      padding: isMobile ? '14px' : '12px',
                      minHeight: isMobile ? '70px' : '60px',
                      cursor: equippedItem ? 'pointer' : 'default',
                      transition: 'all 0.2s',
                      touchAction: equippedItem ? 'manipulation' : 'auto',
                    }}
                    onClick={() => equippedItem && handleSelectItem(equippedItem)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: isMobile ? '1.8rem' : '1.5rem' }}>{equippedItem?.icon || icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: '#a0aec0', fontSize: isMobile ? '0.95rem' : '0.85rem' }}>{name}</div>
                        {equippedItem ? (
                          <>
                            <div
                              style={{
                                color: equippedItem.rarity?.color || '#fff',
                                fontWeight: 'bold',
                                fontSize: isMobile ? '1.05rem' : '0.95rem',
                              }}
                            >
                              {equippedItem.name}
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUnequipItem(slot, equippedItem);
                              }}
                              style={{
                                marginTop: '4px',
                                padding: isMobile ? '8px 12px' : '4px 8px',
                                fontSize: isMobile ? '0.9rem' : '0.75rem',
                                background: '#4a5568',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                minHeight: isMobile ? '36px' : 'auto',
                                touchAction: 'manipulation',
                              }}
                            >
                              Unequip
                            </button>
                          </>
                        ) : (
                          <div style={{ color: '#4a5568', fontSize: isMobile ? '0.95rem' : '0.85rem' }}>Empty</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          )}

          {/* Inventory Items */}
          {(!isMobile || mobileView === 'items') && (
          <div
            style={{
              flex: 1,
              width: isMobile ? '100%' : 'auto',
              padding: isMobile ? '15px' : '20px',
              overflowY: 'auto',
              background: '#2d3748',
            }}
          >
            <h3 style={{ color: '#fff', marginTop: 0, marginBottom: '15px', fontSize: isMobile ? '1.1rem' : '1rem' }}>
              Items ({inventory.items.length})
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile
                ? 'repeat(auto-fill, minmax(150px, 1fr))'
                : 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: isMobile ? '12px' : '15px'
            }}>
              {inventory.items.length === 0 ? (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#a0aec0', padding: isMobile ? '30px 20px' : '40px' }}>
                  No items in inventory. Craft some items at the Crafting Station!
                </div>
              ) : (
                inventory.items.map((item, index) => (
                  <div
                    key={item.craftedAt || index}
                    style={{
                      background: '#1a202c',
                      border: `2px solid ${item.rarity?.color || '#4a5568'}`,
                      borderRadius: '10px',
                      padding: isMobile ? '12px' : '15px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      minHeight: isMobile ? '180px' : 'auto',
                      touchAction: 'manipulation',
                    }}
                    onClick={() => handleSelectItem(item)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = `0 4px 15px ${item.rarity?.color || '#4a5568'}40`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '2.5rem' }}>{item.icon}</span>
                    </div>
                    <div
                      style={{
                        color: item.rarity?.color || '#fff',
                        fontWeight: 'bold',
                        fontSize: isMobile ? '0.95rem' : '1rem',
                        textAlign: 'center',
                        marginBottom: '5px',
                      }}
                    >
                      {item.name}
                    </div>
                    <div style={{ color: '#a0aec0', fontSize: isMobile ? '0.8rem' : '0.85rem', textAlign: 'center', marginBottom: '10px' }}>
                      {item.rarity?.name}
                    </div>
                    {item.type === ITEM_TYPES.CONSUMABLE ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUseConsumable(item);
                        }}
                        style={{
                          width: '100%',
                          padding: isMobile ? '12px' : '8px',
                          minHeight: isMobile ? '44px' : 'auto',
                          background: 'linear-gradient(90deg, #51cf66, #37b24d)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          fontSize: isMobile ? '0.95rem' : '1rem',
                          touchAction: 'manipulation',
                        }}
                      >
                        Use
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEquipItem(item);
                        }}
                        style={{
                          width: '100%',
                          padding: isMobile ? '12px' : '8px',
                          minHeight: isMobile ? '44px' : 'auto',
                          background: 'linear-gradient(90deg, #4dabf7, #339af0)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          fontSize: isMobile ? '0.95rem' : '1rem',
                          touchAction: 'manipulation',
                        }}
                      >
                        Equip
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
          )}

          {/* Materials Panel (Phase 3A: Harvested Materials) */}
          {(!isMobile || mobileView === 'materials') && (
          <div
            style={{
              width: isMobile ? '100%' : '300px',
              borderLeft: isMobile ? 'none' : '2px solid #4a5568',
              padding: isMobile ? '15px' : '20px',
              background: '#1a202c',
              overflowY: 'auto',
            }}
          >
            <h3 style={{ color: '#fff', marginTop: 0, marginBottom: '15px', fontSize: isMobile ? '1.1rem' : '1rem' }}>
              Materials
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
              {Object.entries(materials).length === 0 ? (
                <div style={{ textAlign: 'center', color: '#a0aec0', padding: '20px' }}>
                  No materials collected. Harvest trees, rocks, and other props to gather materials!
                </div>
              ) : (
                Object.entries(materials)
                  .filter(([_, amount]) => amount > 0) // Only show materials with quantity > 0
                  .map(([materialType, amount]) => {
                    const materialInfo = MATERIAL_INFO[materialType] || {
                      icon: '📦',
                      name: materialType.charAt(0).toUpperCase() + materialType.slice(1),
                      color: '#4a5568'
                    };

                    return (
                      <div
                        key={materialType}
                        style={{
                          background: '#2d3748',
                          border: `2px solid ${materialInfo.color}`,
                          borderRadius: '8px',
                          padding: isMobile ? '14px' : '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          minHeight: isMobile ? '70px' : '60px',
                        }}
                      >
                        <span style={{ fontSize: isMobile ? '2rem' : '1.8rem' }}>{materialInfo.icon}</span>
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              color: materialInfo.color,
                              fontWeight: 'bold',
                              fontSize: isMobile ? '1.05rem' : '0.95rem',
                              marginBottom: '2px',
                            }}
                          >
                            {materialInfo.name}
                          </div>
                          <div style={{ color: '#a0aec0', fontSize: isMobile ? '0.9rem' : '0.85rem' }}>
                            Quantity: <span style={{ color: '#51cf66', fontWeight: 'bold' }}>{amount}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
          )}

          {/* Item Details Sidebar */}
          {selectedItem && (
            <div
              style={{
                width: '300px',
                borderLeft: '2px solid #4a5568',
                padding: '20px',
                background: '#1a202c',
                overflowY: 'auto',
              }}
            >
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <span style={{ fontSize: '4rem' }}>{selectedItem.icon}</span>
              </div>
              <h3
                style={{
                  color: selectedItem.rarity?.color || '#fff',
                  textAlign: 'center',
                  marginBottom: '10px',
                }}
              >
                {selectedItem.name}
              </h3>
              <div style={{ color: '#a0aec0', textAlign: 'center', marginBottom: '15px' }}>
                {selectedItem.rarity?.name} {selectedItem.type}
              </div>
              <p style={{ color: '#cbd5e0', marginBottom: '20px' }}>{selectedItem.description}</p>

              {selectedItem.stats && (
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ color: '#ffd700', marginBottom: '10px' }}>Stats</h4>
                  {Object.entries(selectedItem.stats).map(([stat, value]) => (
                    <div
                      key={stat}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '6px 0',
                        borderBottom: '1px solid #4a5568',
                        color: '#fff',
                      }}
                    >
                      <span style={{ textTransform: 'capitalize' }}>
                        {stat.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      <span style={{ color: '#51cf66', fontWeight: 'bold' }}>+{value}</span>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => setSelectedItem(null)}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: '#4a5568',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InventoryUI;
