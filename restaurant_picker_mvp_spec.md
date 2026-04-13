# Restaurant / Cuisine Picker — MVP Specification

## Product idea
A lightweight React web app that helps a group decide what to eat when nobody knows what they want. The app should reduce decision fatigue by combining simple cuisine filtering, exclusions, and random selection.

The first version should use hardcoded cuisines and restaurant suggestions. In the future, it should be possible to connect the app to Pyszne.pl and replace static data with real delivery options.

---

## Product goal
Help users quickly answer one question:

**"What should we order today?"**

The MVP should make this decision fast, playful, and low-friction.

---

## Main use case
A user opens the page with friends or family, selects which cuisines are acceptable, excludes cuisines they do not want, and clicks a button to draw one random result.

The result can be:
- a cuisine
- a restaurant suggestion inside that cuisine
- optionally another reroll if the first result is rejected

---

## MVP scope

### Included
- Single-page React app
- Hardcoded list of cuisines
- Hardcoded list of restaurant suggestions per cuisine
- Ability to exclude specific cuisines
- Ability to include only selected cuisines
- Random cuisine / restaurant draw
- Reroll option
- Clean mobile-friendly UI
- Simple state stored in memory only

### Not included in MVP
- Authentication
- User accounts
- Saving preferences to backend
- Real API integration
- Geolocation
- Delivery time / pricing / ratings
- Advanced group voting

---

## Core user stories
1. As a user, I want to see a list of cuisines, so I can quickly decide what category of food is possible.
2. As a user, I want to exclude cuisines we do not want today, so they are not considered in the draw.
3. As a user, I want to draw a random result, so the app helps us make a decision.
4. As a user, I want to reroll, so I can get another option without resetting everything.
5. As a user, I want to see example restaurants for each cuisine, so the result feels concrete.
6. As a future user, I want real restaurant data from Pyszne.pl, so the suggestions are relevant to my location.

---

## Functional requirements

### 1. Cuisine list
The app should display a predefined list of cuisines, for example:
- Pizza
- Burgers
- Sushi
- Thai
- Indian
- Mexican
- Chinese
- Kebab
- Pasta
- Vegetarian
- Vietnamese
- Desserts

Each cuisine should contain:
- `id`
- `name`
- `enabled` or selection status
- `restaurants` array

Example structure:

```ts
{
  id: 'sushi',
  name: 'Sushi',
  restaurants: ['Sushi Go', 'Tokyo Roll', 'Wasabi Box']
}
```

### 2. Excluding cuisines
Users should be able to remove cuisines from the draw pool.

Recommended interaction:
- each cuisine appears as a selectable card, chip, or checkbox
- users can toggle cuisines on/off
- disabled cuisines are visibly marked as excluded

Behavior:
- excluded cuisines must never appear in random results
- if all cuisines are excluded, the draw button should be disabled
- the UI should display a helpful message like:
  `No cuisines available. Please enable at least one option.`

### 3. Random selection
The app should support a simple randomization flow.

Recommended MVP logic:
1. Build a list of active cuisines
2. Randomly choose one cuisine
3. Randomly choose one restaurant from that cuisine
4. Display both results

Example output:
- **Cuisine:** Thai
- **Restaurant:** Bangkok Wok

### 4. Reroll
After showing a result, the app should provide:
- `Draw again`
- optional `Only reroll restaurant`

MVP minimum:
- one button to generate a fully new result

### 5. Reset filters
Users should be able to restore all cuisines.

Button:
- `Reset all`

Behavior:
- all cuisines become active again
- current result may remain visible or be cleared; either is acceptable for MVP, but clearing is cleaner

---

## Suggested UI structure

### Page layout
A single-page layout with 4 main sections:

#### 1. Header
- App name, for example: `What Should We Eat?`
- Short subtitle: `Pick a cuisine and let luck decide.`

#### 2. Filter section
- Grid of cuisine chips/cards
- Active state
- Excluded state
- Counter showing active cuisines, e.g. `8 cuisines available`

#### 3. Action section
- Primary button: `Pick for us`
- Secondary button: `Reset all`

#### 4. Result section
Visible after first draw.

Should contain:
- selected cuisine
- selected restaurant
- reroll button

Optional MVP extra:
- small message like `Still not feeling it? Try again.`

---

## UX notes
- The app should feel playful but not childish.
- The main action should be obvious.
- The user should understand at a glance which cuisines are excluded.
- The result should be visually prominent.
- Mobile layout should be first-class, because this is likely to be used on phones.

Recommended styles:
- rounded cards or chips
- strong button hierarchy
- simple animations for result changes
- subtle shadows
- enough spacing for touch interaction

---

## State management
Local React state is enough for MVP.

Suggested state:

```ts
selectedCuisineIds: string[]
result: {
  cuisineId: string
  cuisineName: string
  restaurantName: string
} | null
```

Alternative simpler approach:
- store full cuisine data in a constant
- store excluded cuisine ids in state
- derive available cuisines from that

Recommended MVP state:

```ts
excludedCuisineIds: string[]
currentResult: {
  cuisine: string
  restaurant: string
} | null
```

This is simpler and easier to maintain.

---

## Example hardcoded data

```ts
export const CUISINES = [
  {
    id: 'pizza',
    name: 'Pizza',
    restaurants: ['Pizza House', 'Mamma Mia Pizza', 'Fire Crust']
  },
  {
    id: 'burgers',
    name: 'Burgers',
    restaurants: ['Burger Spot', 'Grill Bros', 'Smash Town']
  },
  {
    id: 'sushi',
    name: 'Sushi',
    restaurants: ['Sushi Go', 'Tokyo Roll', 'Wasabi Box']
  },
  {
    id: 'thai',
    name: 'Thai',
    restaurants: ['Bangkok Wok', 'Thai Flame', 'Pad Thai Corner']
  },
  {
    id: 'indian',
    name: 'Indian',
    restaurants: ['Curry House', 'Bombay Kitchen', 'Masala Express']
  },
  {
    id: 'mexican',
    name: 'Mexican',
    restaurants: ['Taco Street', 'Casa Burrito', 'Mucho Fiesta']
  }
]
```

---

## Randomization rules

### Basic algorithm
```ts
const availableCuisines = CUISINES.filter(
  cuisine => !excludedCuisineIds.includes(cuisine.id)
)

const randomCuisine = availableCuisines[
  Math.floor(Math.random() * availableCuisines.length)
]

const randomRestaurant = randomCuisine.restaurants[
  Math.floor(Math.random() * randomCuisine.restaurants.length)
]
```

### Edge cases
- If `availableCuisines.length === 0`, do not allow drawing
- If a cuisine has no restaurants, either:
  - skip it during draw, or
  - display cuisine only

Recommended MVP rule:
- every hardcoded cuisine must have at least 1 restaurant

---

## Technical specification

### Stack
- React
- TypeScript preferred
- Tailwind CSS recommended for fast styling
- No backend for MVP

### Suggested component structure

```text
App
├── Header
├── CuisineFilterList
│   └── CuisineChip / CuisineCard
├── ActionBar
└── ResultCard
```

### Suggested file structure

```text
src/
  data/
    cuisines.ts
  components/
    Header.tsx
    CuisineFilterList.tsx
    CuisineChip.tsx
    ActionBar.tsx
    ResultCard.tsx
  App.tsx
```

For an even faster MVP, everything can live in `App.tsx` first.

---

## MVP acceptance criteria
- User can see a list of cuisines
- User can exclude one or more cuisines
- Excluded cuisines are not used in random draw
- User can draw a result from available cuisines only
- Result shows both cuisine and restaurant
- User can reroll
- User can reset exclusions
- App works on mobile and desktop

---

## Future roadmap

### Phase 2
- Save last used filters in local storage
- Add "Only cuisine" vs "Cuisine + restaurant" mode
- Add category tags like `cheap`, `spicy`, `healthy`, `fast`
- Add simple group voting

### Phase 3
- Integrate with Pyszne.pl
- Fetch restaurants dynamically by cuisine
- Filter by city / delivery area
- Show delivery time, minimum order, and rating
- Open selected restaurant directly in Pyszne.pl

---

## Pyszne.pl integration concept
This should not be implemented in MVP, but the app should be designed so static data can later be replaced by an external provider.

### Future integration assumptions
Potential data flow:
1. User selects city or location
2. App fetches available restaurants from Pyszne.pl
3. Restaurants are grouped or tagged by cuisine
4. Excluded cuisines are removed from the pool
5. Random result is generated from live restaurant data

### Important architectural note
The cuisine filtering and randomization logic should be independent from the data source.

This means the app should later support both:
- static local data
- API-provided restaurant data

Recommended abstraction:

```ts
type RestaurantOption = {
  id: string
  name: string
  cuisine: string
  url?: string
  deliveryTime?: string
  rating?: number
}
```

---

## Developer notes
- Keep business logic simple and isolated
- Make filters derived from state, not duplicated
- Avoid overengineering in MVP
- Focus on speed, clarity, and easy iteration

---

## Copy-ready MVP prompt for development

Build a single-page React app called **"What Should We Eat?"**.

Requirements:
- Use hardcoded cuisine data with restaurant suggestions
- Display cuisines as toggleable chips or cards
- Users can exclude cuisines from the random draw
- Add a primary button to randomly select one cuisine and one restaurant from the active list
- Add a reroll button
- Add a reset button to enable all cuisines again
- If all cuisines are excluded, disable the draw button and show an error/help message
- Make the UI responsive and mobile-friendly
- Use simple, clean styling
- Keep the logic easy to replace later with Pyszne.pl API data

Use a clean component structure, but keep the MVP implementation simple enough to live in one file if needed.

---

## Optional MVP enhancement
A useful extra for version 1 could be a switch:
- `Draw cuisine only`
- `Draw cuisine + restaurant`

That gives users a faster decision mode when they only want broad inspiration first.

