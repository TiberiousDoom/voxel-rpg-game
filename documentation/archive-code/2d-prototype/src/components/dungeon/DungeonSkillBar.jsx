/**
 * DungeonSkillBar.jsx
 *
 * Active skill bar for dungeon combat
 * Integrates with the dungeon store's skill system
 */

import React, { useState, useEffect, useCallback } from 'react';
import useGameStore from '../../stores/useGameStore';
import useDungeonStore from '../../stores/useDungeonStore';
import './DungeonSkillBar.css';

// Hotkey mapping
const HOTKEYS = ['1', '2', '3', '4', '5', '6'];

/**
 * DungeonSkillBar Component
 * Shows active skills that can be used in dungeon combat
 */
const DungeonSkillBar = () => {
  const player = useGameStore((state) => state.player);
  const getActiveSkills = useGameStore((state) => state.getActiveSkills);

  const {
    skillCooldowns,
    dungeonPlayerMana,
    dungeonPlayerMaxMana,
    inCombat,
    useSkill: activateSkill,
    isPlayerDead
  } = useDungeonStore();

  const [activeSkills, setActiveSkills] = useState([]);
  const [feedback, setFeedback] = useState(null);

  // Update active skills
  useEffect(() => {
    if (getActiveSkills) {
      const skills = getActiveSkills();
      // Map skills to dungeon-compatible format
      const dungeonSkills = skills.map(skill => ({
        id: `${skill.treeId}_${skill.skillId}`,
        treeId: skill.treeId,
        skillId: skill.skillId,
        name: skill.name,
        icon: skill.icon || '⚡',
        description: skill.description,
        manaCost: skill.activation?.manaCost || 10,
        cooldown: skill.activation?.cooldown || 5,
        type: determineSkillType(skill),
        damage: calculateSkillDamage(skill, player),
        damageMultiplier: skill.activation?.damageMultiplier || 1,
        healAmount: skill.activation?.healAmount || 0,
        aoe: skill.activation?.aoe || false
      }));
      setActiveSkills(dungeonSkills);
    }
  }, [getActiveSkills, player]);

  // Determine skill type from skill data
  function determineSkillType(skill) {
    if (skill.activation?.healAmount > 0) return 'heal';
    if (skill.activation?.buff) return 'buff';
    return 'damage';
  }

  // Calculate skill damage based on player stats
  function calculateSkillDamage(skill, playerStats) {
    const baseDamage = playerStats?.damage || 10;
    const multiplier = skill.activation?.damageMultiplier || 1;
    return Math.floor(baseDamage * multiplier);
  }

  // Show feedback message
  const showFeedback = useCallback((message, type) => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 2000);
  }, []);

  // Handle skill activation
  const handleActivate = useCallback((skill) => {
    if (isPlayerDead()) {
      showFeedback('You are defeated!', 'error');
      return;
    }

    // Check mana
    if (dungeonPlayerMana < skill.manaCost) {
      showFeedback('Not enough mana!', 'error');
      return;
    }

    // Check cooldown
    const currentCooldown = skillCooldowns[skill.id] || 0;
    if (currentCooldown > 0) {
      showFeedback(`On cooldown (${currentCooldown.toFixed(1)}s)`, 'error');
      return;
    }

    // Use the skill via dungeon store
    const result = activateSkill(skill.id, {
      name: skill.name,
      type: skill.type,
      damage: skill.damage,
      damageMultiplier: skill.damageMultiplier,
      healAmount: skill.healAmount,
      manaCost: skill.manaCost,
      cooldown: skill.cooldown,
      aoe: skill.aoe
    }, {
      damage: player.damage,
      critChance: player.critChance,
      critDamage: player.critDamage
    });

    if (result.success) {
      showFeedback(`${skill.name} activated!`, 'success');
    } else {
      showFeedback(result.message || 'Failed to use skill', 'error');
    }
  }, [player, dungeonPlayerMana, skillCooldowns, activateSkill, isPlayerDead, showFeedback]);

  // Handle hotkey presses
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (!inCombat) return;

      const hotkeyIndex = HOTKEYS.indexOf(e.key);
      if (hotkeyIndex !== -1 && hotkeyIndex < activeSkills.length) {
        handleActivate(activeSkills[hotkeyIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [activeSkills, handleActivate, inCombat]);

  // Format cooldown display
  const formatCooldown = (seconds) => {
    if (seconds <= 0) return '';
    if (seconds < 60) return `${Math.ceil(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = Math.ceil(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (!activeSkills || activeSkills.length === 0) {
    return (
      <div className="dungeon-skill-bar empty">
        <p>No active skills unlocked</p>
      </div>
    );
  }

  return (
    <div className="dungeon-skill-bar">
      {/* Mana Display */}
      <div className="mana-display">
        <div className="mana-bar">
          <div
            className="mana-fill"
            style={{ width: `${(dungeonPlayerMana / dungeonPlayerMaxMana) * 100}%` }}
          />
          <span className="mana-text">{Math.floor(dungeonPlayerMana)} MP</span>
        </div>
      </div>

      {/* Skill Buttons */}
      <div className="skill-bar-container">
        {activeSkills.map((skill, index) => {
          const cooldown = skillCooldowns[skill.id] || 0;
          const isOnCooldown = cooldown > 0;
          const hasEnoughMana = dungeonPlayerMana >= skill.manaCost;
          const canUse = !isOnCooldown && hasEnoughMana && inCombat && !isPlayerDead();

          return (
            <div
              key={skill.id}
              className={`skill-button ${isOnCooldown ? 'on-cooldown' : ''} ${!canUse ? 'disabled' : 'ready'}`}
              onClick={() => canUse && handleActivate(skill)}
              title={`${skill.name}\n${skill.description || ''}\nMana: ${skill.manaCost}\nCooldown: ${skill.cooldown}s\n\nHotkey: ${HOTKEYS[index]}`}
            >
              {/* Skill Icon */}
              <div className="skill-icon">{skill.icon}</div>

              {/* Cooldown Overlay */}
              {isOnCooldown && (
                <div
                  className="cooldown-overlay"
                  style={{ height: `${(cooldown / skill.cooldown) * 100}%` }}
                />
              )}

              {/* Cooldown Text */}
              {isOnCooldown && (
                <div className="cooldown-text">{formatCooldown(cooldown)}</div>
              )}

              {/* Mana Cost */}
              <div className={`mana-cost ${!hasEnoughMana ? 'insufficient' : ''}`}>
                {skill.manaCost}
              </div>

              {/* Hotkey Badge */}
              <div className="hotkey-badge">{HOTKEYS[index]}</div>

              {/* Skill Type Indicator */}
              <div className={`skill-type ${skill.type}`}>
                {skill.type === 'heal' ? '💚' : skill.type === 'buff' ? '✨' : '⚔️'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Activation Feedback */}
      {feedback && (
        <div className={`skill-feedback ${feedback.type}`}>
          {feedback.message}
        </div>
      )}
    </div>
  );
};

export default DungeonSkillBar;
