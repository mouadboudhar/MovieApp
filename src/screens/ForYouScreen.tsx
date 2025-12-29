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
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Movie, RootStackParamList } from '../types';
import {
  getRecommendations,
  getTrendingMovies,
  getNowPlayingMovies,
} from '../services/RecommendationService';
import { TMDB_IMAGE_SIZES } from '../config';

const SCREEN_WIDTH = Dimensions.get('window').width;
const POSTER_WIDTH = (SCREEN_WIDTH - 48) / 2;
const TMDB_IMAGE_BASE_URL = TMDB_IMAGE_SIZES.poster.medium;

type TabType = 'trending' | 'recommended' | 'latest';

interface TabData {
  key: TabType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const TABS: TabData[] = [
  { key: 'trending', label: 'Trending', icon: 'flame' },
  { key: 'recommended', label: 'For You', icon: 'heart' },
  { key: 'latest', label: 'Latest', icon: 'time' },
];

const ForYouScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [activeTab, setActiveTab] = useState<TabType>('trending');
  const [trendingMovies, setTrendingMovies] = useState<Movie[]>([]);
  const [recommendedMovies, setRecommendedMovies] = useState<Movie[]>([]);
  const [latestMovies, setLatestMovies] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAllData = useCallback(async (showRefresh = false) => {
    if (showRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const [trending, recommendations, latest] = await Promise.all([
        getTrendingMovies(),
        getRecommendations(),
        getNowPlayingMovies(),
      ]);

      setTrendingMovies(trending);
      setRecommendedMovies(recommendations.movies);
      setLatestMovies(latest);
    } catch (err) {
      console.error('Error fetching movies:', err);
      setError('Failed to load movies. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleRefresh = useCallback(() => {
    fetchAllData(true);
  }, [fetchAllData]);

  const handleMoviePress = useCallback((movie: Movie) => {
    navigation.navigate('MovieDetail', { movie });
  }, [navigation]);

  const getActiveMovies = (): Movie[] => {
    switch (activeTab) {
      case 'trending':
        return trendingMovies;
      case 'recommended':
        return recommendedMovies;
      case 'latest':
        return latestMovies;
      default:
        return [];
    }
  };

  const renderTab = (tab: TabData) => {
    const isActive = activeTab === tab.key;
    return (
      <TouchableOpacity
        key={tab.key}
        style={[styles.tab, isActive && styles.activeTab]}
        onPress={() => setActiveTab(tab.key)}
        activeOpacity={0.7}
      >
        <Ionicons
          name={tab.icon}
          size={18}
          color={isActive ? '#E50914' : '#888'}
          style={styles.tabIcon}
        />
        <Text style={[styles.tabText, isActive && styles.activeTabText]}>
          {tab.label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderMovieItem = useCallback(({ item }: { item: Movie }) => {
    const posterUri = item.poster_path
      ? `${TMDB_IMAGE_BASE_URL}${item.poster_path}`
      : null;

    return (
      <TouchableOpacity
        style={styles.movieCard}
        onPress={() => handleMoviePress(item)}
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
            {item.title}
          </Text>
          <View style={styles.movieMeta}>
            {item.vote_average !== undefined && item.vote_average > 0 && (
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={12} color="#FFD700" />
                <Text style={styles.rating}>{item.vote_average.toFixed(1)}</Text>
              </View>
            )}
            {item.release_date && (
              <Text style={styles.releaseYear}>
                {new Date(item.release_date).getFullYear()}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [handleMoviePress]);

  const renderEmptyComponent = useCallback(() => {
    if (isLoading) return null;

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="film-outline" size={64} color="#666" />
        <Text style={styles.emptyText}>No movies available</Text>
        <Text style={styles.emptySubtext}>
          {activeTab === 'recommended'
            ? 'Rate some movies to get personalized recommendations!'
            : 'Pull down to refresh'}
        </Text>
      </View>
    );
  }, [isLoading, activeTab]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Movies</Text>
        </View>
        <View style={styles.tabContainer}>
          {TABS.map(renderTab)}
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E50914" />
          <Text style={styles.loadingText}>Loading movies...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Movies</Text>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#E50914" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchAllData()}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const movies = getActiveMovies();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Movies</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {TABS.map(renderTab)}
      </View>

      {/* Movie Grid */}
      <FlatList
        data={movies}
        keyExtractor={(item) => `${activeTab}-${item.id}`}
        renderItem={renderMovieItem}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyComponent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#E50914"
            colors={['#E50914']}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e1e1e',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
  },
  activeTab: {
    backgroundColor: '#2a1a1a',
