/**
 * SkillTreeUI.jsx
 * Skill tree visualization and allocation UI
 */

import React, { useState } from 'react';
import useGameStore from '../../stores/useGameStore';
import './SkillTreeUI.css';

const SkillTreeUI = ({ treeId = 'settlement' }) => {
  const character = useGameStore((state) => state.character);
  const allocateSkill = useGameStore((state) => state.allocateSkill);
  const deallocateSkill = useGameStore((state) => state.deallocateSkill);
  const resetSkillTree = useGameStore((state) => state.resetSkillTree);
  const getSkillPoints = useGameStore((state) => state.getSkillPoints);
  const canAllocateSkill = useGameStore((state) => state.canAllocateSkill);
  const getSkillTree = useGameStore((state) => state.getSkillTree);

  const [selectedSkill, setSelectedSkill] = useState(null);

  const tree = getSkillTree(treeId);
  if (!tree) return <div>Skill tree not found</div>;

  const handleSkillClick = (skillId) => {
    setSelectedSkill(skillId);
  };

  const handleAllocate = (skillId) => {
    allocateSkill(treeId, skillId);
  };

  const handleDeallocate = (skillId) => {
    deallocateSkill(treeId, skillId);
  };

  const handleReset = () => {
    if (window.confirm('Reset all skills in this tree? This will refund all skill points.')) {
      resetSkillTree(treeId);
      setSelectedSkill(null);
    }
  };

  return (
    <div className="skill-tree-ui">
      {/* Header */}
      <div className="skill-tree-header">
        <h2>{tree.icon} {tree.name}</h2>
        <p className="skill-tree-description">{tree.description}</p>
        <div className="skill-points-display">
          <span className="points-label">Skill Points:</span>
          <span className="points-value">{character.skillPoints}</span>
          <button className="reset-button" onClick={handleReset}>
            Reset Tree
          </button>
        </div>
      </div>

      {/* Skill Tree Tiers */}
      <div className="skill-tree-tiers">
        {tree.tiers.map((tier) => (
          <div key={tier.tier} className="skill-tier">
            {/* Tier Header */}
            <div className="tier-header">
              <h3>Tier {tier.tier}: {tier.name}</h3>
              <span className="tier-requirements">
                Level {tier.levelRequirement}+ • {tier.minPointsInTree} points in tree
              </span>
            </div>

            {/* Skills in Tier */}
            <div className="tier-skills">
              {tier.skills.map((skill) => {
                const currentPoints = getSkillPoints(treeId, skill.id);
                const validation = canAllocateSkill(treeId, skill.id);
                const isMaxed = currentPoints >= skill.maxPoints;
                const isAllocated = currentPoints > 0;
                const isSelected = selectedSkill === skill.id;

                return (
                  <div
                    key={skill.id}
                    className={`skill-node ${isAllocated ? 'allocated' : ''} ${isMaxed ? 'maxed' : ''} ${isSelected ? 'selected' : ''} ${!validation.canAllocate && !isAllocated ? 'locked' : ''}`}
                    onClick={() => handleSkillClick(skill.id)}
                  >
                    {/* Skill Icon */}
                    <div className="skill-icon">{skill.icon}</div>

                    {/* Skill Name */}
                    <div className="skill-name">{skill.name}</div>

                    {/* Skill Points */}
                    <div className="skill-points-badge">
                      {currentPoints}/{skill.maxPoints}
                    </div>

                    {/* Skill Type Badge */}
                    {skill.type === 'active' && (
                      <div className="skill-type-badge active">Active</div>
                    )}
                    {skill.type === 'capstone' && (
                      <div className="skill-type-badge capstone">Capstone</div>
                    )}

                    {/* Allocation Buttons */}
                    {isSelected && (
                      <div className="skill-node-actions">
                        {!isMaxed && validation.canAllocate && (
                          <button
                            className="allocate-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAllocate(skill.id);
                            }}
                          >
                            +
                          </button>
                        )}
                        {isAllocated && (
                          <button
                            className="deallocate-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeallocate(skill.id);
                            }}
                          >
                            -
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Skill Details Panel */}
      {selectedSkill && (
        <div className="skill-details-panel">
          {(() => {
            // Find skill in tree
            let foundSkill = null;
            for (const tier of tree.tiers) {
              foundSkill = tier.skills.find((s) => s.id === selectedSkill);
              if (foundSkill) break;
            }

            if (!foundSkill) return null;

            const currentPoints = getSkillPoints(treeId, selectedSkill);
            const validation = canAllocateSkill(treeId, selectedSkill);

            return (
              <>
                <div className="skill-details-header">
                  <span className="skill-details-icon">{foundSkill.icon}</span>
                  <h3>{foundSkill.name}</h3>
                  {foundSkill.type === 'active' && <span className="skill-type-label">Active Skill</span>}
                  {foundSkill.type === 'capstone' && <span className="skill-type-label">Capstone</span>}
                </div>

                <p className="skill-details-description">{foundSkill.description}</p>

                <div className="skill-details-info">
                  <div className="info-row">
                    <span className="info-label">Cost:</span>
                    <span className="info-value">{foundSkill.pointCost} skill points</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Current:</span>
                    <span className="info-value">{currentPoints}/{foundSkill.maxPoints}</span>
                  </div>
                </div>

                {/* Prerequisites */}
                {foundSkill.prerequisites && foundSkill.prerequisites.length > 0 && (
                  <div className="skill-prerequisites">
                    <span className="prerequisites-label">Requires:</span>
                    <ul>
                      {foundSkill.prerequisites.map((prereqId) => {
                        // Find prerequisite skill name
                        let prereqSkill = null;
                        for (const tier of tree.tiers) {
                          prereqSkill = tier.skills.find((s) => s.id === prereqId);
                          if (prereqSkill) break;
                        }
                        return (
                          <li key={prereqId}>{prereqSkill ? prereqSkill.name : prereqId}</li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {/* Active Skill Info */}
                {foundSkill.type === 'active' && foundSkill.activation && (
                  <div className="skill-activation-info">
                    <h4>Activation</h4>
                    <div className="activation-details">
                      {foundSkill.activation.costType !== 'none' && (
                        <div className="activation-row">
                          <span>Cost:</span>
                          <span>{foundSkill.activation.cost} {foundSkill.activation.costType}</span>
                        </div>
                      )}
                      <div className="activation-row">
                        <span>Cooldown:</span>
                        <span>{foundSkill.activation.cooldown}s</span>
                      </div>
                      {foundSkill.activation.duration && (
                        <div className="activation-row">
                          <span>Duration:</span>
                          <span>{foundSkill.activation.duration}s</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Validation Message */}
                {!validation.canAllocate && currentPoints < foundSkill.maxPoints && (
                  <div className="skill-locked-message">
                    🔒 {validation.reason}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default SkillTreeUI;
