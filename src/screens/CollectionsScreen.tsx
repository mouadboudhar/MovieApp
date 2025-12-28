import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Collection, CollectionItem, Movie, RootStackParamList } from '../types';
import {
  getCollections,
  createCollection,
  getCollectionItems,
  deleteCollection,
  removeMovieFromCollection,
} from '../services/db';
import { TMDB_IMAGE_SIZES } from '../config';

const TMDB_IMAGE_BASE_URL = TMDB_IMAGE_SIZES.poster.small;

const CollectionsScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [collectionItems, setCollectionItems] = useState<CollectionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');

  const loadCollections = useCallback(async (showRefresh = false) => {
    if (showRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const fetchedCollections = await getCollections();
      setCollections(fetchedCollections);
    } catch (error) {
      console.error('Error loading collections:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const loadCollectionItems = useCallback(async (collectionId: number) => {
    try {
      const items = await getCollectionItems(collectionId);
      setCollectionItems(items);
    } catch (error) {
      console.error('Error loading collection items:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCollections();
    }, [loadCollections])
  );

  useEffect(() => {
    if (selectedCollection) {
      loadCollectionItems(selectedCollection.id);
    }
  }, [selectedCollection, loadCollectionItems]);

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) {
      Alert.alert('Error', 'Please enter a collection name');
      return;
    }

    try {
      await createCollection(newCollectionName.trim());
      setNewCollectionName('');
      setIsCreateModalVisible(false);
      loadCollections();
      Alert.alert('Success', 'Collection created successfully!');
    } catch (error) {
      console.error('Error creating collection:', error);
      Alert.alert('Error', 'Failed to create collection');
    }
  };

  const handleDeleteCollection = (collection: Collection) => {
    Alert.alert(
      'Delete Collection',
      `Are you sure you want to delete "${collection.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCollection(collection.id);
              if (selectedCollection?.id === collection.id) {
                setSelectedCollection(null);
                setCollectionItems([]);
              }
              loadCollections();
            } catch (error) {
              console.error('Error deleting collection:', error);
              Alert.alert('Error', 'Failed to delete collection');
            }
          },
        },
      ]
    );
  };

  const handleRemoveFromCollection = (item: CollectionItem) => {
    Alert.alert(
      'Remove Movie',
      `Remove "${item.title}" from this collection?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeMovieFromCollection(selectedCollection!.id, item.tmdb_id);
              loadCollectionItems(selectedCollection!.id);
            } catch (error) {
              console.error('Error removing movie:', error);
              Alert.alert('Error', 'Failed to remove movie');
            }
          },
        },
      ]
    );
  };

  const handleMoviePress = (item: CollectionItem) => {
    const movie: Movie = {
      id: item.tmdb_id,
      tmdb_id: item.tmdb_id,
      title: item.title,
      poster_path: item.poster_path,
    };
    navigation.navigate('MovieDetail', { movie });
  };

  const renderCollectionCard = ({ item }: { item: Collection }) => (
    <TouchableOpacity
      style={[
        styles.collectionCard,
        selectedCollection?.id === item.id && styles.collectionCardSelected,
      ]}
      onPress={() => setSelectedCollection(item)}
      onLongPress={() => handleDeleteCollection(item)}
    >
      <View style={styles.collectionIcon}>
        <Text style={styles.collectionIconText}>📁</Text>
      </View>
      <View style={styles.collectionInfo}>
        <Text style={styles.collectionName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.collectionDate}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderMovieItem = ({ item }: { item: CollectionItem }) => {
    const posterUri = item.poster_path
      ? `${TMDB_IMAGE_BASE_URL}${item.poster_path}`
      : null;

    return (
      <TouchableOpacity
        style={styles.movieCard}
        onPress={() => handleMoviePress(item)}
        onLongPress={() => handleRemoveFromCollection(item)}
      >
        {posterUri ? (
          <Image source={{ uri: posterUri }} style={styles.poster} />
        ) : (
          <View style={[styles.poster, styles.placeholderPoster]}>
            <Text style={styles.placeholderText}>No Image</Text>
          </View>
        )}
        <Text style={styles.movieTitle} numberOfLines={2}>
          {item.title}
        </Text>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E50914" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Collections</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setIsCreateModalVisible(true)}
        >
          <Text style={styles.addButtonText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {collections.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📁</Text>
          <Text style={styles.emptyText}>No collections yet</Text>
          <Text style={styles.emptySubtext}>
            Create a collection to organize your favorite movies
          </Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setIsCreateModalVisible(true)}
          >
            <Text style={styles.createButtonText}>Create Collection</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.content}>
          {/* Collections List */}
          <View style={styles.collectionsSection}>
            <FlatList
              data={collections}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderCollectionCard}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.collectionsList}
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={() => loadCollections(true)}
                  tintColor="#E50914"
                />
              }
            />
          </View>

          {/* Collection Items */}
          {selectedCollection ? (
            <View style={styles.itemsSection}>
              <View style={styles.itemsHeader}>
                <Text style={styles.itemsTitle}>{selectedCollection.name}</Text>
                <Text style={styles.itemsCount}>
                  {collectionItems.length} movie{collectionItems.length !== 1 ? 's' : ''}
                </Text>
              </View>

              {collectionItems.length === 0 ? (
                <View style={styles.emptyItemsContainer}>
                  <Text style={styles.emptyItemsText}>No movies in this collection</Text>
                  <Text style={styles.emptyItemsSubtext}>
                    Add movies from the movie details page
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={collectionItems}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={renderMovieItem}
                  numColumns={3}
                  columnWrapperStyle={styles.moviesRow}
                  contentContainerStyle={styles.moviesContent}
                  showsVerticalScrollIndicator={false}
                />
              )}
            </View>
          ) : (
            <View style={styles.selectCollectionContainer}>
              <Text style={styles.selectCollectionText}>
                Select a collection to view movies
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Create Collection Modal */}
      <Modal
        visible={isCreateModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Collection</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Collection name"
              placeholderTextColor="#666"
              value={newCollectionName}
              onChangeText={setNewCollectionName}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setNewCollectionName('');
                  setIsCreateModalVisible(false);
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalCreateButton}
                onPress={handleCreateCollection}
              >
                <Text style={styles.modalCreateText}>Create</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  addButton: {
    backgroundColor: '#E50914',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  content: {
    flex: 1,
  },
  collectionsSection: {
    paddingVertical: 12,
  },
  collectionsList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  collectionCard: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 180,
    marginRight: 12,
  },
  collectionCardSelected: {
    backgroundColor: '#E50914',
  },
  collectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  collectionIconText: {
    fontSize: 20,
  },
  collectionInfo: {
