export type Cuisine = {
  id: string;
  name: string;
  googlePlacesQuery: string;
};

export const CUISINES_PL = [
  'Pizza',
  'Burgery',
  'Kebab',
  'Sushi',
  'Kuchnia chińska',
  'Kuchnia tajska',
  'Kuchnia indyjska',
  'Kuchnia włoska',
  'Kuchnia meksykańska',
  'Kuchnia polska',
  'Kuchnia amerykańska',
  'Kuchnia grecka',
  'Kuchnia turecka',
  'Kuchnia wietnamska',
  'Kuchnia japońska',
  'Kuchnia koreańska',
  'Kuchnia bliskowschodnia',
  'Kuchnia hiszpańska',
  'Kuchnia czeska',
  'Steki',
  'Grill / BBQ',
  'Owoce morza',
  'Makarony',
  'Ramen',
  'Street food',
  'Desery',
  'Fast food',
  'Wrapy',
  'Kanapki'
] as const;

function toCuisineId(name: string) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ł/g, 'l')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function toGoogleQuery(name: string) {
  return `${name} restauracja Zielona Góra`;
}

export const CUISINES: Cuisine[] = CUISINES_PL.map((name) => ({
  id: toCuisineId(name),
  name,
  googlePlacesQuery: toGoogleQuery(name)
}));
