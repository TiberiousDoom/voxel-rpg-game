/**
 * Card.jsx - Reusable card container component
 *
 * Features:
 * - Multiple variants (default, elevated, outlined)
 * - Optional header and footer
 * - Clickable state
 * - Padding options
 */

import React from 'react';
import './Card.css';

/**
 * Card component
 * @param {Object} props
 * @param {React.ReactNode} props.children - Card content
 * @param {string} props.variant - Card variant: 'default', 'elevated', 'outlined' (default: 'default')
 * @param {string} props.padding - Padding size: 'none', 'small', 'medium', 'large' (default: 'medium')
 * @param {boolean} props.clickable - Makes card interactive with hover states
 * @param {boolean} props.selected - Shows selected state
 * @param {Function} props.onClick - Click handler
 * @param {string} props.className - Additional CSS classes
 * @param {React.ReactNode} props.header - Optional header content
 * @param {React.ReactNode} props.footer - Optional footer content
 */
function Card({
  children,
  variant = 'default',
  padding = 'medium',
  clickable = false,
  selected = false,
  onClick,
  className = '',
  header,
  footer,
  ...rest
}) {
  const handleClick = (e) => {
    if (clickable && onClick) {
      onClick(e);
    }
  };

  const handleKeyDown = (e) => {
    if (clickable && onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick(e);
    }
  };

  return (
    <div
      className={`card card-${variant} card-padding-${padding} ${clickable ? 'card-clickable' : ''} ${selected ? 'card-selected' : ''} ${className}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={clickable ? 0 : undefined}
      role={clickable ? 'button' : undefined}
      {...rest}
    >
      {header && <div className="card-header">{header}</div>}
      <div className="card-content">{children}</div>
      {footer && <div className="card-footer">{footer}</div>}
    </div>
  );
}

/**
 * CardHeader - Subcomponent for card headers
 */
function CardHeader({ children, className = '', ...rest }) {
  return (
    <div className={`card-header ${className}`} {...rest}>
      {children}
    </div>
  );
}

/**
 * CardTitle - Subcomponent for card titles
 */
function CardTitle({ children, className = '', as: Tag = 'h3', ...rest }) {
  return (
    <Tag className={`card-title ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

/**
 * CardDescription - Subcomponent for card descriptions
 */
function CardDescription({ children, className = '', ...rest }) {
  return (
    <p className={`card-description ${className}`} {...rest}>
      {children}
    </p>
  );
}

/**
 * CardFooter - Subcomponent for card footers
 */
function CardFooter({ children, className = '', ...rest }) {
  return (
    <div className={`card-footer ${className}`} {...rest}>
      {children}
    </div>
  );
}

// Export subcomponents
Card.Header = CardHeader;
Card.Title = CardTitle;
Card.Description = CardDescription;
Card.Footer = CardFooter;

export default Card;
