import { IndicatorData, IndicatorReading, Candle } from '../vision';

export class IndicatorFusionEngine {
    constructor() {}

    public calculateIndicators(candles: Candle[] | null): IndicatorData {
        const data: IndicatorData = {
            trend: [],
            momentum: [],
            oscillators: [],
            volatility: [],
            volume: [],
            trendStrength: []
        };
        
        if (!candles || candles.length === 0) {
            return data;
        }

        // Priority hierarchy: 1 (Native), 2 (OCR), 3 (Approx), 4 (Skip)
        data.trend.push({
            name: 'Approx_SMA',
            value: 0,
            direction: this.approximateTrendDirection(candles),
            priority: 3,
            confidence: 50
        });

        data.momentum.push({
            name: 'Approx_Momentum',
            value: 0,
            direction: this.approximateMomentum(candles),
            priority: 3,
            confidence: 50
        });
        
        data.volatility.push({
            name: 'Approx_Volatility',
            value: this.approximateVolatility(candles),
            direction: 'neutral',
            priority: 3,
            confidence: 60
        });

        data.volume.push({
            name: 'Approx_Volume',
            value: 0,
            direction: 'neutral',
            priority: 4, 
            confidence: 20
        });

        return data;
    }

    private approximateTrendDirection(candles: Candle[]): 'bullish' | 'bearish' | 'neutral' {
        if (candles.length < 2) return 'neutral';
        const start = candles[0].close;
        const end = candles[candles.length - 1].close;
        // Pixel coordinates (y smaller = higher price on screen)
        if (end < start) return 'bullish';
        if (end > start) return 'bearish';
        return 'neutral';
    }

    private approximateMomentum(candles: Candle[]): 'bullish' | 'bearish' | 'neutral' {
        if (candles.length < 3) return 'neutral';
        const recent = candles.slice(-3);
        let bullishCount = 0;
        let bearishCount = 0;
        for (const c of recent) {
            if (c.direction === 'bullish') bullishCount++;
            if (c.direction === 'bearish') bearishCount++;
        }
        if (bullishCount > bearishCount) return 'bullish';
        if (bearishCount > bullishCount) return 'bearish';
        return 'neutral';
    }

    private approximateVolatility(candles: Candle[]): number {
        if (candles.length === 0) return 0;
        let sum = 0;
        for (const c of candles) {
            sum += c.totalHeight;
        }
        return sum / candles.length;
    }
}
