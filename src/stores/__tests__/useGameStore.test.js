/**
 * useGameStore — XP, reset, status effects, shield, respawn teleport.
 */
import useGameStore from '../useGameStore';

describe('useGameStore', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
  });

  test('a large XP grant applies every level-up', () => {
    useGameStore.getState().addXP(1000);
    const p = useGameStore.getState().player;
    // 100 + 150 + 225 + 337 = 812 to reach level 5; 188 left of 505
    expect(p.level).toBe(5);
    expect(p.xp).toBe(188);
    expect(p.xpToNext).toBe(505);
    expect(useGameStore.getState().character.skillPoints).toBeGreaterThan(0);
  });

  test('reset() restores a complete player (status effects, rage) and inventory', () => {
    const s = useGameStore.getState();
    s.addMaterial('stone', 50);
    s.equipItem('weapon', { id: 'sword' });
    s.reset();

    const after = useGameStore.getState();
    expect(after.player.statusEffects).toEqual([]);
    expect(after.player.maxRage).toBe(100);
    expect(after.inventory.materials.stone).toBe(0);
    expect(after.equipment.weapon).toBeNull();

    after.addStatusEffect({ type: 'haste', duration: 5, value: 1.3 });
    after.dealDamageToPlayer(5, 'test');
    expect(Number.isNaN(useGameStore.getState().player.rage)).toBe(false);
  });

  test('re-casting a buff refreshes it and buffs expire', () => {
    const s = useGameStore.getState();
    s.addStatusEffect({ type: 'haste', duration: 2, value: 1.3 });
    s.addStatusEffect({ type: 'haste', duration: 6, value: 1.3 });
    expect(useGameStore.getState().player.statusEffects).toHaveLength(1);

    s.tickPlayerStatusEffects(5);
    expect(useGameStore.getState().player.statusEffects[0].duration).toBeCloseTo(1);
    s.tickPlayerStatusEffects(2);
    expect(useGameStore.getState().player.statusEffects).toHaveLength(0);
  });

  test('shield absorbs damage until depleted', () => {
    const s = useGameStore.getState();
    s.addStatusEffect({ type: 'shield', duration: 8, value: 30 });

    s.dealDamageToPlayer(20, 'test');
    let p = useGameStore.getState().player;
    expect(p.health).toBe(100);
    expect(p.statusEffects[0].value).toBe(10);

    s.dealDamageToPlayer(25, 'test'); // 10 absorbed, 15 taken
    p = useGameStore.getState().player;
    expect(p.health).toBe(85);
    expect(p.statusEffects).toHaveLength(0);
  });

  test('respawn requests a teleport to the new position', () => {
    useGameStore.getState().updatePlayer({ health: 0 });
    useGameStore.getState().respawnPlayer();
    const s = useGameStore.getState();
    expect(s.pendingTeleport).toEqual(s.player.position);
    expect(s.player.health).toBeGreaterThan(0);
  });
});
