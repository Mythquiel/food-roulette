import { useEffect, useMemo, useState } from 'react';
import { CUISINES, type Cuisine } from './data/cuisines';
import {
  DAILY_PLACES_REQUEST_LIMIT,
  getCachedPlacesLoadResult,
  fetchPlacesForCuisines,
  getRemainingPlacesRequests,
  getRequiredRequestCount,
  hasGooglePlacesApiKey,
  type PlacesByCuisineId
} from './services/googlePlaces';

type Result = {
  cuisine: string;
  cuisineId: string;
  restaurant: string;
  address?: string;
  rating?: number;
  googleMapsUrl?: string;
};

type DrawMode = 'full' | 'cuisine-first';

function getRandomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

type HeaderProps = {
  cuisineCount: number;
};

function Header({ cuisineCount }: HeaderProps) {
  return (
    <header className="header">
      <div className="header-copy">
        <p className="eyebrow">Losowanie restauracji</p>
        <h1>Co dziś zamawiamy?</h1>
        <p className="lede">Zaznacz, czego dziś nie chcecie, a aplikacja wybierze kuchnię i miejsce.</p>
      </div>

      <div className="header-summary" aria-label="Skrót działania">
        <span>{cuisineCount} kuchni</span>
        <span>1 losowanie</span>
        <span>zero dyskusji</span>
      </div>
    </header>
  );
}

type CuisineFilterListProps = {
  cuisines: Cuisine[];
  excludedCuisineIds: string[];
  placesByCuisineId: PlacesByCuisineId;
  onToggleCuisine: (cuisineId: string) => void;
};

function CuisineFilterList({
  cuisines,
  excludedCuisineIds,
  placesByCuisineId,
  onToggleCuisine
}: CuisineFilterListProps) {
  return (
    <section className="filter-section" aria-labelledby="cuisine-filter-heading">
      <div className="section-heading">
        <h2 id="cuisine-filter-heading">Kuchnie</h2>
        <p>Dostępne: {cuisines.length - excludedCuisineIds.length}</p>
      </div>

      <div className="cuisine-grid">
        {cuisines.map((cuisine) => {
          const isExcluded = excludedCuisineIds.includes(cuisine.id);
          const livePlaces = placesByCuisineId[cuisine.id] ?? [];
          const placeCount = livePlaces.length;

          return (
            <button
              className={`cuisine-card ${isExcluded ? 'is-excluded' : ''}`}
              key={cuisine.id}
              type="button"
              aria-pressed={!isExcluded}
              onClick={() => onToggleCuisine(cuisine.id)}
            >
              <span>{cuisine.name}</span>
              <small>
                {isExcluded
                  ? 'Wykluczona'
                  : placeCount > 0
                    ? `${placeCount} ${placeCount === 1 ? 'miejsce' : 'miejsca'} z Google`
                    : 'Brak pobranych miejsc'}
              </small>
            </button>
          );
        })}
      </div>
    </section>
  );
}

type ActionBarProps = {
  availableCount: number;
  availablePlacesCount: number;
  hasResult: boolean;
  placesStatus: PlacesStatus;
  remainingPlacesRequests: number;
  requiredPlacesRequests: number;
  drawMode: DrawMode;
  onDrawModeChange: (drawMode: DrawMode) => void;
  onDraw: () => void;
  onReset: () => void;
  onLoadPlaces: () => void;
};

type PlacesStatus = 'idle' | 'loading' | 'ready' | 'error';

function ActionBar({
  availableCount,
  availablePlacesCount,
  hasResult,
  placesStatus,
  remainingPlacesRequests,
  requiredPlacesRequests,
  drawMode,
  onDrawModeChange,
  onDraw,
  onReset,
  onLoadPlaces
}: ActionBarProps) {
  const noOptions = availableCount === 0;
  const noPlaces = availablePlacesCount === 0;
  const isLoadingPlaces = placesStatus === 'loading';
  const hasApiKey = hasGooglePlacesApiKey();
  const hasLoadedPlaces = placesStatus === 'ready';
  const canLoadPlaces = hasApiKey && !hasLoadedPlaces && !isLoadingPlaces && remainingPlacesRequests >= requiredPlacesRequests;

  return (
    <section className="action-bar" aria-label="Akcje">
    <div className="load-places-control">
      <button className="primary-button" type="button" onClick={onDraw} disabled={noOptions || noPlaces}>
        {hasResult ? 'Losuj ponownie' : drawMode === 'full' ? 'Wylosuj dla nas' : 'Wylosuj kuchnię'}
      </button>
              <span className="quota-tooltip" role="tooltip">
                Najpierw pobierz restauracje z Google.
              </span>
      </div>
      <div className="mode-toggle" aria-label="Tryb losowania">
        <button
          className={drawMode === 'full' ? 'is-active' : ''}
          type="button"
          onClick={() => onDrawModeChange('full')}
        >
          Kuchnia + restauracja
        </button>
        <button
          className={drawMode === 'cuisine-first' ? 'is-active' : ''}
          type="button"
          onClick={() => onDrawModeChange('cuisine-first')}
        >
          Najpierw kuchnia
        </button>
      </div>
      <div className="load-places-control">
        <button
          className="secondary-button"
          type="button"
          onClick={onLoadPlaces}
          disabled={!canLoadPlaces}
        >
          {isLoadingPlaces ? 'Pobieram miejsca...' : 'Pobierz miejsca z Google'}
        </button>
        <span className="quota-tooltip" role="tooltip">
          Limit: {remainingPlacesRequests}/{DAILY_PLACES_REQUEST_LIMIT} zapytań dziś. Jedno pobranie
          zużywa {requiredPlacesRequests}. Wyniki są zapamiętywane na 24 godziny.
        </span>
      </div>
      <button className="secondary-button" type="button" onClick={onReset}>
        Przywróć wszystko
      </button>
      {hasLoadedPlaces && (
        <p className="helper-message">Miejsca zostały już pobrane. Zmień tryb przed kolejnym startem aplikacji.</p>
      )}
      {noOptions && (
        <p className="empty-message">Brak dostępnych kuchni. Włącz co najmniej jedną opcję.</p>
      )}
      {!noOptions && noPlaces && (
        <p className="empty-message">Najpierw pobierz miejsca z Google dla Zielonej Góry.</p>
      )}
      {!hasApiKey && (
        <p className="empty-message">Dodaj VITE_GOOGLE_MAPS_API_KEY w .env, żeby pobrać miejsca.</p>
      )}
      {hasApiKey && remainingPlacesRequests < requiredPlacesRequests && (
        <p className="empty-message">Za mało zapytań na odświeżenie wszystkich grup.</p>
      )}
    </section>
  );
}

type ResultCardProps = {
  result: Result | null;
  drawMode: DrawMode;
  onReroll: () => void;
  onDrawRestaurant: () => void;
};

function ResultCard({ result, drawMode, onReroll, onDrawRestaurant }: ResultCardProps) {
  if (!result) {
    return (
      <section className="result-card placeholder" aria-label="Wynik">
        <p>Czekam na pobranie miejsc i pierwsze losowanie.</p>
      </section>
    );
  }

  const hasRestaurant = Boolean(result.restaurant);

  return (
    <section className="result-card" aria-label="Wynik">
      <p className="result-label">{hasRestaurant ? 'Dzisiaj zamawiamy' : 'Najpierw kuchnia'}</p>
      <h2>{result.cuisine}</h2>
      {hasRestaurant ? (
        <p className="restaurant-name">{result.restaurant}</p>
      ) : (
        <p className="restaurant-name">Wybierz restaurację z tej kuchni, kiedy będziecie gotowi.</p>
      )}
      {result.address && <p className="restaurant-meta">{result.address}</p>}
      {hasRestaurant && (
        <div className="result-meta-row">
          <span>Google Places</span>
          {result.rating && <span>Ocena {result.rating.toFixed(1)}</span>}
        </div>
      )}
      {result.googleMapsUrl && (
        <a className="place-link" href={result.googleMapsUrl} target="_blank" rel="noreferrer">
          Otwórz w Google Maps
        </a>
      )}
      {drawMode === 'cuisine-first' && !hasRestaurant && (
        <button className="secondary-button" type="button" onClick={onDrawRestaurant}>
          Dobierz restaurację
        </button>
      )}
      <button className="secondary-button" type="button" onClick={onReroll}>
        {drawMode === 'cuisine-first' ? 'Losuj inną kuchnię' : 'Nie pasuje? Losuj jeszcze raz.'}
      </button>
    </section>
  );
}

function App() {
  const [cuisines, setCuisines] = useState<Cuisine[]>(CUISINES);
  const [excludedCuisineIds, setExcludedCuisineIds] = useState<string[]>([]);
  const [currentResult, setCurrentResult] = useState<Result | null>(null);
  const [placesByCuisineId, setPlacesByCuisineId] = useState<PlacesByCuisineId>({});
  const [placesStatus, setPlacesStatus] = useState<PlacesStatus>('idle');
  const [placesMessage, setPlacesMessage] = useState('');
  const [remainingPlacesRequests, setRemainingPlacesRequests] = useState(getRemainingPlacesRequests);
  const [drawMode, setDrawMode] = useState<DrawMode>('full');

  const requiredPlacesRequests = getRequiredRequestCount(cuisines);

  const availableCuisines = useMemo(
    () => cuisines.filter((cuisine) => !excludedCuisineIds.includes(cuisine.id)),
    [cuisines, excludedCuisineIds]
  );

  const availableCuisinesWithPlaces = useMemo(
    () => availableCuisines.filter((cuisine) => (placesByCuisineId[cuisine.id] ?? []).length > 0),
    [availableCuisines, placesByCuisineId]
  );

  const availablePlacesCount = useMemo(
    () =>
      availableCuisinesWithPlaces.reduce((total, cuisine) => {
        return total + (placesByCuisineId[cuisine.id]?.length ?? 0);
      }, 0),
    [availableCuisinesWithPlaces, placesByCuisineId]
  );

  useEffect(() => {
    const cachedResult = getCachedPlacesLoadResult();

    if (!cachedResult) {
      return;
    }

    setCuisines(cachedResult.cuisines);
    setPlacesByCuisineId(cachedResult.placesByCuisineId);
    setPlacesStatus('ready');
  }, []);

  useEffect(() => {
    if (!placesMessage || placesStatus === 'loading') {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setPlacesMessage('');
    }, 4500);

    return () => window.clearTimeout(timeoutId);
  }, [placesMessage, placesStatus]);

  function toggleCuisine(cuisineId: string) {
    setExcludedCuisineIds((currentIds) =>
      currentIds.includes(cuisineId)
        ? currentIds.filter((id) => id !== cuisineId)
        : [...currentIds, cuisineId]
    );
  }

  function drawResult() {
    if (availableCuisinesWithPlaces.length === 0) {
      return;
    }

    const cuisine = getRandomItem(availableCuisinesWithPlaces);

    if (drawMode === 'cuisine-first') {
      setCurrentResult({
        cuisine: cuisine.name,
        cuisineId: cuisine.id,
        restaurant: ''
      });

      return;
    }

    drawRestaurantForCuisine(cuisine);
  }

  function drawRestaurantForCuisine(cuisine: Cuisine) {
    const place = getRandomItem(placesByCuisineId[cuisine.id]);

    setCurrentResult({
      cuisine: cuisine.name,
      cuisineId: cuisine.id,
      restaurant: place.name,
      address: place.address,
      rating: place.rating,
      googleMapsUrl: place.googleMapsUrl
    });
  }

  function drawRestaurantForCurrentCuisine() {
    if (!currentResult) {
      return;
    }

    const cuisine = cuisines.find((currentCuisine) => currentCuisine.id === currentResult.cuisineId);

    if (!cuisine || !placesByCuisineId[cuisine.id]?.length) {
      return;
    }

    drawRestaurantForCuisine(cuisine);
  }

  async function loadPlaces() {
    const hasLoadedPlaces = placesStatus === 'ready';

    if (!hasGooglePlacesApiKey() || placesStatus === 'loading' || hasLoadedPlaces) {
      return;
    }

    setPlacesStatus('loading');
    setPlacesMessage('Pobieram miejsca z Zielonej Góry dla każdej kuchni.');

    try {
      const result = await fetchPlacesForCuisines(cuisines);

      setCuisines(result.cuisines);
      setPlacesByCuisineId(result.placesByCuisineId);
      setRemainingPlacesRequests(getRemainingPlacesRequests());
      setPlacesStatus('ready');
      setPlacesMessage(
        `Pobrano ${result.totalPlaces} miejsc z Google Places dla Zielonej Góry. Dodano ${result.addedCuisineCount} nowych grup.`
      );
    } catch (error) {
      setRemainingPlacesRequests(getRemainingPlacesRequests());
      setPlacesStatus('error');
      setPlacesMessage(error instanceof Error ? error.message : 'Nie udało się pobrać miejsc.');
    }
  }

  function resetAll() {
    setExcludedCuisineIds([]);
    setCurrentResult(null);
  }

  return (
    <main className="app-shell">
      <Header cuisineCount={cuisines.length} />

      <div className="main-grid">
        <CuisineFilterList
          cuisines={cuisines}
          excludedCuisineIds={excludedCuisineIds}
          placesByCuisineId={placesByCuisineId}
          onToggleCuisine={toggleCuisine}
        />

        <div className="decision-panel">
          <ActionBar
            availableCount={availableCuisines.length}
            availablePlacesCount={availablePlacesCount}
            hasResult={currentResult !== null}
            placesStatus={placesStatus}
            remainingPlacesRequests={remainingPlacesRequests}
            requiredPlacesRequests={requiredPlacesRequests}
            drawMode={drawMode}
            onDrawModeChange={setDrawMode}
            onDraw={drawResult}
            onReset={resetAll}
            onLoadPlaces={loadPlaces}
          />
          <ResultCard
            result={currentResult}
            drawMode={drawMode}
            onReroll={drawResult}
            onDrawRestaurant={drawRestaurantForCurrentCuisine}
          />
        </div>
      </div>

      {placesMessage && <p className={`places-toast ${placesStatus}`}>{placesMessage}</p>}
    </main>
  );
}

export default App;
