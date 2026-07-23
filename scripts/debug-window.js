const activeWin = require('active-win');
const fs = require('fs');

async function check() {
  try {
    const win = await activeWin();
    if (win) {
      console.log(`Title: ${win.title}`);
      console.log(`Owner: ${win.owner ? win.owner.name : 'Unknown'}`);
    } else {
      console.log('No active window found.');
    }
  } catch(e) {
    console.error(e);
  }
}

setInterval(check, 3000);
