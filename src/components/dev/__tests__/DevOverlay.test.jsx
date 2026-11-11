/**
 * Dev overlay: mode cycling, tabs, and the cheats/world controls it exposes.
 */
import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import useGameStore from '../../../stores/useGameStore';
import DevOverlay from '../DevOverlay';
import * as dev from '../devActions';
import { getFrameStats, pushFrameTime, resetFrameSampler } from '../frameSampler';
import { DAY_LENGTH_SECONDS } from '../../../data/tuning';

const pressKey = (code) => act(() => {
  document.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
});

describe('frameSampler', () => {
  beforeEach(() => resetFrameSampler());

  test('summarizes frame times', () => {
    for (let i = 0; i < 59; i++) pushFrameTime(16);
    pushFrameTime(50);
    const stats = getFrameStats();
    expect(stats.samples).toBe(60);
    expect(stats.max).toBe(50);
    expect(stats.longFrames).toBe(1);
    expect(stats.p95).toBe(16);
    expect(stats.fps).toBeGreaterThan(55);
    expect(stats.fps).toBeLessThan(62);
  });

  test('empty sampler reports zeros', () => {
    expect(getFrameStats()).toEqual({ fps: 0, avg: 0, p95: 0, max: 0, longFrames: 0, samples: 0 });
  });
});

describe('devActions', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
    useGameStore.getState()._enemyHandlers.clear();
  });

  test('healFull restores vitals and hunger', () => {
    useGameStore.getState().updatePlayer({ health: 10, mana: 5, stamina: 1 });
    useGameStore.getState().updateHunger({ current: 3 });
    dev.healFull();
    const s = useGameStore.getState();
    expect(s.player.health).toBe(s.player.maxHealth);
    expect(s.player.mana).toBe(s.player.maxMana);
    expect(s.hunger.current).toBe(s.hunger.max);
  });

  test('god mode blocks damage', () => {
    dev.setGodMode(true);
    useGameStore.getState().dealDamageToPlayer(50, 'test');
    expect(useGameStore.getState().player.health).toBe(100);
    dev.setGodMode(false);
    useGameStore.getState().dealDamageToPlayer(50, 'test');
    expect(useGameStore.getState().player.health).toBeLessThan(100);
  });

  test('spawnEnemy adds a rift enemy and killAllEnemies hits every handler', () => {
    const id = dev.spawnEnemy('goblin');
    expect(useGameStore.getState().enemies.find((e) => e.id === id)?.type).toBe('goblin');

    const handler = { takeDamage: vi.fn(), applyStatusEffect: vi.fn() };
    useGameStore.getState()._enemyHandlers.set(id, handler);
    expect(dev.killAllEnemies()).toBe(1);
    expect(handler.takeDamage).toHaveBeenCalled();
  });

  test('jumpToHour sets elapsed time on the current day', () => {
    useGameStore.getState().updateWorldTime({ dayNumber: 3 });
    dev.jumpToHour(12);
    expect(useGameStore.getState().worldTime.elapsed).toBeCloseTo(2.5 * DAY_LENGTH_SECONDS);
  });

  test('teleports request a physics move', () => {
    expect(dev.teleportToSettlement()).toBe(false); // no campfire yet
    useGameStore.getState().setSettlementCenter([10, 20, 30]);
    expect(dev.teleportToSettlement()).toBe(true);
    expect(useGameStore.getState().pendingTeleport).toEqual([13, 26, 33]);
  });

  test('giveMaterials adds to every material', () => {
    const before = useGameStore.getState().inventory.materials.stone || 0;
    dev.giveMaterials(25);
    expect(useGameStore.getState().inventory.materials.stone).toBe(before + 25);
  });
});

describe('DevOverlay', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
    window.localStorage.removeItem('voxel-dev-overlay');
  });

  test('F3 cycles closed → full → mini → closed', () => {
    render(<DevOverlay />);
    expect(screen.queryByTestId('dev-overlay')).toBeNull();

    pressKey('F3');
    expect(screen.getByTestId('dev-overlay')).toBeInTheDocument();

    pressKey('F3');
    expect(screen.queryByTestId('dev-overlay')).toBeNull();
    expect(screen.getByTestId('dev-overlay-mini')).toBeInTheDocument();

    pressKey('F3');
    expect(screen.queryByTestId('dev-overlay-mini')).toBeNull();
  });

  test('F4 opens the settlement tab', () => {
    render(<DevOverlay />);
    pressKey('F4');
    expect(screen.getByRole('tab', { name: 'Settlement' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText(/Phase 2 checks/i)).toBeInTheDocument();
  });

  test('every tab renders and the god mode button works', () => {
    render(<DevOverlay />);
    pressKey('F3');
    for (const name of ['Perf', 'Player', 'World', 'Settlement']) {
      fireEvent.click(screen.getByRole('tab', { name }));
      expect(screen.getByRole('tab', { name })).toHaveAttribute('aria-selected', 'true');
    }
    fireEvent.click(screen.getByRole('tab', { name: 'Player' }));
    fireEvent.click(screen.getByText(/God mode off/));
    expect(useGameStore.getState()._devGodMode).toBe(true);
  });

  test('time scale buttons change world speed', () => {
    render(<DevOverlay />);
    pressKey('F3');
    fireEvent.click(screen.getByRole('tab', { name: 'World' }));
    fireEvent.click(screen.getByText('×5'));
    expect(useGameStore.getState().worldTime.timeScale).toBe(5);
  });

  test('clicks inside the overlay do not reach document listeners (game input)', () => {
    const onPointerDown = vi.fn();
    document.addEventListener('pointerdown', onPointerDown);
    render(<DevOverlay />);
    pressKey('F3');
    fireEvent.pointerDown(screen.getByTestId('dev-overlay'));
    expect(onPointerDown).not.toHaveBeenCalled();
    document.removeEventListener('pointerdown', onPointerDown);
  });

  test('remembers its mode and tab', () => {
    const { unmount } = render(<DevOverlay />);
    pressKey('F4');
    unmount();
    render(<DevOverlay />);
    expect(screen.getByRole('tab', { name: 'Settlement' })).toHaveAttribute('aria-selected', 'true');
  });
});

describe('DevOverlay on touch devices', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
    window.localStorage.removeItem('voxel-dev-overlay');
    window.ontouchstart = null; // isTouchDevice() checks for this
  });
  afterEach(() => {
    delete window.ontouchstart;
  });

  test('DEV button opens and closes the panel', () => {
    render(<DevOverlay />);
    fireEvent.click(screen.getByRole('button', { name: 'Open dev overlay' }));
    expect(screen.getByTestId('dev-overlay')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close dev overlay' }));
    expect(screen.queryByTestId('dev-overlay')).toBeNull();
  });
});
