import { NextRequest, NextResponse } from 'next/server';

interface CachedPlacePhoto {
  photoUrl: string;
  placeName?: string;
  author?: string;
  attribution: string;
  source: 'google_places';
}

const serverPhotoCache = new Map<string, CachedPlacePhoto>();

/**
 * Server-side proxy for Google Maps Platform Places API (New):
 * 1. Calls `POST https://places.googleapis.com/v1/places:searchText` with `X-Goog-Maps-Solution-ID: gmp_git_agentskills_v1`
 *    and minimal `X-Goog-FieldMask: places.id,places.displayName,places.photos`.
 * 2. Resolves the high-resolution (1200px) `photoUri` via `GET https://places.googleapis.com/v1/{photoName}/media?maxWidthPx=1200&skipHttpRedirect=true&solution_id=gmp_git_agentskills_v1`
 *    so the API key is never exposed in client-side `<img>` URLs.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get('q') || '').trim();
  const city = (searchParams.get('city') || '').trim();

  if (!query) {
    return NextResponse.json({ photoUrl: null, error: 'Missing query parameter q' }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ photoUrl: null, source: 'unconfigured' }, { status: 200 });
  }

  // Clean arrows from city like "Kyoto -> Osaka" -> "Kyoto"
  const cleanCity = city.split(/->|→|\/|,/)[0].replace(/\(.*?\)/g, '').trim();
  const fullQuery =
    cleanCity && !query.toLowerCase().includes(cleanCity.toLowerCase())
      ? `${query} ${cleanCity} Japan`
      : `${query} Japan`;

  const cacheKey = fullQuery.toLowerCase();
  if (serverPhotoCache.has(cacheKey)) {
    return NextResponse.json(serverPhotoCache.get(cacheKey), {
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
    });

    if (!searchRes.ok) {
      return NextResponse.json({ photoUrl: null, source: 'places_search_error' }, { status: 200 });
    }

    const searchData = await searchRes.json();
    const places: any[] = Array.isArray(searchData?.places) ? searchData.places : [];
    const matchedPlace = places.find((p) => Array.isArray(p?.photos) && p.photos.length > 0);
    const firstPhoto = matchedPlace?.photos?.[0];

    if (!firstPhoto?.name) {
      return NextResponse.json({ photoUrl: null, source: 'no_photo_found' }, { status: 200 });
    }

    // Fetch direct high-resolution (1200px) photoUri without exposing the API key to the browser
    const mediaUrl = `https://places.googleapis.com/v1/${firstPhoto.name}/media?maxWidthPx=1200&skipHttpRedirect=true&key=${encodeURIComponent(
      apiKey
    )}&solution_id=gmp_git_agentskills_v1`;

    const mediaRes = await fetch(mediaUrl, {
      method: 'GET',
      headers: {
        'X-Goog-Maps-Solution-ID': 'gmp_git_agentskills_v1',
      },
    });

    if (!mediaRes.ok) {
      return NextResponse.json({ photoUrl: null, source: 'photo_media_error' }, { status: 200 });
    }

    const mediaData = await mediaRes.json();
    const photoUri: string | undefined = mediaData?.photoUri;

    if (!photoUri || !/^https?:\/\//i.test(photoUri)) {
      return NextResponse.json({ photoUrl: null, source: 'invalid_photo_uri' }, { status: 200 });
    }

    const payload: CachedPlacePhoto = {
      photoUrl: photoUri,
      placeName: matchedPlace?.displayName?.text,
      author: firstPhoto?.authorAttributions?.[0]?.displayName,
      attribution: 'Google Maps',
      source: 'google_places',
    };

    serverPhotoCache.set(cacheKey, payload);

    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'public, max-age=86400, s-maxage=604800',
      },
    });
  } catch {
    return NextResponse.json({ photoUrl: null, source: 'network_error' }, { status: 200 });
  }
}
