// TypeScript interfaces for Movie App

export interface Movie {
  id: number;
  tmdb_id?: number;
  title: string;
  poster_path: string | null;
  overview?: string;
  release_date?: string;
  vote_average?: number;
  vote_count?: number;
  backdrop_path?: string | null;
  genre_ids?: number[];
}

export interface MovieDetails extends Movie {
  genres: Genre[];
  runtime: number;
  tagline?: string;
  budget?: number;
  revenue?: number;
  production_companies: ProductionCompany[];
}

export interface Genre {
  id: number;
  name: string;
}

export interface ProductionCompany {
  id: number;
  name: string;
  logo_path: string | null;
  origin_country: string;
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
}

export interface CrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
  profile_path: string | null;
}

export interface Credits {
  cast: CastMember[];
  crew: CrewMember[];
}

export interface Collection {
  id: number;
  name: string;
  created_at: string;
}

export interface CollectionItem {
  id: number;
  collection_id: number;
  tmdb_id: number;
  title: string;
  poster_path: string | null;
}

export interface Rating {
  tmdb_id: number;
  rating: number;
  review: string | null;
}

export interface RecommendationResult {
  title: string;
  movies: Movie[];
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

export interface FilterOptions {
  genre?: number;
  year?: number;
  sortBy?: 'popularity' | 'vote_average' | 'release_date';
}

// Navigation types
export type RootStackParamList = {
  MainTabs: undefined;
  MovieDetail: { movie: Movie };
  Login: undefined;
  Register: undefined;
  Ratings: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Search: undefined;
  Collections: undefined;
  Profile: undefined;
};
