/**
 * ActiveSkillBar.jsx
 *
 * UI component for displaying and activating active skills
 * Shows unlocked active skills with cooldowns and hotkeys
 */

import React, { useState, useEffect } from 'react';
import useGameStore from '../../stores/useGameStore';
import './ActiveSkillBar.css';

// Hotkey mapping (constant)
const HOTKEYS = ['1', '2', '3', '4', '5', '6'];

const ActiveSkillBar = () => {
  // eslint-disable-next-line no-unused-vars
  const character = useGameStore((state) => state.character);
  const getActiveSkills = useGameStore((state) => state.getActiveSkills);
  const activateActiveSkill = useGameStore((state) => state.activateActiveSkill);
  const getActiveSkillCooldown = useGameStore((state) => state.getActiveSkillCooldown);
  const canActivateSkill = useGameStore((state) => state.canActivateSkill);
  const getActiveBuffs = useGameStore((state) => state.getActiveBuffs);

  const [activeSkills, setActiveSkills] = useState([]);
  const [cooldowns, setCooldowns] = useState({});
  const [activeBuffs, setActiveBuffs] = useState([]);
  const [feedback, setFeedback] = useState(null);

  // Update active skills and cooldowns every 100ms
  useEffect(() => {
    const updateSkillsAndCooldowns = () => {
      if (getActiveSkills && getActiveSkillCooldown) {
        const skills = getActiveSkills();
        setActiveSkills(skills);

        // Update cooldowns
        const newCooldowns = {};
        for (const skill of skills) {
          const cooldown = getActiveSkillCooldown(skill.treeId, skill.skillId);
          newCooldowns[`${skill.treeId}_${skill.skillId}`] = cooldown;
        }
        setCooldowns(newCooldowns);

        // Update active buffs
        if (getActiveBuffs) {
          setActiveBuffs(getActiveBuffs());
        }
      }
    };

    updateSkillsAndCooldowns();
    const interval = setInterval(updateSkillsAndCooldowns, 100);

    return () => clearInterval(interval);
  }, [getActiveSkills, getActiveSkillCooldown, getActiveBuffs]);

  const showFeedback = React.useCallback((message, type) => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 2000);
  }, []);

  const handleActivate = React.useCallback((skill) => {
    if (!activateActiveSkill) return;

    const validation = canActivateSkill(skill.treeId, skill.skillId);
    if (!validation.canActivate) {
      showFeedback(validation.reason, 'error');
      return;
    }

    const result = activateActiveSkill(skill.treeId, skill.skillId);
    if (result.success) {
      showFeedback(`${skill.name} activated!`, 'success');
    } else {
      showFeedback(result.message, 'error');
    }
  }, [activateActiveSkill, canActivateSkill, showFeedback]);

  // Handle hotkey presses
  useEffect(() => {
    const handleKeyPress = (e) => {
      const hotkeyIndex = HOTKEYS.indexOf(e.key);
      if (hotkeyIndex !== -1 && hotkeyIndex < activeSkills.length) {
        const skill = activeSkills[hotkeyIndex];
        handleActivate(skill);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [activeSkills, handleActivate]);

  const formatCooldown = (seconds) => {
    if (seconds <= 0) return 'Ready';
    if (seconds < 60) return `${Math.ceil(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = Math.ceil(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDuration = (seconds) => {
    if (seconds < 60) return `${Math.ceil(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${Math.ceil(seconds % 60)}s`;
  };

  if (!activeSkills || activeSkills.length === 0) {
    return null; // Don't show if no active skills unlocked
  }

  return (
    <div className="active-skill-bar">
      {/* Active Buffs Display */}
      {activeBuffs && activeBuffs.length > 0 && (
        <div className="active-buffs">
          {activeBuffs.map((buff, idx) => (
            <div key={idx} className="active-buff">
              <div className="buff-icon">{buff.activation?.icon || '✨'}</div>
              <div className="buff-info">
                <div className="buff-name">{buff.skillName}</div>
                <div className="buff-duration">{formatDuration(buff.remainingDuration)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Skill Buttons */}
      <div className="skill-bar-container">
        {activeSkills.map((skill, index) => {
          const cooldownKey = `${skill.treeId}_${skill.skillId}`;
          const cooldown = cooldowns[cooldownKey] || 0;
          const isOnCooldown = cooldown > 0;
          const validation = canActivateSkill ? canActivateSkill(skill.treeId, skill.skillId) : { canActivate: false };

          return (
            <div
              key={cooldownKey}
              className={`skill-button ${isOnCooldown ? 'on-cooldown' : 'ready'} ${!validation.canActivate ? 'disabled' : ''}`}
              onClick={() => handleActivate(skill)}
              title={`${skill.name}\n${skill.description}\nCooldown: ${skill.activation.cooldown}s\nDuration: ${skill.activation.duration}s\n\nHotkey: ${HOTKEYS[index]}`}
            >
              {/* Skill Icon */}
              <div className="skill-icon">{skill.icon || '⚡'}</div>

              {/* Cooldown Overlay */}
              {isOnCooldown && (
                <div
                  className="cooldown-overlay"
                  style={{ height: `${(cooldown / skill.activation.cooldown) * 100}%` }}
                />
              )}

              {/* Cooldown Text */}
              {isOnCooldown && (
                <div className="cooldown-text">{formatCooldown(cooldown)}</div>
              )}

              {/* Hotkey Badge */}
              <div className="hotkey-badge">{HOTKEYS[index]}</div>
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

export default ActiveSkillBar;
