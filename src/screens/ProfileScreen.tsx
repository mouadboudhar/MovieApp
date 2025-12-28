import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';
import { RootStackParamList } from '../types';
import AuthService from '../services/AuthService';

interface UserStats {
  ratingsCount: number;
  averageRating: number;
}

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, logout, isLoading: authLoading } = useAuth();
  const [stats, setStats] = useState<UserStats>({
    ratingsCount: 0,
    averageRating: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');

  const fetchUserStats = useCallback(async () => {
    try {
      const token = await AuthService.getToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      // Fetch ratings only
      const ratingsResponse = await fetch(`${API_BASE_URL}/ratings`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const ratingsData = await ratingsResponse.json();

      // Calculate stats
      const ratings = ratingsData.ratings || [];
      
      const avgRating = ratings.length > 0
        ? ratings.reduce((sum: number, r: any) => sum + r.rating, 0) / ratings.length
        : 0;

      setStats({
        ratingsCount: ratings.length,
        averageRating: avgRating,
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh stats when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchUserStats();
    }, [fetchUserStats])
  );

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: logout,
        },
      ]
    );
  };

  const handleEditProfile = () => {
    setEditName(user?.name || '');
    setEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    Alert.alert('Info', 'Profile update feature coming soon!');
    setEditModalVisible(false);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            Alert.alert('Info', 'Account deletion feature coming soon!');
          },
        },
      ]
    );
  };

  const menuItems = [
    { 
      icon: 'person-outline' as const, 
      title: 'Edit Profile', 
      onPress: handleEditProfile,
    },
    { 
      icon: 'star-outline' as const, 
      title: 'My Ratings', 
      subtitle: `${stats.ratingsCount} movies rated`,
      onPress: () => navigation.navigate('Ratings'),
    },
  ];

  const getMemberSince = () => {
    return 'December 2024';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        {/* User Info Card */}
        <View style={styles.userCard}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {user?.name?.charAt(0).toUpperCase() || '?'}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.name || 'User'}</Text>
            <Text style={styles.userEmail}>{user?.email || 'user@email.com'}</Text>
            <Text style={styles.memberSince}>Member since {getMemberSince()}</Text>
          </View>
          <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
            <Ionicons name="pencil" size={16} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Stats */}
        {isLoading ? (
          <View style={styles.statsLoading}>
            <ActivityIndicator color="#E50914" />
          </View>
        ) : (
          <TouchableOpacity 
            style={styles.statsContainer}
            onPress={() => navigation.navigate('Ratings')}
            activeOpacity={0.7}
          >
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.ratingsCount}</Text>
              <Text style={styles.statLabel}>Movies Rated</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '-'}
              </Text>
              <Text style={styles.statLabel}>Avg Rating</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" style={styles.statsArrow} />
          </TouchableOpacity>
        )}

        {/* Menu Items */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Account</Text>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={item.onPress}
            >
              <View style={styles.menuItemLeft}>
                <Ionicons name={item.icon} size={22} color="#888" />
                <View style={styles.menuTextContainer}>
                  <Text style={styles.menuTitle}>{item.title}</Text>
                  {item.subtitle && (
                    <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                  )}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Danger Zone */}
        <View style={styles.menuSection}>
          <Text style={[styles.sectionTitle, styles.dangerTitle]}>Danger Zone</Text>
          <TouchableOpacity
            style={[styles.menuItem, styles.menuItemDanger]}
            onPress={handleDeleteAccount}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="warning-outline" size={22} color="#E50914" />
              <Text style={[styles.menuTitle, styles.menuTitleDanger]}>
                Delete Account
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#E50914" />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          disabled={authLoading}
        >
          <Ionicons name="log-out-outline" size={22} color="#E50914" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        {/* App Version */}
        <Text style={styles.versionText}>Movie App v1.0.0</Text>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                style={styles.modalInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Enter your name"
                placeholderTextColor="#666"
              />
              
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={[styles.modalInput, styles.inputDisabled]}
                value={user?.email || ''}
                editable={false}
                placeholder="Email"
                placeholderTextColor="#666"
              />
              <Text style={styles.inputHint}>Email cannot be changed</Text>
            </View>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={handleSaveProfile}
              >
                <Text style={styles.saveButtonText}>Save</Text>
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
  scrollContent: {
    paddingBottom: 100,
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
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E50914',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  userInfo: {
    flex: 1,
    marginLeft: 16,
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: '#888',
    marginBottom: 2,
  },
  memberSince: {
    fontSize: 12,
    color: '#666',
  },
  editButton: {
    backgroundColor: '#333',
    padding: 10,
    borderRadius: 20,
  },
  statsLoading: {
    backgroundColor: '#1e1e1e',
    marginHorizontal: 16,
    padding: 40,
    borderRadius: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
