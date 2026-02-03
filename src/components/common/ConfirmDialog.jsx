/**
 * ConfirmDialog.jsx - Confirmation dialog component
 *
 * Features:
 * - Customizable message
 * - Confirm/Cancel buttons
 * - Icon support
 * - Type variants (danger, warning, info)
 */

import React from 'react';
import Button from './Button';
import './ConfirmDialog.css';

/**
 * ConfirmDialog component
 * @param {Object} props
 * @param {string} props.message - Confirmation message
 * @param {string} props.description - Additional description (optional)
 * @param {Function} props.onConfirm - Confirm callback
 * @param {Function} props.onCancel - Cancel callback
 * @param {string} props.confirmText - Confirm button text (default: 'Confirm')
 * @param {string} props.cancelText - Cancel button text (default: 'Cancel')
 * @param {string} props.type - Dialog type: 'danger', 'warning', 'info' (default: 'info')
 * @param {string} props.icon - Icon to display (optional)
 */
function ConfirmDialog({
  message = 'Are you sure?',
  description = '',
  onConfirm = () => {},
  onCancel = () => {},
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'info',
  icon = null
}) {
  // Default icons based on type
  const defaultIcons = {
    danger: '⚠️',
    warning: '⚡',
    info: 'ℹ️'
  };

  const displayIcon = icon || defaultIcons[type] || defaultIcons.info;

  return (
    <div className={`confirm-dialog confirm-dialog-${type}`}>
      {/* Icon */}
      {displayIcon && (
        <div className="confirm-dialog-icon">
          {displayIcon}
        </div>
      )}

      {/* Message */}
      <div className="confirm-dialog-content">
        <h3 className="confirm-dialog-message">{message}</h3>
        {description && (
          <p className="confirm-dialog-description">{description}</p>
        )}
      </div>

      {/* Actions */}
      <div className="confirm-dialog-actions">
        <Button
          variant="secondary"
          onClick={onCancel}
        >
          {cancelText}
        </Button>
        <Button
          variant={type === 'danger' ? 'danger' : 'primary'}
          onClick={onConfirm}
        >
          {confirmText}
        </Button>
      </div>
    </div>
  );
}

export default ConfirmDialog;
