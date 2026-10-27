import { triggerHaptic } from '@/lib/haptics';

/**
 * Robust copy helper that handles Permission Policy restrictions,
 * iframes, non-secure contexts, and falls back to execCommand.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  // 1. Try modern navigator.clipboard API
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      triggerHaptic('light');
      return true;
    }
  } catch (err) {
    console.warn('navigator.clipboard.writeText blocked or failed, trying fallback:', err);
  }

  // 2. Fallback to textarea + document.execCommand('copy')
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.setAttribute('readonly', '');
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.width = '2em';
    textArea.style.height = '2em';
    textArea.style.padding = '0';
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';
    textArea.style.opacity = '0';
    textArea.style.pointerEvents = 'none';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    if (successful) {
      triggerHaptic('light');
      return true;
    }
  } catch (fallbackErr) {
    console.error('Fallback execCommand copy failed:', fallbackErr);
  }

  return false;
}
