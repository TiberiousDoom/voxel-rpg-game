/**
 * useCharacterSync.js
 * Synchronizes character data (attributes) with NPCManager
 *
 * Keeps NPCManager updated with latest character attributes
 * so Leadership bonuses are applied to NPC efficiency calculations.
 */

import { useEffect, useRef } from 'react';
import useGameStore from '../stores/useGameStore';

/**
 * Hook to sync character data to NPCManager
 * Call this from the main game component
 *
 * @param {object} gameManager - GameManager instance from useGameManager
 */
export function useCharacterSync(gameManager) {
  const character = useGameStore((state) => state.character);
  const previousCharacter = useRef(null);

  useEffect(() => {
    // Only sync if gameManager is ready and character changed
    if (!gameManager?.orchestrator?.npcManager) {
      return;
    }

    // Check if character actually changed (avoid unnecessary syncs)
    const characterChanged =
      !previousCharacter.current ||
      JSON.stringify(previousCharacter.current.attributes) !==
        JSON.stringify(character.attributes);

    if (characterChanged) {
      // Sync character data to NPCManager
      gameManager.orchestrator.npcManager.setCharacter(character);

      // Update previous character ref
      previousCharacter.current = character;

      // eslint-disable-next-line no-console
      console.log('[CharacterSync] Synced character to NPCManager', {
        leadership: character.attributes.leadership,
        construction: character.attributes.construction,
        exploration: character.attributes.exploration,
        combat: character.attributes.combat,
        magic: character.attributes.magic,
        endurance: character.attributes.endurance,
      });
    }
  }, [gameManager, character]);
}

export default useCharacterSync;
