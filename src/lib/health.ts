import { PIDS } from './pids';
import { DtcInfo, DtcSeverity, lookupDtc } from './dtc';

export interface LiveReading {
  pid: string;
  value: number;
  timestamp: number;
}

export interface HealthFinding {
  id: string;
  title: string;
  detail: string;
  severity: DtcSeverity;
  source: 'dtc' | 'live-parameter';
  recommendation: string;
}

/** Historical readings keyed by PID, most recent last. Rolling window kept by caller. */
export type ReadingHistory = Record<string, LiveReading[]>;

const OUT_OF_RANGE_STREAK_REQUIRED = 5; // consecutive bad readings before flagging, to avoid noise

function checkLiveParameters(history: ReadingHistory): HealthFinding[] {
  const findings: HealthFinding[] = [];

  for (const [pid, readings] of Object.entries(history)) {
    const def = PIDS[pid];
    if (!def?.healthyRange || readings.length === 0) continue;
    const [low, high] = def.healthyRange;
    const recent = readings.slice(-OUT_OF_RANGE_STREAK_REQUIRED);
    if (recent.length < OUT_OF_RANGE_STREAK_REQUIRED) continue;
    const allOutOfRange = recent.every((r) => r.value < low || r.value > high);
    if (!allOutOfRange) continue;

    const latest = recent[recent.length - 1].value;
    const direction = latest > high ? 'high' : 'low';

    findings.push(buildLiveFinding(pid, def.name, direction, latest, def.unit, low, high));
  }

  return findings;
}

function buildLiveFinding(
  pid: string,
  name: string,
  direction: 'high' | 'low',
  value: number,
  unit: string,
  low: number,
  high: number
): HealthFinding {
  const detail = `${name} reading ${value.toFixed(1)}${unit} is ${direction === 'high' ? 'above' : 'below'} the normal range (${low}–${high}${unit}).`;

  const advice: Record<string, { severity: DtcSeverity; recommendation: string }> = {
    '05': { severity: 'critical', recommendation: 'Check coolant level, radiator fan, thermostat, and water pump. Persistent overheating can cause head gasket failure.' },
    '42': { severity: 'critical', recommendation: 'Have the alternator, battery, and charging system tested — voltage out of range risks electrical failures and a dead battery.' },
    '5C': { severity: 'moderate', recommendation: 'Check oil level and condition; have the oil cooler and cooling system inspected.' },
    '0C': { severity: 'moderate', recommendation: 'Erratic or out-of-range RPM can indicate idle control, vacuum leak, or sensor issues — have idle system inspected.' },
    '11': { severity: 'moderate', recommendation: 'Have throttle body and TPS sensor calibration checked.' },
    '10': { severity: 'moderate', recommendation: 'Have the MAF sensor cleaned or tested — dirty/failing MAF sensors commonly cause rough idle and poor fuel economy.' },
    '0F': { severity: 'informational', recommendation: 'Usually benign unless paired with other intake issues; monitor.' },
    '04': { severity: 'informational', recommendation: 'Sustained high load can indicate towing/hills or a developing mechanical issue if seen at idle — monitor.' },
  };

  const fallback = { severity: 'informational' as DtcSeverity, recommendation: 'Monitor this parameter and consider a diagnostic scan if it persists.' };
  const { severity, recommendation } = advice[pid] ?? fallback;

  return {
    id: `live-${pid}-${direction}`,
    title: `${name} out of normal range`,
    detail,
    severity,
    source: 'live-parameter',
    recommendation,
  };
}

function checkDtcs(codes: string[]): HealthFinding[] {
  return codes.map((code) => {
    const info: DtcInfo = lookupDtc(code);
    return {
      id: `dtc-${code}`,
      title: `${code}: ${info.description}`,
      detail: `Reported by the ECU. Affected system: ${info.system}.`,
      severity: info.severity,
      source: 'dtc' as const,
      recommendation: recommendationForSystem(info.system, info.severity),
    };
  });
}

function recommendationForSystem(system: string, severity: DtcSeverity): string {
  if (severity === 'critical') {
    return `Address soon — continuing to drive with this ${system.toLowerCase()} issue risks further damage. Consider having it inspected before your next long trip.`;
  }
  if (severity === 'moderate') {
    return `Schedule a service visit for the ${system.toLowerCase()} within the next few weeks.`;
  }
  return `Low urgency — worth mentioning at your next scheduled service for the ${system.toLowerCase()}.`;
}

export function assessVehicleHealth(codes: string[], history: ReadingHistory): HealthFinding[] {
  const findings = [...checkDtcs(codes), ...checkLiveParameters(history)];
  const order: Record<DtcSeverity, number> = { critical: 0, moderate: 1, informational: 2 };
  return findings.sort((a, b) => order[a.severity] - order[b.severity]);
}

export function overallStatus(findings: HealthFinding[]): { label: string; color: string } {
  if (findings.some((f) => f.severity === 'critical')) return { label: 'Needs Attention', color: '#E5484D' };
  if (findings.some((f) => f.severity === 'moderate')) return { label: 'Minor Issues', color: '#F5A623' };
  if (findings.length > 0) return { label: 'Mostly Good', color: '#F5D923' };
  return { label: 'All Good', color: '#3DD68C' };
}
