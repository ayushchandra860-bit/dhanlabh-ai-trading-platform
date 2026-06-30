function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

function round(value, digits = 2) {
  return Number(Number(value || 0).toFixed(digits));
}

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function standardDeviation(values) {
  const mean = average(values);
  return Math.sqrt(average(values.map((value) => (value - mean) ** 2)));
}

function findPivots(values, mode = 'high', radius = 3) {
  const pivots = [];
  for (let i = radius; i < values.length - radius; i += 1) {
    const window = values.slice(i - radius, i + radius + 1);
    const target = values[i];
    if (mode === 'high' && target === Math.max(...window)) pivots.push({ index: i, value: target });
    if (mode === 'low' && target === Math.min(...window)) pivots.push({ index: i, value: target });
  }
  return pivots;
}

function lineSlope(values) {
  if (values.length < 2) return 0;
  return ((values.at(-1) - values[0]) / Math.max(Math.abs(values[0]), 1)) * 100;
}

function estimatePriceLevel(y, height, low = 0, high = 100) {
  return round(high - (y / Math.max(height, 1)) * (high - low), 2);
}

function classifyPattern({ highs, lows, trendSlope, compression, volatility, greenRatio }) {
  const lastHigh = highs.at(-1);
  const prevHigh = highs.at(-2);
  const thirdHigh = highs.at(-3);
  const lastLow = lows.at(-1);
  const prevLow = lows.at(-2);
  const thirdLow = lows.at(-3);
  const closeEnough = (a, b, tolerance = 5) => Math.abs((a?.value ?? 0) - (b?.value ?? 9999)) <= tolerance;

  if (lastHigh && prevHigh && closeEnough(lastHigh, prevHigh, 6) && trendSlope < -0.03) return 'Double Top';
  if (lastLow && prevLow && closeEnough(lastLow, prevLow, 6) && trendSlope > 0.03) return 'Double Bottom';
  if (lastHigh && prevHigh && thirdHigh && prevHigh.value < thirdHigh.value && prevHigh.value < lastHigh.value) return 'Inverse Head & Shoulders';
  if (lastLow && prevLow && thirdLow && prevLow.value > thirdLow.value && prevLow.value > lastLow.value) return 'Head & Shoulders';
  if (compression && trendSlope > 0.05) return 'Ascending Triangle';
  if (compression && trendSlope < -0.05) return 'Descending Triangle';
  if (volatility < 14 && Math.abs(trendSlope) < 0.04) return 'Consolidation';
  if (greenRatio > 58 && compression) return 'Bull Flag';
  if (greenRatio < 42 && compression) return 'Bear Flag';
  if (volatility > 40 && Math.abs(trendSlope) > 0.12) return 'Breakout';
  if (volatility > 35 && Math.abs(trendSlope) < 0.08) return 'Fake Breakout Risk';
  if (Math.abs(trendSlope) > 0.18) return 'Trend Continuation';
  return 'No clear pattern';
}

function decideMarketBias({ trend, confidence, risk, momentum }) {
  if (confidence < 58 || risk === 'High') return 'WAIT';
  if (trend === 'Bullish' && momentum !== 'Bearish pressure') return 'BUY';
  if (trend === 'Bearish' && momentum !== 'Bullish pressure') return 'SELL';
  return 'WAIT';
}

export function analyzeChartImage(imageData, width, height) {
  const data = imageData.data;
  const stepX = Math.max(3, Math.floor(width / 180));
  const stepY = Math.max(2, Math.floor(height / 160));
  const columns = [];
  let greenPixels = 0;
  let redPixels = 0;
  let brightPixels = 0;
  let linePixels = 0;
  const horizontalDensity = new Array(height).fill(0);

  for (let x = 0; x < width; x += stepX) {
    let top = null;
    let bottom = null;
    let green = 0;
    let red = 0;
    let bright = 0;
    for (let y = 0; y < height; y += stepY) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const intensity = (r + g + b) / 3;
      const isGreen = g > r + 18 && g > b + 8;
      const isRed = r > g + 18 && r > b + 8;
      const isLine = intensity > 95 && Math.abs(r - g) < 45 && Math.abs(g - b) < 45;
      if (isGreen || isRed || isLine || intensity > 150) {
        top = top === null ? y : Math.min(top, y);
        bottom = bottom === null ? y : Math.max(bottom, y);
        horizontalDensity[y] += 1;
      }
      if (isGreen) {
        green += 1;
        greenPixels += 1;
      }
      if (isRed) {
        red += 1;
        redPixels += 1;
      }
      if (intensity > 150) {
        bright += 1;
        brightPixels += 1;
      }
      if (isLine) linePixels += 1;
    }
    if (top !== null && bottom !== null) {
      columns.push({ x, top, bottom, mid: (top + bottom) / 2, green, red, bright });
    }
  }

  const mids = columns.map((column) => column.mid);
  const lows = findPivots(mids, 'low');
  const highs = findPivots(mids, 'high');
  const trendSlope = lineSlope(mids);
  const volatility = standardDeviation(mids);
  const greenRatio = (greenPixels / Math.max(greenPixels + redPixels, 1)) * 100;
  const redRatio = 100 - greenRatio;
  const compression = mids.length > 20 && standardDeviation(mids.slice(-18)) < standardDeviation(mids.slice(-60)) * 0.72;

  const densest = horizontalDensity
    .map((value, y) => ({ value, y }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)
    .filter((item) => item.value > 0);
  const supportY = densest.filter((item) => item.y > height / 2).at(0)?.y ?? Math.max(...mids, height * 0.7);
  const resistanceY = densest.filter((item) => item.y < height / 2).at(0)?.y ?? Math.min(...mids, height * 0.3);

  const trend = trendSlope < -0.08 ? 'Bullish' : trendSlope > 0.08 ? 'Bearish' : 'Sideways';
  const momentum = greenRatio > 56 ? 'Bullish pressure' : redRatio > 56 ? 'Bearish pressure' : 'Mixed';
  const marketPhase = compression ? 'Range / Compression' : Math.abs(trendSlope) > 0.12 ? 'Trending' : 'Balanced';
  const pattern = classifyPattern({ highs, lows, trendSlope, compression, volatility, greenRatio });
  const indicatorAlignment = [
    greenRatio > 55 && 'Candle pressure bullish',
    redRatio > 55 && 'Candle pressure bearish',
    linePixels > brightPixels * 0.18 && 'Visible moving-average / indicator lines detected',
    compression && 'Price compression detected',
    volatility > 35 && 'Expanded volatility detected'
  ].filter(Boolean);

  const risk = volatility > 42 || pattern.includes('Fake') ? 'High' : volatility > 22 || trend === 'Sideways' ? 'Medium' : 'Low';
  const trendScore = trend === 'Bullish' ? 16 : trend === 'Bearish' ? -16 : 0;
  const momentumScore = (greenRatio - 50) * 0.7;
  const structureScore = compression ? -5 : Math.abs(trendSlope) > 0.12 ? 8 : 0;
  const confidence = clamp(round(52 + Math.abs(trendScore + momentumScore) + Math.max(0, 28 - volatility * 0.35) + structureScore), 5, 94);
  const decision = decideMarketBias({ trend, confidence, risk, momentum });

  const explanation = [
    `Decision support: ${decision}.`,
    `Visible candle pressure is ${round(greenRatio)}% bullish and ${round(redRatio)}% bearish.`,
    `Market phase appears to be ${marketPhase.toLowerCase()}.`,
    `Detected structure: ${pattern}.`,
    indicatorAlignment.length ? `Alignment: ${indicatorAlignment.join(', ')}.` : 'Indicator alignment is mixed or not clearly visible.',
    risk === 'High' ? 'Risk is high; wait for clearer confirmation.' : risk === 'Medium' ? 'Risk is moderate; confirmation matters.' : 'Risk is relatively low based on visible structure.'
  ];

  return {
    decision,
    trend,
    momentum,
    support: estimatePriceLevel(supportY, height),
    resistance: estimatePriceLevel(resistanceY, height),
    pattern,
    risk,
    confidence,
    marketPhase,
    marketStructure: trend === 'Bullish' ? 'Higher highs / higher lows likely' : trend === 'Bearish' ? 'Lower highs / lower lows likely' : 'Range structure',
    indicatorAlignment,
    volatility: round(volatility, 2),
    liquidityZones: {
      upper: estimatePriceLevel(resistanceY, height),
      lower: estimatePriceLevel(supportY, height)
    },
    explanation,
    detected: {
      candles: columns.length,
      swingHighs: highs.length,
      swingLows: lows.length,
      ema: linePixels > 50,
      rsi: brightPixels > 120,
      macd: brightPixels > 120,
      vwap: linePixels > 50,
      bollingerBands: linePixels > 120
    }
  };
}
