import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import './CollapsibleSection.css';

/**
 * CollapsibleSection Component
 * Reusable accordion-style section for sidebar panels
 *
 * @param {string} title - Section title
 * @param {string} icon - Optional emoji or icon
 * @param {string|number} badge - Optional badge content (e.g., count, status)
 * @param {boolean} defaultExpanded - Whether section starts expanded
 * @param {ReactNode} children - Section content
 */
function CollapsibleSection({
  title,
  icon,
  badge,
  defaultExpanded = true,
  children,
  className = ''
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className={`collapsible-section ${isExpanded ? 'expanded' : ''} ${className}`}>
      <button
        className="collapsible-header"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        <div className="collapsible-header-left">
          <span className="collapsible-toggle-icon">
            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </span>
          {icon && <span className="collapsible-icon">{icon}</span>}
          <h3 className="collapsible-title">{title}</h3>
        </div>
        {badge !== undefined && badge !== null && (
          <span className="collapsible-badge">{badge}</span>
        )}
      </button>

      {isExpanded && (
        <div className="collapsible-content">
          {children}
        </div>
      )}
    </div>
  );
}

export default CollapsibleSection;
