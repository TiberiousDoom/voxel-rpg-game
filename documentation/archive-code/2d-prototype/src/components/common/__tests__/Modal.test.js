/**
 * Modal.test.js - Tests for Modal component
 *
 * Test scenarios:
 * - Modal rendering and visibility
 * - Close on ESC key
 * - Close on backdrop click
 * - Focus trap
 * - Portal rendering
 * - Accessibility
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Modal from '../Modal';

describe('Modal Component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    title: 'Test Modal',
    children: <div>Modal Content</div>
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render when isOpen is true', () => {
      render(<Modal {...defaultProps} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Test Modal')).toBeInTheDocument();
      expect(screen.getByText('Modal Content')).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      render(<Modal {...defaultProps} isOpen={false} />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should render without title', () => {
      render(<Modal {...defaultProps} title="" />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    });

    it('should apply correct size classes', () => {
      const { rerender } = render(<Modal {...defaultProps} size="small" />);
      expect(screen.getByRole('dialog')).toHaveClass('modal-small');

      rerender(<Modal {...defaultProps} size="medium" />);
      expect(screen.getByRole('dialog')).toHaveClass('modal-medium');

      rerender(<Modal {...defaultProps} size="large" />);
      expect(screen.getByRole('dialog')).toHaveClass('modal-large');
    });

    it('should apply custom className', () => {
      render(<Modal {...defaultProps} className="custom-class" />);
      expect(screen.getByRole('dialog')).toHaveClass('custom-class');
    });
  });

  describe('Close Functionality', () => {
    it('should call onClose when close button is clicked', () => {
      const onClose = jest.fn();
      render(<Modal {...defaultProps} onClose={onClose} />);

      const closeButton = screen.getByLabelText('Close modal');
      fireEvent.click(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when ESC key is pressed', () => {
      const onClose = jest.fn();
      render(<Modal {...defaultProps} onClose={onClose} closeOnEsc={true} />);

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should not call onClose when ESC is pressed if closeOnEsc is false', () => {
      const onClose = jest.fn();
      render(<Modal {...defaultProps} onClose={onClose} closeOnEsc={false} />);

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(onClose).not.toHaveBeenCalled();
    });

    it('should call onClose when backdrop is clicked', () => {
      const onClose = jest.fn();
      render(<Modal {...defaultProps} onClose={onClose} closeOnBackdropClick={true} />);

      const backdrop = screen.getByRole('presentation');
      fireEvent.click(backdrop);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should not call onClose when backdrop is clicked if closeOnBackdropClick is false', () => {
      const onClose = jest.fn();
      render(<Modal {...defaultProps} onClose={onClose} closeOnBackdropClick={false} />);

      const backdrop = screen.getByRole('presentation');
      fireEvent.click(backdrop);

      expect(onClose).not.toHaveBeenCalled();
    });

    it('should not close when modal content is clicked', () => {
      const onClose = jest.fn();
      render(<Modal {...defaultProps} onClose={onClose} />);

      const modalContent = screen.getByRole('dialog');
      fireEvent.click(modalContent);

      expect(onClose).not.toHaveBeenCalled();
    });

    it('should hide close button when showCloseButton is false', () => {
      render(<Modal {...defaultProps} showCloseButton={false} />);
      expect(screen.queryByLabelText('Close modal')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<Modal {...defaultProps} />);

      const modal = screen.getByRole('dialog');
      expect(modal).toHaveAttribute('aria-modal', 'true');
      expect(modal).toHaveAttribute('aria-labelledby', 'modal-title');
    });

    it('should prevent body scroll when open', () => {
      render(<Modal {...defaultProps} />);
      expect(document.body.style.overflow).toBe('hidden');
    });

    it('should restore body scroll when closed', () => {
      const { rerender } = render(<Modal {...defaultProps} />);
      expect(document.body.style.overflow).toBe('hidden');

      rerender(<Modal {...defaultProps} isOpen={false} />);
      expect(document.body.style.overflow).toBe('');
    });
  });

  describe('Focus Management', () => {
    it('should focus first focusable element when opened', async () => {
      render(
        <Modal {...defaultProps}>
          <button>First Button</button>
          <button>Second Button</button>
        </Modal>
      );

      await waitFor(() => {
        expect(screen.getByText('First Button')).toHaveFocus();
      });
    });
  });
});
