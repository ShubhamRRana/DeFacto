import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export default function AuthScreen() {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Auth Screen — Coming in Phase 2</Text>
    </View>
  );
}

function createStyles(colors, typography) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.canvas,
      justifyContent: 'center',
      alignItems: 'center',
    },
    text: {
      ...typography.presets.bodyMd,
      color: colors.ink,
    },
  });
}
