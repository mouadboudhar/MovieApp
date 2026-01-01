import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../types';
import { API_BASE_URL, TMDB_IMAGE_SIZES } from '../config';
import AuthService from '../services/AuthService';

interface Rating {
  id: number;
  tmdb_id: number;
  rating: number;
  review: string | null;
  created_at: string;
  // Movie details fetched from TMDB
  title?: string;
  poster_path?: string;
}

const RatingsScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchRatings = useCallback(async (showRefresh = false) => {
    if (showRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const token = await AuthService.getToken();
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/ratings`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      setRatings(data.ratings || []);
    } catch (error) {
      console.error('Error fetching ratings:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRatings();
  }, [fetchRatings]);

  // Refresh when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchRatings();
    });
    return unsubscribe;
  }, [navigation, fetchRatings]);

  const handleRefresh = useCallback(() => {
    fetchRatings(true);
  }, [fetchRatings]);

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= rating ? 'star' : 'star-outline'}
          size={14}
          color={i <= rating ? '#FFD700' : '#666'}
        />
      );
    }
    return <View style={styles.starsContainer}>{stars}</View>;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const renderRatingItem = ({ item }: { item: Rating }) => {
    const posterUri = item.poster_path
      ? `${TMDB_IMAGE_SIZES.poster.small}${item.poster_path}`
      : null;

    return (
      <TouchableOpacity
        style={styles.ratingCard}
        onPress={() => {
          // Navigate to movie detail if we have the movie data
          navigation.navigate('MovieDetail', {
            movie: {
              id: item.tmdb_id,
              title: item.title || `Movie #${item.tmdb_id}`,
              poster_path: item.poster_path || null,
              overview: '',
              vote_average: 0,
              release_date: '',
              genre_ids: [],
            },
          });
        }}
        activeOpacity={0.7}
      >
        {posterUri ? (
          <Image source={{ uri: posterUri }} style={styles.poster} />
        ) : (
          <View style={[styles.poster, styles.placeholderPoster]}>
            <Ionicons name="film-outline" size={32} color="#666" />
          </View>
        )}
        <View style={styles.ratingInfo}>
          <Text style={styles.movieTitle} numberOfLines={2}>
            {item.title || `Movie #${item.tmdb_id}`}
          </Text>
          <View style={styles.ratingRow}>
            {renderStars(item.rating)}
            <Text style={styles.ratingNumber}>{item.rating}/5</Text>
          </View>
          {item.review && (
            <Text style={styles.review} numberOfLines={2}>
              "{item.review}"
            </Text>
          )}
          <Text style={styles.ratingDate}>
            Rated on {formatDate(item.created_at)}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="star-outline" size={64} color="#666" />
      <Text style={styles.emptyTitle}>No Ratings Yet</Text>
      <Text style={styles.emptyText}>
        Rate movies to keep track of what you've watched and loved!
      </Text>
      <TouchableOpacity
        style={styles.browseButton}
        onPress={() => navigation.navigate('MainTabs')}
      >
        <Text style={styles.browseButtonText}>Browse Movies</Text>
      </TouchableOpacity>
    </View>
  );

  const getAverageRating = () => {
    if (ratings.length === 0) return 0;
    const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
    return (sum / ratings.length).toFixed(1);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Ratings</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Stats Summary */}
      {ratings.length > 0 && (
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{ratings.length}</Text>
            <Text style={styles.statLabel}>Movies</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{getAverageRating()}</Text>
            <Text style={styles.statLabel}>Avg Rating</Text>
          </View>
        </View>
      )}

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E50914" />
        </View>
      ) : (
        <FlatList
          data={ratings}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderRatingItem}
          contentContainerStyle={[
            styles.listContent,
            ratings.length === 0 && styles.emptyListContent,
          ]}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#E50914"
              colors={['#E50914']}
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerRight: {
    width: 40,
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: '#1e1e1e',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#E50914',
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyListContent: {
    flex: 1,
  },
  ratingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  poster: {
    width: 60,
    height: 90,
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
  },
  placeholderPoster: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  movieTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 6,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  starsContainer: {
    flexDirection: 'row',
    marginRight: 8,
  },
  ratingNumber: {
    fontSize: 14,
    color: '#FFD700',
    fontWeight: '600',
  },
  review: {
    fontSize: 13,
    color: '#aaa',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  ratingDate: {
    fontSize: 12,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 24,
  },
  browseButton: {
    backgroundColor: '#E50914',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  browseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default RatingsScreen;
