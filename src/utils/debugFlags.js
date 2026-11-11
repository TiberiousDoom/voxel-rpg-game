/**
 * debugFlags.js — Whether developer/QA tools are enabled.
 *
 * The dev overlay (F3, or the DEV button on touch devices) and the QA test tracker
 * (backtick) are always available in development builds. In production they
 * are hidden unless explicitly enabled with `?debug=1` in the URL (which is
 * remembered in localStorage) — disable again with `?debug=0`.
 */

const STORAGE_KEY = 'voxel-debug-tools';

function readDebugFlag() {
  if (import.meta.env?.DEV) return true;
  if (typeof window === 'undefined') return false;
  try {
    const param = new URLSearchParams(window.location.search).get('debug');
    if (param === '1' || param === 'true') {
      window.localStorage.setItem(STORAGE_KEY, '1');
      return true;
    }
    if (param === '0' || param === 'false') {
      window.localStorage.removeItem(STORAGE_KEY);
      return false;
    }
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export const DEBUG_TOOLS_ENABLED = readDebugFlag();
