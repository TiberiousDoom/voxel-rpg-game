/**
 * Modal.jsx - Reusable modal component with backdrop
 *
 * Features:
 * - Smooth enter/exit animations
 * - Focus trap for accessibility
 * - Backdrop click to close (optional)
 * - ESC key to close (optional)
 * - Portal rendering
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import './Modal.css';

/**
 * Modal component
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether modal is visible
 * @param {Function} props.onClose - Close callback
 * @param {string} props.title - Modal title
 * @param {React.ReactNode} props.children - Modal content
 * @param {boolean} props.showCloseButton - Show close button (default: true)
 * @param {boolean} props.closeOnBackdropClick - Close on backdrop click (default: true)
 * @param {boolean} props.closeOnEsc - Close on ESC key (default: true)
 * @param {string} props.size - Modal size: 'small', 'medium', 'large' (default: 'medium')
 * @param {string} props.className - Additional CSS classes
 */
function Modal({
  isOpen = false,
  onClose = () => {},
  title = '',
  children,
  showCloseButton = true,
  closeOnBackdropClick = true,
  closeOnEsc = true,
  size = 'medium',
  className = ''
}) {
  const modalRef = useRef(null);
  const previousActiveElement = useRef(null);

  // Handle ESC key press
  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Escape' && closeOnEsc && isOpen) {
      onClose();
    }
  }, [closeOnEsc, isOpen, onClose]);

  // Handle backdrop click
  const handleBackdropClick = useCallback((event) => {
    if (closeOnBackdropClick && event.target === event.currentTarget) {
      onClose();
    }
  }, [closeOnBackdropClick, onClose]);

  // Focus trap implementation
  useEffect(() => {
    if (!isOpen) return;

    // Store previously focused element
    previousActiveElement.current = document.activeElement;

    // Focus modal on open
    if (modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      }

      // Trap focus within modal
      const handleTabKey = (e) => {
        if (e.key !== 'Tab') return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      };

      modalRef.current.addEventListener('keydown', handleTabKey);

      return () => {
        if (modalRef.current) {
          modalRef.current.removeEventListener('keydown', handleTabKey);
        }
        // Restore focus to previous element
        if (previousActiveElement.current) {
          previousActiveElement.current.focus();
        }
      };
    }
  }, [isOpen]);

  // Add ESC key listener
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
      };
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const modalContent = (
    <div
      className={`modal-backdrop ${isOpen ? 'visible' : ''}`}
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        ref={modalRef}
        className={`modal-content modal-${size} ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="modal-header">
            {title && (
              <h2 id="modal-title" className="modal-title">
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                type="button"
                className="modal-close-button"
                onClick={onClose}
                aria-label="Close modal"
              >
                <span aria-hidden="true">×</span>
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );

  // Render in portal (at document.body level)
  return createPortal(modalContent, document.body);
}

export default Modal;
