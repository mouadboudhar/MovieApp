import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
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
import { MovieCard, LoadingSpinner } from '../components';

const SCREEN_WIDTH = Dimensions.get('window').width;
const POSTER_WIDTH = (SCREEN_WIDTH - 48) / 2;

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
    return (
      <MovieCard
        movie={item}
        onPress={handleMoviePress}
        style={{ width: POSTER_WIDTH }}
      />
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
        <LoadingSpinner text="Loading movies..." fullScreen />
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
    borderWidth: 1,
    borderColor: '#E50914',
  },
  tabIcon: {
    marginRight: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
  },
  activeTabText: {
    color: '#E50914',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#888',
    fontSize: 16,
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#E50914',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    color: '#888',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});

export default ForYouScreen;
