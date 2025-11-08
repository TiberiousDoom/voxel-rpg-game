import React, { useState, useEffect } from 'react';
import { X, Package, Trash2 } from 'lucide-react';
import useGameStore from '../stores/useGameStore';
import { ITEM_TYPES } from '../data/craftingRecipes';

/**
 * InventoryUI component - Inventory and equipment management
 */
const InventoryUI = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const inventory = useGameStore((state) => state.inventory);
  const equipment = useGameStore((state) => state.equipment);
  const equipItem = useGameStore((state) => state.equipItem);
  const unequipItem = useGameStore((state) => state.unequipItem);
  const removeItem = useGameStore((state) => state.removeItem);
  const applyConsumable = useGameStore((state) => state.applyConsumable);

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
    applyConsumable(item);
    setSelectedItem(null);
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
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) setIsOpen(false);
      }}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          borderRadius: '20px',
          maxWidth: '1200px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'hidden',
          border: '2px solid #4a5568',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 30px',
            borderBottom: '2px solid #4a5568',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'linear-gradient(90deg, #2d3748, #1a202c)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <Package size={32} color="#4dabf7" />
            <h2 style={{ margin: 0, color: '#4dabf7', fontSize: '2rem' }}>Inventory</h2>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '8px',
            }}
          >
            <X size={24} color="#fff" />
          </button>
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Equipment Panel */}
          <div
            style={{
              width: '350px',
              borderRight: '2px solid #4a5568',
              padding: '20px',
              background: '#1a202c',
              overflowY: 'auto',
            }}
          >
            <h3 style={{ color: '#fff', marginTop: 0, marginBottom: '15px' }}>Equipment</h3>
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
                      padding: '12px',
                      minHeight: '60px',
                      cursor: equippedItem ? 'pointer' : 'default',
                      transition: 'all 0.2s',
                    }}
                    onClick={() => equippedItem && setSelectedItem(equippedItem)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '1.5rem' }}>{equippedItem?.icon || icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: '#a0aec0', fontSize: '0.85rem' }}>{name}</div>
                        {equippedItem ? (
                          <>
                            <div
                              style={{
                                color: equippedItem.rarity?.color || '#fff',
                                fontWeight: 'bold',
                                fontSize: '0.95rem',
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
                                padding: '4px 8px',
                                fontSize: '0.75rem',
                                background: '#4a5568',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                              }}
                            >
                              Unequip
                            </button>
                          </>
                        ) : (
                          <div style={{ color: '#4a5568', fontSize: '0.85rem' }}>Empty</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Inventory Items */}
          <div
            style={{
              flex: 1,
              padding: '20px',
              overflowY: 'auto',
              background: '#2d3748',
            }}
          >
            <h3 style={{ color: '#fff', marginTop: 0, marginBottom: '15px' }}>
              Items ({inventory.items.length})
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
              {inventory.items.length === 0 ? (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#a0aec0', padding: '40px' }}>
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
                      padding: '15px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onClick={() => setSelectedItem(item)}
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
                        fontSize: '1rem',
                        textAlign: 'center',
                        marginBottom: '5px',
                      }}
                    >
                      {item.name}
                    </div>
                    <div style={{ color: '#a0aec0', fontSize: '0.85rem', textAlign: 'center', marginBottom: '10px' }}>
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
                          padding: '8px',
                          background: 'linear-gradient(90deg, #51cf66, #37b24d)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: 'bold',
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
                          padding: '8px',
                          background: 'linear-gradient(90deg, #4dabf7, #339af0)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: 'bold',
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
