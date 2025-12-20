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
