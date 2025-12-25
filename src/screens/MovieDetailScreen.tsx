import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Movie,
  Collection,
  RootStackParamList,
  Credits,
  CastMember,
  CrewMember,
  MovieDetails,
} from '../types';
import {
  saveRating,
  getRating,
  getCollections,
  addMovieToCollection,
} from '../services/db';
import {
  getMovieCredits,
  getMovieRecommendations,
  getMovieDetails,
} from '../services/RecommendationService';
import { TMDB_IMAGE_SIZES } from '../config';

const SCREEN_WIDTH = Dimensions.get('window').width;
const TMDB_IMAGE_BASE_URL = TMDB_IMAGE_SIZES.poster.large;
const TMDB_PROFILE_URL = TMDB_IMAGE_SIZES.poster.small;

type MovieDetailRouteProp = RouteProp<RootStackParamList, 'MovieDetail'>;

const MovieDetailScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<MovieDetailRouteProp>();
  const { movie } = route.params;

  const [userRating, setUserRating] = useState<number>(0);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isCollectionModalVisible, setIsCollectionModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingRating, setIsSavingRating] = useState(false);
  
  // New states for enhanced details
  const [movieDetails, setMovieDetails] = useState<MovieDetails | null>(null);
  const [credits, setCredits] = useState<Credits | null>(null);
  const [recommendations, setRecommendations] = useState<Movie[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(true);

  const tmdbId = movie.tmdb_id ?? movie.id;

  useEffect(() => {
    loadExistingRating();
    loadMovieDetails();
  }, [tmdbId]);

  const loadExistingRating = async () => {
    try {
      const existingRating = await getRating(tmdbId);
      if (existingRating) {
        setUserRating(existingRating.rating);
      }
    } catch (error) {
      console.error('Error loading existing rating:', error);
    }
  };

  const loadMovieDetails = async () => {
    setIsLoadingDetails(true);
    try {
      const [details, movieCredits, recs] = await Promise.all([
        getMovieDetails(tmdbId),
        getMovieCredits(tmdbId),
        getMovieRecommendations(tmdbId),
      ]);

      setMovieDetails(details);
      setCredits(movieCredits);
      setRecommendations(recs.slice(0, 10)); // Limit to 10 recommendations
    } catch (error) {
      console.error('Error loading movie details:', error);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleStarPress = async (star: number) => {
    setIsSavingRating(true);
    try {
      await saveRating(tmdbId, star, null, movie.title, movie.poster_path ?? undefined);
      setUserRating(star);
      Alert.alert('Success', `You rated "${movie.title}" ${star} star${star > 1 ? 's' : ''}!`);
    } catch (error) {
      console.error('Error saving rating:', error);
      Alert.alert('Error', 'Failed to save rating. Please try again.');
    } finally {
      setIsSavingRating(false);
    }
  };

  const handleAddToCollection = async () => {
    setIsLoading(true);
    try {
      const fetchedCollections = await getCollections();
      setCollections(fetchedCollections);
      setIsCollectionModalVisible(true);
    } catch (error) {
      console.error('Error fetching collections:', error);
      Alert.alert('Error', 'Failed to load collections. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectCollection = async (collection: Collection) => {
    try {
      await addMovieToCollection(collection.id, movie);
      setIsCollectionModalVisible(false);
      Alert.alert('Success', `"${movie.title}" added to "${collection.name}"!`);
    } catch (error) {
      console.error('Error adding movie to collection:', error);
      Alert.alert('Error', 'Failed to add movie to collection. Please try again.');
    }
  };

  const handleRecommendationPress = (recMovie: Movie) => {
    navigation.push('MovieDetail', { movie: recMovie });
  };

  const renderStar = (starNumber: number) => {
    const isFilled = starNumber <= userRating;
    return (
      <TouchableOpacity
        key={starNumber}
        onPress={() => handleStarPress(starNumber)}
        disabled={isSavingRating}
        style={styles.starButton}
      >
        <Text style={[styles.star, isFilled && styles.starFilled]}>
          {isFilled ? '★' : '☆'}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderCastMember = ({ item }: { item: CastMember }) => {
    const profileUri = item.profile_path
      ? `${TMDB_PROFILE_URL}${item.profile_path}`
      : null;

    return (
      <View style={styles.castCard}>
        {profileUri ? (
          <Image source={{ uri: profileUri }} style={styles.castImage} />
        ) : (
          <View style={[styles.castImage, styles.castPlaceholder]}>
            <Text style={styles.castPlaceholderText}>👤</Text>
          </View>
        )}
        <Text style={styles.castName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.castCharacter} numberOfLines={1}>
          {item.character}
        </Text>
      </View>
    );
  };

  const renderCrewMember = (member: CrewMember, role: string) => {
    const profileUri = member.profile_path
      ? `${TMDB_PROFILE_URL}${member.profile_path}`
      : null;

    return (
      <View key={member.id} style={styles.crewCard}>
        {profileUri ? (
          <Image source={{ uri: profileUri }} style={styles.crewImage} />
        ) : (
          <View style={[styles.crewImage, styles.crewPlaceholder]}>
            <Text style={styles.crewPlaceholderText}>👤</Text>
          </View>
        )}
        <View style={styles.crewInfo}>
          <Text style={styles.crewName}>{member.name}</Text>
          <Text style={styles.crewRole}>{role}</Text>
        </View>
      </View>
    );
  };

  const renderRecommendation = ({ item }: { item: Movie }) => {
    const posterUri = item.poster_path
      ? `${TMDB_PROFILE_URL}${item.poster_path}`
      : null;

    return (
      <TouchableOpacity
        style={styles.recCard}
        onPress={() => handleRecommendationPress(item)}
      >
        {posterUri ? (
          <Image source={{ uri: posterUri }} style={styles.recPoster} />
        ) : (
          <View style={[styles.recPoster, styles.recPlaceholder]}>
            <Text style={styles.recPlaceholderText}>🎬</Text>
          </View>
        )}
        <Text style={styles.recTitle} numberOfLines={2}>
          {item.title}
        </Text>
        {item.vote_average !== undefined && (
          <View style={styles.recRating}>
            <Text style={styles.recRatingStar}>★</Text>
            <Text style={styles.recRatingText}>{item.vote_average.toFixed(1)}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderCollectionItem = ({ item }: { item: Collection }) => (
    <TouchableOpacity
      style={styles.collectionItem}
      onPress={() => handleSelectCollection(item)}
    >
      <Text style={styles.collectionName}>{item.name}</Text>
      <Text style={styles.collectionDate}>
        Created: {new Date(item.created_at).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  );

  const posterUri = movie.poster_path
    ? `${TMDB_IMAGE_BASE_URL}${movie.poster_path}`
    : null;

  // Get director and key crew
  const director = credits?.crew.find((c) => c.job === 'Director');
  const producers = credits?.crew.filter((c) => c.job === 'Producer').slice(0, 2) || [];
  const productionCompany = movieDetails?.production_companies?.[0];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Back Button */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>

        {/* Movie Poster */}
        <View style={styles.posterContainer}>
          {posterUri ? (
            <Image source={{ uri: posterUri }} style={styles.poster} />
          ) : (
            <View style={[styles.poster, styles.placeholderPoster]}>
              <Text style={styles.placeholderText}>No Poster</Text>
            </View>
          )}
        </View>

        {/* Movie Title & Info */}
        <Text style={styles.title}>{movie.title}</Text>
        
        {movieDetails?.tagline && (
          <Text style={styles.tagline}>"{movieDetails.tagline}"</Text>
        )}

        <View style={styles.metaRow}>
          {movie.release_date && (
            <Text style={styles.metaText}>
              {new Date(movie.release_date).getFullYear()}
            </Text>
          )}
          {movieDetails?.runtime && (
            <>
              <Text style={styles.metaDot}>•</Text>
              <Text style={styles.metaText}>
                {Math.floor(movieDetails.runtime / 60)}h {movieDetails.runtime % 60}m
              </Text>
            </>
          )}
          {movie.vote_average !== undefined && (
            <>
              <Text style={styles.metaDot}>•</Text>
              <Text style={styles.metaRating}>★ {movie.vote_average.toFixed(1)}</Text>
            </>
          )}
        </View>

        {/* Genres */}
        {movieDetails?.genres && movieDetails.genres.length > 0 && (
          <View style={styles.genresContainer}>
            {movieDetails.genres.map((genre) => (
              <View key={genre.id} style={styles.genreChip}>
                <Text style={styles.genreText}>{genre.name}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Overview */}
        {movie.overview && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Overview</Text>
