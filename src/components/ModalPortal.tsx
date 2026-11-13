'use client';

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useIsMounted } from '@/lib/useIsMounted';

interface ModalPortalProps {
  children: React.ReactNode;
  /** Optional centralized scroll lock when the parent modal does not manage it on its own. */
  lockScroll?: boolean;
}

/**
 * Hydration-safe document.body portal for full-viewport modals/drawers on iOS & Android
 * so `fixed inset-0` always escapes transformed ancestors and respects device safe areas.
 */
export function ModalPortal({ children, lockScroll = false }: ModalPortalProps) {
  const mounted = useIsMounted();

  useEffect(() => {
    if (!lockScroll || typeof document === 'undefined') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [lockScroll]);

  if (!mounted || typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}

