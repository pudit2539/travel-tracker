// src/lib/confetti.ts
/**
 * Zero-dependency Lightweight Confetti celebration effect
 */

export function triggerConfetti() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const count = 60;
  const colors = ['#ec4899', '#a855f7', '#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#fb7185'];

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.inset = '0';
  container.style.pointerEvents = 'none';
  container.style.zIndex = '9999';
  container.style.overflow = 'hidden';
  document.body.appendChild(container);

  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    const color = colors[Math.floor(Math.random() * colors.length)];
    const size = Math.random() * 8 + 6;
    const startX = Math.random() * 100;
    const endX = startX + (Math.random() * 40 - 20);
    const duration = Math.random() * 1.5 + 1.2;
    const delay = Math.random() * 0.2;
    const isCircle = Math.random() > 0.5;

    el.style.position = 'absolute';
    el.style.left = `${startX}vw`;
    el.style.top = '-20px';
    el.style.width = `${size}px`;
    el.style.height = isCircle ? `${size}px` : `${size * 0.6}px`;
    el.style.backgroundColor = color;
    el.style.borderRadius = isCircle ? '50%' : '2px';
    el.style.opacity = '1';
    el.style.transform = `rotate(${Math.random() * 360}deg)`;
    el.style.transition = `transform ${duration}s cubic-bezier(0.25, 1, 0.5, 1), opacity ${duration}s ease-out`;
    el.style.transitionDelay = `${delay}s`;

    container.appendChild(el);

    // Trigger animation in next frame
    requestAnimationFrame(() => {
      el.style.transform = `translate(${endX - startX}vw, ${window.innerHeight + 50}px) rotate(${Math.random() * 720 + 360}deg)`;
      el.style.opacity = '0';
    });
  }

  setTimeout(() => {
    container.remove();
  }, 3000);
}
