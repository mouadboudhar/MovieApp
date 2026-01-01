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
            <Text style={styles.overview}>{movie.overview}</Text>
          </View>
        )}

        {/* Star Rating */}
        <View style={styles.ratingSection}>
          <Text style={styles.sectionTitle}>Your Rating</Text>
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map(renderStar)}
          </View>
          {isSavingRating && (
            <ActivityIndicator size="small" color="#E50914" style={styles.ratingLoader} />
          )}
          {userRating > 0 && !isSavingRating && (
            <Text style={styles.ratingText}>
              You rated this movie {userRating} star{userRating > 1 ? 's' : ''}
            </Text>
          )}
        </View>

        {/* Add to Collection Button */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddToCollection}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.addButtonText}>+ Add to Collection</Text>
          )}
        </TouchableOpacity>

        {/* Cast & Crew Section */}
        {isLoadingDetails ? (
          <View style={styles.loadingSection}>
            <ActivityIndicator size="small" color="#E50914" />
            <Text style={styles.loadingText}>Loading details...</Text>
          </View>
        ) : (
          <>
            {/* Key Crew */}
            {(director || producers.length > 0 || productionCompany) && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Cast & Crew</Text>
                <View style={styles.crewGrid}>
                  {director && renderCrewMember(director, 'Director')}
                  {producers.map((p) => renderCrewMember(p, 'Producer'))}
                  {productionCompany && (
                    <View style={styles.crewCard}>
                      <View style={[styles.crewImage, styles.companyPlaceholder]}>
                        <Text style={styles.companyIcon}>🎬</Text>
                      </View>
                      <View style={styles.crewInfo}>
                        <Text style={styles.crewName}>{productionCompany.name}</Text>
                        <Text style={styles.crewRole}>Production Company</Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Cast */}
            {credits && credits.cast.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Top Cast</Text>
                <FlatList
                  data={credits.cast.slice(0, 10)}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={renderCastMember}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.castList}
                />
              </View>
            )}

            {/* Recommendations */}
            {recommendations.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recommendations</Text>
                <FlatList
                  data={recommendations}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={renderRecommendation}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.recList}
                />
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Collection Selection Modal */}
      <Modal
        visible={isCollectionModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsCollectionModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Collection</Text>

            {collections.length > 0 ? (
              <FlatList
                data={collections}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderCollectionItem}
                style={styles.collectionList}
              />
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No collections yet.</Text>
                <Text style={styles.emptySubtext}>
                  Create a collection first to add movies.
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setIsCollectionModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 16,
    padding: 8,
  },
  backButtonText: {
    color: '#E50914',
    fontSize: 16,
    fontWeight: '600',
  },
  posterContainer: {
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  poster: {
    width: 220,
    height: 330,
    borderRadius: 12,
  },
  placeholderPoster: {
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#888',
    fontSize: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 4,
  },
  tagline: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#888',
    textAlign: 'center',
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  metaText: {
    fontSize: 14,
    color: '#888',
  },
  metaDot: {
    fontSize: 14,
    color: '#555',
    marginHorizontal: 8,
  },
  metaRating: {
    fontSize: 14,
    color: '#FFD700',
    fontWeight: '600',
  },
  genresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  genreChip: {
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  genreText: {
    color: '#fff',
    fontSize: 12,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  overview: {
    fontSize: 15,
    color: '#ccc',
    lineHeight: 22,
  },
  ratingSection: {
    alignItems: 'center',
    marginTop: 24,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  starButton: {
    padding: 8,
  },
  star: {
    fontSize: 36,
    color: '#555',
  },
  starFilled: {
    color: '#FFD700',
  },
  ratingLoader: {
    marginTop: 8,
  },
  ratingText: {
    color: '#888',
    fontSize: 14,
    marginTop: 8,
  },
  addButton: {
    backgroundColor: '#E50914',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 20,
    alignItems: 'center',
    alignSelf: 'center',
    minWidth: 200,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingSection: {
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    color: '#888',
    marginTop: 8,
  },
  crewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  crewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
    padding: 12,
    borderRadius: 12,
    minWidth: SCREEN_WIDTH / 2 - 24,
  },
  crewImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  crewPlaceholder: {
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  crewPlaceholderText: {
    fontSize: 20,
  },
  companyPlaceholder: {
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  companyIcon: {
    fontSize: 20,
  },
  crewInfo: {
    flex: 1,
  },
  crewName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  crewRole: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  castList: {
    gap: 12,
  },
  castCard: {
    width: 100,
    alignItems: 'center',
    marginRight: 12,
  },
  castImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 8,
  },
  castPlaceholder: {
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  castPlaceholderText: {
    fontSize: 32,
  },
  castName: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  castCharacter: {
    color: '#888',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 2,
  },
  recList: {
    gap: 12,
  },
  recCard: {
    width: 120,
    marginRight: 12,
  },
  recPoster: {
    width: 120,
    height: 180,
    borderRadius: 8,
    marginBottom: 8,
  },
  recPlaceholder: {
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recPlaceholderText: {
    fontSize: 32,
  },
  recTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  recRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  recRatingStar: {
    color: '#FFD700',
    fontSize: 12,
    marginRight: 4,
  },
  recRatingText: {
    color: '#FFD700',
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1e1e1e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
  },
  collectionList: {
    maxHeight: 300,
  },
  collectionItem: {
    backgroundColor: '#2a2a2a',
    padding: 16,
    borderRadius: 8,
    marginBottom: 10,
  },
  collectionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  collectionDate: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    color: '#666',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  closeButton: {
    backgroundColor: '#333',
    padding: 14,
    borderRadius: 8,
    marginTop: 16,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
  },
});

export default MovieDetailScreen;
