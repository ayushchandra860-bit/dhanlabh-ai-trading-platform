const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'dist', 'frontend', 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');

// Add a bright red "REACT LOADING" indicator that turns green when React mounts
// and add IPC call to write DOM state to a log file
const extraScript = `
<script>
  // Inject bright visible test content
  document.addEventListener('DOMContentLoaded', function() {
    var testDiv = document.createElement('div');
    testDiv.id = '__test';
    testDiv.style.cssText = 'position:fixed;top:10px;right:10px;background:red;color:white;padding:10px;z-index:1000000;font:bold 14px sans-serif;border-radius:4px;';
    testDiv.textContent = 'DOM READY - React not yet';
    document.body.appendChild(testDiv);
    console.log('[TEST] DOMContentLoaded fired, root children: ' + (document.getElementById('root') ? document.getElementById('root').childElementCount : 'no root'));
    
    // Poll for React to mount
    var check = setInterval(function() {
      var root = document.getElementById('root');
      if (root && root.childElementCount > 0) {
        testDiv.style.background = 'green';
        testDiv.textContent = 'REACT MOUNTED! children=' + root.childElementCount;
        console.log('[TEST] React mounted! Root children: ' + root.childElementCount);
        console.log('[TEST] Root innerHTML preview: ' + root.innerHTML.substring(0, 300));
        clearInterval(check);
      }
    }, 100);
    
    // After 5 seconds if React hasn't mounted, report
    setTimeout(function() {
      var root = document.getElementById('root');
      if (root && root.childElementCount === 0) {
        testDiv.style.background = 'orange';
        testDiv.textContent = 'REACT NOT MOUNTED after 5s!';
        console.error('[TEST] React FAILED to mount after 5 seconds');
        console.error('[TEST] __errors: ' + JSON.stringify(window.__errors));
      }
    }, 5000);
  });
<\/script>
`;

// Insert before closing </head>
html = html.replace('</head>', extraScript + '</head>');
fs.writeFileSync(htmlPath, html);
console.log('Extra diagnostic injected. HTML length:', html.length);
