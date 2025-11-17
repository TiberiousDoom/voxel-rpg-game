import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

/**
 * ModalWrapper - Reusable modal container for centered menu panels
 * Matches the styling pattern of InventoryUI
 *
 * @param {boolean} isOpen - Whether the modal is visible
 * @param {function} onClose - Callback when modal is closed
 * @param {string} title - Modal title
 * @param {React.Node} icon - Optional icon component
 * @param {React.Node} children - Modal content
 * @param {string} maxWidth - Maximum width (default: '1200px')
 * @param {boolean} showCloseButton - Show X button (default: true)
 * @param {string} escapeKey - Key to close modal (default: 'Escape')
 */
const ModalWrapper = ({
  isOpen,
  onClose,
  title,
  icon,
  children,
  maxWidth = '1200px',
  showCloseButton = true,
  escapeKey = 'Escape',
}) => {
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ESC key handler
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyPress = (e) => {
      if (e.key === escapeKey && isOpen) {
        // Don't close if typing in input/textarea
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
          return;
        }
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isOpen, onClose, escapeKey]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(0, 0, 0, 0.85)',
        zIndex: 2000,
        display: 'flex',
        alignItems: isMobile ? 'stretch' : 'center',
        justifyContent: 'center',
        padding: isMobile ? '0' : '20px',
      }}
      onClick={(e) => {
        // Close when clicking backdrop (desktop only)
        if (!isMobile && e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          borderRadius: isMobile ? '0' : '20px',
          maxWidth: isMobile ? '100%' : maxWidth,
          width: '100%',
          maxHeight: isMobile ? '100%' : '90vh',
          height: isMobile ? '100%' : 'auto',
          overflow: 'hidden',
          border: isMobile ? 'none' : '2px solid #4a5568',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: isMobile ? '15px 20px' : '20px 30px',
            borderBottom: '2px solid #4a5568',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(0, 0, 0, 0.2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {icon && (
              <span style={{ fontSize: isMobile ? '24px' : '28px' }}>
                {icon}
              </span>
            )}
            <h2
              style={{
                margin: 0,
                color: '#e2e8f0',
                fontSize: isMobile ? '20px' : '24px',
                fontWeight: 700,
              }}
            >
              {title}
            </h2>
          </div>
          {showCloseButton && (
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                padding: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
                color: '#e2e8f0',
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.1)';
              }}
            >
              <X size={isMobile ? 20 : 24} />
            </button>
          )}
        </div>

        {/* Content - Scrollable with improved visibility */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            maxHeight: '80vh', // Improved scrollable container
            minHeight: '60px', // Ensures readability even when compressed
            padding: isMobile ? '15px' : '20px',
          }}
        >
          {children}
        </div>

        {/* Footer hint */}
        <div
          style={{
            padding: isMobile ? '10px 15px' : '12px 20px',
            borderTop: '1px solid #4a5568',
            background: 'rgba(0, 0, 0, 0.2)',
            color: '#94a3b8',
            fontSize: isMobile ? '11px' : '12px',
            textAlign: 'center',
            fontStyle: 'italic',
          }}
        >
          Press ESC or click outside to close
        </div>
      </div>
    </div>
  );
};

export default ModalWrapper;
