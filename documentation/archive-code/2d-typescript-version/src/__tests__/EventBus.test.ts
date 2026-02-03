/**
 * EventBus Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBus, getEventBus } from '../core/EventBus';

describe('EventBus', () => {
  beforeEach(() => {
    EventBus.reset();
  });

  describe('singleton', () => {
    it('should return the same instance', () => {
      const bus1 = getEventBus();
      const bus2 = getEventBus();
      expect(bus1).toBe(bus2);
    });

    it('should return new instance after reset', () => {
      const bus1 = getEventBus();
      EventBus.reset();
      const bus2 = getEventBus();
      expect(bus1).not.toBe(bus2);
    });
  });

  describe('on', () => {
    it('should subscribe to events', () => {
      const bus = getEventBus();
      const handler = vi.fn();

      bus.on('game:started', handler);
      bus.emit('game:started', {});

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should call handler with correct payload', () => {
      const bus = getEventBus();
      const handler = vi.fn();

      bus.on('player:moved', handler);
      bus.emit('player:moved', { position: { x: 10, y: 20 } });

      expect(handler).toHaveBeenCalledWith({ position: { x: 10, y: 20 } });
    });

    it('should allow multiple subscribers', () => {
      const bus = getEventBus();
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      bus.on('game:started', handler1);
      bus.on('game:started', handler2);
      bus.emit('game:started', {});

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('should return unsubscribe function', () => {
      const bus = getEventBus();
      const handler = vi.fn();

      const unsubscribe = bus.on('game:started', handler);
      unsubscribe();
      bus.emit('game:started', {});

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('once', () => {
    it('should only call handler once', () => {
      const bus = getEventBus();
      const handler = vi.fn();

      bus.once('game:started', handler);
      bus.emit('game:started', {});
      bus.emit('game:started', {});

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('emit', () => {
    it('should not throw for events with no subscribers', () => {
      const bus = getEventBus();
      expect(() => bus.emit('game:started', {})).not.toThrow();
    });

    it('should call handlers in priority order', () => {
      const bus = getEventBus();
      const order: number[] = [];

      bus.on('game:started', () => order.push(1), 1);
      bus.on('game:started', () => order.push(2), 2);
      bus.on('game:started', () => order.push(0), 0);

      bus.emit('game:started', {});

      expect(order).toEqual([2, 1, 0]);
    });
  });

  describe('queue', () => {
    it('should queue events for later processing', () => {
      const bus = getEventBus();
      const handler = vi.fn();

      bus.on('game:started', handler);
      bus.queue('game:started', {});

      expect(handler).not.toHaveBeenCalled();

      bus.processQueue();

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('off', () => {
    it('should remove all subscribers for an event', () => {
      const bus = getEventBus();
      const handler = vi.fn();

      bus.on('game:started', handler);
      bus.off('game:started');
      bus.emit('game:started', {});

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('subscriberCount', () => {
    it('should return correct count', () => {
      const bus = getEventBus();

      expect(bus.subscriberCount('game:started')).toBe(0);

      bus.on('game:started', () => {});
      expect(bus.subscriberCount('game:started')).toBe(1);

      bus.on('game:started', () => {});
      expect(bus.subscriberCount('game:started')).toBe(2);
    });
  });
});
