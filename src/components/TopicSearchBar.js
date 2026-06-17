import React, { useRef, useEffect } from 'react';
import {
  View, TextInput, TouchableOpacity, StyleSheet, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../theme/colors';

export default function TopicSearchBar({ query, onChangeQuery }) {
  const [expanded, setExpanded] = React.useState(false);
  const inputRef = useRef(null);
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: expanded ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [expanded, widthAnim]);

  const openSearch = () => {
    setExpanded(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const closeSearch = () => {
    onChangeQuery('');
    setExpanded(false);
    inputRef.current?.blur();
  };

  if (!expanded) {
    return (
      <TouchableOpacity style={styles.searchButton} onPress={openSearch} activeOpacity={0.7}>
        <Ionicons name="search" size={20} color={colors.textSecondary} />
      </TouchableOpacity>
    );
  }

  return (
    <Animated.View
      style={[
        styles.searchRow,
        {
          width: widthAnim.interpolate({ inputRange: [0, 1], outputRange: ['40%', '100%'] }),
          opacity: widthAnim,
        },
      ]}
    >
      <Ionicons name="search" size={18} color={colors.textMuted} style={styles.searchIcon} />
      <TextInput
        ref={inputRef}
        style={styles.input}
        value={query}
        onChangeText={onChangeQuery}
        placeholder="Search interests..."
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
      />
      <TouchableOpacity onPress={closeSearch} style={styles.clearButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="close-circle" size={20} color={colors.textMuted} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: spacing.sm,
    minHeight: 40,
    alignSelf: 'stretch',
  },
  searchIcon: {
    marginRight: spacing.xs,
  },
  input: {
    flex: 1,
    fontSize: typography.fontSizes.sm,
    color: colors.textPrimary,
    paddingVertical: 8,
  },
  clearButton: {
    marginLeft: spacing.xs,
  },
});
