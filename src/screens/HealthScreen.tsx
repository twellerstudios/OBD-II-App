import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { colors } from '../theme/colors';
import { useObdStore } from '../lib/obdStore';
import { assessVehicleHealth, overallStatus, HealthFinding } from '../lib/health';

const severityColor: Record<HealthFinding['severity'], string> = {
  critical: colors.critical,
  moderate: colors.warning,
  informational: colors.good,
};

export function HealthScreen() {
  const { dtcCodes, history, refreshDtcs, clearDtcs, connectionState } = useObdStore();

  useEffect(() => {
    if (connectionState === 'connected') refreshDtcs();
  }, [connectionState]);

  const findings = assessVehicleHealth(dtcCodes, history);
  const status = overallStatus(findings);

  const onClear = () => {
    Alert.alert(
      'Clear diagnostic codes?',
      'This clears stored codes and resets the check-engine light. If the underlying problem isn\'t fixed, the code will likely come back.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear codes', style: 'destructive', onPress: () => clearDtcs() },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <View style={[styles.statusBanner, { borderColor: status.color }]}>
        <View style={[styles.statusDot, { backgroundColor: status.color }]} />
        <Text style={[styles.statusLabel, { color: status.color }]}>{status.label}</Text>
      </View>

      <View style={styles.rowBetween}>
        <Text style={styles.sectionTitle}>Findings ({findings.length})</Text>
        <TouchableOpacity onPress={refreshDtcs}>
          <Text style={styles.refresh}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {findings.length === 0 && (
        <Text style={styles.empty}>No issues detected from stored codes or live parameters. Keep an eye on things as you drive — trends build up over time.</Text>
      )}

      {findings.map((f) => (
        <View key={f.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.badge, { backgroundColor: severityColor[f.severity] }]} />
            <Text style={styles.cardTitle}>{f.title}</Text>
          </View>
          <Text style={styles.cardDetail}>{f.detail}</Text>
          <Text style={styles.cardRecommendation}>→ {f.recommendation}</Text>
        </View>
      ))}

      {dtcCodes.length > 0 && (
        <TouchableOpacity style={styles.clearBtn} onPress={onClear}>
          <Text style={styles.clearBtnText}>Clear stored codes</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  statusBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, borderRadius: 12,
    borderWidth: 1, backgroundColor: colors.surface, marginBottom: 20,
  },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  statusLabel: { fontSize: 18, fontWeight: '700' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  refresh: { color: colors.accent, fontSize: 13, fontWeight: '600' },
  empty: { color: colors.textSecondary, lineHeight: 20 },
  card: { backgroundColor: colors.surface, borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  badge: { width: 10, height: 10, borderRadius: 5 },
  cardTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: '700', flex: 1 },
  cardDetail: { color: colors.textSecondary, fontSize: 13, marginBottom: 8, lineHeight: 18 },
  cardRecommendation: { color: colors.textPrimary, fontSize: 13, lineHeight: 18 },
  clearBtn: { marginTop: 8, backgroundColor: colors.surfaceAlt, borderRadius: 10, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  clearBtnText: { color: colors.critical, fontWeight: '600' },
});
