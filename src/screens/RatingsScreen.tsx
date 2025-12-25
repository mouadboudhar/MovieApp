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
