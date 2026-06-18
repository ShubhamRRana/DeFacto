import React, { useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { spacing, borderRadius } from '../theme/colors';

const FACTS_PREVIEW = [
  { icon: 'planet', text: 'Space & Universe' },
  { icon: 'flask', text: 'Science & Tech' },
  { icon: 'football', text: 'Sports & Games' },
  { icon: 'book', text: 'History & Culture' },
  { icon: 'leaf', text: 'Nature & Animals' },
];

export default function WelcomeScreen({ navigation }) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);
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
    <View style={styles.container}>
      <Animated.View
        style={[styles.logoSection, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}
      >
        <View style={styles.logoCard}>
          <Ionicons name="flash" size={40} color={colors.primary} />
        </View>
        <Text style={styles.appName}>De'Facto</Text>
        <Text style={styles.tagline}>Facts that matter.{'\n'}Curated just for you.</Text>
      </Animated.View>

      <Animated.View
        style={[styles.pillsSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
      >
        <Text style={styles.pillsLabel}>Explore topics you love</Text>
        <View style={styles.pillsRow}>
          {FACTS_PREVIEW.map((item, index) => (
            <View key={index} style={styles.pill}>
              <Ionicons name={item.icon} size={14} color={colors.ink} />
              <Text style={styles.pillText}>{item.text}</Text>
            </View>
          ))}
        </View>
      </Animated.View>

      <Animated.View
        style={[styles.buttonsSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
      >
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('Signup')}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>Get Started — It's Free</Text>
          <Ionicons name="arrow-forward" size={18} color={colors.onPrimary} />
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
    </View>
  );
}

function createStyles(colors, typography) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 80,
    paddingHorizontal: spacing.lg,
  },
  logoSection: {
    alignItems: 'center',
    marginTop: 20,
  },
  logoCard: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.hairline,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  appName: {
    ...typography.presets.displayLg,
    fontSize: typography.fontSizes.xxxl,
    letterSpacing: -1,
  },
  tagline: {
    ...typography.presets.bodyMd,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  pillsSection: {
    alignItems: 'center',
    width: '100%',
  },
  pillsLabel: {
    ...typography.presets.captionUppercase,
    marginBottom: spacing.md,
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
    backgroundColor: colors.surfaceStrong,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.pill,
    gap: 6,
    marginBottom: 8,
  },
  pillText: {
    ...typography.presets.bodySm,
    color: colors.ink,
  },
  buttonsSection: {
    width: '100%',
    gap: spacing.md,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    paddingHorizontal: 18,
    height: 48,
    gap: 10,
  },
  primaryButtonText: {
    ...typography.presets.button,
    color: colors.onPrimary,
    fontSize: typography.fontSizes.md,
  },
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  secondaryButtonText: {
    ...typography.presets.bodyMd,
  },
  secondaryButtonHighlight: {
    color: colors.ink,
    fontFamily: typography.fontFamily.sansSemiBold,
    fontWeight: typography.fontWeights.semibold,
  },
  footer: {
    ...typography.presets.caption,
  },
  });
}
