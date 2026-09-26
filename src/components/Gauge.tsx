import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

interface GaugeProps {
  label: string;
  value: number | undefined;
  unit: string;
  min: number;
  max: number;
  healthyRange?: [number, number];
}

export function Gauge({ label, value, unit, min, max, healthyRange }: GaugeProps) {
  const hasValue = value !== undefined && !Number.isNaN(value);
  const pct = hasValue ? Math.min(1, Math.max(0, (value! - min) / (max - min))) : 0;

  let barColor = colors.accent;
  if (hasValue && healthyRange) {
    const [low, high] = healthyRange;
    barColor = value! < low || value! > high ? colors.critical : colors.good;
  }

  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color: barColor }]}>
        {hasValue ? value!.toFixed(1) : '—'}
        <Text style={styles.unit}> {unit}</Text>
      </Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: barColor }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    width: '47%',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: { color: colors.textSecondary, fontSize: 13, marginBottom: 6 },
  value: { fontSize: 24, fontWeight: '700' },
  unit: { fontSize: 13, fontWeight: '400', color: colors.textSecondary },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceAlt,
    marginTop: 10,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 3 },
});
