# OBD2 Diagnostics

A React Native app that connects to a Bluetooth ELM327 OBD2 adapter and gives you
real-time engine data, decoded trouble codes, and plain-language maintenance advice —
so you know what's actually wrong with your car and what to fix first.

## Why React Native

ELM327 Bluetooth adapters come in two flavors:

- **Bluetooth Classic (SPP)** — the vast majority of cheap ELM327 clones. Needs a real
  serial-port-profile connection, which browsers (Web Bluetooth) cannot do at all.
- **BLE** — newer dongles (Vgate iCar Pro BLE, OBDLink CX, etc.) expose a UART-style
  BLE service.

A native mobile app is the only option that reliably supports both, on a device you're
actually going to have with you in the car. This project supports **both** transports:

- `react-native-bluetooth-classic` for SPP adapters
- `react-native-ble-plx` for BLE adapters

## What it does

1. **Connect** — pick your paired Classic adapter, or scan for a BLE one.
2. **Live Data** — polls key Mode 01 PIDs (RPM, speed, coolant temp, throttle, engine
   load, intake temp, MAF, battery voltage, fuel level) every ~1.5s and shows them as
   live gauges, color-coded against healthy ranges.
3. **Health** — reads stored (Mode 03) and pending (Mode 07) diagnostic trouble codes,
   decodes them against a built-in DTC library, and cross-references sustained
   out-of-range live readings (e.g. coolant running hot, charging voltage low) to
   produce a prioritized list of findings: what's wrong, which system it affects, how
   urgent it is, and what to do about it.

## Project layout

```
src/
  lib/
    elm327.ts          ELM327 AT-command protocol client (transport-agnostic)
    pids.ts            Standard Mode 01 PID definitions + decoders + healthy ranges
    dtc.ts             DTC byte decoder + a starter library of common P-codes
    health.ts          Turns DTCs + live-parameter trends into prioritized findings
    obdStore.ts         Zustand store: connection state, polling loop, live values
    transports/
      classicTransport.ts   Bluetooth Classic (SPP) transport
      bleTransport.ts       BLE transport
  screens/             Connect / Dashboard / Health screens
  components/          Gauge component
  navigation/          Bottom tab navigator
```

## Setup

Requires a native build (this app uses native Bluetooth modules, so it can't run in
Expo Go — use a development build):

```bash
npm install
npx expo prebuild
npm run android   # or: npm run ios (requires macOS + Xcode)
```

Pair your ELM327 adapter in your phone's system Bluetooth settings first if it's a
Classic (SPP) adapter — the app lists already-paired devices. For BLE adapters, use
the in-app scanner (no OS pairing needed).

### Android permissions

Android 12+ requires runtime `BLUETOOTH_CONNECT` / `BLUETOOTH_SCAN` and (for BLE
scanning) location permission — already declared in `app.json`, but you'll need to
request them at runtime before scanning (add a permissions step in `ConnectScreen`
using `PermissionsAndroid` if you hit scan failures on real devices).

### BLE service UUIDs

`src/lib/transports/bleTransport.ts` uses the common `FFF0`/`FFF1`/`FFF2`
service/notify/write UUIDs found on most consumer BLE OBD dongles. If your specific
adapter uses different UUIDs, update those three constants — check the adapter's
spec sheet or sniff it with a BLE scanner app.

## Extending

- **More PIDs**: add entries to `PIDS` in `src/lib/pids.ts` — decode formulas are
  straight from the SAE J1979 standard.
- **More DTCs**: add entries to `DTC_LIBRARY` in `src/lib/dtc.ts`, or swap in a call to
  a live DTC lookup API for full coverage beyond the built-in common-code list.
- **Manufacturer-specific codes**: Mode 22 (enhanced PIDs) and manufacturer DTCs vary
  by make — this scaffold covers generic OBD2 (SAE standard) only.
- **History/trends**: `obdStore.history` already keeps a rolling window per PID; wire
  it into a chart (e.g. `react-native-svg`-based sparkline) on the dashboard.

## Status

This is a working scaffold: protocol layer, both transports, live dashboard, and the
health/maintenance advisor are implemented. Before relying on it for real diagnostics:

- [ ] Test against your actual adapter's exact response quirks (some clones deviate
      from spec — timing, prompt behavior, and multi-line responses vary).
- [ ] Add the Android runtime permission flow for BLE scan/connect.
- [ ] Expand the DTC library or wire up a live lookup API.
- [ ] Add trip logging / history persistence (AsyncStorage is already a dependency).
