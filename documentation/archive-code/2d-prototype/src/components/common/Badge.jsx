/**
 * Badge.jsx - Badge/tag component for labels and counts
 *
 * Features:
 * - Multiple variants (default, success, warning, danger, info)
 * - Size options
 * - Optional dot indicator
 * - Closable badges
 */

import React from 'react';
import { X } from 'lucide-react';
import './Badge.css';

/**
 * Badge component
 * @param {Object} props
 * @param {React.ReactNode} props.children - Badge content
 * @param {string} props.variant - Badge variant: 'default', 'success', 'warning', 'danger', 'info', 'accent' (default: 'default')
 * @param {string} props.size - Badge size: 'small', 'medium' (default: 'medium')
 * @param {boolean} props.dot - Shows a dot indicator instead of content
 * @param {boolean} props.closable - Shows close button
 * @param {Function} props.onClose - Close handler
 * @param {string} props.className - Additional CSS classes
 */
function Badge({
  children,
  variant = 'default',
  size = 'medium',
  dot = false,
  closable = false,
  onClose,
  className = '',
  ...rest
}) {
  if (dot) {
    return (
      <span
        className={`badge-dot badge-dot-${variant} ${className}`}
        aria-hidden="true"
        {...rest}
      />
    );
  }

  return (
    <span
      className={`badge badge-${variant} badge-${size} ${className}`}
      {...rest}
    >
      <span className="badge-text">{children}</span>
      {closable && (
        <button
          type="button"
          className="badge-close"
          onClick={onClose}
          aria-label="Remove"
        >
          <X size={12} />
        </button>
      )}
    </span>
  );
}

/**
 * BadgeGroup - Container for multiple badges
 */
function BadgeGroup({ children, className = '', ...rest }) {
  return (
    <div className={`badge-group ${className}`} {...rest}>
      {children}
    </div>
  );
}

Badge.Group = BadgeGroup;

export default Badge;
