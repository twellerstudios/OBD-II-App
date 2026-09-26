import RNBluetoothClassic, { BluetoothDevice } from 'react-native-bluetooth-classic';
import type { ObdTransport } from '../elm327';

/** Wraps a paired Bluetooth Classic (SPP) device, e.g. most ELM327 clones. */
export class ClassicObdTransport implements ObdTransport {
  private device: BluetoothDevice;
  private connected = false;
  private listeners = new Set<(chunk: string) => void>();
  private subscription: { remove(): void } | null = null;

  constructor(device: BluetoothDevice) {
    this.device = device;
  }

  static async listPaired(): Promise<BluetoothDevice[]> {
    const enabled = await RNBluetoothClassic.isBluetoothEnabled();
    if (!enabled) await RNBluetoothClassic.requestBluetoothEnabled();
    return RNBluetoothClassic.getBondedDevices();
  }

  async connect(): Promise<void> {
    const already = await this.device.isConnected();
    if (!already) {
      await this.device.connect({ connectorType: 'rfcomm', delimiter: '>' });
    }
    this.connected = true;
    this.subscription = this.device.onDataReceived((event) => {
      for (const cb of this.listeners) cb(event.data);
    });
  }

  isConnected(): boolean {
    return this.connected;
  }

  async write(command: string): Promise<void> {
    await this.device.write(command, 'ascii');
  }

  onData(cb: (chunk: string) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.subscription?.remove();
    await this.device.disconnect();
  }
}
