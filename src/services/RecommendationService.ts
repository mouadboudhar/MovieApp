import axios from 'axios';
import { Movie, RecommendationResult, Credits, MovieDetails, Genre, ProductionCompany } from '../types';
import { getLastHighRatedMovie } from './db';
import { TMDB_API_KEY, TMDB_BASE_URL } from '../config';

// Create axios instance with default config
const tmdbApi = axios.create({
  baseURL: TMDB_BASE_URL,
  params: {
    api_key: TMDB_API_KEY,
    language: 'en-US',
  },
});

interface TMDBMovieResponse {
  id: number;
  title: string;
  poster_path: string | null;
  overview: string;
  release_date: string;
  vote_average: number;
  vote_count: number;
  backdrop_path: string | null;
  genre_ids?: number[];
}

interface TMDBRecommendationsResponse {
  page: number;
  results: TMDBMovieResponse[];
  total_pages: number;
  total_results: number;
}

interface TMDBMovieDetailsResponse extends TMDBMovieResponse {
  genres: Genre[];
  runtime: number;
  tagline?: string;
  budget?: number;
  revenue?: number;
  production_companies: ProductionCompany[];
}

interface TMDBCreditsResponse {
  id: number;
  cast: Array<{
    id: number;
    name: string;
    character: string;
    profile_path: string | null;
    order: number;
  }>;
  crew: Array<{
    id: number;
    name: string;
    job: string;
    department: string;
    profile_path: string | null;
  }>;
}

/**
 * Transform TMDB movie response to our Movie interface
 */
const transformMovie = (tmdbMovie: TMDBMovieResponse): Movie => ({
  id: tmdbMovie.id,
  tmdb_id: tmdbMovie.id,
  title: tmdbMovie.title,
  poster_path: tmdbMovie.poster_path,
  overview: tmdbMovie.overview,
  release_date: tmdbMovie.release_date,
  vote_average: tmdbMovie.vote_average,
  vote_count: tmdbMovie.vote_count,
  backdrop_path: tmdbMovie.backdrop_path,
  genre_ids: tmdbMovie.genre_ids,
});

/**
 * Get movie details by TMDB ID
 */
export const getMovieDetails = async (movieId: number): Promise<MovieDetails | null> => {
  try {
    const response = await tmdbApi.get<TMDBMovieDetailsResponse>(
      `/movie/${movieId}`
    );
    const data = response.data;
    return {
      ...transformMovie(data),
      genres: data.genres,
      runtime: data.runtime,
      tagline: data.tagline,
      budget: data.budget,
      revenue: data.revenue,
      production_companies: data.production_companies,
    };
  } catch (error) {
    console.error('Error fetching movie details:', error);
    return null;
  }
};

/**
 * Get movie credits (cast & crew)
 */
export const getMovieCredits = async (movieId: number): Promise<Credits | null> => {
  try {
    const response = await tmdbApi.get<TMDBCreditsResponse>(
      `/movie/${movieId}/credits`
    );
    return {
      cast: response.data.cast.map((c) => ({
        id: c.id,
        name: c.name,
        character: c.character,
        profile_path: c.profile_path,
        order: c.order,
      })),
      crew: response.data.crew.map((c) => ({
        id: c.id,
        name: c.name,
        job: c.job,
        department: c.department,
        profile_path: c.profile_path,
      })),
    };
  } catch (error) {
    console.error('Error fetching movie credits:', error);
    return null;
  }
};

/**
 * Get recommendations based on a specific movie
 */
export const getMovieRecommendations = async (
  movieId: number
): Promise<Movie[]> => {
  try {
    const response = await tmdbApi.get<TMDBRecommendationsResponse>(
      `/movie/${movieId}/recommendations`
    );
    return response.data.results.map(transformMovie);
  } catch (error) {
    console.error('Error fetching movie recommendations:', error);
    return [];
  }
};

/**
 * Get trending movies of the week
 */
export const getTrendingMovies = async (): Promise<Movie[]> => {
  try {
    const response = await tmdbApi.get<TMDBRecommendationsResponse>(
      '/trending/movie/week'
    );
    return response.data.results.map(transformMovie);
  } catch (error) {
    console.error('Error fetching trending movies:', error);
    return [];
  }
};

/**
 * Get now playing movies (latest releases in theaters)
 */
export const getNowPlayingMovies = async (): Promise<Movie[]> => {
  try {
    const response = await tmdbApi.get<TMDBRecommendationsResponse>(
      '/movie/now_playing'
    );
    return response.data.results.map(transformMovie);
  } catch (error) {
    console.error('Error fetching now playing movies:', error);
    return [];
  }
};

/**
 * Get personalized recommendations based on user's ratings
 * - If user has a high-rated movie (>= 4 stars), get recommendations based on that movie
 * - Otherwise, return trending movies of the week
 */
export const getRecommendations = async (): Promise<RecommendationResult> => {
  try {
    // Check if user has any highly rated movies
    const lastHighRatedMovieId = await getLastHighRatedMovie();

    if (lastHighRatedMovieId) {
      // Get the movie details to show in the title
      const movieDetails = await getMovieDetails(lastHighRatedMovieId);
      const movieTitle = movieDetails?.title ?? 'your favorite movie';

      // Fetch recommendations based on that movie
      const recommendations = await getMovieRecommendations(lastHighRatedMovieId);

      return {
        title: `Because you liked ${movieTitle}`,
        movies: recommendations,
      };
    }

    // No high-rated movies, return trending
    const trendingMovies = await getTrendingMovies();

    return {
      title: 'Trending This Week',
      movies: trendingMovies,
    };
  } catch (error) {
    console.error('Error getting recommendations:', error);

    // Fallback to trending on error
    const trendingMovies = await getTrendingMovies();
    return {
      title: 'Trending This Week',
      movies: trendingMovies,
    };
  }
};

/**
 * Search movies by query
 */
export const searchMovies = async (query: string): Promise<Movie[]> => {
  try {
    const response = await tmdbApi.get<TMDBRecommendationsResponse>(
      '/search/movie',
      {
        params: { query },
      }
    );
    return response.data.results.map(transformMovie);
  } catch (error) {
    console.error('Error searching movies:', error);
    return [];
  }
};

export default {
  getRecommendations,
  getMovieDetails,
  getMovieCredits,
  getMovieRecommendations,
  getTrendingMovies,
  getNowPlayingMovies,
  searchMovies,
};
