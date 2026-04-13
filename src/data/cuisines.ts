export type Cuisine = {
  id: string;
  name: string;
  googlePlacesQuery: string;
  googlePlaceTypes: string[];
};

export const CUISINES: Cuisine[] = [
  {
    id: 'pizza',
    name: 'Pizza',
    googlePlacesQuery: 'pizza restauracja Zielona Góra',
    googlePlaceTypes: ['pizza_restaurant']
  },
  {
    id: 'burgers',
    name: 'Burgery',
    googlePlacesQuery: 'burgery restauracja Zielona Góra',
    googlePlaceTypes: ['hamburger_restaurant']
  },
  {
    id: 'sushi',
    name: 'Sushi',
    googlePlacesQuery: 'sushi restauracja Zielona Góra',
    googlePlaceTypes: ['sushi_restaurant']
  },
  {
    id: 'thai',
    name: 'Tajska',
    googlePlacesQuery: 'tajska restauracja Zielona Góra',
    googlePlaceTypes: ['thai_restaurant']
  },
  {
    id: 'indian',
    name: 'Indyjska',
    googlePlacesQuery: 'indyjska restauracja Zielona Góra',
    googlePlaceTypes: ['indian_restaurant']
  },
  {
    id: 'mexican',
    name: 'Meksykańska',
    googlePlacesQuery: 'meksykańska restauracja Zielona Góra',
    googlePlaceTypes: ['mexican_restaurant']
  },
  {
    id: 'chinese',
    name: 'Chińska',
    googlePlacesQuery: 'chińska restauracja Zielona Góra',
    googlePlaceTypes: ['chinese_restaurant']
  },
  {
    id: 'kebab',
    name: 'Kebab',
    googlePlacesQuery: 'kebab Zielona Góra',
    googlePlaceTypes: ['middle_eastern_restaurant']
  },
  {
    id: 'pasta',
    name: 'Makarony',
    googlePlacesQuery: 'makaron pasta restauracja Zielona Góra',
    googlePlaceTypes: ['italian_restaurant']
  },
  {
    id: 'vegetarian',
    name: 'Wegetariańska',
    googlePlacesQuery: 'wegetariańska restauracja Zielona Góra',
    googlePlaceTypes: ['vegetarian_restaurant', 'vegan_restaurant']
  },
  {
    id: 'vietnamese',
    name: 'Wietnamska',
    googlePlacesQuery: 'wietnamska restauracja Zielona Góra',
    googlePlaceTypes: ['vietnamese_restaurant']
  },
  {
    id: 'desserts',
    name: 'Desery',
    googlePlacesQuery: 'desery kawiarnia Zielona Góra',
    googlePlaceTypes: ['dessert_shop', 'ice_cream_shop', 'bakery', 'cafe']
  }
];
