import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import { CUISINES, type Cuisine } from '../data/cuisines';

const ZIELONA_GORA_CENTER = {
  lat: 51.9356,
  lng: 15.5062
};

const SEARCH_RADIUS_METERS = 12000;
const MAX_RESULTS_PER_CUISINE = 100;
export const DAILY_PLACES_REQUEST_LIMIT = 500;
export const PLACES_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const USAGE_STORAGE_KEY = 'food-roulette-google-places-usage';
const PLACES_CACHE_STORAGE_KEY = 'food-roulette-google-places-cache';

let placesLibraryPromise: Promise<google.maps.PlacesLibrary> | null = null;
let loaderOptionsSet = false;

export type PlaceSuggestion = {
  id: string;
  name: string;
  address?: string;
  rating?: number;
  googleMapsUrl?: string;
  primaryType?: string;
  primaryTypeDisplayName?: string;
  googleTypes: string[];
};

export type PlacesByCuisineId = Record<string, PlaceSuggestion[]>;

export type GooglePlacesLoadResult = {
  cuisines: Cuisine[];
  placesByCuisineId: PlacesByCuisineId;
  totalPlaces: number;
};

type PlacesUsage = {
  date: string;
  count: number;
};

type PlacesCache = {
  savedAt: number;
  result: GooglePlacesLoadResult;
};

function getApiKey() {
  return import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
}

function getPlacesLibrary() {
  const apiKey = getApiKey();

  if (!apiKey) {
    throw new Error('Brakuje VITE_GOOGLE_MAPS_API_KEY w pliku .env.');
  }

  if (!placesLibraryPromise) {
    if (!loaderOptionsSet) {
      setOptions({
        key: apiKey,
        v: 'weekly',
        language: 'pl',
        region: 'PL'
      });

      loaderOptionsSet = true;
    }

    placesLibraryPromise = importLibrary('places');
  }

  return placesLibraryPromise;
}

export function hasGooglePlacesApiKey() {
  return Boolean(getApiKey());
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function getPlacesUsage(): PlacesUsage {
  const today = getTodayKey();
  const rawUsage = window.localStorage.getItem(USAGE_STORAGE_KEY);

  if (!rawUsage) {
    return {
      date: today,
      count: 0
    };
  }

  try {
    const usage = JSON.parse(rawUsage) as PlacesUsage;

    if (usage.date !== today) {
      return {
        date: today,
        count: 0
      };
    }

    return {
      date: today,
      count: usage.count
    };
  } catch {
    return {
      date: today,
      count: 0
    };
  }
}

export function getRemainingPlacesRequests() {
  return Math.max(DAILY_PLACES_REQUEST_LIMIT - getPlacesUsage().count, 0);
}

export function getCachedPlacesLoadResult() {
  const rawCache = window.localStorage.getItem(PLACES_CACHE_STORAGE_KEY);

  if (!rawCache) {
    return null;
  }

  try {
    const cache = JSON.parse(rawCache) as PlacesCache;

    if (Date.now() - cache.savedAt > PLACES_CACHE_TTL_MS) {
      window.localStorage.removeItem(PLACES_CACHE_STORAGE_KEY);
      return null;
    }

    if (!cacheMatchesCurrentCuisineList(cache.result)) {
      window.localStorage.removeItem(PLACES_CACHE_STORAGE_KEY);
      return null;
    }

    return cache.result;
  } catch {
    window.localStorage.removeItem(PLACES_CACHE_STORAGE_KEY);
    return null;
  }
}

function cacheMatchesCurrentCuisineList(result: GooglePlacesLoadResult) {
  const currentCuisineIds = new Set(CUISINES.map((cuisine) => cuisine.id));

  if (result.cuisines.length !== CUISINES.length) {
    return false;
  }

  return result.cuisines.every((cuisine) => currentCuisineIds.has(cuisine.id));
}

function cachePlacesLoadResult(result: GooglePlacesLoadResult) {
  window.localStorage.setItem(
    PLACES_CACHE_STORAGE_KEY,
    JSON.stringify({
      savedAt: Date.now(),
      result
    })
  );
}

function reservePlacesRequests(requestCount: number) {
  const usage = getPlacesUsage();
  const nextCount = usage.count + requestCount;

  if (nextCount > DAILY_PLACES_REQUEST_LIMIT) {
    throw new Error(
      `Dzisiejszy limit Google Places został osiągnięty. Pozostało ${getRemainingPlacesRequests()} z ${DAILY_PLACES_REQUEST_LIMIT} zapytań.`
    );
  }

  window.localStorage.setItem(
    USAGE_STORAGE_KEY,
    JSON.stringify({
      date: usage.date,
      count: nextCount
    })
  );
}

function placeToSuggestion(place: google.maps.places.Place): PlaceSuggestion | null {
  if (!place.id || !place.displayName) {
    return null;
  }

  return {
    id: place.id,
    name: place.displayName,
    address: place.formattedAddress ?? undefined,
    rating: place.rating ?? undefined,
    googleMapsUrl: place.googleMapsURI?.toString(),
    primaryType: place.primaryType ?? undefined,
    primaryTypeDisplayName: place.primaryTypeDisplayName ?? undefined,
    googleTypes: place.types ?? []
  };
}

async function searchPlacesByText(textQuery: string) {
  const { Place } = await getPlacesLibrary();
  const { places } = await Place.searchByText({
    textQuery,
    fields: [
      'id',
      'displayName',
      'formattedAddress',
      'rating',
      'googleMapsURI',
      'primaryType',
      'primaryTypeDisplayName',
      'types'
    ],
    locationBias: {
      center: ZIELONA_GORA_CENTER,
      radius: SEARCH_RADIUS_METERS
    },
    maxResultCount: MAX_RESULTS_PER_CUISINE,
    language: 'pl',
    region: 'PL'
  });

  return places.map(placeToSuggestion).filter((place): place is PlaceSuggestion => place !== null);
}

function addPlace(placesByCuisineId: PlacesByCuisineId, cuisineId: string, place: PlaceSuggestion) {
  const currentPlaces = placesByCuisineId[cuisineId] ?? [];

  if (currentPlaces.some((currentPlace) => currentPlace.id === place.id)) {
    return;
  }

  placesByCuisineId[cuisineId] = [...currentPlaces, place];
}

export async function fetchPlacesForCuisines(cuisines: Cuisine[]): Promise<GooglePlacesLoadResult> {
  reservePlacesRequests(cuisines.length);

  const placesByCuisineId: PlacesByCuisineId = {};

  const searchResults = await Promise.all(
    cuisines.map(async (cuisine) => ({
      cuisine,
      places: await searchPlacesByText(cuisine.googlePlacesQuery)
    }))
  );

  for (const searchResult of searchResults) {
    for (const place of searchResult.places) {
      addPlace(placesByCuisineId, searchResult.cuisine.id, place);
    }
  }

  const totalPlaces = new Set(Object.values(placesByCuisineId).flat().map((place) => place.id)).size;

  const result = {
    cuisines,
    placesByCuisineId,
    totalPlaces
  };

  cachePlacesLoadResult(result);

  return result;
}

export function getRequiredRequestCount(cuisines: Cuisine[] = CUISINES) {
  return cuisines.length;
}
