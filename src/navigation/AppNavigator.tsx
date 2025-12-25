import React from 'react';
import { Text, View, StyleSheet, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList, MainTabParamList } from '../types';

// Screens
import ForYouScreen from '../screens/ForYouScreen';
import SearchScreen from '../screens/SearchScreen';
import CollectionsScreen from '../screens/CollectionsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import MovieDetailScreen from '../screens/MovieDetailScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import RatingsScreen from '../screens/RatingsScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

// Auth required screen wrapper
const AuthRequiredScreen: React.FC<{
  navigation: any;
  screenName: string;
}> = ({ navigation, screenName }) => {
  return (
    <View style={styles.authRequiredContainer}>
      <Ionicons name="lock-closed-outline" size={64} color="#888" style={{ marginBottom: 24 }} />
      <Text style={styles.authRequiredTitle}>Login Required</Text>
      <Text style={styles.authRequiredText}>
        Please sign in to access {screenName}
      </Text>
      <TouchableOpacity
        style={styles.loginButton}
        onPress={() => navigation.navigate('Login')}
      >
        <Text style={styles.loginButtonText}>Sign In</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.registerButton}
        onPress={() => navigation.navigate('Register')}
      >
        <Text style={styles.registerButtonText}>Create Account</Text>
      </TouchableOpacity>
    </View>
  );
};

// Main Tab Navigator
const MainTabs: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: '#1a1a1a',
          borderTopColor: '#333',
          borderTopWidth: 1,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom + 8,
          paddingTop: 12,
        },
        tabBarActiveTintColor: '#E50914',
        tabBarInactiveTintColor: '#888',
      }}
    >
      <Tab.Screen
        name="Home"
        component={ForYouScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="search-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Collections"
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="bookmark-outline" size={size} color={color} />,
        }}
      >
        {({ navigation }) =>
          isAuthenticated ? (
            <CollectionsScreen />
          ) : (
            <AuthRequiredScreen navigation={navigation} screenName="Collections" />
          )
        }
      </Tab.Screen>
      <Tab.Screen
        name="Profile"
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
        }}
      >
        {({ navigation }) =>
          isAuthenticated ? (
            <ProfileScreen />
          ) : (
            <AuthRequiredScreen navigation={navigation} screenName="Profile" />
          )
        }
      </Tab.Screen>
    </Tab.Navigator>
  );
};

// Root Stack Navigator
const AppNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen
        name="MovieDetail"
        component={MovieDetailScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{
          animation: 'slide_from_bottom',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{
          animation: 'slide_from_bottom',
          presentation: 'modal',
        }}
