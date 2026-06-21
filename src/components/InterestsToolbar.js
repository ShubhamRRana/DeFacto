import React from 'react';
import { View, StyleSheet } from 'react-native';
import { spacing } from '../theme/colors';
import TopicSearchBar from './TopicSearchBar';

export default function InterestsToolbar({ searchQuery, onChangeQuery }) {
  return (
    <View style={styles.toolbar}>
      <View style={styles.searchRow}>
        <TopicSearchBar query={searchQuery} onChangeQuery={onChangeQuery} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  searchRow: {
    width: '100%',
    alignSelf: 'stretch',
  },
});
