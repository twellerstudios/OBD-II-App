import { PermissionsAndroid, Platform } from 'react-native';

/** Requests the runtime Bluetooth permissions Android requires before any adapter call. */
export async function ensureBluetoothPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

  const api = typeof Platform.Version === 'number' ? Platform.Version : parseInt(String(Platform.Version), 10);
  const wanted =
    api >= 31
      ? [PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT, PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN]
      : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];

  const results = await PermissionsAndroid.requestMultiple(wanted);
  return wanted.every((p) => results[p] === PermissionsAndroid.RESULTS.GRANTED);
}
