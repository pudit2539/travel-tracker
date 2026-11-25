// src/lib/livePresence.ts
import { supabase } from '@/lib/supabase';

export interface EphemeralPresencePayload {
  privacyLevel: 'off' | 'progress' | 'district' | 'exact';
  progressPct?: number;
  district?: string;
  coords?: { lat: number; lng: number };
  userId?: string;
  displayName?: string;
  updatedAt: string;
}

interface ActivePresenceSession {
  channel: any;
  ready: boolean;
  lastSentAt: number;
  peers: Record<string, EphemeralPresencePayload>;
  listeners: Set<(peers: Record<string, EphemeralPresencePayload>) => void>;
}

const presenceSessions = new Map<string, ActivePresenceSession>();
const MIN_BROADCAST_INTERVAL_MS = 2500;

function ensurePresenceChannel(tripId: string): ActivePresenceSession | null {
  if (!tripId || typeof window === 'undefined') return null;
  const existing = presenceSessions.get(tripId);
  if (existing) return existing;

  if (!supabase || typeof supabase.channel !== 'function') return null;

  const session: ActivePresenceSession = {
    channel: null,
    ready: false,
    lastSentAt: 0,
    peers: {},
    listeners: new Set(),
  };

  try {
    const channel = supabase.channel(`presence:trip:${tripId}`);
    session.channel = channel;

    if (typeof channel.on === 'function') {
      channel.on('broadcast', { event: 'companion_presence' }, (msg: any) => {
        const data = msg?.payload as EphemeralPresencePayload | undefined;
        if (!data) return;
        const peerKey = data.userId || data.displayName || 'peer';
        if (data.privacyLevel === 'off') {
          delete session.peers[peerKey];
        } else {
          session.peers[peerKey] = data;
        }
        session.listeners.forEach((fn) => fn({ ...session.peers }));
      });
    }

    if (typeof channel.subscribe === 'function') {
      channel.subscribe((status?: string) => {
        if (!status || status === 'SUBSCRIBED') {
          session.ready = true;
        }
      });
      // Support synchronous mock channels that don't invoke subscribe callback
      session.ready = true;
    }

    presenceSessions.set(tripId, session);
    return session;
  } catch {
    return null;
  }
}

/**
 * Publishes live GPS/companion progress over Supabase Realtime Broadcast (ephemeral memory)
 * instead of mutating `itinerary_items` (`__meta_trip_data__`), eliminating cross-device
 * JSON clobbering and database write amplification.
 */
export async function publishLivePresence(
  tripId: string,
  payload: EphemeralPresencePayload,
  options?: { force?: boolean }
): Promise<boolean> {
  if (!tripId) return false;
  const now = Date.now();
  const session = ensurePresenceChannel(tripId);
  if (!session || !session.channel) return false;

  if (!options?.force && now - session.lastSentAt < MIN_BROADCAST_INTERVAL_MS) {
    return false;
  }
  session.lastSentAt = now;

  try {
    if (typeof session.channel.send === 'function') {
      await session.channel.send({
        type: 'broadcast',
        event: 'companion_presence',
        payload,
      });
    }
    if (typeof session.channel.track === 'function') {
      if (payload.privacyLevel === 'off' && typeof session.channel.untrack === 'function') {
        await session.channel.untrack();
      } else {
        await session.channel.track(payload);
      }
    }
    return true;
  } catch {
    return false;
  }
}

export function subscribeLivePresence(
  tripId: string,
  onPeersUpdated: (peers: Record<string, EphemeralPresencePayload>) => void
): () => void {
  const session = ensurePresenceChannel(tripId);
  if (!session) return () => {};

  session.listeners.add(onPeersUpdated);
  return () => {
    session.listeners.delete(onPeersUpdated);
    if (session.listeners.size === 0 && presenceSessions.get(tripId) === session) {
      presenceSessions.delete(tripId);
      try {
        if (session.channel && typeof supabase?.removeChannel === 'function') {
          supabase.removeChannel(session.channel);
        }
      } catch {
        // ignore cleanup errors
      }
    }
  };
}
