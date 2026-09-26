/**
 * Decodes raw DTC bytes (from Mode 03/07/0A responses) into standard codes like "P0301".
 * Each DTC is 2 bytes. First two bits of the first byte select the letter.
 */
const LETTERS = ['P', 'C', 'B', 'U'];

export function decodeDtcBytes(bytes: number[]): string[] {
  const codes: string[] = [];
  for (let i = 0; i + 1 < bytes.length; i += 2) {
    const a = bytes[i];
    const b = bytes[i + 1];
    if (a === 0 && b === 0) continue; // padding
    const letter = LETTERS[(a & 0xc0) >> 6];
    const digit1 = (a & 0x30) >> 4;
    const digit2 = a & 0x0f;
    const digit3 = (b & 0xf0) >> 4;
    const digit4 = b & 0x0f;
    codes.push(`${letter}${digit1}${digit2.toString(16).toUpperCase()}${digit3.toString(16).toUpperCase()}${digit4.toString(16).toUpperCase()}`);
  }
  return codes;
}

export type DtcSeverity = 'critical' | 'moderate' | 'informational';

export interface DtcInfo {
  description: string;
  severity: DtcSeverity;
  system: string;
}

/** A practical starter set of the most common generic (P0xxx) codes. Extend as needed. */
export const DTC_LIBRARY: Record<string, DtcInfo> = {
  P0011: { description: 'Intake Camshaft Position Timing Over-Advanced (Bank 1)', severity: 'moderate', system: 'Engine / Variable Valve Timing' },
  P0016: { description: 'Crankshaft/Camshaft Position Correlation (Bank 1 Sensor A)', severity: 'critical', system: 'Engine / Timing' },
  P0030: { description: 'HO2S Heater Control Circuit (Bank 1 Sensor 1)', severity: 'moderate', system: 'Emissions / O2 Sensor' },
  P0100: { description: 'Mass or Volume Air Flow Circuit Malfunction', severity: 'moderate', system: 'Intake / MAF Sensor' },
  P0101: { description: 'Mass or Volume Air Flow Circuit Range/Performance', severity: 'moderate', system: 'Intake / MAF Sensor' },
  P0113: { description: 'Intake Air Temperature Circuit High Input', severity: 'informational', system: 'Intake / IAT Sensor' },
  P0116: { description: 'Engine Coolant Temperature Circuit Range/Performance', severity: 'moderate', system: 'Cooling / ECT Sensor' },
  P0117: { description: 'Engine Coolant Temperature Circuit Low Input', severity: 'moderate', system: 'Cooling / ECT Sensor' },
  P0121: { description: 'Throttle Position Sensor Circuit Range/Performance', severity: 'moderate', system: 'Throttle Body' },
  P0128: { description: 'Coolant Thermostat (below regulating temperature)', severity: 'moderate', system: 'Cooling / Thermostat' },
  P0130: { description: 'O2 Sensor Circuit Malfunction (Bank 1 Sensor 1)', severity: 'moderate', system: 'Emissions / O2 Sensor' },
  P0171: { description: 'System Too Lean (Bank 1)', severity: 'moderate', system: 'Fuel / Air-Fuel Mixture' },
  P0172: { description: 'System Too Rich (Bank 1)', severity: 'moderate', system: 'Fuel / Air-Fuel Mixture' },
  P0174: { description: 'System Too Lean (Bank 2)', severity: 'moderate', system: 'Fuel / Air-Fuel Mixture' },
  P0175: { description: 'System Too Rich (Bank 2)', severity: 'moderate', system: 'Fuel / Air-Fuel Mixture' },
  P0217: { description: 'Engine Overtemperature Condition', severity: 'critical', system: 'Cooling System' },
  P0300: { description: 'Random/Multiple Cylinder Misfire Detected', severity: 'critical', system: 'Ignition / Misfire' },
  P0301: { description: 'Cylinder 1 Misfire Detected', severity: 'critical', system: 'Ignition / Misfire' },
  P0302: { description: 'Cylinder 2 Misfire Detected', severity: 'critical', system: 'Ignition / Misfire' },
  P0303: { description: 'Cylinder 3 Misfire Detected', severity: 'critical', system: 'Ignition / Misfire' },
  P0304: { description: 'Cylinder 4 Misfire Detected', severity: 'critical', system: 'Ignition / Misfire' },
  P0325: { description: 'Knock Sensor Circuit Malfunction (Bank 1)', severity: 'moderate', system: 'Ignition / Knock Sensor' },
  P0335: { description: 'Crankshaft Position Sensor Circuit Malfunction', severity: 'critical', system: 'Engine / Sensors' },
  P0340: { description: 'Camshaft Position Sensor Circuit Malfunction', severity: 'critical', system: 'Engine / Sensors' },
  P0401: { description: 'Exhaust Gas Recirculation Flow Insufficient', severity: 'moderate', system: 'Emissions / EGR' },
  P0420: { description: 'Catalyst System Efficiency Below Threshold (Bank 1)', severity: 'moderate', system: 'Emissions / Catalytic Converter' },
  P0430: { description: 'Catalyst System Efficiency Below Threshold (Bank 2)', severity: 'moderate', system: 'Emissions / Catalytic Converter' },
  P0440: { description: 'Evaporative Emission Control System Malfunction', severity: 'informational', system: 'Emissions / EVAP' },
  P0442: { description: 'EVAP System Leak Detected (small leak)', severity: 'informational', system: 'Emissions / EVAP' },
  P0455: { description: 'EVAP System Leak Detected (large leak, often loose gas cap)', severity: 'informational', system: 'Emissions / EVAP' },
  P0500: { description: 'Vehicle Speed Sensor Malfunction', severity: 'moderate', system: 'Drivetrain / Sensors' },
  P0505: { description: 'Idle Air Control System Malfunction', severity: 'moderate', system: 'Engine / Idle Control' },
  P0562: { description: 'System Voltage Low', severity: 'critical', system: 'Electrical / Charging System' },
  P0563: { description: 'System Voltage High', severity: 'critical', system: 'Electrical / Charging System' },
  P0601: { description: 'Internal Control Module Memory Check Sum Error', severity: 'critical', system: 'ECU' },
  P0700: { description: 'Transmission Control System Malfunction (see transmission codes)', severity: 'critical', system: 'Transmission' },
};

export function lookupDtc(code: string): DtcInfo {
  return DTC_LIBRARY[code] ?? {
    description: 'Code not in local library — look up on a live database for full details.',
    severity: 'informational',
    system: 'Unknown',
  };
}
