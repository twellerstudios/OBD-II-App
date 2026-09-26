import { parseHexPayload } from './pids';

/**
 * ELM327 transport abstraction.
 * Most cheap ELM327 clones use Bluetooth Classic (SPP), which needs
 * react-native-bluetooth-classic. Newer OBD dongles (e.g. Vgate iCar Pro BLE)
 * use BLE with a UART-style service, handled via react-native-ble-plx.
 * Both are wrapped behind the same interface so the rest of the app doesn't care.
 */
export interface ObdTransport {
  write(command: string): Promise<void>;
  onData(cb: (chunk: string) => void): () => void;
  disconnect(): Promise<void>;
  isConnected(): boolean;
}

const PROMPT = '>';

export class Elm327Client {
  private transport: ObdTransport;
  private buffer = '';
  private pending: { resolve: (v: string) => void; reject: (e: Error) => void } | null = null;
  private unsubscribe: () => void;
  private busy = false;

  constructor(transport: ObdTransport) {
    this.transport = transport;
    this.unsubscribe = transport.onData((chunk) => this.handleData(chunk));
  }

  private handleData(chunk: string) {
    this.buffer += chunk;
    if (this.buffer.includes(PROMPT)) {
      const raw = this.buffer;
      this.buffer = '';
      if (this.pending) {
        const { resolve } = this.pending;
        this.pending = null;
        resolve(raw);
      }
    }
  }

  /** Sends a raw AT/OBD command and waits for the ">" prompt terminator. */
  async sendRaw(command: string, timeoutMs = 4000): Promise<string> {
    if (this.busy) throw new Error('ELM327 client is busy with another command');
    if (!this.transport.isConnected()) throw new Error('Not connected to adapter');
    this.busy = true;
    try {
      return await new Promise<string>((resolve, reject) => {
        const timer = setTimeout(() => {
          this.pending = null;
          reject(new Error(`Timed out waiting for response to "${command}"`));
        }, timeoutMs);

        this.pending = {
          resolve: (v) => {
            clearTimeout(timer);
            resolve(v);
          },
          reject: (e) => {
            clearTimeout(timer);
            reject(e);
          },
        };

        this.transport.write(command + '\r').catch((e) => {
          clearTimeout(timer);
          this.pending = null;
          reject(e);
        });
      });
    } finally {
      this.busy = false;
    }
  }

  /** Standard adapter init sequence. */
  async initialize(): Promise<void> {
    await this.sendRaw('ATZ', 2000).catch(() => {}); // reset, ignore garbage banner
    await this.sendRaw('ATE0'); // echo off
    await this.sendRaw('ATL0'); // linefeeds off
    await this.sendRaw('ATS0'); // spaces off
    await this.sendRaw('ATH0'); // headers off
    await this.sendRaw('ATSP0'); // auto-detect protocol
  }

  /** Requests one Mode 01 PID and returns the raw data bytes (after mode+pid echo), or null if no data. */
  async requestPid(pid: string): Promise<number[] | null> {
    const response = await this.sendRaw(`01${pid}`);
    return this.extractDataBytes(response, '41', pid);
  }

  /** Requests stored DTCs (Mode 03). Returns decoded raw byte stream (caller decodes via decodeDtcBytes). */
  async requestStoredDtcs(): Promise<number[]> {
    const response = await this.sendRaw('03');
    return this.extractModeBytes(response, '43');
  }

  async requestPendingDtcs(): Promise<number[]> {
    const response = await this.sendRaw('07');
    return this.extractModeBytes(response, '47');
  }

  async clearDtcs(): Promise<void> {
    await this.sendRaw('04');
  }

  async readVin(): Promise<string | null> {
    const response = await this.sendRaw('0902');
    const bytes = this.extractModeBytes(response, '49');
    if (!bytes.length) return null;
    // First byte after mode/pid echo is often a byte count (0x01); strip non-ASCII.
    const ascii = bytes
      .filter((b) => b >= 0x20 && b <= 0x7e)
      .map((b) => String.fromCharCode(b))
      .join('');
    return ascii || null;
  }

  private extractDataBytes(raw: string, modeEcho: string, pidEcho: string): number[] | null {
    const lines = this.splitLines(raw);
    for (const line of lines) {
      const clean = line.replace(/\s+/g, '').toUpperCase();
      if (clean.startsWith(modeEcho + pidEcho.toUpperCase())) {
        const rest = clean.substring((modeEcho + pidEcho).length);
        return parseHexPayload(rest);
      }
    }
    return null;
  }

  private extractModeBytes(raw: string, modeEcho: string): number[] {
    const lines = this.splitLines(raw);
    const bytes: number[] = [];
    for (const line of lines) {
      const clean = line.replace(/\s+/g, '').toUpperCase();
      if (clean.startsWith(modeEcho)) {
        bytes.push(...parseHexPayload(clean.substring(modeEcho.length)));
      }
    }
    return bytes;
  }

  private splitLines(raw: string): string[] {
    return raw
      .replace(PROMPT, '')
      .split(/[\r\n]+/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && l !== 'OK' && !l.startsWith('SEARCHING') && !l.includes('NO DATA'));
  }

  destroy() {
    this.unsubscribe();
  }
}
