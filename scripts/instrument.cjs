const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'dist', 'frontend', 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');

const errorCapture = `
<script>
  window.__errors = [];
  window.onerror = function(msg, src, line, col, err) {
    var stack = err && err.stack ? err.stack : '';
    window.__errors.push({ msg: msg, src: src, line: line, stack: stack });
    var overlay = document.getElementById('__err');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = '__err';
      overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:#111;color:#f66;padding:24px;font:13px monospace;z-index:999999;overflow:auto;white-space:pre-wrap';
      document.body.appendChild(overlay);
    }
    overlay.textContent = 'JS ERROR\\n' + msg + '\\nFile: ' + src + ':' + line + '\\n\\n' + stack;
    return false;
  };
  window.addEventListener('unhandledrejection', function(e) {
    var reason = e.reason;
    var msg = reason instanceof Error ? reason.message : String(reason);
    var stack = reason instanceof Error ? reason.stack : '';
    window.__errors.push({ msg: 'UnhandledRejection: ' + msg, stack: stack });
    var overlay = document.getElementById('__err');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = '__err';
      overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:#111;color:#fa0;padding:24px;font:13px monospace;z-index:999999;overflow:auto;white-space:pre-wrap';
      document.body.appendChild(overlay);
    }
    overlay.textContent = 'UNHANDLED REJECTION\\n' + msg + '\\n\\n' + stack;
  });
  console.log('[DIAGNOSTIC] Error capture installed');
<\/script>
`;

// Insert BEFORE the first script tag
html = html.replace('<script', errorCapture + '<script');

fs.writeFileSync(htmlPath, html);
console.log('Instrumented:', htmlPath);
console.log(html.substring(0, 600));
