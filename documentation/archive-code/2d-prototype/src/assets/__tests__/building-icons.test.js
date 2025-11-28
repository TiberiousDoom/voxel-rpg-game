/**
 * building-icons Unit Tests
 * Tests for building icon and visual asset definitions
 *
 * Part of WF3: Building Rendering & Visual Effects
 */

import {
  BUILDING_ICONS,
  TEXTURE_OVERLAYS,
  SHADOW_EFFECTS,
  getBuildingIcon,
  getBuildingColor,
  getTextureOverlay,
  getShadowEffect,
  generateShadowCSS,
  ALL_BUILDING_VISUALS
} from '../building-icons.js';
import { BUILDING_TYPES } from '../../shared/config.js';

describe('building-icons', () => {
  describe('BUILDING_ICONS', () => {
    test('has icon definitions for all building types', () => {
      Object.values(BUILDING_TYPES).forEach(buildingType => {
        expect(BUILDING_ICONS[buildingType]).toBeDefined();
      });
    });

    test('each icon has required properties', () => {
      Object.values(BUILDING_ICONS).forEach(icon => {
        expect(icon.name).toBeDefined();
        expect(icon.icon).toBeDefined();
        expect(icon.emoji).toBeDefined();
        expect(icon.symbol).toBeDefined();
        expect(icon.colors).toBeDefined();
        expect(icon.tier).toBeDefined();
        expect(icon.size).toBeDefined();
      });
    });

    test('each icon has all color states', () => {
      Object.values(BUILDING_ICONS).forEach(icon => {
        expect(icon.colors.preview).toBeDefined();
        expect(icon.colors.blueprint).toBeDefined();
        expect(icon.colors.construction).toBeDefined();
        expect(icon.colors.complete).toBeDefined();
        expect(icon.colors.damaged).toBeDefined();
        expect(icon.colors.destroyed).toBeDefined();
      });
    });
  });

  describe('getBuildingIcon', () => {
    test('returns icon for valid building type', () => {
      const icon = getBuildingIcon(BUILDING_TYPES.WALL);
      expect(icon.name).toBe('Wall');
      expect(icon.emoji).toBe('🧱');
    });

    test('returns default icon for unknown building type', () => {
      const icon = getBuildingIcon('UNKNOWN_TYPE');
      expect(icon.name).toBe('Unknown');
      expect(icon.emoji).toBe('❓');
    });

    test('returns icon with all required properties', () => {
      const icon = getBuildingIcon(BUILDING_TYPES.CASTLE);
      expect(icon).toHaveProperty('name');
      expect(icon).toHaveProperty('icon');
      expect(icon).toHaveProperty('emoji');
      expect(icon).toHaveProperty('symbol');
      expect(icon).toHaveProperty('colors');
      expect(icon).toHaveProperty('tier');
      expect(icon).toHaveProperty('size');
    });
  });

  describe('getBuildingColor', () => {
    test('returns correct color for COMPLETE state', () => {
      const color = getBuildingColor(BUILDING_TYPES.WALL, 'COMPLETE');
      expect(color).toBe('#888888');
    });

    test('returns correct color for BLUEPRINT state', () => {
      const color = getBuildingColor(BUILDING_TYPES.WALL, 'BLUEPRINT');
      expect(color).toContain('rgba');
      expect(color).toContain('0.5');
    });

    test('returns correct color for UNDER_CONSTRUCTION state', () => {
      const color = getBuildingColor(BUILDING_TYPES.WALL, 'UNDER_CONSTRUCTION');
      expect(color).toContain('rgba');
      expect(color).toContain('0.7');
    });

    test('returns correct color for DAMAGED state', () => {
      const color = getBuildingColor(BUILDING_TYPES.WALL, 'DAMAGED');
      expect(color).toBe('#606060');
    });

    test('returns correct color for DESTROYED state', () => {
      const color = getBuildingColor(BUILDING_TYPES.WALL, 'DESTROYED');
      expect(color).toBe('#2a2a2a');
    });

    test('handles case-insensitive state names', () => {
      const color1 = getBuildingColor(BUILDING_TYPES.WALL, 'complete');
      const color2 = getBuildingColor(BUILDING_TYPES.WALL, 'COMPLETE');
      expect(color1).toBe(color2);
    });

    test('defaults to COMPLETE for unknown state', () => {
      const color = getBuildingColor(BUILDING_TYPES.WALL, 'UNKNOWN_STATE');
      expect(color).toBe('#888888'); // Should default to complete color
    });
  });

  describe('getTextureOverlay', () => {
    test('returns blueprint grid for BLUEPRINT state', () => {
      const overlay = getTextureOverlay('BLUEPRINT');
      expect(overlay).toBe(TEXTURE_OVERLAYS.BLUEPRINT_GRID);
    });

    test('returns construction pattern for UNDER_CONSTRUCTION state', () => {
      const overlay = getTextureOverlay('UNDER_CONSTRUCTION');
      expect(overlay).toBe(TEXTURE_OVERLAYS.CONSTRUCTION_PATTERN);
    });

    test('returns light cracks for slightly damaged buildings', () => {
      const overlay = getTextureOverlay('DAMAGED', 0.8);
      expect(overlay).toBe(TEXTURE_OVERLAYS.CRACKS.light);
    });

    test('returns medium cracks for moderately damaged buildings', () => {
      const overlay = getTextureOverlay('DAMAGED', 0.5);
      expect(overlay).toBe(TEXTURE_OVERLAYS.CRACKS.medium);
    });

    test('returns heavy cracks for heavily damaged buildings', () => {
      const overlay = getTextureOverlay('DAMAGED', 0.2);
      expect(overlay).toBe(TEXTURE_OVERLAYS.CRACKS.heavy);
    });

    test('returns rubble for DESTROYED state', () => {
      const overlay = getTextureOverlay('DESTROYED');
      expect(overlay).toBe(TEXTURE_OVERLAYS.RUBBLE.heavy);
    });

    test('returns null for COMPLETE state with full health', () => {
      const overlay = getTextureOverlay('COMPLETE', 1.0);
      expect(overlay).toBeNull();
    });
  });

  describe('getShadowEffect', () => {
    test('returns small shadow for WALL', () => {
      const shadow = getShadowEffect(BUILDING_TYPES.WALL);
      expect(shadow).toBe(SHADOW_EFFECTS.small);
    });

    test('returns medium shadow for TOWER', () => {
      const shadow = getShadowEffect(BUILDING_TYPES.TOWER);
      expect(shadow).toBe(SHADOW_EFFECTS.medium);
    });

    test('returns large shadow for BARRACKS', () => {
      const shadow = getShadowEffect(BUILDING_TYPES.BARRACKS);
      expect(shadow).toBe(SHADOW_EFFECTS.large);
    });

    test('returns xlarge shadow for CASTLE', () => {
      const shadow = getShadowEffect(BUILDING_TYPES.CASTLE);
      expect(shadow).toBe(SHADOW_EFFECTS.xlarge);
    });
  });

  describe('generateShadowCSS', () => {
    test('generates correct CSS string for shadow', () => {
      const shadowConfig = {
        offsetX: 2,
        offsetY: 3,
        blur: 5,
        color: 'rgba(0, 0, 0, 0.5)'
      };
      const css = generateShadowCSS(shadowConfig);
      expect(css).toBe('2px 3px 5px rgba(0, 0, 0, 0.5)');
    });

    test('handles different shadow configurations', () => {
      const css = generateShadowCSS(SHADOW_EFFECTS.small);
      expect(css).toContain('px');
      expect(css).toContain('rgba');
    });
  });

  describe('ALL_BUILDING_VISUALS', () => {
    test('contains all building types', () => {
      const buildingTypes = ALL_BUILDING_VISUALS.map(v => v.type);
      Object.values(BUILDING_TYPES).forEach(type => {
        expect(buildingTypes).toContain(type);
      });
    });

    test('each visual has type and icon properties', () => {
      ALL_BUILDING_VISUALS.forEach(visual => {
        expect(visual.type).toBeDefined();
        expect(visual.name).toBeDefined();
        expect(visual.emoji).toBeDefined();
      });
    });
  });

  describe('TEXTURE_OVERLAYS', () => {
    test('has all required overlay types', () => {
      expect(TEXTURE_OVERLAYS.CRACKS).toBeDefined();
      expect(TEXTURE_OVERLAYS.RUBBLE).toBeDefined();
      expect(TEXTURE_OVERLAYS.BLUEPRINT_GRID).toBeDefined();
      expect(TEXTURE_OVERLAYS.CONSTRUCTION_PATTERN).toBeDefined();
    });

    test('cracks have light, medium, and heavy variants', () => {
      expect(TEXTURE_OVERLAYS.CRACKS.light).toBeDefined();
      expect(TEXTURE_OVERLAYS.CRACKS.medium).toBeDefined();
      expect(TEXTURE_OVERLAYS.CRACKS.heavy).toBeDefined();
    });

    test('rubble has light, medium, and heavy variants', () => {
      expect(TEXTURE_OVERLAYS.RUBBLE.light).toBeDefined();
      expect(TEXTURE_OVERLAYS.RUBBLE.medium).toBeDefined();
      expect(TEXTURE_OVERLAYS.RUBBLE.heavy).toBeDefined();
    });
  });

  describe('SHADOW_EFFECTS', () => {
    test('has all size variants', () => {
      expect(SHADOW_EFFECTS.small).toBeDefined();
      expect(SHADOW_EFFECTS.medium).toBeDefined();
      expect(SHADOW_EFFECTS.large).toBeDefined();
      expect(SHADOW_EFFECTS.xlarge).toBeDefined();
    });

    test('each shadow has required properties', () => {
      Object.values(SHADOW_EFFECTS).forEach(shadow => {
        expect(shadow.offsetX).toBeDefined();
        expect(shadow.offsetY).toBeDefined();
        expect(shadow.blur).toBeDefined();
        expect(shadow.color).toBeDefined();
      });
    });

    test('shadow sizes increase appropriately', () => {
      expect(SHADOW_EFFECTS.small.blur).toBeLessThan(SHADOW_EFFECTS.medium.blur);
      expect(SHADOW_EFFECTS.medium.blur).toBeLessThan(SHADOW_EFFECTS.large.blur);
      expect(SHADOW_EFFECTS.large.blur).toBeLessThan(SHADOW_EFFECTS.xlarge.blur);
    });
  });
});
