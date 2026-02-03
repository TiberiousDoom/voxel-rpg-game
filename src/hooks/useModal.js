/**
 * useModal.js - Custom hook for managing modal state
 *
 * Features:
 * - Open/close modal
 * - Modal content management
 * - Callback handling
 *
 * @returns {Object} Modal state and control functions
 */

import { useState, useCallback } from 'react';

/**
 * Custom hook for modal management
 * @returns {Object} { isOpen, modalContent, showModal, hideModal, modalProps }
 */
function useModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [modalContent, setModalContent] = useState(null);
  const [modalProps, setModalProps] = useState({});

  /**
   * Show modal with content and props
   * @param {Object} config - Modal configuration
   * @param {string} config.title - Modal title
   * @param {React.ReactNode} config.content - Modal content
   * @param {Function} config.onConfirm - Confirm callback
   * @param {Function} config.onCancel - Cancel callback
   * @param {string} config.size - Modal size ('small', 'medium', 'large')
   * @param {boolean} config.showCloseButton - Show close button
   * @param {boolean} config.closeOnBackdropClick - Close on backdrop click
   * @param {boolean} config.closeOnEsc - Close on ESC key
   */
  const showModal = useCallback((config = {}) => {
    const {
      title = '',
      content = null,
      onConfirm = null,
      onCancel = null,
      size = 'medium',
      showCloseButton = true,
      closeOnBackdropClick = true,
      closeOnEsc = true,
      ...rest
    } = config;

    setModalContent(content);
    setModalProps({
      title,
      size,
      showCloseButton,
      closeOnBackdropClick,
      closeOnEsc,
      onConfirm,
      onCancel,
      ...rest
    });
    setIsOpen(true);
  }, []);

  /**
   * Hide modal
   */
  const hideModal = useCallback(() => {
    setIsOpen(false);
    // Clear content after animation completes
    setTimeout(() => {
      setModalContent(null);
      setModalProps({});
    }, 300);
  }, []);

  /**
   * Handle confirm action
   */
  const handleConfirm = useCallback(() => {
    if (modalProps.onConfirm) {
      modalProps.onConfirm();
    }
    hideModal();
  }, [modalProps, hideModal]);

  /**
   * Handle cancel action
   */
  const handleCancel = useCallback(() => {
    if (modalProps.onCancel) {
      modalProps.onCancel();
    }
    hideModal();
  }, [modalProps, hideModal]);

  return {
    isOpen,
    modalContent,
    modalProps,
    showModal,
    hideModal,
    handleConfirm,
    handleCancel
  };
}

export default useModal;
