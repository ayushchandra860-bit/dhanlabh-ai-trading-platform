const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const venvPython = process.platform === 'win32'
  ? path.join(root, '.venv', 'Scripts', 'python.exe')
  : path.join(root, '.venv', 'bin', 'python');
const pythonCommand = fs.existsSync(venvPython) ? venvPython : 'python';

const child = spawn(
  pythonCommand,
  ['-m', 'uvicorn', 'backend.app.main:app', '--reload', '--port', '8000'],
  {
    cwd: root,
    stdio: 'inherit',
    shell: false,
  }
);

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
