/**
 * Button.jsx - Reusable button component
 *
 * Features:
 * - Multiple variants (primary, secondary, danger, success, warning)
 * - Loading state
 * - Disabled state
 * - Icon support
 * - Size variants
 */

import React from 'react';
import './Button.css';

/**
 * Button component
 * @param {Object} props
 * @param {React.ReactNode} props.children - Button content
 * @param {Function} props.onClick - Click handler
 * @param {string} props.variant - Button variant: 'primary', 'secondary', 'danger', 'success', 'warning', 'ghost', 'outline' (default: 'primary')
 * @param {string} props.size - Button size: 'small', 'medium', 'large' (default: 'medium')
 * @param {boolean} props.disabled - Disabled state
 * @param {boolean} props.loading - Loading state
 * @param {string} props.icon - Icon to display (optional)
 * @param {string} props.iconPosition - Icon position: 'left', 'right' (default: 'left')
 * @param {string} props.type - Button type: 'button', 'submit', 'reset' (default: 'button')
 * @param {string} props.className - Additional CSS classes
 */
function Button({
  children,
  onClick = () => {},
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon = null,
  iconPosition = 'left',
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
      className={`btn btn-${variant} btn-${size} ${isDisabled ? 'btn-disabled' : ''} ${loading ? 'btn-loading' : ''} ${className}`}
      onClick={handleClick}
      disabled={isDisabled}
      {...rest}
    >
      {loading && (
        <span className="btn-spinner" aria-hidden="true">
          ⏳
        </span>
      )}

      {!loading && icon && iconPosition === 'left' && (
        <span className="btn-icon btn-icon-left" aria-hidden="true">
          {icon}
        </span>
      )}

      <span className="btn-text">{children}</span>

      {!loading && icon && iconPosition === 'right' && (
        <span className="btn-icon btn-icon-right" aria-hidden="true">
          {icon}
        </span>
      )}
    </button>
  );
}

export default Button;
