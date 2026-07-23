const activeWin = require('active-win');
setInterval(async () => {
  const win = await activeWin();
  if (win) {
    console.log(new Date().toISOString(), 'Owner:', win.owner.name, 'Title:', win.title);
  }
}, 1000);
