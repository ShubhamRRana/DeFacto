import React, { useRef, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';
import { spacing, borderRadius } from '../theme/colors';

export default function TopicSearchBar({ query, onChangeQuery }) {
  const { t } = useTranslation();
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);
  const [expanded, setExpanded] = React.useState(false);
  const inputRef = useRef(null);

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
        <Ionicons name="search" size={18} color={colors.muted} style={styles.searchIcon} />
        <Text style={styles.placeholder}>{t('toolbar.searchPlaceholder')}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.searchRow}>
      <Ionicons name="search" size={18} color={colors.muted} style={styles.searchIcon} />
      <TextInput
        ref={inputRef}
        style={styles.input}
        value={query}
        onChangeText={onChangeQuery}
        placeholder={t('toolbar.searchPlaceholder')}
        placeholderTextColor={colors.mutedSoft}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
      />
      <TouchableOpacity onPress={closeSearch} style={styles.clearButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="close-circle" size={20} color={colors.muted} />
      </TouchableOpacity>
    </View>
  );
}

function createStyles(colors, typography) {
  return StyleSheet.create({
    searchButton: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'stretch',
      width: '100%',
      minHeight: 44,
      borderRadius: borderRadius.md,
      backgroundColor: colors.surfaceCard,
      borderWidth: 1,
      borderColor: colors.hairline,
      paddingHorizontal: spacing.sm,
    },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'stretch',
      width: '100%',
      backgroundColor: colors.surfaceCard,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.hairline,
      paddingHorizontal: spacing.sm,
      minHeight: 44,
    },
    searchIcon: {
      marginRight: spacing.xs,
    },
    placeholder: {
      flex: 1,
      fontSize: typography.fontSizes.sm,
      fontFamily: typography.fontFamily.sans,
      color: colors.mutedSoft,
    },
    input: {
      flex: 1,
      fontSize: typography.fontSizes.sm,
      fontFamily: typography.fontFamily.sans,
      color: colors.ink,
      paddingVertical: 8,
    },
    clearButton: {
      marginLeft: spacing.xs,
    },
  });
}
