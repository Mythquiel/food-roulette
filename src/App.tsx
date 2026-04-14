import { useEffect, useMemo, useRef, useState } from 'react';
import { CUISINES, type Cuisine } from './data/cuisines';
import {
  DAILY_PLACES_REQUEST_LIMIT,
  fetchPlacesForCuisines,
  getCachedPlacesLoadResult,
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
type PlacesStatus = 'idle' | 'loading' | 'ready' | 'error';
const DRAW_ANIMATION_MS = 900;

function getRandomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

type HeaderProps = {
  cuisineCount: number;
};

function Header({ cuisineCount }: HeaderProps) {
  return (
    <header className="grid items-end gap-6 overflow-hidden rounded-lg border border-white/10 bg-[linear-gradient(135deg,rgb(10_14_20_/_96%),rgb(20_36_42_/_88%)),url('https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1400&q=80')] bg-cover bg-center p-6 text-white shadow-[0_24px_70px_rgb(0_0_0_/_34%)] md:grid-cols-[minmax(0,1fr)_auto]">
      <div className="grid gap-8">
        <p className="w-max rounded-lg border border-[#49d6cd]/35 bg-[#49d6cd]/10 px-2.5 py-1.5 text-xs font-black uppercase text-[#5ee0d5]">
          Losowanie restauracji
        </p>
        <h1 className="max-w-[16ch] text-4xl font-black leading-none text-white md:text-5xl">
          Co dziś zamawiamy?
        </h1>
        <p className="max-w-2xl text-base font-semibold leading-relaxed text-[#c7d4dc]">
        </p>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-3 md:min-w-55 md:grid-cols-1" aria-label="Skrót działania">
        <span className="rounded-lg border border-white/10 bg-white/10 px-3 py-2.5 font-black text-[#f7fbfc] backdrop-blur-xl">
          {cuisineCount} kuchni
        </span>
        <span className="rounded-lg border border-white/10 bg-white/10 px-3 py-2.5 font-black text-[#f7fbfc] backdrop-blur-xl">
          1 losowanie
        </span>
        <span className="rounded-lg border border-white/10 bg-white/10 px-3 py-2.5 font-black text-[#f7fbfc] backdrop-blur-xl">
          zero dyskusji
        </span>
      </div>
    </header>
  );
}

type CuisineFilterListProps = {
  cuisines: Cuisine[];
  excludedCuisineIds: string[];
  placesByCuisineId: PlacesByCuisineId;
  onToggleCuisine: (cuisineId: string) => void;
  onExcludeAll: () => void;
  onClearExclusions: () => void;
};

function CuisineFilterList({
  cuisines,
  excludedCuisineIds,
  placesByCuisineId,
  onToggleCuisine,
  onExcludeAll,
  onClearExclusions
}: CuisineFilterListProps) {
  return (
    <section
      className="grid gap-4 rounded-lg border border-white/10 bg-[#080b10]/65 p-4 shadow-[0_22px_58px_rgb(0_0_0_/_28%)] backdrop-blur-xl"
      aria-labelledby="cuisine-filter-heading"
    >
      <div className="grid gap-3 sm:flex sm:items-end sm:justify-between">
        <div>
          <h2 id="cuisine-filter-heading" className="text-xl font-black text-[#edf4f8]">
            Wyklucz kuchnie
          </h2>
          <p className="mt-1 text-sm font-extrabold text-[#91a1ad]">
            Kliknij tylko te opcje, których dziś nie chcecie.
          </p>
        </div>
        <div className="grid gap-2 sm:justify-items-end">
          <p className="font-black text-[#91a1ad]">Dostępne: {cuisines.length - excludedCuisineIds.length}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              className="min-h-11 rounded-lg border border-[#5ee0d5]/25 bg-[#5ee0d5]/10 px-4 text-base font-black text-[#5ee0d5] transition hover:-translate-y-px hover:bg-[#5ee0d5]/20"
              type="button"
              onClick={onClearExclusions}
            >
              Wyczyść zaznaczenie
            </button>
            <button
              className="min-h-11 rounded-lg border border-[#ff8a7a]/25 bg-[#ff6a54]/10 px-4 text-base font-black text-[#ff8a7a] transition hover:-translate-y-px hover:bg-[#ff6a54]/20"
              type="button"
              onClick={onExcludeAll}
            >
              Wyklucz wszystko
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cuisines.map((cuisine) => {
          const isExcluded = excludedCuisineIds.includes(cuisine.id);
          const livePlaces = placesByCuisineId[cuisine.id] ?? [];
          const placeCount = livePlaces.length;

          return (
            <button
              className={`grid min-h-25 content-between gap-3 rounded-lg border p-4 text-left transition hover:-translate-y-0.5 ${
                isExcluded
                  ? 'border-[#ff8a7a]/20 bg-[#0d1117]/90 text-[#8795a1] shadow-none'
                  : 'border-[#5ee0d5]/25 bg-[#18222c]/95 text-[#edf4f8] shadow-[inset_0_1px_0_rgb(255_255_255_/_6%),0_18px_44px_rgb(0_0_0_/_32%)] hover:border-[#5ee0d5]/80 hover:bg-[#1c2f38]'
              }`}
              key={cuisine.id}
              type="button"
              aria-pressed={!isExcluded}
              onClick={() => onToggleCuisine(cuisine.id)}
            >
              <span className="text-base font-black">{cuisine.name}</span>
              <small
                className={`w-max rounded-lg px-2 py-1 text-xs font-black ${
                  isExcluded ? 'bg-[#ff6a54]/10 text-[#ff8a7a]' : 'bg-[#49d6cd]/10 text-[#5ee0d5]'
                }`}
              >
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
  isDrawing: boolean;
  onDrawModeChange: (drawMode: DrawMode) => void;
  onDraw: () => void;
  onReset: () => void;
  onLoadPlaces: () => void;
};

function ActionBar({
  availableCount,
  availablePlacesCount,
  hasResult,
  placesStatus,
  remainingPlacesRequests,
  requiredPlacesRequests,
  drawMode,
  isDrawing,
  onDrawModeChange,
  onDraw,
  onReset,
  onLoadPlaces
}: ActionBarProps) {
  const noOptions = availableCount === 0;
  const noPlaces = availablePlacesCount === 0;
  const isLoadingPlaces = placesStatus === 'loading';
  const hasApiKey = hasGooglePlacesApiKey();
  const canLoadPlaces = hasApiKey && !isLoadingPlaces && remainingPlacesRequests >= requiredPlacesRequests;

  return (
    <section
      className="grid gap-3 rounded-lg border border-white/10 bg-[#111820]/90 p-5 shadow-[0_22px_54px_rgb(0_0_0_/_28%)] backdrop-blur-xl"
      aria-label="Akcje"
    >
      <button
        className="min-h-18 rounded-lg border-0 bg-[#5ee0d5] px-5 text-xl font-black text-[#071014] shadow-[0_16px_36px_rgb(94_224_213_/_20%)] transition hover:-translate-y-px hover:bg-[#39cbc0] hover:shadow-[0_18px_42px_rgb(57_203_192_/_24%)] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none"
        type="button"
        onClick={onDraw}
        disabled={noOptions || noPlaces || isDrawing}
      >
        <span className="inline-flex items-center justify-center gap-3">
          {isDrawing && <span className="size-5 animate-spin rounded-full border-[3px] border-[#071014]/25 border-t-[#071014]" />}
          {isDrawing
            ? 'Losuję...'
            : hasResult
              ? 'Losuj ponownie'
              : drawMode === 'full'
                ? 'Wylosuj dla nas'
                : 'Wylosuj kuchnię'}
        </span>
      </button>

      <div className="grid grid-cols-2 gap-1 rounded-lg border border-white/10 bg-[#080b10]/60 p-1" aria-label="Tryb losowania">
        <button
          className={`min-h-11 rounded-md px-3 text-base font-black transition ${
            drawMode === 'full' ? 'bg-[#5ee0d5] text-[#071014]' : 'text-[#91a1ad] hover:text-[#edf4f8]'
          }`}
          type="button"
          onClick={() => onDrawModeChange('full')}
        >
          Kuchnia + restauracja
        </button>
        <button
          className={`min-h-11 rounded-md px-3 text-base font-black transition ${
            drawMode === 'cuisine-first' ? 'bg-[#5ee0d5] text-[#071014]' : 'text-[#91a1ad] hover:text-[#edf4f8]'
          }`}
          type="button"
          onClick={() => onDrawModeChange('cuisine-first')}
        >
          Najpierw kuchnia
        </button>
      </div>

      {!noOptions && noPlaces && (
        <p className="rounded-lg border border-[#5ee0d5]/20 bg-[#5ee0d5]/10 p-3 text-sm font-extrabold leading-relaxed text-[#dff8f6]">
          Najpierw pobierz restauracje z Google, potem losowanie będzie gotowe.
        </p>
      )}

      <div className="group relative grid">
        <button
          className="min-h-13 rounded-lg border-0 bg-[#f2c14e] px-5 text-base font-black text-[#111820] transition hover:-translate-y-px hover:bg-[#e5ad27] hover:shadow-[0_14px_30px_rgb(242_193_78_/_20%)] disabled:cursor-not-allowed disabled:opacity-50"
          type="button"
          onClick={onLoadPlaces}
          disabled={!canLoadPlaces}
        >
          {isLoadingPlaces ? 'Pobieram miejsca...' : 'Pobierz miejsca z Google'}
        </button>
        <span
          className="pointer-events-none absolute right-0 bottom-[calc(100%+8px)] z-10 w-[min(260px,80vw)] translate-y-1 rounded-lg border border-white/10 bg-[#080b10]/95 p-2.5 text-xs font-extrabold leading-snug text-[#c7d4dc] opacity-0 shadow-[0_16px_34px_rgb(0_0_0_/_32%)] transition group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100"
          role="tooltip"
        >
          Limit: {remainingPlacesRequests}/{DAILY_PLACES_REQUEST_LIMIT} zapytań dziś. Jedno pobranie zużywa{' '}
          {requiredPlacesRequests}. Wyniki są zapamiętywane na 24 godziny.
        </span>
      </div>

      <button
        className="min-h-13 rounded-lg border-0 bg-[#f2c14e] px-5 text-base font-black text-[#111820] transition hover:-translate-y-px hover:bg-[#e5ad27] hover:shadow-[0_14px_30px_rgb(242_193_78_/_20%)]"
        type="button"
        onClick={onReset}
      >
        Przywróć wszystko
      </button>

      {noOptions && <p className="font-black text-[#ff8a7a]">Brak dostępnych kuchni. Włącz co najmniej jedną opcję.</p>}
      {!hasApiKey && <p className="font-black text-[#ff8a7a]">Dodaj VITE_GOOGLE_MAPS_API_KEY w .env, żeby pobrać miejsca.</p>}
      {hasApiKey && remainingPlacesRequests < requiredPlacesRequests && (
        <p className="font-black text-[#ff8a7a]">Za mało zapytań na odświeżenie wszystkich grup.</p>
      )}
    </section>
  );
}

type ResultCardProps = {
  result: Result | null;
  drawMode: DrawMode;
  isDrawing: boolean;
  onReroll: () => void;
  onDrawRestaurant: () => void;
};

function ResultCard({ result, drawMode, isDrawing, onReroll, onDrawRestaurant }: ResultCardProps) {
  const cardClasses =
    "grid min-h-[430px] content-center justify-items-start gap-4 overflow-hidden rounded-lg border border-white/10 bg-[linear-gradient(135deg,rgb(6_10_15_/_76%),rgb(16_83_83_/_70%)),url('https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80')] bg-cover bg-center p-7 text-white shadow-[0_28px_70px_rgb(0_0_0_/_36%)]";

  if (isDrawing) {
    return (
      <section className={`${cardClasses} justify-items-center text-center`} aria-label="Losowanie">
        <div className="relative grid size-32 place-items-center">
          <span className="absolute inset-0 animate-ping rounded-full border border-[#5ee0d5]/30" />
          <span className="absolute inset-4 animate-spin rounded-full border-4 border-[#5ee0d5]/20 border-t-[#f2c14e]" />
          <span className="relative rounded-lg bg-[#f2c14e] px-3 py-2 text-sm font-black uppercase text-[#101820]">
            Losuję
          </span>
        </div>
        <h2 className="animate-pulse text-4xl font-black leading-none md:text-6xl">Chwila decyzji.</h2>
        <div className="flex gap-2">
          <span className="size-3 animate-bounce rounded-full bg-[#5ee0d5]" />
          <span className="size-3 animate-bounce rounded-full bg-[#f2c14e] [animation-delay:120ms]" />
          <span className="size-3 animate-bounce rounded-full bg-[#ff8a7a] [animation-delay:240ms]" />
        </div>
      </section>
    );
  }

  if (!result) {
    return (
      <section
        className={`${cardClasses} bg-[linear-gradient(135deg,rgb(17_24_32_/_88%),rgb(20_36_42_/_78%)),url('https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1200&q=80')]`}
        aria-label="Wynik"
      >
        <p className="rounded-lg bg-[#f2c14e] px-2.5 py-1.5 text-sm font-black uppercase text-[#101820]">
          Gotowe do losowania?
        </p>
        <p className="text-xl font-black text-[#dff8f6]">
          Pobierz miejsca z Google, wyklucz niechciane kuchnie i kliknij losowanie.
        </p>
      </section>
    );
  }

  const hasRestaurant = Boolean(result.restaurant);

  return (
    <section className={cardClasses} aria-label="Wynik">
      <p className="rounded-lg bg-[#f2c14e] px-2.5 py-1.5 text-sm font-black uppercase text-[#101820]">
        {hasRestaurant ? 'Dzisiaj zamawiamy' : 'Najpierw kuchnia'}
      </p>
      <h2 className="text-4xl font-black leading-none md:text-6xl">{result.cuisine}</h2>
      {hasRestaurant ? (
        <p className="text-xl font-black text-[#dff8f6]">{result.restaurant}</p>
      ) : (
        <p className="text-xl font-black text-[#dff8f6]">Wybierz restaurację z tej kuchni, kiedy będziecie gotowi.</p>
      )}
      {result.address && <p className="text-base font-extrabold leading-relaxed text-[#c7d4dc]">{result.address}</p>}
      {hasRestaurant && (
        <div className="flex flex-wrap gap-2">
          <span className="rounded-lg border border-white/10 bg-white/10 px-2.5 py-1.5 text-sm font-black text-[#dff8f6]">
            Google Places
          </span>
          {result.rating && (
            <span className="rounded-lg border border-white/10 bg-white/10 px-2.5 py-1.5 text-sm font-black text-[#dff8f6]">
              Ocena {result.rating.toFixed(1)}
            </span>
          )}
        </div>
      )}
      {result.googleMapsUrl && (
        <a
          className="rounded-lg border border-white/10 bg-white/10 px-2.5 py-1.5 text-sm font-black text-[#dff8f6] no-underline transition hover:bg-[#5ee0d5] hover:text-[#101820]"
          href={result.googleMapsUrl}
          target="_blank"
          rel="noreferrer"
        >
          Otwórz w Google Maps
        </a>
      )}
      {drawMode === 'cuisine-first' && !hasRestaurant && (
        <button
          className="min-h-13 rounded-lg border-0 bg-[#f2c14e] px-5 text-base font-black text-[#111820] transition hover:-translate-y-px hover:bg-[#e5ad27]"
          type="button"
          onClick={onDrawRestaurant}
        >
          Dobierz restaurację
        </button>
      )}
      <button
        className="min-h-13 rounded-lg border-0 bg-[#f2c14e] px-5 text-base font-black text-[#111820] transition hover:-translate-y-px hover:bg-[#e5ad27]"
        type="button"
        onClick={onReroll}
      >
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
  const [isDrawing, setIsDrawing] = useState(false);
  const drawTimeoutRef = useRef<number | null>(null);

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

    setCuisines(CUISINES);
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

  useEffect(() => {
    return () => {
      if (drawTimeoutRef.current) {
        window.clearTimeout(drawTimeoutRef.current);
      }
    };
  }, []);

  function toggleCuisine(cuisineId: string) {
    setExcludedCuisineIds((currentIds) =>
      currentIds.includes(cuisineId)
        ? currentIds.filter((id) => id !== cuisineId)
        : [...currentIds, cuisineId]
    );
  }

  function drawResult() {
    if (availableCuisinesWithPlaces.length === 0 || isDrawing) {
      return;
    }

    const cuisine = getRandomItem(availableCuisinesWithPlaces);

    startDrawing(() => {
      if (drawMode === 'cuisine-first') {
        setCurrentResult({
          cuisine: cuisine.name,
          cuisineId: cuisine.id,
          restaurant: ''
        });

        return;
      }

      drawRestaurantForCuisine(cuisine);
    });
  }

  function startDrawing(onComplete: () => void) {
    if (drawTimeoutRef.current) {
      window.clearTimeout(drawTimeoutRef.current);
    }

    setIsDrawing(true);
    drawTimeoutRef.current = window.setTimeout(() => {
      onComplete();
      setIsDrawing(false);
      drawTimeoutRef.current = null;
    }, DRAW_ANIMATION_MS);
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
    if (!currentResult || isDrawing) {
      return;
    }

    const cuisine = cuisines.find((currentCuisine) => currentCuisine.id === currentResult.cuisineId);

    if (!cuisine || !placesByCuisineId[cuisine.id]?.length) {
      return;
    }

    startDrawing(() => drawRestaurantForCuisine(cuisine));
  }

  async function loadPlaces() {
    const hasLoadedPlaces = placesStatus === 'ready';

    if (!hasGooglePlacesApiKey() || placesStatus === 'loading') {
      return;
    }

    if (
      hasLoadedPlaces &&
      !window.confirm(
        'Masz już pobrane miejsca z Google. Ponowne pobranie zużyje kolejne zapytania z dziennego limitu. Czy na pewno odświeżyć dane?'
      )
    ) {
      return;
    }

    setPlacesStatus('loading');
    setPlacesMessage(hasLoadedPlaces ? 'Odświeżam miejsca z Google.' : 'Pobieram miejsca z Google.');

    try {
      const result = await fetchPlacesForCuisines(cuisines);

      setCuisines(CUISINES);
      setPlacesByCuisineId(result.placesByCuisineId);
      setRemainingPlacesRequests(getRemainingPlacesRequests());
      setPlacesStatus('ready');
      setPlacesMessage(`Pobrano ${result.totalPlaces} miejsc z Google Places dla Zielonej Góry.`);
    } catch (error) {
      setRemainingPlacesRequests(getRemainingPlacesRequests());
      setPlacesStatus('error');
      setPlacesMessage(error instanceof Error ? error.message : 'Nie udało się pobrać miejsc.');
    }
  }

  function resetAll() {
    stopDrawing();
    setExcludedCuisineIds([]);
    setCurrentResult(null);
  }

  function clearExclusions() {
    stopDrawing();
    setExcludedCuisineIds([]);
    setCurrentResult(null);
  }

  function excludeAll() {
    stopDrawing();
    setExcludedCuisineIds(cuisines.map((cuisine) => cuisine.id));
    setCurrentResult(null);
  }

  function stopDrawing() {
    if (drawTimeoutRef.current) {
      window.clearTimeout(drawTimeoutRef.current);
      drawTimeoutRef.current = null;
    }

    setIsDrawing(false);
  }

  return (
    <main className="mx-auto grid min-h-screen w-[min(1120px,calc(100%-32px))] gap-6 py-8">
      <Header cuisineCount={cuisines.length} />

      <section className="grid items-stretch gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]" aria-label="Losowanie">
        <ResultCard
          result={currentResult}
          drawMode={drawMode}
          isDrawing={isDrawing}
          onReroll={drawResult}
          onDrawRestaurant={drawRestaurantForCurrentCuisine}
        />
        <ActionBar
          availableCount={availableCuisines.length}
          availablePlacesCount={availablePlacesCount}
          hasResult={currentResult !== null}
          placesStatus={placesStatus}
          remainingPlacesRequests={remainingPlacesRequests}
          requiredPlacesRequests={requiredPlacesRequests}
          drawMode={drawMode}
          isDrawing={isDrawing}
          onDrawModeChange={setDrawMode}
          onDraw={drawResult}
          onReset={resetAll}
          onLoadPlaces={loadPlaces}
        />
      </section>

      <CuisineFilterList
        cuisines={cuisines}
        excludedCuisineIds={excludedCuisineIds}
        placesByCuisineId={placesByCuisineId}
        onToggleCuisine={toggleCuisine}
        onExcludeAll={excludeAll}
        onClearExclusions={clearExclusions}
      />

      {placesMessage && (
        <p
          className={`fixed right-4 bottom-4 z-20 w-[min(380px,calc(100%-36px))] rounded-lg border bg-[#111820]/95 px-4 py-3.5 font-black leading-relaxed shadow-[0_18px_44px_rgb(0_0_0_/_36%)] ${
            placesStatus === 'error' ? 'border-[#ff8a7a]/30 text-[#ffb5aa]' : 'border-[#5ee0d5]/30 text-[#dff8f6]'
          }`}
        >
          {placesMessage}
        </p>
      )}
    </main>
  );
}

export default App;
