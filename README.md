# DhanLabh AI Chart Assistant

Personal Windows desktop AI chart analysis assistant for Olymp Trade.

DhanLabh does not place trades, connect to a broker, manage accounts, or guarantee profit. It watches the visible Olymp Trade candlestick chart and provides probability-based visual analysis.

## Desktop Features

- Windows desktop app built with Electron and React.
- Automatically waits for the Olymp Trade window.
- Automatically detects and locks onto the main candlestick chart.
- Ignores visible platform UI such as headers, buttons, menus, sidebars, account areas, and notifications.
- Relocates the chart automatically when Olymp Trade is resized, moved, or refreshed.
- Continuous monitoring with stale-frame detection.
- Automatic refresh only when the visible chart changes.
- Friendly recovery when capture, OCR, or analysis fails.
- Live status panel with Capture FPS, Processing Time, Last Updated, OCR Status, AI Status, and Capture Status.
- Local computer-vision chart analysis for trend, momentum, support, resistance, volatility, market structure, and chart patterns.
- Clean analysis panel with Trend, Support, Resistance, Market Structure, Indicator Summary, Pattern Detected, Confidence Level, and Risk Level.
- Always-on-top floating overlay with glass styling, compact/full mode, transparency control, resizing, and click-through locking.
- Local screenshot history, replay mode, and journal notes.
- Local SQLite storage in the Windows app data folder.

## Folder Structure

```text
electron/
  assets/           Windows icon and desktop artwork
  main.cjs          Electron main process, capture, storage, overlay
  overlay.html      Always-on-top floating overlay
  preload.cjs       Secure desktop bridge
  splash.html       Startup splash screen

frontend/
  src/App.jsx       Desktop dashboard
  src/vision/       Olymp Trade chart detection, chart vision, OCR helpers
  dist/             Production renderer build

scripts/
  generate-assets.cjs
```

## Development

```bash
npm install
npm run dev
```

`npm run dev` starts the desktop app and the local renderer together.

## Build

```bash
npm run build
```

## Windows Installer And Portable App

```bash
npm run dist:win
```

The generated files are written to `release-desktop/`:

- `DhanLabh-Setup-2.0.0.exe`
- `DhanLabh-Portable-2.0.0.exe`

After installation, launch DhanLabh from the Start Menu, desktop shortcut, or by double-clicking the portable executable.

## Daily Use

1. Open Olymp Trade.
2. Keep the candlestick chart visible.
3. Launch DhanLabh AI Chart Assistant.
4. Wait for `LIVE`.
5. Open the overlay when you want compact always-on-top status.
6. Save screenshots and notes from the Journal panel.

If Olymp Trade is not open, DhanLabh shows `Waiting for Olymp Trade`.

## Safety

This is decision-support software only. It analyzes visible chart structure and indicator-like visual evidence. It cannot know the future, cannot guarantee winning trades, and should not be treated as financial advice.
