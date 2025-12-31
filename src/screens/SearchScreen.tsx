import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Movie, FilterOptions, RootStackParamList, Genre } from '../types';
import { searchMovies } from '../services/RecommendationService';
import { TMDB_IMAGE_SIZES } from '../config';

const TMDB_IMAGE_BASE_URL = TMDB_IMAGE_SIZES.poster.medium;

// Genre list from TMDB
const GENRES: Genre[] = [
  { id: 28, name: 'Action' },
  { id: 12, name: 'Adventure' },
  { id: 16, name: 'Animation' },
  { id: 35, name: 'Comedy' },
  { id: 80, name: 'Crime' },
  { id: 99, name: 'Documentary' },
  { id: 18, name: 'Drama' },
  { id: 10751, name: 'Family' },
  { id: 14, name: 'Fantasy' },
  { id: 36, name: 'History' },
  { id: 27, name: 'Horror' },
  { id: 10402, name: 'Music' },
  { id: 9648, name: 'Mystery' },
  { id: 10749, name: 'Romance' },
  { id: 878, name: 'Science Fiction' },
  { id: 10770, name: 'TV Movie' },
  { id: 53, name: 'Thriller' },
  { id: 10752, name: 'War' },
  { id: 37, name: 'Western' },
];

const YEARS = Array.from({ length: 30 }, (_, i) => 2025 - i);

const SORT_OPTIONS = [
  { value: 'popularity', label: 'Popularity' },
  { value: 'vote_average', label: 'Rating' },
  { value: 'release_date', label: 'Release Date' },
] as const;

const SearchScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [searchQuery, setSearchQuery] = useState('');
  const [movies, setMovies] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({});
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setHasSearched(true);
    try {
      let results = await searchMovies(searchQuery);

      // Apply filters
      if (filters.genre) {
        results = results.filter((m) => m.genre_ids?.includes(filters.genre!));
      }
      if (filters.year) {
        results = results.filter((m) => {
          const movieYear = m.release_date ? new Date(m.release_date).getFullYear() : null;
          return movieYear === filters.year;
        });
      }
      if (filters.sortBy) {
        results = [...results].sort((a, b) => {
          switch (filters.sortBy) {
            case 'vote_average':
              return (b.vote_average || 0) - (a.vote_average || 0);
            case 'release_date':
              return new Date(b.release_date || 0).getTime() - new Date(a.release_date || 0).getTime();
            default:
              return 0;
          }
        });
      }

      setMovies(results);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, filters]);

  const handleMoviePress = (movie: Movie) => {
    navigation.navigate('MovieDetail', { movie });
  };

  const clearFilters = () => {
    setFilters({});
  };

  const applyFilters = () => {
    setIsFilterModalVisible(false);
    if (searchQuery.trim()) {
      handleSearch();
    }
  };

  const renderMovieItem = ({ item }: { item: Movie }) => {
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
            <Text style={styles.placeholderText}>No Image</Text>
          </View>
        )}
        <View style={styles.movieInfo}>
          <Text style={styles.movieTitle} numberOfLines={2}>
            {item.title}
          </Text>
          {item.vote_average !== undefined && (
            <View style={styles.ratingContainer}>
              <Text style={styles.starIcon}>★</Text>
              <Text style={styles.rating}>{item.vote_average.toFixed(1)}</Text>
            </View>
          )}
          {item.release_date && (
            <Text style={styles.releaseYear}>
              {new Date(item.release_date).getFullYear()}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Search</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search movies..."
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.filterButton, activeFilterCount > 0 && styles.filterButtonActive]}
          onPress={() => setIsFilterModalVisible(true)}
        >
          <Text style={styles.filterIcon}>⚙️</Text>
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E50914" />
        </View>
      ) : movies.length > 0 ? (
        <FlatList
          data={movies}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderMovieItem}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : hasSearched ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🎬</Text>
          <Text style={styles.emptyText}>No movies found</Text>
          <Text style={styles.emptySubtext}>Try a different search term</Text>
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyText}>Search for movies</Text>
          <Text style={styles.emptySubtext}>Find your favorite films</Text>
        </View>
      )}

      {/* Filter Modal */}
      <Modal
        visible={isFilterModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filters</Text>
              <TouchableOpacity onPress={() => setIsFilterModalVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {/* Genre Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Genre</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.chipContainer}>
                    {GENRES.map((genre) => (
                      <TouchableOpacity
                        key={genre.id}
                        style={[
                          styles.chip,
                          filters.genre === genre.id && styles.chipActive,
                        ]}
                        onPress={() =>
                          setFilters((f) => ({
                            ...f,
                            genre: f.genre === genre.id ? undefined : genre.id,
                          }))
                        }
                      >
                        <Text
                          style={[
                            styles.chipText,
                            filters.genre === genre.id && styles.chipTextActive,
                          ]}
                        >
                          {genre.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {/* Year Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Year</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.chipContainer}>
                    {YEARS.map((year) => (
                      <TouchableOpacity
                        key={year}
                        style={[
                          styles.chip,
                          filters.year === year && styles.chipActive,
                        ]}
                        onPress={() =>
                          setFilters((f) => ({
                            ...f,
                            year: f.year === year ? undefined : year,
                          }))
                        }
                      >
                        <Text
                          style={[
                            styles.chipText,
                            filters.year === year && styles.chipTextActive,
                          ]}
                        >
                          {year}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {/* Sort By Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Sort By</Text>
                <View style={styles.sortContainer}>
                  {SORT_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.sortOption,
                        filters.sortBy === option.value && styles.sortOptionActive,
                      ]}
                      onPress={() =>
                        setFilters((f) => ({
                          ...f,
                          sortBy: f.sortBy === option.value ? undefined : option.value,
                        }))
                      }
                    >
                      <Text
                        style={[
                          styles.sortOptionText,
                          filters.sortBy === option.value && styles.sortOptionTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
                <Text style={styles.clearButtonText}>Clear All</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
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
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    paddingVertical: 12,
  },
  clearIcon: {
    fontSize: 16,
    color: '#666',
    padding: 4,
  },
  filterButton: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#E50914',
  },
  filterIcon: {
    fontSize: 20,
  },
  filterBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#E50914',
    borderRadius: 10,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 12,
  },
  row: {
    justifyContent: 'space-between',
  },
  movieCard: {
    width: '48%',
    marginBottom: 16,
    backgroundColor: '#1e1e1e',
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
  placeholderText: {
    color: '#666',
    fontSize: 12,
  },
  movieInfo: {
    padding: 10,
  },
  movieTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 6,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  starIcon: {
    color: '#FFD700',
    fontSize: 14,
    marginRight: 4,
  },
  rating: {
    color: '#FFD700',
    fontSize: 13,
    fontWeight: '600',
  },
  releaseYear: {
    fontSize: 12,
    color: '#888',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtext: {
    color: '#888',
    fontSize: 14,
    marginTop: 8,
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
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    fontSize: 20,
    color: '#888',
  },
  modalScroll: {
    padding: 20,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#333',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  chipActive: {
    backgroundColor: '#E50914',
  },
  chipText: {
    color: '#fff',
    fontSize: 14,
  },
  chipTextActive: {
    fontWeight: '600',
  },
  sortContainer: {
    gap: 8,
  },
  sortOption: {
    backgroundColor: '#333',
    padding: 14,
    borderRadius: 12,
  },
  sortOptionActive: {
    backgroundColor: '#E50914',
  },
  sortOptionText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
  sortOptionTextActive: {
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  clearButton: {
    flex: 1,
    backgroundColor: '#333',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  applyButton: {
    flex: 1,
    backgroundColor: '#E50914',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SearchScreen;
