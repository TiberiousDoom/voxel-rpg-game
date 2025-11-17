/**
 * SpriteSheetParser.test.js
 * Unit tests for the SpriteSheetParser class
 */

import SpriteSheetParser from '../SpriteSheetParser.js';

// Mock Image class
class MockImage {
  constructor(width = 64, height = 16) {
    this.width = width;
    this.height = height;
    this.complete = true;
  }
}

// Mock canvas and context for testing
class MockCanvas {
  constructor() {
    this.width = 0;
    this.height = 0;
    this._context = new MockContext();
  }

  getContext(type) {
    return this._context;
  }
}

class MockContext {
  constructor() {
    this.drawImageCalls = [];
  }

  drawImage(...args) {
    this.drawImageCalls.push(args);
  }

  save() {}
  restore() {}
  translate() {}
  scale() {}
}

// Mock document.createElement
global.document = {
  createElement: (tag) => {
    if (tag === 'canvas') {
      return new MockCanvas();
    }
    return {};
  }
};

describe('SpriteSheetParser', () => {
  describe('constructor', () => {
    test('creates parser with valid image', () => {
      const image = new MockImage(64, 16);
      const parser = new SpriteSheetParser(image, 16, 16);

      expect(parser.frameWidth).toBe(16);
      expect(parser.frameHeight).toBe(16);
      expect(parser.frameCount).toBe(4);
    });

    test('throws error with incomplete image', () => {
      const image = new MockImage();
      image.complete = false;

      expect(() => new SpriteSheetParser(image, 16, 16))
        .toThrow('must be loaded before parsing');
    });

    test('throws error with invalid frame dimensions', () => {
      const image = new MockImage();

      expect(() => new SpriteSheetParser(image, 0, 16))
        .toThrow('Frame dimensions must be positive');

      expect(() => new SpriteSheetParser(image, 16, -1))
        .toThrow('Frame dimensions must be positive');
    });

    test('throws error when image is smaller than frame', () => {
      const image = new MockImage(8, 16);

      expect(() => new SpriteSheetParser(image, 16, 16))
        .toThrow('smaller than frame width');
    });
  });

  describe('getFrameCount', () => {
    test('calculates correct frame count', () => {
      const image = new MockImage(64, 16);
      const parser = new SpriteSheetParser(image, 16, 16);

      expect(parser.getFrameCount()).toBe(4);
    });

    test('handles single frame', () => {
      const image = new MockImage(16, 16);
      const parser = new SpriteSheetParser(image, 16, 16);

      expect(parser.getFrameCount()).toBe(1);
    });
  });

  describe('getFrameDimensions', () => {
    test('returns frame dimensions', () => {
      const image = new MockImage(64, 16);
      const parser = new SpriteSheetParser(image, 16, 16);

      const dimensions = parser.getFrameDimensions();

      expect(dimensions.width).toBe(16);
      expect(dimensions.height).toBe(16);
    });
  });

  describe('getImage', () => {
    test('returns the source image', () => {
      const image = new MockImage(64, 16);
      const parser = new SpriteSheetParser(image, 16, 16);

      expect(parser.getImage()).toBe(image);
    });
  });

  describe('extractFrame', () => {
    test('extracts a valid frame', () => {
      const image = new MockImage(64, 16);
      const parser = new SpriteSheetParser(image, 16, 16);

      const frame = parser.extractFrame(0);

      expect(frame).toBeInstanceOf(MockCanvas);
      expect(frame.width).toBe(16);
      expect(frame.height).toBe(16);
    });

    test('throws error for invalid frame index', () => {
      const image = new MockImage(64, 16);
      const parser = new SpriteSheetParser(image, 16, 16);

      expect(() => parser.extractFrame(-1))
        .toThrow('out of range');

      expect(() => parser.extractFrame(4))
        .toThrow('out of range');
    });

    test('caches extracted frames', () => {
      const image = new MockImage(64, 16);
      const parser = new SpriteSheetParser(image, 16, 16);

      const frame1 = parser.extractFrame(0);
      const frame2 = parser.extractFrame(0);

      expect(frame1).toBe(frame2);
      expect(parser.frameCache.size).toBe(1);
    });
  });

  describe('extractAllFrames', () => {
    test('extracts all frames', () => {
      const image = new MockImage(64, 16);
      const parser = new SpriteSheetParser(image, 16, 16);

      const frames = parser.extractAllFrames();

      expect(frames.length).toBe(4);
      expect(parser.frameCache.size).toBe(4);
    });
  });

  describe('clearCache', () => {
    test('clears frame cache', () => {
      const image = new MockImage(64, 16);
      const parser = new SpriteSheetParser(image, 16, 16);

      parser.extractFrame(0);
      parser.extractFrame(1);

      expect(parser.frameCache.size).toBe(2);

      parser.clearCache();

      expect(parser.frameCache.size).toBe(0);
    });
  });

  describe('getCacheStats', () => {
    test('returns cache statistics', () => {
      const image = new MockImage(64, 16);
      const parser = new SpriteSheetParser(image, 16, 16);

      parser.extractFrame(0);
      parser.extractFrame(1);

      const stats = parser.getCacheStats();

      expect(stats.totalFrames).toBe(4);
      expect(stats.cachedFrames).toBe(2);
      expect(stats.frameWidth).toBe(16);
      expect(stats.frameHeight).toBe(16);
      expect(stats.imageWidth).toBe(64);
      expect(stats.imageHeight).toBe(16);
    });
  });

  describe('drawFrame', () => {
    test('draws frame to context', () => {
      const image = new MockImage(64, 16);
      const parser = new SpriteSheetParser(image, 16, 16);
      const ctx = new MockContext();

      parser.drawFrame(ctx, 1, 10, 20, 32, 32);

      expect(ctx.drawImageCalls.length).toBe(1);
      const call = ctx.drawImageCalls[0];

      // Check source position (frame 1 should be at x=16)
      expect(call[1]).toBe(16); // sourceX
      expect(call[2]).toBe(0);  // sourceY
    });

    test('throws error for invalid frame index', () => {
      const image = new MockImage(64, 16);
      const parser = new SpriteSheetParser(image, 16, 16);
      const ctx = new MockContext();

      expect(() => parser.drawFrame(ctx, -1, 0, 0))
        .toThrow('out of range');
    });
  });

  describe('drawFrameFlipped', () => {
    test('draws frame without flipping when flipX is false', () => {
      const image = new MockImage(64, 16);
      const parser = new SpriteSheetParser(image, 16, 16);
      const ctx = new MockContext();

      parser.drawFrameFlipped(ctx, 0, 10, 20, 16, 16, false);

      expect(ctx.drawImageCalls.length).toBe(1);
    });
  });
});
