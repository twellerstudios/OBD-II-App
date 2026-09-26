import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';
import { useObdStore } from '../lib/obdStore';
import { PIDS, LIVE_DASHBOARD_PIDS } from '../lib/pids';
import { Gauge } from '../components/Gauge';

export function DashboardScreen() {
  const { liveValues, vin, connectionState, disconnect } = useObdStore();

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Live Data</Text>
          {vin && <Text style={styles.vin}>VIN: {vin}</Text>}
        </View>
        <TouchableOpacity style={styles.disconnectBtn} onPress={disconnect}>
          <Text style={styles.disconnectText}>{connectionState === 'connected' ? 'Disconnect' : '—'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.grid}>
        {LIVE_DASHBOARD_PIDS.map((pid) => {
          const def = PIDS[pid];
          return (
            <Gauge
              key={pid}
              label={def.short}
              value={liveValues[pid]}
              unit={def.unit}
              min={def.min}
              max={def.max}
              healthyRange={def.healthyRange}
            />
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  title: { color: colors.textPrimary, fontSize: 22, fontWeight: '700' },
  vin: { color: colors.textSecondary, fontSize: 12, marginTop: 4 },
  disconnectBtn: { backgroundColor: colors.surface, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border },
  disconnectText: { color: colors.critical, fontSize: 13, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
});
