import React from 'react';
import { View, StyleSheet } from 'react-native';

const STARS = [
  { top: '4%', left: '12%', size: 2, opacity: 0.6 },
  { top: '8%', left: '78%', size: 1, opacity: 0.4 },
  { top: '12%', left: '45%', size: 1, opacity: 0.5 },
  { top: '16%', left: '22%', size: 1, opacity: 0.3 },
  { top: '18%', left: '88%', size: 2, opacity: 0.5 },
  { top: '22%', left: '62%', size: 1, opacity: 0.4 },
  { top: '26%', left: '8%', size: 1, opacity: 0.35 },
  { top: '28%', left: '35%', size: 2, opacity: 0.55 },
  { top: '32%', left: '92%', size: 1, opacity: 0.3 },
  { top: '36%', left: '52%', size: 1, opacity: 0.45 },
  { top: '40%', left: '18%', size: 1, opacity: 0.4 },
  { top: '44%', left: '72%', size: 2, opacity: 0.5 },
  { top: '48%', left: '5%', size: 1, opacity: 0.35 },
  { top: '52%', left: '38%', size: 1, opacity: 0.4 },
  { top: '56%', left: '85%', size: 1, opacity: 0.45 },
  { top: '60%', left: '28%', size: 2, opacity: 0.5 },
  { top: '64%', left: '58%', size: 1, opacity: 0.3 },
  { top: '68%', left: '95%', size: 1, opacity: 0.4 },
  { top: '72%', left: '15%', size: 1, opacity: 0.35 },
  { top: '76%', left: '48%', size: 2, opacity: 0.55 },
  { top: '80%', left: '82%', size: 1, opacity: 0.4 },
  { top: '84%', left: '32%', size: 1, opacity: 0.3 },
  { top: '88%', left: '68%', size: 1, opacity: 0.45 },
  { top: '92%', left: '10%', size: 2, opacity: 0.5 },
  { top: '6%', left: '55%', size: 1, opacity: 0.35 },
  { top: '14%', left: '68%', size: 1, opacity: 0.4 },
  { top: '24%', left: '42%', size: 1, opacity: 0.3 },
  { top: '34%', left: '78%', size: 1, opacity: 0.45 },
  { top: '46%', left: '8%', size: 2, opacity: 0.5 },
  { top: '58%', left: '42%', size: 1, opacity: 0.35 },
  { top: '70%', left: '75%', size: 1, opacity: 0.4 },
  { top: '82%', left: '55%', size: 1, opacity: 0.3 },
  { top: '94%', left: '88%', size: 2, opacity: 0.45 },
];

export default function StarFieldBackground() {
  return (
    <View style={styles.container} pointerEvents="none">
      {STARS.map((star, index) => (
        <View
          key={index}
          style={[
            styles.star,
            {
              top: star.top,
              left: star.left,
              width: star.size,
              height: star.size,
              opacity: star.opacity,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  star: {
    position: 'absolute',
    backgroundColor: '#ffffff',
    borderRadius: 999,
  },
});
