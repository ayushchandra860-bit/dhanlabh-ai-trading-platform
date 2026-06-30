const { app, BrowserWindow, desktopCapturer, ipcMain, screen } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const initSqlJs = require('sql.js');

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);
const iconPath = path.join(__dirname, 'assets', 'icon.ico');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('ignore-gpu-blocklist');

let mainWindow;
let overlayWindow;
let splashWindow;
let db;
let dbPath;
let configPath;
let screenshotDir;
let logPath;

function userFile(name) {
  return path.join(app.getPath('userData'), name);
}

async function initStorage() {
  fs.mkdirSync(app.getPath('userData'), { recursive: true });
  screenshotDir = userFile('screenshots');
  fs.mkdirSync(screenshotDir, { recursive: true });
  dbPath = userFile('history.sqlite');
  configPath = userFile('settings.json');
  logPath = userFile('desktop.log');

  const wasmBinary = fs.readFileSync(require.resolve('sql.js/dist/sql-wasm.wasm'));
  const SQL = await initSqlJs({ wasmBinary });
  if (fs.existsSync(dbPath)) {
    db = new SQL.Database(fs.readFileSync(dbPath));
  } else {
    db = new SQL.Database();
  }

  db.run(`
    create table if not exists captures (
      id text primary key,
      created_at text not null,
      screenshot_path text not null,
      trend text,
      support text,
      resistance text,
      pattern text,
      confidence integer,
      risk text,
      analysis_json text not null,
      notes text default ''
    );
  `);
  persistDb();
}

function persistDb() {
  if (!db || !dbPath) return;
  fs.writeFileSync(dbPath, Buffer.from(db.export()));
}

function log(level, message, meta = {}) {
  const line = JSON.stringify({
    at: new Date().toISOString(),
    level,
    message,
    meta
  });
  console[level === 'error' ? 'error' : 'log'](line);
  if (logPath) fs.appendFile(logPath, `${line}\n`, () => {});
}

function readConfig() {
  const defaults = {
    captureSpeed: 250,
    darkMode: true,
    sourceId: null,
    sourceName: '',
    overlay: {
      width: 300,
      height: 230,
      x: 80,
      y: 80,
      opacity: 0.82,
      compact: false,
      clickThrough: true
    }
  };
  try {
    if (!fs.existsSync(configPath)) return defaults;
    const stored = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return { ...defaults, ...stored, overlay: { ...defaults.overlay, ...(stored.overlay || {}) } };
  } catch (error) {
    log('error', 'Unable to read settings; using defaults.', { error: error.message });
    return defaults;
  }
}

function writeConfig(nextConfig) {
  const current = readConfig();
  const config = {
    ...current,
    ...nextConfig,
    overlay: { ...current.overlay, ...(nextConfig.overlay || {}) }
  };
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  return config;
}

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 520,
    height: 330,
    frame: false,
    resizable: false,
    show: true,
    backgroundColor: '#050816',
    icon: iconPath,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  splashWindow.loadFile(path.join(__dirname, 'splash.html'));
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1120,
    minHeight: 720,
    backgroundColor: '#050816',
    title: 'DhanLabh AI Chart Assistant',
    show: false,
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.once('ready-to-show', () => {
    splashWindow?.close();
    splashWindow = null;
    mainWindow.show();
  });
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  if (isDev) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../frontend/dist/index.html'));
  }
}

function applyOverlaySettings() {
  if (!overlayWindow) return;
  const { overlay } = readConfig();
  overlayWindow.setOpacity(Math.min(1, Math.max(0.35, Number(overlay.opacity || 0.82))));
  overlayWindow.setIgnoreMouseEvents(Boolean(overlay.clickThrough), { forward: true });
  overlayWindow.webContents.send('overlay:settings', overlay);
}

function createOverlayWindow() {
  const { overlay } = readConfig();
  overlayWindow = new BrowserWindow({
    width: overlay.width,
    height: overlay.height,
    x: overlay.x,
    y: overlay.y,
    minWidth: 220,
    minHeight: 130,
    frame: false,
    transparent: true,
    resizable: true,
    thickFrame: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  overlayWindow.setAlwaysOnTop(true, 'screen-saver');
  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  overlayWindow.setContentProtection(true);
  overlayWindow.loadFile(path.join(__dirname, 'overlay.html'));
  overlayWindow.webContents.on('did-finish-load', applyOverlaySettings);
  overlayWindow.on('move', saveOverlayBounds);
  overlayWindow.on('resize', saveOverlayBounds);
  overlayWindow.on('closed', () => {
    overlayWindow = null;
  });
  applyOverlaySettings();
}

function saveOverlayBounds() {
  if (!overlayWindow) return;
  writeConfig({ overlay: overlayWindow.getBounds() });
}

async function listSources() {
  const displays = screen.getAllDisplays();
  const maxWidth = Math.max(...displays.map((display) => display.size.width));
  const maxHeight = Math.max(...displays.map((display) => display.size.height));
  const sources = await desktopCapturer.getSources({
    types: ['screen', 'window'],
    thumbnailSize: { width: 420, height: 260 }
  });
  return sources.map((source) => ({
    id: source.id,
    name: source.name,
    displayId: source.display_id,
    thumbnail: source.thumbnail.toDataURL(),
    maxWidth,
    maxHeight
  }));
}

async function captureFrame(sourceId) {
  const displays = screen.getAllDisplays();
  const maxWidth = Math.max(...displays.map((display) => display.size.width));
  const maxHeight = Math.max(...displays.map((display) => display.size.height));
  const sources = await desktopCapturer.getSources({
    types: ['screen', 'window'],
    thumbnailSize: { width: maxWidth, height: maxHeight }
  });
  const source = sourceId ? sources.find((item) => item.id === sourceId) : sources[0];
  if (!source) throw new Error('No screen or window source is available.');
  return {
    sourceId: source.id,
    name: source.name,
    image: source.thumbnail.toDataURL(),
    width: source.thumbnail.getSize().width,
    height: source.thumbnail.getSize().height,
    capturedAt: new Date().toISOString()
  };
}

function saveCapture({ image, analysis, notes = '' }) {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const filename = `${createdAt.replace(/[:.]/g, '-')}-${id}.png`;
  const screenshotPath = path.join(screenshotDir, filename);
  const base64 = String(image || '').replace(/^data:image\/png;base64,/, '');
  fs.writeFileSync(screenshotPath, Buffer.from(base64, 'base64'));
  const payload = JSON.stringify(analysis || {});
  const stmt = db.prepare(`
    insert into captures (
      id, created_at, screenshot_path, trend, support, resistance,
      pattern, confidence, risk, analysis_json, notes
    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run([
    id,
    createdAt,
    screenshotPath,
    analysis?.trend || '',
    String(analysis?.support ?? ''),
    String(analysis?.resistance ?? ''),
    analysis?.pattern || '',
    Number(analysis?.confidence || 0),
    analysis?.risk || '',
    payload,
    notes
  ]);
  stmt.free();
  persistDb();
  return { id, createdAt, screenshotPath, analysis, notes };
}

function listCaptures() {
  const result = db.exec('select * from captures order by created_at desc limit 300');
  const rows = result[0]?.values || [];
  const columns = result[0]?.columns || [];
  return rows.map((row) => {
    const item = Object.fromEntries(columns.map((column, index) => [column, row[index]]));
    return {
      ...item,
      screenshotDataUrl: fs.existsSync(item.screenshot_path)
        ? `data:image/png;base64,${fs.readFileSync(item.screenshot_path).toString('base64')}`
        : '',
      analysis: JSON.parse(item.analysis_json || '{}')
    };
  });
}

app.whenReady().then(async () => {
  await initStorage();
  createSplashWindow();
  createMainWindow();
  createOverlayWindow();
  log('info', 'DhanLabh desktop app started.');
});

app.on('window-all-closed', () => {
  persistDb();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', persistDb);
process.on('uncaughtException', (error) => log('error', 'Unhandled exception', { error: error.message, stack: error.stack }));
process.on('unhandledRejection', (error) => log('error', 'Unhandled rejection', { error: String(error) }));

ipcMain.handle('sources:list', listSources);
ipcMain.handle('capture:frame', (_event, sourceId) => captureFrame(sourceId));
ipcMain.handle('config:get', () => readConfig());
ipcMain.handle('config:set', (_event, config) => writeConfig(config));
ipcMain.handle('history:list', () => listCaptures());
ipcMain.handle('history:save', (_event, payload) => saveCapture(payload));
ipcMain.handle('overlay:show', () => {
  if (!overlayWindow) createOverlayWindow();
  applyOverlaySettings();
  overlayWindow.show();
  return true;
});
ipcMain.handle('overlay:hide', () => {
  overlayWindow?.hide();
  return true;
});
ipcMain.handle('overlay:update', (_event, analysis) => {
  overlayWindow?.webContents.send('overlay:analysis', analysis);
  return true;
});
ipcMain.handle('overlay:settings', (_event, overlay) => {
  writeConfig({ overlay });
  applyOverlaySettings();
  return readConfig().overlay;
});
ipcMain.handle('app:exit', () => app.quit());
