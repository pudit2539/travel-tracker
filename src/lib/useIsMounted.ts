'use client';

import { useSyncExternalStore } from 'react';

const emptySubscribe = () => () => {};

/**
 * Hydration-safe hook that returns `false` on SSR / initial hydration pass
 * and `true` once mounted on the client, without calling setState inside useEffect.
 */
export function useIsMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

