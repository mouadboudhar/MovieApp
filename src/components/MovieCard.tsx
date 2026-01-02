import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Movie } from '../types';
import { TMDB_IMAGE_SIZES } from '../config';

const SCREEN_WIDTH = Dimensions.get('window').width;
const POSTER_WIDTH = (SCREEN_WIDTH - 48) / 2;
const TMDB_IMAGE_BASE_URL = TMDB_IMAGE_SIZES.poster.medium;

interface MovieCardProps {
  movie: Movie;
  onPress: (movie: Movie) => void;
  style?: object;
}

export const MovieCard: React.FC<MovieCardProps> = ({ movie, onPress, style }) => {
  const posterUri = movie.poster_path
    ? `${TMDB_IMAGE_BASE_URL}${movie.poster_path}`
    : null;

  return (
    <TouchableOpacity
      style={[styles.movieCard, style]}
      onPress={() => onPress(movie)}
      activeOpacity={0.7}
    >
      {posterUri ? (
        <Image source={{ uri: posterUri }} style={styles.poster} />
      ) : (
        <View style={[styles.poster, styles.placeholderPoster]}>
          <Ionicons name="film-outline" size={40} color="#666" />
        </View>
      )}
      <View style={styles.movieInfo}>
        <Text style={styles.movieTitle} numberOfLines={2}>
          {movie.title}
        </Text>
        {movie.vote_average !== undefined && movie.vote_average > 0 && (
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={12} color="#FFD700" />
            <Text style={styles.rating}>{movie.vote_average.toFixed(1)}</Text>
          </View>
        )}
        {movie.release_date && (
          <Text style={styles.releaseYear}>
            {new Date(movie.release_date).getFullYear()}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  movieCard: {
    width: POSTER_WIDTH,
    marginBottom: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    overflow: 'hidden',
  },
  poster: {
    width: '100%',
    aspectRatio: 2 / 3,
    backgroundColor: '#2a2a2a',
  },
  placeholderPoster: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  movieInfo: {
    padding: 10,
  },
  movieTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  rating: {
    color: '#FFD700',
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
  releaseYear: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
});

export default MovieCard;
