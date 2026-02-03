/**
 * SlidePanel.jsx - Unified slide-up panel component
 *
 * Features:
 * - Slides up from bottom of screen
 * - Three height states: collapsed, half, full
 * - Touch gesture support for mobile
 * - Drag handle for resizing
 * - Backdrop click to close
 * - Keyboard accessible (ESC to close)
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { X, ChevronUp, ChevronDown, GripHorizontal } from 'lucide-react';
import { IconButton } from '../common';
import './SlidePanel.css';

/**
 * SlidePanel component
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether panel is open
 * @param {Function} props.onClose - Close handler
 * @param {string} props.height - Panel height: 'collapsed', 'half', 'full' (default: 'half')
 * @param {Function} props.onHeightChange - Height change handler
 * @param {string} props.title - Panel title
 * @param {React.ReactNode} props.children - Panel content
 * @param {React.ReactNode} props.headerActions - Optional header actions
 * @param {boolean} props.showBackdrop - Show backdrop (default: true)
 * @param {boolean} props.closeOnBackdrop - Close on backdrop click (default: true)
 * @param {boolean} props.showDragHandle - Show drag handle for resizing (default: true)
 * @param {string} props.className - Additional CSS classes
 */
function SlidePanel({
  isOpen,
  onClose,
  height = 'half',
  onHeightChange,
  title,
  children,
  headerActions,
  showBackdrop = true,
  closeOnBackdrop = true,
  showDragHandle = true,
  className = '',
}) {
  const panelRef = useRef(null);
  const dragStartY = useRef(null);
  const initialHeight = useRef(null);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when panel is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Focus trap - focus panel when opened
  useEffect(() => {
    if (isOpen && panelRef.current) {
      panelRef.current.focus();
    }
  }, [isOpen]);

  // Toggle height between half and full
  const toggleHeight = useCallback(() => {
    if (onHeightChange) {
      const newHeight = height === 'full' ? 'half' : 'full';
      onHeightChange(newHeight);
    }
  }, [height, onHeightChange]);

  // Handle drag start
  const handleDragStart = (e) => {
    e.preventDefault();
    const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
    dragStartY.current = clientY;
    initialHeight.current = height;

    if (e.type === 'touchstart') {
      document.addEventListener('touchmove', handleDragMove, { passive: false });
      document.addEventListener('touchend', handleDragEnd);
    } else {
      document.addEventListener('mousemove', handleDragMove);
      document.addEventListener('mouseup', handleDragEnd);
    }
  };

  // Handle drag move
  const handleDragMove = useCallback((e) => {
    if (dragStartY.current === null) return;
    e.preventDefault();

    const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
    const deltaY = dragStartY.current - clientY;
    const threshold = 50;

    if (onHeightChange) {
      if (deltaY > threshold && initialHeight.current !== 'full') {
        onHeightChange('full');
      } else if (deltaY < -threshold && initialHeight.current !== 'collapsed') {
        if (initialHeight.current === 'full') {
          onHeightChange('half');
        } else {
          onClose();
        }
      }
    }
  }, [onHeightChange, onClose]);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    dragStartY.current = null;
    initialHeight.current = null;
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
    document.removeEventListener('touchmove', handleDragMove);
    document.removeEventListener('touchend', handleDragEnd);
  }, [handleDragMove]);

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (closeOnBackdrop && e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="slide-panel-container">
      {/* Backdrop */}
      {showBackdrop && (
        <div
          className={`slide-panel-backdrop ${height === 'full' ? 'slide-panel-backdrop-dark' : ''}`}
          onClick={handleBackdropClick}
          aria-hidden="true"
        />
      )}

      {/* Panel */}
      <div
        ref={panelRef}
        className={`slide-panel slide-panel-${height} ${className}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        {/* Drag Handle */}
        {showDragHandle && (
          <div
            className="slide-panel-drag-handle"
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
            role="slider"
            aria-label="Resize panel"
            aria-valuetext={`Panel height: ${height}`}
          >
            <GripHorizontal size={20} />
          </div>
        )}

        {/* Header */}
        <div className="slide-panel-header">
          <div className="slide-panel-header-content">
            {title && <h2 className="slide-panel-title">{title}</h2>}
            {headerActions && (
              <div className="slide-panel-header-actions">{headerActions}</div>
            )}
          </div>

          <div className="slide-panel-header-controls">
            {onHeightChange && (
              <IconButton
                icon={height === 'full' ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                onClick={toggleHeight}
                variant="ghost"
                size="small"
                ariaLabel={height === 'full' ? 'Minimize panel' : 'Maximize panel'}
              />
            )}
            <IconButton
              icon={<X size={20} />}
              onClick={onClose}
              variant="ghost"
              size="small"
              ariaLabel="Close panel"
            />
          </div>
        </div>

        {/* Content */}
        <div className="slide-panel-content">
          {children}
        </div>
      </div>
    </div>
  );
}

export default SlidePanel;
