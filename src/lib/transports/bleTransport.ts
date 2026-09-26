import { BleManager, Device, Subscription } from 'react-native-ble-plx';
import base64 from 'react-native-base64';
import type { ObdTransport } from '../elm327';

/**
 * Wraps a BLE ELM327-style adapter (e.g. Vgate iCar Pro BLE, OBDLink CX).
 * Most of these expose a UART-like service with a write and a notify characteristic.
 * The UUIDs below cover the common "SPP-over-BLE" (Nordic UART-style) profile
 * used by the majority of consumer OBD BLE dongles; update per-device if needed.
 */
const SERVICE_UUID = 'FFF0';
const WRITE_CHAR_UUID = 'FFF2';
const NOTIFY_CHAR_UUID = 'FFF1';

export class BleObdTransport implements ObdTransport {
  private manager: BleManager;
  private device: Device;
  private connected = false;
  private listeners = new Set<(chunk: string) => void>();
  private notifySub: Subscription | null = null;

  constructor(manager: BleManager, device: Device) {
    this.manager = manager;
    this.device = device;
  }

  static async scan(manager: BleManager, onFound: (d: Device) => void, timeoutMs = 8000): Promise<() => void> {
    manager.startDeviceScan(null, { allowDuplicates: false }, (error, device) => {
      if (error || !device) return;
      if (device.name && /obd|elm|vgate|obdlink|icar/i.test(device.name)) {
        onFound(device);
      }
    });
    const timer = setTimeout(() => manager.stopDeviceScan(), timeoutMs);
    return () => {
      clearTimeout(timer);
      manager.stopDeviceScan();
    };
  }

  async connect(): Promise<void> {
    const connected = await this.device.connect();
    await connected.discoverAllServicesAndCharacteristics();
    this.device = connected;
    this.connected = true;

    this.notifySub = this.device.monitorCharacteristicForService(
      SERVICE_UUID,
      NOTIFY_CHAR_UUID,
      (error, characteristic) => {
        if (error || !characteristic?.value) return;
        const chunk = base64.decode(characteristic.value);
        for (const cb of this.listeners) cb(chunk);
      }
    );
  }

  isConnected(): boolean {
    return this.connected;
  }

  async write(command: string): Promise<void> {
    const encoded = base64.encode(command);
    await this.device.writeCharacteristicWithResponseForService(SERVICE_UUID, WRITE_CHAR_UUID, encoded);
  }

  onData(cb: (chunk: string) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.notifySub?.remove();
    await this.device.cancelConnection();
  }
}
