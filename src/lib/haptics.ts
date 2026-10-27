// src/lib/haptics.ts

/**
 * Trigger subtle tactile haptic feedback on supported mobile devices (iPhone, Android).
 * Fails silently if haptics are unsupported or disabled by OS/browser permissions.
 */
export function triggerHaptic(type: 'light' | 'medium' | 'success' | 'warning' | 'selection' = 'light') {
  if (typeof window === 'undefined' || !('vibrate' in navigator)) {
    return;
  }

  try {
    switch (type) {
      case 'selection':
        navigator.vibrate(8);
        break;
      case 'light':
        navigator.vibrate(12);
        break;
      case 'medium':
        navigator.vibrate(22);
        break;
      case 'success':
        navigator.vibrate([15, 40, 15]);
        break;
      case 'warning':
        navigator.vibrate([30, 50, 30]);
        break;
      default:
        navigator.vibrate(12);
    }
  } catch {
    // Silently ignore browser permission or security context errors
  }
}
