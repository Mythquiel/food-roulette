import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import { CUISINES, type Cuisine } from '../data/cuisines';

const ZIELONA_GORA_CENTER = {
  lat: 51.9356,
  lng: 15.5062
};

const SEARCH_RADIUS_METERS = 12000;
const MAX_RESULTS_PER_CUISINE = 8;
const MAX_DISCOVERY_RESULTS = 20;
export const DAILY_PLACES_REQUEST_LIMIT = 100;

const USAGE_STORAGE_KEY = 'food-roulette-google-places-usage';

const GENERIC_PLACE_TYPES = new Set(['restaurant', 'food', 'point_of_interest', 'establishment']);

const GOOGLE_TYPE_LABELS: Record<string, string> = {
  american_restaurant: 'Amerykańska',
  bakery: 'Piekarnie',
  bar: 'Bary',
  barbecue_restaurant: 'Grill',
  breakfast_restaurant: 'Śniadania',
  brunch_restaurant: 'Brunch',
  buffet_restaurant: 'Bufet',
  cafe: 'Kawiarnie',
  chinese_restaurant: 'Chińska',
  coffee_shop: 'Kawa',
  dessert_shop: 'Desery',
  fast_food_restaurant: 'Fast food',
  french_restaurant: 'Francuska',
  greek_restaurant: 'Grecka',
  hamburger_restaurant: 'Burgery',
  ice_cream_shop: 'Lody',
  indian_restaurant: 'Indyjska',
  indonesian_restaurant: 'Indonezyjska',
  italian_restaurant: 'Włoska',
  japanese_restaurant: 'Japońska',
  korean_restaurant: 'Koreańska',
  lebanese_restaurant: 'Libańska',
  meal_delivery: 'Dostawa',
  meal_takeaway: 'Na wynos',
  mediterranean_restaurant: 'Śródziemnomorska',
  mexican_restaurant: 'Meksykańska',
  middle_eastern_restaurant: 'Bliskowschodnia',
  pizza_restaurant: 'Pizza',
  ramen_restaurant: 'Ramen',
  sandwich_shop: 'Kanapki',
  seafood_restaurant: 'Owoce morza',
  spanish_restaurant: 'Hiszpańska',
  steak_house: 'Steki',
  sushi_restaurant: 'Sushi',
  thai_restaurant: 'Tajska',
  turkish_restaurant: 'Turecka',
  vegan_restaurant: 'Wegańska',
  vegetarian_restaurant: 'Wegetariańska',
  vietnamese_restaurant: 'Wietnamska'
};

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
  addedCuisineCount: number;
};

type PlacesUsage = {
  date: string;
  count: number;
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

function formatGoogleTypeName(type: string) {
  return GOOGLE_TYPE_LABELS[type] ?? type.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isUsefulCuisineType(type: string) {
  return !GENERIC_PLACE_TYPES.has(type) && (type.endsWith('_restaurant') || type in GOOGLE_TYPE_LABELS);
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

async function discoverNearbyRestaurants() {
  const { Place, SearchNearbyRankPreference } = await getPlacesLibrary();
  const { places } = await Place.searchNearby({
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
    includedTypes: ['restaurant'],
    locationRestriction: {
      center: ZIELONA_GORA_CENTER,
      radius: SEARCH_RADIUS_METERS
    },
    maxResultCount: MAX_DISCOVERY_RESULTS,
    rankPreference: SearchNearbyRankPreference.POPULARITY,
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

function getCandidateCuisineTypes(place: PlaceSuggestion) {
  return [place.primaryType, ...place.googleTypes]
    .filter((type): type is string => Boolean(type))
    .filter((type) => isUsefulCuisineType(type));
}

function ensureCuisineForType(
  cuisinesById: Map<string, Cuisine>,
  cuisineIdByGoogleType: Map<string, string>,
  googleType: string,
  displayName?: string
) {
  const existingCuisineId = cuisineIdByGoogleType.get(googleType);

  if (existingCuisineId) {
    return existingCuisineId;
  }

  const cuisine: Cuisine = {
    id: `google-${googleType}`,
    name: displayName ?? formatGoogleTypeName(googleType),
    googlePlacesQuery: `${formatGoogleTypeName(googleType)} Zielona Góra`,
    googlePlaceTypes: [googleType]
  };

  cuisinesById.set(cuisine.id, cuisine);
  cuisineIdByGoogleType.set(googleType, cuisine.id);

  return cuisine.id;
}

export async function fetchPlacesForCuisines(cuisines: Cuisine[]): Promise<GooglePlacesLoadResult> {
  reservePlacesRequests(cuisines.length + 1);

  const cuisinesById = new Map(cuisines.map((cuisine) => [cuisine.id, cuisine]));
  const baseCuisineIds = new Set(cuisines.map((cuisine) => cuisine.id));
  const cuisineIdByGoogleType = new Map<string, string>();
  const placesByCuisineId: PlacesByCuisineId = {};

  for (const cuisine of cuisines) {
    for (const googlePlaceType of cuisine.googlePlaceTypes) {
      cuisineIdByGoogleType.set(googlePlaceType, cuisine.id);
    }
  }

  const searchResults = await Promise.all([
    ...cuisines.map(async (cuisine) => ({
      cuisine,
      places: await searchPlacesByText(cuisine.googlePlacesQuery)
    })),
    discoverNearbyRestaurants().then((places) => ({
      cuisine: null,
      places
    }))
  ]);

  for (const searchResult of searchResults) {
    for (const place of searchResult.places) {
      const candidateTypes = getCandidateCuisineTypes(place);

      if (searchResult.cuisine) {
        addPlace(placesByCuisineId, searchResult.cuisine.id, place);
      }

      for (const googleType of candidateTypes) {
        const cuisineId = ensureCuisineForType(
          cuisinesById,
          cuisineIdByGoogleType,
          googleType,
          googleType === place.primaryType ? place.primaryTypeDisplayName : undefined
        );

        addPlace(placesByCuisineId, cuisineId, place);
      }
    }
  }

  const allCuisines = Array.from(cuisinesById.values());
  const totalPlaces = new Set(Object.values(placesByCuisineId).flat().map((place) => place.id)).size;
  const addedCuisineCount = allCuisines.filter((cuisine) => !baseCuisineIds.has(cuisine.id)).length;

  return {
    cuisines: allCuisines,
    placesByCuisineId,
    totalPlaces,
    addedCuisineCount
  };
}

export function getRequiredRequestCount(cuisines: Cuisine[] = CUISINES) {
  return cuisines.length + 1;
}
