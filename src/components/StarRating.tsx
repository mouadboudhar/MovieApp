import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface StarRatingProps {
  rating: number;
  maxStars?: number;
  size?: number;
  onRatingChange?: (rating: number) => void;
  disabled?: boolean;
  isLoading?: boolean;
  showLabel?: boolean;
  interactive?: boolean;
}

export const StarRating: React.FC<StarRatingProps> = ({
  rating,
  maxStars = 5,
  size = 24,
  onRatingChange,
  disabled = false,
  isLoading = false,
  showLabel = false,
  interactive = true,
}) => {
  const handlePress = (star: number) => {
    if (!disabled && !isLoading && interactive && onRatingChange) {
      onRatingChange(star);
    }
  };

  const renderStar = (starNumber: number) => {
    const isFilled = starNumber <= rating;
    
    if (interactive) {
      return (
        <TouchableOpacity
          key={starNumber}
          onPress={() => handlePress(starNumber)}
          disabled={disabled || isLoading}
          style={styles.starButton}
        >
          <Ionicons
            name={isFilled ? 'star' : 'star-outline'}
            size={size}
            color={isFilled ? '#FFD700' : '#666'}
          />
        </TouchableOpacity>
      );
    }
    
    return (
      <View key={starNumber} style={styles.starButton}>
        <Ionicons
          name={isFilled ? 'star' : 'star-outline'}
          size={size}
          color={isFilled ? '#FFD700' : '#666'}
        />
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color="#FFD700" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.starsContainer}>
        {Array.from({ length: maxStars }, (_, i) => renderStar(i + 1))}
      </View>
      {showLabel && rating > 0 && (
        <Text style={styles.ratingLabel}>{rating} / {maxStars}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starButton: {
    padding: 4,
  },
  ratingLabel: {
    color: '#888',
    fontSize: 12,
    marginTop: 4,
  },
});

export default StarRating;
