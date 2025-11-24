import React, { useState, useEffect } from 'react';
import { X, Hammer, Package, Sword, Shield, Zap } from 'lucide-react';
import useGameStore from '../stores/useGameStore';
// eslint-disable-next-line no-unused-vars
import { CRAFTING_RECIPES, ITEM_TYPES, canCraft, consumeMaterials } from '../data/craftingRecipes';

/**
 * CraftingUI component - Main crafting interface
 * Mobile-compatible with responsive layout
 */
const CraftingUI = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [craftingAnimation, setCraftingAnimation] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileView, setMobileView] = useState('categories'); // 'categories' | 'recipes' | 'details'

  const inventory = useGameStore((state) => state.inventory);
  const player = useGameStore((state) => state.player);
  // eslint-disable-next-line no-unused-vars
  const craftItem = useGameStore((state) => state.craftItem);

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
      if (e.key === 'c' || e.key === 'C') {
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

  const categories = [
    { id: 'all', name: 'All', icon: Package },
    { id: ITEM_TYPES.WEAPON, name: 'Weapons', icon: Sword },
    { id: ITEM_TYPES.ARMOR, name: 'Armor', icon: Shield },
    { id: ITEM_TYPES.CONSUMABLE, name: 'Potions', icon: Zap },
  ];

  const filteredRecipes = Object.values(CRAFTING_RECIPES).filter((recipe) => {
    if (selectedCategory === 'all') return true;
    return recipe.type === selectedCategory;
  });

  const handleCraft = (recipe) => {
    if (!canCraft(recipe, inventory)) return;

    setCraftingAnimation(true);

    // Consume materials and add item
    const newMaterials = consumeMaterials(recipe, inventory);
    craftItem(recipe, newMaterials);

    // Spawn crafting effect
    useGameStore.getState().addParticleEffect({
      position: player.position,
      color: recipe.rarity.color,
      type: 'spiral',
      count: 30,
    });

    setTimeout(() => {
      setCraftingAnimation(false);
    }, 1000);
  };

  // Mobile navigation helpers
  const handleSelectCategory = (catId) => {
    setSelectedCategory(catId);
    if (isMobile) {
      setMobileView('recipes');
    }
  };

  const handleSelectRecipe = (recipe) => {
    setSelectedRecipe(recipe);
    if (isMobile) {
      setMobileView('details');
    }
  };

  const handleMobileBack = () => {
    if (mobileView === 'details') {
      setMobileView('recipes');
    } else if (mobileView === 'recipes') {
      setMobileView('categories');
    }
  };

  const getMaterialColor = (material, required, available) => {
    if (available >= required) return '#51cf66';
    return '#ff6b6b';
  };

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
            {isMobile && mobileView !== 'categories' && (
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
            <Hammer size={isMobile ? 24 : 32} color="#ffd700" />
            <h2 style={{ margin: 0, color: '#ffd700', fontSize: isMobile ? '1.3rem' : '2rem' }}>
              {isMobile && mobileView === 'recipes' ? selectedCategory === 'all' ? 'All' : categories.find(c => c.id === selectedCategory)?.name : 'Crafting'}
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
              transition: 'background 0.2s',
              minWidth: '44px',
              minHeight: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              touchAction: 'manipulation',
            }}
            onMouseEnter={(e) => (e.target.style.background = 'rgba(255, 255, 255, 0.1)')}
            onMouseLeave={(e) => (e.target.style.background = 'transparent')}
          >
            <X size={isMobile ? 20 : 24} color="#fff" />
          </button>
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Sidebar - Categories */}
          {(!isMobile || mobileView === 'categories') && (
          <div
            style={{
              width: isMobile ? '100%' : '200px',
              borderRight: isMobile ? 'none' : '2px solid #4a5568',
              padding: isMobile ? '15px' : '20px',
              background: '#1a202c',
              overflowY: 'auto',
            }}
          >
            <h3 style={{ color: '#fff', marginTop: 0, marginBottom: '15px', fontSize: isMobile ? '1.1rem' : '1rem' }}>Categories</h3>
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => handleSelectCategory(cat.id)}
                  style={{
                    width: '100%',
                    padding: isMobile ? '16px' : '12px',
                    marginBottom: '8px',
                    minHeight: isMobile ? '50px' : 'auto',
                    background: selectedCategory === cat.id ? '#4a5568' : 'transparent',
                    border: selectedCategory === cat.id ? '2px solid #ffd700' : '2px solid #4a5568',
                    borderRadius: '8px',
                    color: '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    transition: 'all 0.2s',
                    fontSize: isMobile ? '1.1rem' : '1rem',
                    touchAction: 'manipulation',
                  }}
                  onMouseEnter={(e) => {
                    if (selectedCategory !== cat.id) {
                      e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedCategory !== cat.id) {
                      e.target.style.background = 'transparent';
                    }
                  }}
                >
                  <Icon size={isMobile ? 24 : 20} />
                  {cat.name}
                </button>
              );
            })}
          </div>
          )}

          {/* Recipe List */}
          {(!isMobile || mobileView === 'recipes') && (
          <div
            style={{
              width: isMobile ? '100%' : '350px',
              borderRight: isMobile ? 'none' : '2px solid #4a5568',
              overflowY: 'auto',
              background: '#2d3748',
            }}
          >
            <div style={{ padding: isMobile ? '15px' : '20px' }}>
              <h3 style={{ color: '#fff', marginTop: 0, marginBottom: '15px', fontSize: isMobile ? '1.1rem' : '1rem' }}>
                Recipes ({filteredRecipes.length})
              </h3>
              {filteredRecipes.map((recipe) => {
                const craftable = canCraft(recipe, inventory);
                return (
                  <div
                    key={recipe.id}
                    onClick={() => handleSelectRecipe(recipe)}
                    style={{
                      padding: isMobile ? '16px' : '15px',
                      marginBottom: '10px',
                      minHeight: isMobile ? '60px' : 'auto',
                      background: selectedRecipe?.id === recipe.id ? '#4a5568' : '#1a202c',
                      border: `2px solid ${selectedRecipe?.id === recipe.id ? recipe.rarity.color : '#4a5568'}`,
                      borderRadius: '10px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      opacity: craftable ? 1 : 0.6,
                      touchAction: 'manipulation',
                    }}
                    onMouseEnter={(e) => {
                      if (selectedRecipe?.id !== recipe.id) {
                        e.target.style.background = '#374151';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedRecipe?.id !== recipe.id) {
                        e.target.style.background = '#1a202c';
                      }
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '1.5rem' }}>{recipe.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            color: recipe.rarity.color,
                            fontWeight: 'bold',
                            fontSize: '1.1rem',
                          }}
                        >
                          {recipe.name}
                        </div>
                        <div style={{ color: '#a0aec0', fontSize: '0.85rem' }}>
                          {recipe.rarity.name}
                        </div>
                      </div>
                      {!craftable && (
                        <div
                          style={{
                            color: '#ff6b6b',
                            fontSize: '0.8rem',
                            background: 'rgba(255, 107, 107, 0.2)',
                            padding: '2px 8px',
                            borderRadius: '4px',
                          }}
                        >
                          Locked
                        </div>
                      )}
                    </div>
                    <div style={{ color: '#cbd5e0', fontSize: '0.9rem' }}>{recipe.description}</div>
                  </div>
                );
              })}
            </div>
          </div>
          )}

          {/* Recipe Details */}
          {(!isMobile || mobileView === 'details') && (
          <div
            style={{
              flex: 1,
              padding: '30px',
              overflowY: 'auto',
              background: '#1a202c',
            }}
          >
            {selectedRecipe ? (
              <>
                <div style={{ marginBottom: '30px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '3rem' }}>{selectedRecipe.icon}</span>
                    <div>
                      <h2
                        style={{
                          margin: 0,
                          color: selectedRecipe.rarity.color,
                          fontSize: '2rem',
                        }}
                      >
                        {selectedRecipe.name}
                      </h2>
                      <div style={{ color: '#a0aec0', fontSize: '1rem' }}>
                        {selectedRecipe.rarity.name} {selectedRecipe.type}
                      </div>
                    </div>
                  </div>
                  <p style={{ color: '#cbd5e0', fontSize: '1.1rem', marginTop: '10px' }}>
                    {selectedRecipe.description}
                  </p>
                </div>

                {/* Stats */}
                {selectedRecipe.stats && (
                  <div style={{ marginBottom: '30px' }}>
                    <h3 style={{ color: '#ffd700', marginBottom: '15px' }}>Item Stats</h3>
                    <div
                      style={{
                        background: '#2d3748',
                        padding: '15px',
                        borderRadius: '10px',
                        border: '2px solid #4a5568',
                      }}
                    >
                      {Object.entries(selectedRecipe.stats).map(([stat, value]) => (
                        <div
                          key={stat}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            padding: '8px 0',
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
                  </div>
                )}

                {/* Materials Required */}
                <div style={{ marginBottom: '30px' }}>
                  <h3 style={{ color: '#ffd700', marginBottom: '15px' }}>Materials Required</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {Object.entries(selectedRecipe.requirements).map(([material, required]) => {
                      const available = inventory.materials[material] || 0;
                      const color = getMaterialColor(material, required, available);

                      return (
                        <div
                          key={material}
                          style={{
                            background: '#2d3748',
                            padding: '12px',
                            borderRadius: '8px',
                            border: `2px solid ${available >= required ? '#51cf66' : '#ff6b6b'}`,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <span style={{ color: '#fff', textTransform: 'capitalize' }}>{material}</span>
                          <span style={{ color, fontWeight: 'bold' }}>
                            {available} / {required}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Craft Button */}
                <button
                  onClick={() => handleCraft(selectedRecipe)}
                  disabled={!canCraft(selectedRecipe, inventory) || craftingAnimation}
                  style={{
                    width: '100%',
                    padding: '15px',
                    fontSize: '1.2rem',
                    fontWeight: 'bold',
                    background: canCraft(selectedRecipe, inventory)
                      ? 'linear-gradient(90deg, #ffd700, #ffed4e)'
                      : '#4a5568',
                    color: canCraft(selectedRecipe, inventory) ? '#000' : '#a0aec0',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: canCraft(selectedRecipe, inventory) ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    transition: 'all 0.2s',
                    boxShadow: canCraft(selectedRecipe, inventory)
                      ? '0 4px 15px rgba(255, 215, 0, 0.3)'
                      : 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (canCraft(selectedRecipe, inventory)) {
                      e.target.style.transform = 'scale(1.05)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'scale(1)';
                  }}
                >
                  <Hammer size={24} />
                  {craftingAnimation ? 'Crafting...' : 'Craft Item'}
                </button>
              </>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: '#a0aec0',
                  fontSize: '1.2rem',
                }}
              >
                Select a recipe to view details
              </div>
            )}
          </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CraftingUI;
