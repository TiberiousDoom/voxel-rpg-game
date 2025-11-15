/**
 * CameraController.jsx - Camera controls for game viewport
 *
 * Features:
 * - Pan camera with mouse drag
 * - Zoom in/out with mouse wheel
 * - Double-click to center on position
 * - Keyboard arrow keys for panning
 * - Reset view button
 * - Zoom limits and smooth transitions
 * - Touch support for mobile
 *
 * Usage:
 * <CameraController
 *   onCameraChange={handleCameraChange}
 *   initialPosition={{ x: 0, y: 0 }}
 *   initialZoom={1.0}
 * />
 */

import React, { useRef, useCallback, useEffect } from 'react';
import useCameraControls from '../hooks/useCameraControls';
import './CameraController.css';

/**
 * CameraController component
 * @param {Object} props
 * @param {Function} props.onCameraChange - Callback when camera changes
 * @param {Object} props.initialPosition - Initial camera position {x, y}
 * @param {number} props.initialZoom - Initial zoom level (default: 1.0)
 * @param {number} props.minZoom - Minimum zoom level (default: 0.5)
 * @param {number} props.maxZoom - Maximum zoom level (default: 3.0)
 * @param {number} props.panSpeed - Pan speed multiplier (default: 1.0)
 * @param {number} props.zoomSpeed - Zoom speed multiplier (default: 0.1)
 * @param {boolean} props.enableKeyboard - Enable keyboard controls (default: true)
 * @param {boolean} props.enableMouse - Enable mouse controls (default: true)
 * @param {boolean} props.enableTouch - Enable touch controls (default: true)
 * @param {React.RefObject} props.containerRef - Ref to container element
 */
function CameraController({
  onCameraChange = () => {},
  initialPosition = { x: 0, y: 0 },
  initialZoom = 1.0,
  minZoom = 0.5,
  maxZoom = 3.0,
  panSpeed = 1.0,
  zoomSpeed = 0.1,
  enableKeyboard = true,
  enableMouse = true,
  enableTouch = true,
  containerRef = null
}) {
  const controlsRef = useRef(null);

  const {
    position,
    zoom,
    isDragging,
    pan,
    setZoom,
    resetCamera,
    centerOn
  } = useCameraControls({
    initialPosition,
    initialZoom,
    minZoom,
    maxZoom,
    panSpeed,
    zoomSpeed,
    onCameraChange
  });

  /**
   * Handle mouse wheel zoom
   */
  const handleWheel = useCallback((event) => {
    if (!enableMouse) return;

    event.preventDefault();
    const delta = -Math.sign(event.deltaY) * zoomSpeed;
    const newZoom = Math.max(minZoom, Math.min(maxZoom, zoom + delta));
    setZoom(newZoom);
  }, [enableMouse, zoom, zoomSpeed, minZoom, maxZoom, setZoom]);

  /**
   * Handle mouse drag
   */
  const handleMouseDown = useCallback((event) => {
    if (!enableMouse || event.button !== 0) return;

    const startX = event.clientX;
    const startY = event.clientY;
    const startPos = { ...position };

    const handleMouseMove = (e) => {
      const deltaX = (e.clientX - startX) * panSpeed;
      const deltaY = (e.clientY - startY) * panSpeed;

      pan({
        x: startPos.x + deltaX,
        y: startPos.y + deltaY
      });
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [enableMouse, position, panSpeed, pan]);

  /**
   * Handle double-click to center
   */
  const handleDoubleClick = useCallback((event) => {
    if (!enableMouse) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Convert screen coordinates to world coordinates
    const worldX = (x - rect.width / 2) / zoom + position.x;
    const worldY = (y - rect.height / 2) / zoom + position.y;

    centerOn({ x: worldX, y: worldY });
  }, [enableMouse, zoom, position, centerOn]);

  /**
   * Handle keyboard controls
   */
  useEffect(() => {
    if (!enableKeyboard) return;

    const handleKeyDown = (event) => {
      const step = 10 * panSpeed;

      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault();
          pan({ x: position.x, y: position.y - step });
          break;
        case 'ArrowDown':
          event.preventDefault();
          pan({ x: position.x, y: position.y + step });
          break;
        case 'ArrowLeft':
          event.preventDefault();
          pan({ x: position.x - step, y: position.y });
          break;
        case 'ArrowRight':
          event.preventDefault();
          pan({ x: position.x + step, y: position.y });
          break;
        case '+':
        case '=':
          event.preventDefault();
          setZoom(Math.min(maxZoom, zoom + zoomSpeed));
          break;
        case '-':
        case '_':
          event.preventDefault();
          setZoom(Math.max(minZoom, zoom - zoomSpeed));
          break;
        case '0':
          event.preventDefault();
          resetCamera();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enableKeyboard, position, zoom, panSpeed, zoomSpeed, minZoom, maxZoom, pan, setZoom, resetCamera]);

  /**
   * Handle touch controls for mobile
   */
  useEffect(() => {
    if (!enableTouch || !containerRef?.current) return;

    const container = containerRef.current;
    let touchStartDistance = 0;
    let touchStartZoom = zoom;

    const handleTouchStart = (event) => {
      if (event.touches.length === 2) {
        // Pinch zoom
        const touch1 = event.touches[0];
        const touch2 = event.touches[1];
        touchStartDistance = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY
        );
        touchStartZoom = zoom;
      }
    };

    const handleTouchMove = (event) => {
      if (event.touches.length === 2) {
        event.preventDefault();

        const touch1 = event.touches[0];
        const touch2 = event.touches[1];
        const distance = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY
        );

        const scale = distance / touchStartDistance;
        const newZoom = Math.max(minZoom, Math.min(maxZoom, touchStartZoom * scale));
        setZoom(newZoom);
      }
    };

    container.addEventListener('touchstart', handleTouchStart);
    container.addEventListener('touchmove', handleTouchMove);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
    };
  }, [enableTouch, containerRef, zoom, minZoom, maxZoom, setZoom]);

  return (
    <div
      ref={controlsRef}
      className={`camera-controller ${isDragging ? 'dragging' : ''}`}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
    >
      {/* Camera Controls UI */}
      <div className="camera-controls-panel">
        {/* Zoom Controls */}
        <div className="camera-control-group">
          <button
            className="camera-control-button"
            onClick={() => setZoom(Math.min(maxZoom, zoom + zoomSpeed))}
            aria-label="Zoom in"
            title="Zoom in (+)"
          >
            +
          </button>
          <span className="camera-zoom-display">
            {Math.round(zoom * 100)}%
          </span>
          <button
            className="camera-control-button"
            onClick={() => setZoom(Math.max(minZoom, zoom - zoomSpeed))}
            aria-label="Zoom out"
            title="Zoom out (-)"
          >
            −
          </button>
        </div>

        {/* Reset Button */}
        <button
          className="camera-control-button camera-reset-button"
          onClick={resetCamera}
          aria-label="Reset camera"
          title="Reset view (0)"
        >
          ⟲
        </button>

        {/* Position Display (optional debug info) */}
        <div className="camera-position-display">
          <span className="camera-position-label">
            X: {Math.round(position.x)} Y: {Math.round(position.y)}
          </span>
        </div>
      </div>

      {/* Help Text */}
      <div className="camera-help-text">
        <p>🖱️ Drag to pan • Scroll to zoom • Double-click to center</p>
        <p>⌨️ Arrow keys to pan • +/- to zoom • 0 to reset</p>
      </div>
    </div>
  );
}

export default CameraController;
