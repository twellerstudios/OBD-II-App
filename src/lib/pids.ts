/**
 * Standard OBD2 Mode 01 (live data) PID definitions.
 * `decode` receives the raw data bytes AFTER the mode/pid echo (A, B, C, D...).
 */
export type PidCategory = 'engine' | 'fuel' | 'emissions' | 'intake' | 'electrical' | 'speed';

export interface PidDefinition {
  pid: string; // hex, e.g. "0C"
  name: string;
  short: string;
  unit: string;
  category: PidCategory;
  bytes: number; // expected data bytes
  min: number;
  max: number;
  /** Ideal/healthy range for quick-glance status; undefined = no simple range check */
  healthyRange?: [number, number];
  decode: (a: number, b: number, c: number, d: number) => number;
}

export const PIDS: Record<string, PidDefinition> = {
  '04': {
    pid: '04', name: 'Engine Load', short: 'Load', unit: '%', category: 'engine', bytes: 1,
    min: 0, max: 100, healthyRange: [0, 90],
    decode: (a) => (a * 100) / 255,
  },
  '05': {
    pid: '05', name: 'Coolant Temperature', short: 'Coolant', unit: '°C', category: 'engine', bytes: 1,
    min: -40, max: 215, healthyRange: [70, 105],
    decode: (a) => a - 40,
  },
  '0A': {
    pid: '0A', name: 'Fuel Pressure', short: 'Fuel Pres.', unit: 'kPa', category: 'fuel', bytes: 1,
    min: 0, max: 765,
    decode: (a) => a * 3,
  },
  '0B': {
    pid: '0B', name: 'Intake Manifold Pressure', short: 'MAP', unit: 'kPa', category: 'intake', bytes: 1,
    min: 0, max: 255, healthyRange: [20, 110],
    decode: (a) => a,
  },
  '0C': {
    pid: '0C', name: 'Engine RPM', short: 'RPM', unit: 'rpm', category: 'engine', bytes: 2,
    min: 0, max: 8000, healthyRange: [600, 6500],
    decode: (a, b) => (a * 256 + b) / 4,
  },
  '0D': {
    pid: '0D', name: 'Vehicle Speed', short: 'Speed', unit: 'km/h', category: 'speed', bytes: 1,
    min: 0, max: 255,
    decode: (a) => a,
  },
  '0F': {
    pid: '0F', name: 'Intake Air Temperature', short: 'Intake Temp', unit: '°C', category: 'intake', bytes: 1,
    min: -40, max: 215, healthyRange: [-10, 60],
    decode: (a) => a - 40,
  },
  '10': {
    pid: '10', name: 'MAF Air Flow Rate', short: 'MAF', unit: 'g/s', category: 'intake', bytes: 2,
    min: 0, max: 655,
    decode: (a, b) => (a * 256 + b) / 100,
  },
  '11': {
    pid: '11', name: 'Throttle Position', short: 'Throttle', unit: '%', category: 'engine', bytes: 1,
    min: 0, max: 100,
    decode: (a) => (a * 100) / 255,
  },
  '1F': {
    pid: '1F', name: 'Run Time Since Start', short: 'Runtime', unit: 's', category: 'engine', bytes: 2,
    min: 0, max: 65535,
    decode: (a, b) => a * 256 + b,
  },
  '21': {
    pid: '21', name: 'Distance w/ MIL On', short: 'MIL Dist.', unit: 'km', category: 'emissions', bytes: 2,
    min: 0, max: 65535,
    decode: (a, b) => a * 256 + b,
  },
  '2F': {
    pid: '2F', name: 'Fuel Tank Level', short: 'Fuel Level', unit: '%', category: 'fuel', bytes: 1,
    min: 0, max: 100,
    decode: (a) => (a * 100) / 255,
  },
  '33': {
    pid: '33', name: 'Barometric Pressure', short: 'Baro', unit: 'kPa', category: 'intake', bytes: 1,
    min: 0, max: 255,
    decode: (a) => a,
  },
  '42': {
    pid: '42', name: 'Control Module Voltage', short: 'Voltage', unit: 'V', category: 'electrical', bytes: 2,
    min: 0, max: 65, healthyRange: [13.0, 14.8],
    decode: (a, b) => (a * 256 + b) / 1000,
  },
  '46': {
    pid: '46', name: 'Ambient Air Temperature', short: 'Ambient Temp', unit: '°C', category: 'intake', bytes: 1,
    min: -40, max: 215,
    decode: (a) => a - 40,
  },
  '5C': {
    pid: '5C', name: 'Engine Oil Temperature', short: 'Oil Temp', unit: '°C', category: 'engine', bytes: 1,
    min: -40, max: 210, healthyRange: [80, 120],
    decode: (a) => a - 40,
  },
};

export const LIVE_DASHBOARD_PIDS = ['0C', '0D', '05', '11', '04', '0F', '10', '42', '2F'];

export function parseHexPayload(hex: string): number[] {
  const clean = hex.replace(/\s+/g, '');
  const bytes: number[] = [];
  for (let i = 0; i < clean.length; i += 2) {
    bytes.push(parseInt(clean.substring(i, i + 2), 16));
  }
  return bytes;
}
