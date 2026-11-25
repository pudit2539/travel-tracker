import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export interface PlacePhotoCandidate {
  url: string;
  author?: string;
  placeName?: string;
}

interface CachedPlacePhoto {
  photoUrl: string | null;
  photos?: PlacePhotoCandidate[];
  placeName?: string;
  author?: string;
  attribution: string;
  source: 'google_places';
}

const MAX_SERVER_PHOTO_CACHE = 250;
const serverPhotoCache = new Map<string, CachedPlacePhoto>();

// Sliding-window per-IP rate limiter to protect Google Places API quota from bots
const RATE_WINDOW_MS = 60_000;
const MAX_SINGLE_REQ_PER_MIN = 60;
const MAX_CANDIDATE_REQ_PER_MIN = 20;
const MAX_TRACKED_IPS = 500;
const ipRateBuckets = new Map<string, { single: number[]; candidates: number[] }>();

export function resetPlacePhotoRateLimiterForTests(): void {
  ipRateBuckets.clear();
}

export function checkPlacePhotoRateLimit(
  ip: string,
  isCandidates: boolean,
  nowMs: number = Date.now()
): { allowed: boolean; retryAfterSec: number } {
  const key = (ip || 'unknown').trim().slice(0, 80);
  if (!ipRateBuckets.has(key) && ipRateBuckets.size >= MAX_TRACKED_IPS) {
    const oldestIp = ipRateBuckets.keys().next().value;
    if (oldestIp !== undefined) ipRateBuckets.delete(oldestIp);
  }
  const bucket = ipRateBuckets.get(key) || { single: [], candidates: [] };
  const cutoff = nowMs - RATE_WINDOW_MS;
  bucket.single = bucket.single.filter((t) => t > cutoff);
  bucket.candidates = bucket.candidates.filter((t) => t > cutoff);

  const arr = isCandidates ? bucket.candidates : bucket.single;
  const limit = isCandidates ? MAX_CANDIDATE_REQ_PER_MIN : MAX_SINGLE_REQ_PER_MIN;
  if (arr.length >= limit) {
    const retryMs = Math.max(1000, arr[0] + RATE_WINDOW_MS - nowMs);
    ipRateBuckets.set(key, bucket);
    return { allowed: false, retryAfterSec: Math.ceil(retryMs / 1000) };
  }

  arr.push(nowMs);
  ipRateBuckets.set(key, bucket);
  return { allowed: true, retryAfterSec: 0 };
}

export function isAllowedPlacePhotoOrigin(request: NextRequest): boolean {
  const secFetchSite = (request.headers.get('sec-fetch-site') || '').toLowerCase();
  if (secFetchSite === 'cross-site') return false;

  const host = (request.headers.get('x-forwarded-host') || request.headers.get('host') || '').toLowerCase();
  if (!host) return true;

  const origin = request.headers.get('origin');
  if (origin) {
    try {
      if (new URL(origin).host.toLowerCase() !== host) return false;
    } catch {
      return false;
    }
  }

  const referer = request.headers.get('referer');
  if (referer) {
    try {
      if (new URL(referer).host.toLowerCase() !== host) return false;
    } catch {
      return false;
    }
  }

  return true;
}

function getServerCachedPhoto(key: string): CachedPlacePhoto | undefined {
  const val = serverPhotoCache.get(key);
  if (val) {
    // Refresh insertion order for basic LRU behavior
    serverPhotoCache.delete(key);
    serverPhotoCache.set(key, val);
  }
  return val;
}

function setServerCachedPhoto(key: string, val: CachedPlacePhoto): void {
  if (serverPhotoCache.has(key)) {
    serverPhotoCache.delete(key);
  } else if (serverPhotoCache.size >= MAX_SERVER_PHOTO_CACHE) {
    const oldestKey = serverPhotoCache.keys().next().value;
    if (oldestKey !== undefined) {
      serverPhotoCache.delete(oldestKey);
    }
  }
  serverPhotoCache.set(key, val);
}

async function resolvePhotoMediaUri(photoName: string, apiKey: string): Promise<string | null> {
  try {
    const mediaUrl = `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=1200&skipHttpRedirect=true&key=${encodeURIComponent(
      apiKey
    )}&solution_id=gmp_git_agentskills_v1`;

    const mediaRes = await fetch(mediaUrl, {
      method: 'GET',
      headers: {
        'X-Goog-Maps-Solution-ID': 'gmp_git_agentskills_v1',
      },
      signal: AbortSignal.timeout(6000),
    });
    if (!mediaRes.ok) return null;
    const mediaData = await mediaRes.json();
    const photoUri: string | undefined = mediaData?.photoUri;
    return photoUri && /^https?:\/\//i.test(photoUri) ? photoUri : null;
  } catch {
    return null;
  }
}

/**
 * Server-side proxy for Google Maps Platform Places API (New):
 * 1. Calls `POST https://places.googleapis.com/v1/places:searchText` with `X-Goog-Maps-Solution-ID: gmp_git_agentskills_v1`
 *    and minimal `X-Goog-FieldMask: places.id,places.displayName,places.photos`.
 * 2. Resolves high-resolution (1200px) `photoUri` via `GET https://places.googleapis.com/v1/{photoName}/media?maxWidthPx=1200&skipHttpRedirect=true&solution_id=gmp_git_agentskills_v1`
 *    so the API key is never exposed in client-side `<img>` URLs.
 * 3. Supports `candidates=1` to return up to 5 angle options for the interactive Google Maps Photo Picker.
 */
export async function GET(request: NextRequest) {
  // 1. Cross-site hotlink & bot origin guard
  if (!isAllowedPlacePhotoOrigin(request)) {
    return NextResponse.json(
      { photoUrl: null, error: 'Forbidden: Cross-origin access denied' },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const query = (searchParams.get('q') || '').trim().slice(0, 120);
  const city = (searchParams.get('city') || '').trim().slice(0, 80);
  const wantCandidates = searchParams.get('candidates') === '1';

  // 2. Validate Bearer token if provided; require same-origin or auth for candidates=1 in production
  const authHeader = request.headers.get('authorization');
  const bearerToken = authHeader?.replace(/^Bearer\s+/i, '').trim() || '';
  if (bearerToken) {
    const { data: authData, error: authErr } = await supabase.auth.getUser(bearerToken);
    if (authErr || !authData?.user) {
      return NextResponse.json(
        { photoUrl: null, error: 'Unauthorized: Invalid session token' },
        { status: 401 }
      );
    }
  } else if (wantCandidates && process.env.NODE_ENV === 'production') {
    const secFetchSite = (request.headers.get('sec-fetch-site') || '').toLowerCase();
    const hasSameOriginSignal =
      secFetchSite === 'same-origin' ||
      secFetchSite === 'same-site' ||
      Boolean(request.headers.get('referer'));
    if (!hasSameOriginSignal) {
      return NextResponse.json(
        { photoUrl: null, error: 'Unauthorized: Authentication or same-origin browser session required' },
        { status: 401 }
      );
    }
  }

  // 3. Per-IP sliding-window rate limit
  const clientIp =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip')?.trim() ||
    'local';
  const rateCheck = checkPlacePhotoRateLimit(clientIp, wantCandidates);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { photoUrl: null, photos: [], error: 'Too many photo requests, please slow down' },
      {
        status: 429,
        headers: { 'Retry-After': String(rateCheck.retryAfterSec) },
      }
    );
  }

  if (!query) {
    return NextResponse.json({ photoUrl: null, error: 'Missing query parameter q' }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ photoUrl: null, photos: [], source: 'unconfigured' }, { status: 200 });
  }

  // Clean arrows from city like "Kyoto -> Osaka" -> "Kyoto"
  const cleanCity = city.split(/->|→|\/|,/)[0].replace(/\(.*?\)/g, '').trim();
  const fullQuery =
    cleanCity && !query.toLowerCase().includes(cleanCity.toLowerCase())
      ? `${query} ${cleanCity} Japan`
      : /\bjapan\b/i.test(query)
      ? query
      : `${query} Japan`;

  const cacheKey = `${fullQuery.toLowerCase()}|candidates:${wantCandidates ? '1' : '0'}`;
  const cachedPayload = getServerCachedPhoto(cacheKey);
  if (cachedPayload) {
    return NextResponse.json(cachedPayload, {
      headers: {
        'Cache-Control': 'public, max-age=86400, s-maxage=604800',
      },
    });
  }

  try {
    const searchRes = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-Maps-Solution-ID': 'gmp_git_agentskills_v1',
        'X-Goog-FieldMask': 'places.id,places.displayName,places.photos',
      },
      body: JSON.stringify({
        textQuery: fullQuery,
        maxResultCount: 3,
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!searchRes.ok) {
      return NextResponse.json({ photoUrl: null, photos: [], source: 'places_search_error' }, { status: 200 });
    }

    const searchData = await searchRes.json();
    const places: any[] = Array.isArray(searchData?.places) ? searchData.places : [];
    const matchedPlace = places.find((p) => Array.isArray(p?.photos) && p.photos.length > 0);

    if (!matchedPlace) {
      return NextResponse.json({ photoUrl: null, photos: [], source: 'no_photo_found' }, { status: 200 });
    }

    if (wantCandidates) {
      // Collect up to 5 photo references from matched places
      const rawRefs: { name: string; author?: string; placeName?: string }[] = [];
      for (const place of places) {
        const pName = place?.displayName?.text;
        const pPhotos = Array.isArray(place?.photos) ? place.photos : [];
        for (const ph of pPhotos) {
          if (ph?.name && rawRefs.length < 5) {
            rawRefs.push({
              name: ph.name,
              author: ph?.authorAttributions?.[0]?.displayName,
              placeName: pName,
            });
          }
        }
        if (rawRefs.length >= 5) break;
      }

      const resolvedUris = await Promise.all(
        rawRefs.map(async (ref) => {
          const uri = await resolvePhotoMediaUri(ref.name, apiKey);
          return uri
            ? ({
                url: uri,
                author: ref.author,
                placeName: ref.placeName,
              } as PlacePhotoCandidate)
            : null;
        })
      );

      const validCandidates = resolvedUris.filter((c): c is PlacePhotoCandidate => c !== null);
      if (validCandidates.length === 0) {
        return NextResponse.json({ photoUrl: null, photos: [], source: 'photo_media_error' }, { status: 200 });
      }

      const payload: CachedPlacePhoto = {
        photoUrl: validCandidates[0].url,
        photos: validCandidates,
        placeName: matchedPlace?.displayName?.text,
        author: validCandidates[0].author,
        attribution: 'Google Maps',
        source: 'google_places',
      };

      setServerCachedPhoto(cacheKey, payload);
      return NextResponse.json(payload, {
        headers: {
          'Cache-Control': 'public, max-age=86400, s-maxage=604800',
        },
      });
    }

    const firstPhoto = matchedPlace.photos[0];
    const photoUri = await resolvePhotoMediaUri(firstPhoto.name, apiKey);

    if (!photoUri) {
      return NextResponse.json({ photoUrl: null, photos: [], source: 'invalid_photo_uri' }, { status: 200 });
    }

    const payload: CachedPlacePhoto = {
      photoUrl: photoUri,
      photos: [
        {
          url: photoUri,
          author: firstPhoto?.authorAttributions?.[0]?.displayName,
          placeName: matchedPlace?.displayName?.text,
        },
      ],
      placeName: matchedPlace?.displayName?.text,
      author: firstPhoto?.authorAttributions?.[0]?.displayName,
      attribution: 'Google Maps',
      source: 'google_places',
    };

    setServerCachedPhoto(cacheKey, payload);

    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'public, max-age=86400, s-maxage=604800',
      },
    });
  } catch {
    return NextResponse.json({ photoUrl: null, photos: [], source: 'network_error' }, { status: 200 });
  }
}
