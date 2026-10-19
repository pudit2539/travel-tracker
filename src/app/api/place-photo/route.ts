import { NextRequest, NextResponse } from 'next/server';

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

const serverPhotoCache = new Map<string, CachedPlacePhoto>();

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
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get('q') || '').trim();
  const city = (searchParams.get('city') || '').trim();
  const wantCandidates = searchParams.get('candidates') === '1';

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

      serverPhotoCache.set(cacheKey, payload);
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

    serverPhotoCache.set(cacheKey, payload);

    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'public, max-age=86400, s-maxage=604800',
      },
    });
  } catch {
    return NextResponse.json({ photoUrl: null, photos: [], source: 'network_error' }, { status: 200 });
  }
}
