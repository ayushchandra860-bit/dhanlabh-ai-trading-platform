import { copyFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const assetsDir = join(process.cwd(), 'dist', 'assets');
const files = readdirSync(assetsDir);
const latestJs = files.find((file) => /^index-.*\.js$/.test(file));
const latestCss = files.find((file) => /^index-.*\.css$/.test(file));

if (latestJs) {
  copyFileSync(join(assetsDir, latestJs), join(assetsDir, 'index-BdM69wcL.js'));
}

if (latestCss) {
  copyFileSync(join(assetsDir, latestCss), join(assetsDir, 'index-DAdQWl3H.css'));
}
