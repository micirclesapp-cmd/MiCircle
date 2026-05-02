import Constants from 'expo-constants';

const GOOGLE_PLACES_API_KEY = Constants.expoConfig?.extra?.googlePlacesApiKey || process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
const TMDB_API_KEY = Constants.expoConfig?.extra?.tmdbApiKey || process.env.EXPO_PUBLIC_TMDB_API_KEY;

export interface PlaceResult {
  id: string;
  name: string;
  address: string;
}

export interface MovieResult {
  id: string;
  title: string;
  releaseDate: string;
  posterPath?: string;
}

/**
 * Search for restaurants using Google Places API
 */
export const searchRestaurants = async (query: string): Promise<PlaceResult[]> => {
  if (!query || query.length < 3) return [];
  
  if (!GOOGLE_PLACES_API_KEY) {
    console.warn('Google Places API Key is missing. Returning mock data for development.');
    return [
      { id: 'mock1', name: `Mock Restaurant: ${query}`, address: '123 Food Street, City' },
      { id: 'mock2', name: 'The Great Cafe', address: '456 Coffee Ave, City' }
    ];
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&type=restaurant&key=${GOOGLE_PLACES_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK') {
      return data.results.slice(0, 5).map((place: any) => ({
        id: place.place_id,
        name: place.name,
        address: place.formatted_address,
      }));
    }
    return [];
  } catch (error) {
    console.error('Error searching restaurants:', error);
    return [];
  }
};

/**
 * Search for movies using TMDB API (region IN)
 */
export const searchMovies = async (query: string): Promise<MovieResult[]> => {
  if (!query || query.length < 3) return [];
  
  if (!TMDB_API_KEY) {
    console.warn('TMDB API Key is missing. Returning mock data for development.');
    return [
      { id: 'mock1', title: `Mock Movie: ${query}`, releaseDate: '2026-05-01' },
      { id: 'mock2', title: 'The Blockbuster', releaseDate: '2026-05-15' }
    ];
  }

  try {
    const url = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&region=IN&page=1`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.results) {
      return data.results.slice(0, 5).map((movie: any) => ({
        id: movie.id.toString(),
        title: movie.title,
        releaseDate: movie.release_date,
        posterPath: movie.poster_path ? `https://image.tmdb.org/t/p/w200${movie.poster_path}` : undefined,
      }));
    }
    return [];
  } catch (error) {
    console.error('Error searching movies:', error);
    return [];
  }
};
