function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function scoreOlympSource(source) {
  const name = String(source?.name || '').toLowerCase();
  let score = 0;
  if (name.includes('olymp trade')) score += 100;
  if (name.includes('olymptrade')) score += 95;
  if (name.includes('olymp')) score += 70;
  if (name.includes('trade')) score += 15;
  if (name.includes('chrome') || name.includes('edge') || name.includes('browser')) score += 8;
  if (name.includes('dhanlabh')) score -= 200;
  return score;
}

export function findOlympTradeSource(sources = []) {
  return sources
    .filter((source) => String(source?.id || '').startsWith('window:'))
    .map((source) => ({ source, score: scoreOlympSource(source) }))
    .filter((item) => item.score >= 70)
    .sort((a, b) => b.score - a.score)[0]?.source || null;
}

function hasEnoughChartTexture(metrics) {
  return metrics.candle > 14 || (metrics.candle > 5 && metrics.grid > 18 && metrics.dark > 30);
}

export function detectOlympChartRegion(imageData, width, height) {
  const data = imageData.data;
  const step = Math.max(3, Math.floor(Math.min(width, height) / 260));
  const leftLimit = Math.floor(width * 0.04);
  const rightLimit = Math.floor(width * 0.96);
  const topLimit = Math.floor(height * 0.09);
  const bottomLimit = Math.floor(height * 0.94);

  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let candlePixels = 0;
  let gridPixels = 0;
  let darkPixels = 0;

  const cell = 28;
  const cols = Math.ceil(width / cell);
  const rows = Math.ceil(height / cell);
  const heat = Array.from({ length: rows }, () => Array.from({ length: cols }, () => ({
    candle: 0,
    grid: 0,
    dark: 0
  })));

  for (let y = topLimit; y < bottomLimit; y += step) {
    for (let x = leftLimit; x < rightLimit; x += step) {
      const index = (y * width + x) * 4;
      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      const intensity = (r + g + b) / 3;
      const spread = Math.max(r, g, b) - Math.min(r, g, b);
      const isGreenCandle = g > r + 22 && g > b + 8 && g > 80;
      const isRedCandle = r > g + 22 && r > b + 8 && r > 80;
      const isCandle = isGreenCandle || isRedCandle;
      const isGrid = intensity > 55 && intensity < 155 && spread < 38;
      const isDarkChart = intensity > 12 && intensity < 70 && spread < 52;
      const cx = Math.floor(x / cell);
      const cy = Math.floor(y / cell);

      if (isCandle) {
        candlePixels += 1;
        heat[cy][cx].candle += 1;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }

      if (isGrid) {
        gridPixels += 1;
        heat[cy][cx].grid += 1;
      }

      if (isDarkChart) {
        darkPixels += 1;
        heat[cy][cx].dark += 1;
      }
    }
  }

  if (candlePixels < 8 && gridPixels < 140) {
    return null;
  }

  let best = null;
  const visited = new Set();
  const key = (row, col) => `${row}:${col}`;

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (visited.has(key(row, col)) || !hasEnoughChartTexture(heat[row][col])) continue;
      const queue = [[row, col]];
      let head = 0;
      let minCol = col;
      let maxCol = col;
      let minRow = row;
      let maxRow = row;
      let score = 0;
      visited.add(key(row, col));

      while (head < queue.length) {
        const [r, c] = queue[head];
        head += 1;
        const metrics = heat[r][c];
        score += metrics.candle * 8 + metrics.grid * 1.4 + metrics.dark * 0.45;
        minCol = Math.min(minCol, c);
        maxCol = Math.max(maxCol, c);
        minRow = Math.min(minRow, r);
        maxRow = Math.max(maxRow, r);

        for (const [nr, nc] of [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]) {
          if (nr < 0 || nc < 0 || nr >= rows || nc >= cols || visited.has(key(nr, nc))) continue;
          if (!hasEnoughChartTexture(heat[nr][nc])) continue;
          visited.add(key(nr, nc));
          queue.push([nr, nc]);
        }
      }

      const boxWidth = (maxCol - minCol + 1) * cell;
      const boxHeight = (maxRow - minRow + 1) * cell;
      if (boxWidth > width * 0.2 && boxHeight > height * 0.22 && (!best || score > best.score)) {
        best = { minCol, maxCol, minRow, maxRow, score };
      }
    }
  }

  let region;
  if (best) {
    region = {
      x: best.minCol * cell,
      y: best.minRow * cell,
      width: (best.maxCol - best.minCol + 1) * cell,
      height: (best.maxRow - best.minRow + 1) * cell
    };
  } else if (candlePixels > 0) {
    region = {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  } else {
    return null;
  }

  const padX = Math.max(36, Math.round(region.width * 0.18));
  const padTop = Math.max(30, Math.round(region.height * 0.22));
  const padBottom = Math.max(34, Math.round(region.height * 0.18));
  const x = clamp(region.x - padX, Math.round(width * 0.05), Math.round(width * 0.92));
  const y = clamp(region.y - padTop, Math.round(height * 0.11), Math.round(height * 0.9));
  const x2 = clamp(region.x + region.width + padX, x + 160, Math.round(width * 0.97));
  const y2 = clamp(region.y + region.height + padBottom, y + 140, Math.round(height * 0.95));
  const detected = {
    x,
    y,
    width: x2 - x,
    height: y2 - y
  };

  if (detected.width < width * 0.28 || detected.height < height * 0.28) {
    return null;
  }

  return {
    ...detected,
    confidence: clamp(Math.round((candlePixels * 0.5 + gridPixels * 0.08 + darkPixels * 0.015)), 35, 96)
  };
}
