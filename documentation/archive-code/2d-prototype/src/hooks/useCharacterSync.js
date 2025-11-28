/**
 * useCharacterSync.js
 * Synchronizes character data (attributes) with game systems
 *
 * Keeps NPCManager and ModuleOrchestrator updated with latest character attributes
 * so attribute bonuses (Leadership → NPCs, Construction → Buildings) are applied.
 */

import { useEffect, useRef } from 'react';
import useGameStore from '../stores/useGameStore';

/**
 * Hook to sync character data to game systems
 * Call this from the main game component
 *
 * @param {object} gameManager - GameManager instance from useGameManager
 */
export function useCharacterSync(gameManager) {
  const character = useGameStore((state) => state.character);
  const previousCharacter = useRef(null);

  useEffect(() => {
    // Only sync if gameManager is ready and character changed
    if (!gameManager?.orchestrator) {
      return;
    }

    // Check if character actually changed (avoid unnecessary syncs)
    const characterChanged =
      !previousCharacter.current ||
      JSON.stringify(previousCharacter.current.attributes) !==
        JSON.stringify(character.attributes);

    if (characterChanged) {
      // Sync character data to NPCManager (Leadership bonuses)
      if (gameManager.orchestrator.npcManager?.setCharacter) {
        gameManager.orchestrator.npcManager.setCharacter(character);
      }

      // Sync character data to ModuleOrchestrator (Construction bonuses)
      if (gameManager.orchestrator.setCharacter) {
        gameManager.orchestrator.setCharacter(character);
      }

      // Update previous character ref
      previousCharacter.current = character;

      // eslint-disable-next-line no-console
      console.log('[CharacterSync] Synced character to game systems', {
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
