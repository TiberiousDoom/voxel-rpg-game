import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import './CollapsibleSection.css';

/**
 * CollapsibleSection Component
 * Reusable accordion section for sidebar panels
 */
function CollapsibleSection({
  title,
  icon,
  badge,
  children,
  defaultExpanded = false,
  className = ''
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className={`collapsible-section ${className}`}>
      <button
        className="section-header"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        <div className="section-title">
          {icon && <span className="section-icon">{icon}</span>}
          <span className="section-text">{title}</span>
          {badge && <span className="section-badge">{badge}</span>}
        </div>
        <span className="section-toggle">
          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </span>
      </button>

      {isExpanded && (
        <div className="section-content">
          {children}
        </div>
      )}
    </div>
  );
}

export default CollapsibleSection;
