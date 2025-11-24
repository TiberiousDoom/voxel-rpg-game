import React, { useState } from 'react';
import { ChevronDown, ChevronRight, X } from 'lucide-react';
import './CollapsibleFloatingPanel.css';

/**
 * CollapsibleFloatingPanel Component
 * Reusable collapsible panel for floating overlays (weather, terrain tools, debug panels)
 *
 * @param {string} title - Panel title
 * @param {string} icon - Optional emoji or icon
 * @param {boolean} defaultExpanded - Whether panel starts expanded
 * @param {ReactNode} children - Panel content
 * @param {string} position - CSS position string (e.g., "top: 10px; left: 10px")
 * @param {Function} onClose - Optional close handler (shows X button if provided)
 * @param {string} className - Additional CSS classes
 */
function CollapsibleFloatingPanel({
  title,
  icon,
  defaultExpanded = false, // Default closed for desktop UI cleanup
  children,
  position = '',
  onClose,
  className = ''
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div
      className={`collapsible-floating-panel ${isExpanded ? 'expanded' : ''} ${className}`}
      style={position ? { position: 'fixed', ...parsePositionStyle(position) } : {}}
    >
      <div className="floating-panel-header">
        <button
          className="floating-panel-toggle"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
          title={isExpanded ? 'Collapse panel' : 'Expand panel'}
        >
          <span className="floating-toggle-icon">
            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </span>
          {icon && <span className="floating-icon">{icon}</span>}
          <h3 className="floating-title">{title}</h3>
        </button>

        {onClose && (
          <button
            className="floating-panel-close"
            onClick={onClose}
            aria-label="Close panel"
            title="Close panel"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="floating-panel-content">
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * Parse position string into style object
 * e.g., "top: 10px; left: 20px" => { top: '10px', left: '20px' }
 */
function parsePositionStyle(positionString) {
  const style = {};
  const pairs = positionString.split(';').filter(s => s.trim());

  pairs.forEach(pair => {
    const [key, value] = pair.split(':').map(s => s.trim());
    if (key && value) {
      style[key] = value;
    }
  });

  return style;
}

export default CollapsibleFloatingPanel;
