/**
 * Toast.test.js - Tests for Toast notification system
 *
 * Test scenarios:
 * - Toast rendering
 * - Auto-dismiss functionality
 * - Multiple toast stacking
 * - Type variants
 * - Position variants
 * - Close functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import Toast from '../Toast';
import Notification from '../Notification';
import useToast from '../../../hooks/useToast';
import { renderHook } from '@testing-library/react';

describe('Notification Component', () => {
  const defaultProps = {
    id: 'test-1',
    type: 'info',
    message: 'Test message',
    duration: 0,
    onClose: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Rendering', () => {
    it('should render with message', () => {
      render(<Notification {...defaultProps} />);
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });

    it('should render with title and message', () => {
      render(<Notification {...defaultProps} title="Test Title" />);
      expect(screen.getByText('Test Title')).toBeInTheDocument();
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });

    it('should render with correct type classes', () => {
      const { rerender } = render(<Notification {...defaultProps} type="success" />);
      expect(screen.getByRole('alert')).toHaveClass('notification-success');

      rerender(<Notification {...defaultProps} type="error" />);
      expect(screen.getByRole('alert')).toHaveClass('notification-error');

      rerender(<Notification {...defaultProps} type="warning" />);
      expect(screen.getByRole('alert')).toHaveClass('notification-warning');

      rerender(<Notification {...defaultProps} type="info" />);
      expect(screen.getByRole('alert')).toHaveClass('notification-info');
    });

    it('should render with custom icon', () => {
      render(<Notification {...defaultProps} icon="🎉" />);
      expect(screen.getByText('🎉')).toBeInTheDocument();
    });
  });

  describe('Close Functionality', () => {
    it('should call onClose when close button is clicked', () => {
      const onClose = jest.fn();
      render(<Notification {...defaultProps} onClose={onClose} />);

      const closeButton = screen.getByLabelText('Close notification');
      fireEvent.click(closeButton);

      expect(onClose).toHaveBeenCalledWith('test-1');
    });
  });

  describe('Auto-dismiss', () => {
    it('should auto-dismiss after duration', async () => {
      const onClose = jest.fn();
      render(<Notification {...defaultProps} duration={3000} onClose={onClose} />);

      act(() => {
        jest.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        expect(onClose).toHaveBeenCalledWith('test-1');
      });
    });

    it('should not auto-dismiss when duration is 0', () => {
      const onClose = jest.fn();
      render(<Notification {...defaultProps} duration={0} onClose={onClose} />);

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(onClose).not.toHaveBeenCalled();
    });

    it('should show progress bar when showProgress is true', () => {
      render(<Notification {...defaultProps} duration={3000} showProgress={true} />);
      expect(document.querySelector('.notification-progress')).toBeInTheDocument();
    });

    it('should not show progress bar when showProgress is false', () => {
      render(<Notification {...defaultProps} duration={3000} showProgress={false} />);
      expect(document.querySelector('.notification-progress')).not.toBeInTheDocument();
    });
  });
});

describe('Toast Container', () => {
  const notifications = [
    { id: '1', type: 'success', message: 'Success message', duration: 0 },
    { id: '2', type: 'error', message: 'Error message', duration: 0 },
    { id: '3', type: 'info', message: 'Info message', duration: 0 }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render multiple notifications', () => {
      render(<Toast notifications={notifications} onClose={jest.fn()} />);

      expect(screen.getByText('Success message')).toBeInTheDocument();
      expect(screen.getByText('Error message')).toBeInTheDocument();
      expect(screen.getByText('Info message')).toBeInTheDocument();
    });

    it('should not render when notifications array is empty', () => {
      const { container } = render(<Toast notifications={[]} onClose={jest.fn()} />);
      expect(container.firstChild).toBeNull();
    });

    it('should apply correct position classes', () => {
      const { rerender } = render(
        <Toast notifications={notifications} onClose={jest.fn()} position="top-right" />
      );
      expect(document.querySelector('.toast-top-right')).toBeInTheDocument();

      rerender(<Toast notifications={notifications} onClose={jest.fn()} position="bottom-left" />);
      expect(document.querySelector('.toast-bottom-left')).toBeInTheDocument();
    });

    it('should limit notifications to maxNotifications', () => {
      const manyNotifications = Array.from({ length: 10 }, (_, i) => ({
        id: `${i}`,
        type: 'info',
        message: `Message ${i}`,
        duration: 0
      }));

      render(<Toast notifications={manyNotifications} onClose={jest.fn()} maxNotifications={5} />);

      // Should only show last 5
      expect(screen.queryByText('Message 0')).not.toBeInTheDocument();
      expect(screen.queryByText('Message 4')).not.toBeInTheDocument();
      expect(screen.getByText('Message 5')).toBeInTheDocument();
      expect(screen.getByText('Message 9')).toBeInTheDocument();
    });
  });
});

describe('useToast Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with empty notifications', () => {
    const { result } = renderHook(() => useToast());
    expect(result.current.notifications).toEqual([]);
  });

  it('should add notification when showToast is called', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showToast({
        type: 'success',
        message: 'Test toast'
      });
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].message).toBe('Test toast');
    expect(result.current.notifications[0].type).toBe('success');
  });

  it('should remove notification when hideToast is called', () => {
    const { result } = renderHook(() => useToast());

    let toastId;
    act(() => {
      toastId = result.current.showToast({
        type: 'info',
        message: 'Test toast'
      });
    });

    expect(result.current.notifications).toHaveLength(1);

    act(() => {
      result.current.hideToast(toastId);
    });

    expect(result.current.notifications).toHaveLength(0);
  });

  it('should clear all notifications when clearAll is called', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showToast({ type: 'success', message: 'Toast 1' });
      result.current.showToast({ type: 'error', message: 'Toast 2' });
      result.current.showToast({ type: 'info', message: 'Toast 3' });
    });

    expect(result.current.notifications).toHaveLength(3);

    act(() => {
      result.current.clearAll();
    });

    expect(result.current.notifications).toHaveLength(0);
  });

  it('should have convenience methods for different types', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.success('Success message');
      result.current.error('Error message');
      result.current.info('Info message');
      result.current.warning('Warning message');
    });

    expect(result.current.notifications).toHaveLength(4);
    expect(result.current.notifications[0].type).toBe('success');
    expect(result.current.notifications[1].type).toBe('error');
    expect(result.current.notifications[2].type).toBe('info');
    expect(result.current.notifications[3].type).toBe('warning');
  });
});
