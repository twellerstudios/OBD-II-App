import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { BluetoothDevice } from 'react-native-bluetooth-classic';
import { BleManager, Device } from 'react-native-ble-plx';
import { colors } from '../theme/colors';
import { useObdStore } from '../lib/obdStore';
import { ClassicObdTransport } from '../lib/transports/classicTransport';
import { BleObdTransport } from '../lib/transports/bleTransport';

const bleManager = new BleManager();

export function ConnectScreen() {
  const { connectionState, connectionError, connectClassic, connectBle } = useObdStore();
  const [pairedDevices, setPairedDevices] = useState<BluetoothDevice[]>([]);
  const [bleDevices, setBleDevices] = useState<Device[]>([]);
  const [scanning, setScanning] = useState(false);
  const [mode, setMode] = useState<'classic' | 'ble'>('classic');

  useEffect(() => {
    if (mode === 'classic') {
      ClassicObdTransport.listPaired()
        .then(setPairedDevices)
        .catch(() => setPairedDevices([]));
    }
  }, [mode]);

  const startBleScan = async () => {
    setScanning(true);
    setBleDevices([]);
    const stop = await BleObdTransport.scan(
      bleManager,
      (d) => setBleDevices((prev) => (prev.find((p) => p.id === d.id) ? prev : [...prev, d])),
      8000
    );
    setTimeout(() => {
      stop();
      setScanning(false);
    }, 8000);
  };

  const connecting = connectionState === 'connecting';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Connect to your OBD2 adapter</Text>
      <Text style={styles.subtitle}>
        Pair your ELM327 Bluetooth adapter in your phone's Bluetooth settings first, then select it below.
      </Text>

      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tab, mode === 'classic' && styles.tabActive]} onPress={() => setMode('classic')}>
          <Text style={styles.tabText}>Bluetooth Classic (SPP)</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, mode === 'ble' && styles.tabActive]} onPress={() => setMode('ble')}>
          <Text style={styles.tabText}>Bluetooth Low Energy</Text>
        </TouchableOpacity>
      </View>

      {mode === 'classic' ? (
        <FlatList
          data={pairedDevices}
          keyExtractor={(d) => d.address}
          ListEmptyComponent={<Text style={styles.empty}>No paired devices found. Pair your ELM327 adapter in system Bluetooth settings first.</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.deviceRow} disabled={connecting} onPress={() => connectClassic(item)}>
              <Text style={styles.deviceName}>{item.name || 'Unknown device'}</Text>
              <Text style={styles.deviceAddr}>{item.address}</Text>
            </TouchableOpacity>
          )}
        />
      ) : (
        <>
          <TouchableOpacity style={styles.scanButton} onPress={startBleScan} disabled={scanning}>
            <Text style={styles.scanButtonText}>{scanning ? 'Scanning…' : 'Scan for BLE adapters'}</Text>
          </TouchableOpacity>
          <FlatList
            data={bleDevices}
            keyExtractor={(d) => d.id}
            ListEmptyComponent={<Text style={styles.empty}>No BLE adapters found yet.</Text>}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.deviceRow} disabled={connecting} onPress={() => connectBle(bleManager, item.id)}>
                <Text style={styles.deviceName}>{item.name || 'Unknown device'}</Text>
                <Text style={styles.deviceAddr}>{item.id}</Text>
              </TouchableOpacity>
            )}
          />
        </>
      )}

      {connecting && (
        <View style={styles.statusRow}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.statusText}>Connecting…</Text>
        </View>
      )}
      {connectionState === 'error' && connectionError && <Text style={styles.errorText}>{connectionError}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 20 },
  title: { color: colors.textPrimary, fontSize: 22, fontWeight: '700', marginBottom: 8 },
  subtitle: { color: colors.textSecondary, fontSize: 14, marginBottom: 20, lineHeight: 20 },
  tabRow: { flexDirection: 'row', marginBottom: 16, gap: 8 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: colors.surface, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  tabActive: { borderColor: colors.accent },
  tabText: { color: colors.textPrimary, fontSize: 13 },
  deviceRow: { backgroundColor: colors.surface, borderRadius: 10, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  deviceName: { color: colors.textPrimary, fontSize: 16, fontWeight: '600' },
  deviceAddr: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  scanButton: { backgroundColor: colors.accent, borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginBottom: 16 },
  scanButtonText: { color: '#04141F', fontWeight: '700' },
  empty: { color: colors.textSecondary, textAlign: 'center', marginTop: 24 },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16, gap: 8 },
  statusText: { color: colors.textSecondary },
  errorText: { color: colors.critical, marginTop: 16, textAlign: 'center' },
});
