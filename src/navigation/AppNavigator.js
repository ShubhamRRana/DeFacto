import React, { useState, useEffect, useMemo } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

import { supabase } from '../config/supabase';
import { useTheme } from '../theme/ThemeContext';

import WelcomeScreen from '../screens/WelcomeScreen';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import TopicPickerScreen from '../screens/TopicPickerScreen';
import FeedScreen from '../screens/FeedScreen';
import BookmarksScreen from '../screens/BookmarksScreen';
import QuizHomeScreen from '../screens/QuizHomeScreen';
import QuizPlayScreen from '../screens/QuizPlayScreen';
import QuizResultsScreen from '../screens/QuizResultsScreen';
import LeaderboardScreen from '../screens/LeaderboardScreen';
import ProfileScreen from '../screens/ProfileScreen';
import EditInterestsScreen from '../screens/EditInterestsScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surfaceCard,
          borderTopColor: colors.hairline,
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 8,
          height: 65,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Feed') iconName = focused ? 'flash' : 'flash-outline';
          else if (route.name === 'Bookmarks') iconName = focused ? 'bookmark' : 'bookmark-outline';
          else if (route.name === 'Quizzes') iconName = focused ? 'school' : 'school-outline';
          else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Feed" component={FeedScreen} />
      <Tab.Screen name="Bookmarks" component={BookmarksScreen} />
      <Tab.Screen name="Quizzes" component={QuizHomeScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
    </Stack.Navigator>
  );
}

function LoadingView() {
  const { colors } = useTheme();
  const styles = useMemo(() => createLoadingStyles(colors), [colors]);

  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

export default function AppNavigator() {
  const [session, setSession] = useState(null);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkOnboarding = async (userId) => {
      const { count } = await supabase
        .from('user_topics')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      return (count ?? 0) > 0;
    };

    const initialize = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);

      if (session) {
        const done = await checkOnboarding(session.user.id);
        setOnboardingComplete(done);
      }

      setLoading(false);
    };

    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);

      if (session) {
        const done = await checkOnboarding(session.user.id);
        setOnboardingComplete(done);
      } else {
        setOnboardingComplete(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <LoadingView />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!session ? (
          <Stack.Screen name="AuthStack" component={AuthStack} />
        ) : !onboardingComplete ? (
          <Stack.Screen name="TopicPicker">
            {() => <TopicPickerScreen onComplete={() => setOnboardingComplete(true)} />}
          </Stack.Screen>
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="QuizPlay" component={QuizPlayScreen} options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="QuizResults" component={QuizResultsScreen} options={{ animation: 'fade' }} />
            <Stack.Screen name="Leaderboard" component={LeaderboardScreen} options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="EditInterests" component={EditInterestsScreen} options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ animation: 'slide_from_bottom' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function createLoadingStyles(colors) {
  return StyleSheet.create({
    loadingContainer: {
      flex: 1,
      backgroundColor: colors.canvas,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
}
