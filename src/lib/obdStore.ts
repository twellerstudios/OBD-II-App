import { create } from 'zustand';
import { BleManager } from 'react-native-ble-plx';
import { BluetoothDevice } from 'react-native-bluetooth-classic';
import { Elm327Client, ObdTransport } from './elm327';
import { ClassicObdTransport } from './transports/classicTransport';
import { BleObdTransport } from './transports/bleTransport';
import { PIDS, LIVE_DASHBOARD_PIDS } from './pids';
import { decodeDtcBytes } from './dtc';
import { ReadingHistory } from './health';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

interface ObdStoreState {
  connectionState: ConnectionState;
  connectionError: string | null;
  client: Elm327Client | null;
  transport: ObdTransport | null;
  vin: string | null;
  liveValues: Record<string, number>;
  history: ReadingHistory;
  dtcCodes: string[];
  polling: boolean;

  connectClassic: (device: BluetoothDevice) => Promise<void>;
  connectBle: (manager: BleManager, deviceId: string) => Promise<void>;
  disconnect: () => Promise<void>;
  startPolling: () => void;
  stopPolling: () => void;
  refreshDtcs: () => Promise<void>;
  clearDtcs: () => Promise<void>;
}

const HISTORY_WINDOW = 20;
let pollTimer: ReturnType<typeof setInterval> | null = null;

export const useObdStore = create<ObdStoreState>((set, get) => ({
  connectionState: 'disconnected',
  connectionError: null,
  client: null,
  transport: null,
  vin: null,
  liveValues: {},
  history: {},
  dtcCodes: [],
  polling: false,

  connectClassic: async (device) => {
    set({ connectionState: 'connecting', connectionError: null });
    try {
      const transport = new ClassicObdTransport(device);
      await transport.connect();
      const client = new Elm327Client(transport);
      await client.initialize();
      const vin = await client.readVin().catch(() => null);
      set({ client, transport, connectionState: 'connected', vin });
      get().startPolling();
    } catch (err: any) {
      set({ connectionState: 'error', connectionError: err?.message ?? 'Failed to connect' });
    }
  },

  connectBle: async (manager, deviceId) => {
    set({ connectionState: 'connecting', connectionError: null });
    try {
      const device = await manager.connectToDevice(deviceId);
      const transport = new BleObdTransport(manager, device);
      await transport.connect();
      const client = new Elm327Client(transport);
      await client.initialize();
      const vin = await client.readVin().catch(() => null);
      set({ client, transport, connectionState: 'connected', vin });
      get().startPolling();
    } catch (err: any) {
      set({ connectionState: 'error', connectionError: err?.message ?? 'Failed to connect' });
    }
  },

  disconnect: async () => {
    get().stopPolling();
    const { transport, client } = get();
    client?.destroy();
    await transport?.disconnect().catch(() => {});
    set({
      connectionState: 'disconnected',
      client: null,
      transport: null,
      vin: null,
      liveValues: {},
      history: {},
    });
  },

  startPolling: () => {
    if (get().polling) return;
    set({ polling: true });
    pollTimer = setInterval(async () => {
      const { client } = get();
      if (!client) return;
      for (const pid of LIVE_DASHBOARD_PIDS) {
        try {
          const bytes = await client.requestPid(pid);
          if (!bytes) continue;
          const def = PIDS[pid];
          const value = def.decode(bytes[0] ?? 0, bytes[1] ?? 0, bytes[2] ?? 0, bytes[3] ?? 0);
          set((state) => {
            const nextHistory = { ...state.history };
            const list = [...(nextHistory[pid] ?? []), { pid, value, timestamp: Date.now() }];
            nextHistory[pid] = list.slice(-HISTORY_WINDOW);
            return {
              liveValues: { ...state.liveValues, [pid]: value },
              history: nextHistory,
            };
          });
        } catch {
          // Skip this PID this cycle — adapter may be busy or car doesn't support it.
        }
      }
    }, 1500);
  },

  stopPolling: () => {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = null;
    set({ polling: false });
  },

  refreshDtcs: async () => {
    const { client } = get();
    if (!client) return;
    const stored = await client.requestStoredDtcs().catch(() => []);
    const codes = decodeDtcBytes(stored);
    set({ dtcCodes: codes });
  },

  clearDtcs: async () => {
    const { client } = get();
    if (!client) return;
    await client.clearDtcs();
    set({ dtcCodes: [] });
  },
}));
