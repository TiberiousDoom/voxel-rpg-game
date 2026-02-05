/**
 * Device detection utilities
 */

// Check if device has touch capability
export const isTouchDevice = () => {
  if (typeof window === 'undefined') return false;
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    navigator.msMaxTouchPoints > 0
  );
};

// Check if device is likely a mobile device (phone/tablet)
export const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;

  // Check user agent for mobile indicators
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;

  // Also check screen size as a fallback
  const isSmallScreen = window.innerWidth <= 768;

  return mobileRegex.test(userAgent.toLowerCase()) || (isTouchDevice() && isSmallScreen);
};

// Check if pointer lock is supported
export const supportsPointerLock = () => {
  if (typeof document === 'undefined') return false;
  return 'pointerLockElement' in document ||
         'mozPointerLockElement' in document ||
         'webkitPointerLockElement' in document;
};
