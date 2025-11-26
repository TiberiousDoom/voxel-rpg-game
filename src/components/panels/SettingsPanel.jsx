/**
 * SettingsPanel.jsx - Settings panel for new UI system
 *
 * New settings panel with organized categories.
 */

import React, { useState } from 'react';
import { Card, Button, Badge } from '../common';
import {
  Settings,
  Volume2,
  VolumeX,
  Monitor,
  Gamepad2,
  Save,
  Trash2,
  Download,
  Upload,
  Info,
} from 'lucide-react';
import './Panel.css';

/**
 * SettingsPanel component
 * @param {Object} props
 * @param {Object} props.gameState - Game state
 * @param {Object} props.gameActions - Game actions
 */
function SettingsPanel({ gameState, gameActions }) {
  const [activeCategory, setActiveCategory] = useState('audio');

  const categories = [
    { id: 'audio', label: 'Audio', icon: Volume2 },
    { id: 'display', label: 'Display', icon: Monitor },
    { id: 'controls', label: 'Controls', icon: Gamepad2 },
    { id: 'saves', label: 'Saves', icon: Save },
    { id: 'about', label: 'About', icon: Info },
  ];

  return (
    <div className="panel panel-settings">
      {/* Category Tabs */}
      <div className="settings-categories">
        {categories.map((cat) => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              className={`settings-category ${activeCategory === cat.id ? 'settings-category-active' : ''}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              <Icon size={18} />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Category Content */}
      <div className="settings-content">
        {activeCategory === 'audio' && (
          <section className="panel-section">
            <h3 className="panel-section-title">
              <Volume2 size={18} />
              Audio Settings
            </h3>
            <Card padding="medium">
              <div className="settings-option">
                <span>Master Volume</span>
                <input type="range" min="0" max="100" defaultValue="80" />
              </div>
              <div className="settings-option">
                <span>Music Volume</span>
                <input type="range" min="0" max="100" defaultValue="70" />
              </div>
              <div className="settings-option">
                <span>SFX Volume</span>
                <input type="range" min="0" max="100" defaultValue="90" />
              </div>
              <div className="settings-option">
                <span>Mute All</span>
                <Button variant="ghost" size="small">
                  <VolumeX size={16} />
                </Button>
              </div>
            </Card>
          </section>
        )}

        {activeCategory === 'display' && (
          <section className="panel-section">
            <h3 className="panel-section-title">
              <Monitor size={18} />
              Display Settings
            </h3>
            <Card padding="medium">
              <div className="settings-option">
                <span>Show FPS</span>
                <input type="checkbox" defaultChecked />
              </div>
              <div className="settings-option">
                <span>Show Grid</span>
                <input type="checkbox" />
              </div>
              <div className="settings-option">
                <span>UI Scale</span>
                <select defaultValue="100">
                  <option value="75">75%</option>
                  <option value="100">100%</option>
                  <option value="125">125%</option>
                  <option value="150">150%</option>
                </select>
              </div>
            </Card>
          </section>
        )}

        {activeCategory === 'controls' && (
          <section className="panel-section">
            <h3 className="panel-section-title">
              <Gamepad2 size={18} />
              Keyboard Shortcuts
            </h3>
            <Card padding="medium">
              <div className="settings-keybind">
                <span>Build Menu</span>
                <Badge variant="default">B</Badge>
              </div>
              <div className="settings-keybind">
                <span>Inventory</span>
                <Badge variant="default">I</Badge>
              </div>
              <div className="settings-keybind">
                <span>NPCs</span>
                <Badge variant="default">N</Badge>
              </div>
              <div className="settings-keybind">
                <span>Resources</span>
                <Badge variant="default">R</Badge>
              </div>
              <div className="settings-keybind">
                <span>Quests</span>
                <Badge variant="default">Q</Badge>
              </div>
              <div className="settings-keybind">
                <span>Clean Mode</span>
                <Badge variant="default">`</Badge>
              </div>
              <div className="settings-keybind">
                <span>Pause</span>
                <Badge variant="default">Space</Badge>
              </div>
            </Card>
          </section>
        )}

        {activeCategory === 'saves' && (
          <section className="panel-section">
            <h3 className="panel-section-title">
              <Save size={18} />
              Save Management
            </h3>
            <Card padding="medium">
              <div className="settings-saves-actions">
                <Button variant="primary" icon={<Save size={16} />}>
                  Save Game
                </Button>
                <Button variant="secondary" icon={<Download size={16} />}>
                  Export Save
                </Button>
                <Button variant="secondary" icon={<Upload size={16} />}>
                  Import Save
                </Button>
                <Button variant="danger" icon={<Trash2 size={16} />}>
                  Delete Save
                </Button>
              </div>
            </Card>
          </section>
        )}

        {activeCategory === 'about' && (
          <section className="panel-section">
            <h3 className="panel-section-title">
              <Info size={18} />
              About
            </h3>
            <Card padding="medium">
              <div className="settings-about">
                <h4>Voxel RPG Game</h4>
                <p>Version 1.0.0</p>
                <p className="settings-about-desc">
                  A settlement building and exploration game with voxel graphics.
                </p>
              </div>
            </Card>
          </section>
        )}
      </div>
    </div>
  );
}

export default SettingsPanel;
