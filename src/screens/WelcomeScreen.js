import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../theme/colors';

const { width, height } = Dimensions.get('window');

const FACTS_PREVIEW = [
  { icon: 'planet', text: 'Space & Universe' },
  { icon: 'flask', text: 'Science & Tech' },
  { icon: 'football', text: 'Sports & Games' },
  { icon: 'book', text: 'History & Culture' },
  { icon: 'leaf', text: 'Nature & Animals' },
];

export default function WelcomeScreen({ navigation }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <LinearGradient colors={['#0A0A0F', '#1A1A2E', '#0A0A0F']} style={styles.container}>
      {/* Decorative background circles */}
      <View style={styles.circle1} />
      <View style={styles.circle2} />

      {/* Logo section */}
      <Animated.View
        style={[styles.logoSection, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}
      >
        <LinearGradient colors={colors.gradientPrimary} style={styles.logoIcon}>
          <Ionicons name="flash" size={40} color="#fff" />
        </LinearGradient>
        <Text style={styles.appName}>De'Facto</Text>
        <Text style={styles.tagline}>Facts that matter.{'\n'}Curated just for you.</Text>
      </Animated.View>

      {/* Topic preview pills */}
      <Animated.View
        style={[styles.pillsSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
      >
        <Text style={styles.pillsLabel}>Explore topics you love</Text>
        <View style={styles.pillsRow}>
          {FACTS_PREVIEW.map((item, index) => (
            <View key={index} style={styles.pill}>
              <Ionicons name={item.icon} size={14} color={colors.primary} />
              <Text style={styles.pillText}>{item.text}</Text>
            </View>
          ))}
        </View>
      </Animated.View>

      {/* CTA Buttons */}
      <Animated.View
        style={[styles.buttonsSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
      >
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('Signup')}
          activeOpacity={0.85}
        >
          <LinearGradient colors={colors.gradientPrimary} style={styles.primaryButtonGradient}>
            <Text style={styles.primaryButtonText}>Get Started — It's Free</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('Login')}
          activeOpacity={0.7}
        >
          <Text style={styles.secondaryButtonText}>
            Already have an account?{' '}
            <Text style={styles.secondaryButtonHighlight}>Sign In</Text>
          </Text>
        </TouchableOpacity>
      </Animated.View>

      <Text style={styles.footer}>
        No spam. No noise. Just facts.
      </Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 80,
    paddingHorizontal: spacing.lg,
  },
  circle1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: colors.primary,
    opacity: 0.06,
    top: -80,
    right: -80,
  },
  circle2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.secondary,
    opacity: 0.06,
    bottom: 100,
    left: -60,
  },
  logoSection: {
    alignItems: 'center',
    marginTop: 20,
  },
  logoIcon: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  appName: {
    fontSize: typography.fontSizes.xxxl,
    fontWeight: typography.fontWeights.extrabold,
    color: colors.textPrimary,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: typography.fontSizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 24,
  },
  pillsSection: {
    alignItems: 'center',
    width: '100%',
  },
  pillsLabel: {
    fontSize: typography.fontSizes.sm,
    color: colors.textMuted,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(108, 99, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(108, 99, 255, 0.25)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    gap: 6,
    marginBottom: 8,
  },
  pillText: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
  },
  buttonsSection: {
    width: '100%',
    gap: spacing.md,
  },
  primaryButton: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  primaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  primaryButtonText: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: '#fff',
  },
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  secondaryButtonText: {
    fontSize: typography.fontSizes.md,
    color: colors.textSecondary,
  },
  secondaryButtonHighlight: {
    color: colors.primary,
    fontWeight: typography.fontWeights.semibold,
  },
  footer: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
  },
});
