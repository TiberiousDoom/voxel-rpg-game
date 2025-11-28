/**
 * IconButton.jsx - Icon-only button component
 *
 * Features:
 * - Icon-only display
 * - Multiple variants
 * - Tooltip support
 * - Size variants
 * - Loading/disabled states
 */

import React from 'react';
import './IconButton.css';

/**
 * IconButton component
 * @param {Object} props
 * @param {string} props.icon - Icon to display
 * @param {Function} props.onClick - Click handler
 * @param {string} props.variant - Button variant: 'primary', 'secondary', 'danger', 'success', 'warning', 'ghost' (default: 'ghost')
 * @param {string} props.size - Button size: 'small', 'medium', 'large' (default: 'medium')
 * @param {boolean} props.disabled - Disabled state
 * @param {boolean} props.loading - Loading state
 * @param {string} props.ariaLabel - Accessibility label (required)
 * @param {string} props.tooltip - Tooltip text (optional)
 * @param {string} props.type - Button type: 'button', 'submit', 'reset' (default: 'button')
 * @param {string} props.className - Additional CSS classes
 */
function IconButton({
  icon,
  onClick = () => {},
  variant = 'ghost',
  size = 'medium',
  disabled = false,
  loading = false,
  ariaLabel,
  tooltip = '',
  type = 'button',
  className = '',
  ...rest
}) {
  const isDisabled = disabled || loading;

  const handleClick = (e) => {
    if (!isDisabled) {
      onClick(e);
    }
  };

  return (
    <button
      type={type}
      className={`icon-btn icon-btn-${variant} icon-btn-${size} ${isDisabled ? 'icon-btn-disabled' : ''} ${loading ? 'icon-btn-loading' : ''} ${className}`}
      onClick={handleClick}
      disabled={isDisabled}
      aria-label={ariaLabel}
      title={tooltip || ariaLabel}
      {...rest}
    >
      {loading ? (
        <span className="icon-btn-spinner" aria-hidden="true">
          ⏳
        </span>
      ) : (
        <span className="icon-btn-icon" aria-hidden="true">
          {icon}
        </span>
      )}
    </button>
  );
}

export default IconButton;
