const http = require('http');
const net = require('net');

function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function cdpRequest(wsUrl, method, params) {
  return new Promise((resolve, reject) => {
    // Parse ws://host:port/path into components
    const m = wsUrl.match(/ws:\/\/([\w.]+):(\d+)(\/.+)/);
    if (!m) return reject(new Error('Bad wsUrl: ' + wsUrl));
    const host = m[1], port = parseInt(m[2]), path = m[3];

    const socket = new net.Socket();
    const key = 'dGhlIHNhbXBsZSBub25jZQ=='; // fixed base64 key for simplicity
    let headerDone = false;
    let buffer = '';
    let responded = false;

    socket.connect(port, host, () => {
      const upgrade = [
        `GET ${path} HTTP/1.1`,
        `Host: ${host}:${port}`,
        `Upgrade: websocket`,
        `Connection: Upgrade`,
        `Sec-WebSocket-Key: ${key}`,
        `Sec-WebSocket-Version: 13`,
        '', ''
      ].join('\r\n');
      socket.write(upgrade);
    });

    socket.on('data', (chunk) => {
      if (!headerDone) {
        const str = chunk.toString();
        const idx = str.indexOf('\r\n\r\n');
        if (idx !== -1) {
          headerDone = true;
          // remainder after headers is the WS frame
          handleWsData(chunk.slice(Buffer.from(str.substring(0, idx) + '\r\n\r\n').length));
        }
        return;
      }
      handleWsData(chunk);
    });

    let sentMsg = false;
    function handleWsData(data) {
      if (!sentMsg) {
        sentMsg = true;
        // Send CDP command as WS text frame
        const msg = JSON.stringify({ id: 1, method, params: params || {} });
        const msgBuf = Buffer.from(msg);
        const frame = Buffer.alloc(2 + 4 + msgBuf.length);
        frame[0] = 0x81; // FIN + text opcode
        frame[1] = 0x80 | msgBuf.length; // masked + length (assumes < 126 bytes)
        const mask = [Math.random()*256|0, Math.random()*256|0, Math.random()*256|0, Math.random()*256|0];
        frame[2] = mask[0]; frame[3] = mask[1]; frame[4] = mask[2]; frame[5] = mask[3];
        for (let i = 0; i < msgBuf.length; i++) frame[6 + i] = msgBuf[i] ^ mask[i % 4];
        socket.write(frame);
        return;
      }
      // Parse response frame
      if (data.length < 2) return;
      const opcode = data[0] & 0x0f;
      if (opcode === 0x1) { // text frame
        let payloadStart = 2;
        let len = data[1] & 0x7f;
        if (len === 126) { len = data.readUInt16BE(2); payloadStart = 4; }
        const payload = data.slice(payloadStart, payloadStart + len).toString();
        if (!responded) {
          responded = true;
          socket.destroy();
          try { resolve(JSON.parse(payload)); } catch(e) { resolve({ raw: payload }); }
        }
      }
    }

    socket.on('error', reject);
    setTimeout(() => { if (!responded) { socket.destroy(); reject(new Error('timeout')); } }, 5000);
  });
}

async function main() {
  console.log('Fetching pages from DevTools...');
  let raw;
  try {
    raw = await httpGet('http://localhost:9222/json');
  } catch(e) {
    console.error('Cannot connect to DevTools:', e.message);
    process.exit(1);
  }
  const pages = JSON.parse(raw);
  const page = pages.find(p => p.type === 'page');
  if (!page) { console.error('No page:', raw); process.exit(1); }
  console.log('Page URL:', page.url);
  console.log('Title:', page.title);
  console.log('WS:', page.webSocketDebuggerUrl);

  try {
    const r1 = await cdpRequest(page.webSocketDebuggerUrl, 'Runtime.evaluate', {
      expression: `JSON.stringify({
        rootChildren: document.getElementById('root') ? document.getElementById('root').childElementCount : -1,
        bodyHTML: document.body ? document.body.innerHTML.substring(0, 1500) : 'NO BODY',
        errors: window.__errors || [],
        href: location.href
      })`,
      returnByValue: true
    });
    console.log('\n=== CDP Result ===');
    const val = r1.result && r1.result.result && r1.result.result.value;
    if (val) {
      const parsed = JSON.parse(val);
      console.log('href:', parsed.href);
      console.log('rootChildren:', parsed.rootChildren);
      console.log('errors:', JSON.stringify(parsed.errors, null, 2));
      console.log('bodyHTML:\n', parsed.bodyHTML);
    } else {
      console.log(JSON.stringify(r1, null, 2));
    }
  } catch(e) {
    console.error('CDP error:', e.message);
    // Fallback: use HTTP version endpoint
    console.log('\nFallback: Checking /json/version...');
    const ver = await httpGet('http://localhost:9222/json/version');
    console.log(ver);
  }
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
