import { LiveMarketObservation, ObservationData, BehaviourState, MarketState } from '../vision';

export class LiveObservationEngine {
    private observationBuffer: ObservationData[] = [];
    private lastPrice: number | null = null;
    private lastTimestamp: number = 0;

    constructor() {}

    public observe(marketState: MarketState | null, timestamp: number): LiveMarketObservation {
        if (marketState && marketState.currentPrice !== null) {
            const currentPrice = marketState.currentPrice;
            let candleSpeed = 0;
            let acceleration = 0;
            let microPullbacks = 0;

            if (this.lastPrice !== null && this.lastTimestamp > 0) {
                const dt = (timestamp - this.lastTimestamp) / 1000.0;
                if (dt > 0) {
                    candleSpeed = Math.abs(currentPrice - this.lastPrice) / dt;
                    if (this.observationBuffer.length > 0) {
                        const lastObs = this.observationBuffer[this.observationBuffer.length - 1];
                        acceleration = (candleSpeed - lastObs.candleSpeed) / dt;
                        
                        // Detect micro pullbacks
                        if (
                            (currentPrice < this.lastPrice && lastObs.price > this.lastPrice) ||
                            (currentPrice > this.lastPrice && lastObs.price < this.lastPrice)
                        ) {
                            microPullbacks = 1;
                        }
                    }
                }
            }

            this.observationBuffer.push({
                timestamp,
                price: currentPrice,
                candleSpeed,
                acceleration,
                microPullbacks
            });

            this.lastPrice = currentPrice;
            this.lastTimestamp = timestamp;
        }

        // Cleanup observations older than 60 seconds
        const cutoff60s = timestamp - 60000;
        this.observationBuffer = this.observationBuffer.filter(obs => obs.timestamp >= cutoff60s);

        const activeBehaviours: BehaviourState[] = this.detectBehaviours(this.observationBuffer);

        return {
            activeBehaviours,
            buffer5s: this.getBuffer(timestamp, 5000),
            buffer15s: this.getBuffer(timestamp, 15000),
            buffer30s: this.getBuffer(timestamp, 30000),
            buffer60s: this.getBuffer(timestamp, 60000),
            observationCount: this.observationBuffer.length,
            memoryBufferSize: Buffer.byteLength(JSON.stringify(this.observationBuffer)),
            oldestObservation: this.observationBuffer.length > 0 ? this.observationBuffer[0].timestamp : timestamp,
            newestObservation: this.observationBuffer.length > 0 ? this.observationBuffer[this.observationBuffer.length - 1].timestamp : timestamp,
            averageUpdateRateMs: this.observationBuffer.length > 1 ? (this.observationBuffer[this.observationBuffer.length - 1].timestamp - this.observationBuffer[0].timestamp) / this.observationBuffer.length : 0
        };
    }

    private getBuffer(currentTimestamp: number, windowMs: number): ObservationData[] {
        const cutoff = currentTimestamp - windowMs;
        return this.observationBuffer.filter(obs => obs.timestamp >= cutoff);
    }

    private detectBehaviours(buffer: ObservationData[]): BehaviourState[] {
        const behaviours: BehaviourState[] = [];
        if (buffer.length < 2) return ['None'];

        const recent = buffer.slice(-5);
        let avgAccel = 0;
        for (const obs of recent) avgAccel += obs.acceleration;
        if (recent.length > 0) avgAccel /= recent.length;

        if (avgAccel > 0.5) behaviours.push('Momentum Increasing');
        else if (avgAccel < -0.5) behaviours.push('Momentum Weakening');

        const priceChange = buffer[buffer.length - 1].price - buffer[0].price;
        if (priceChange > 0 && avgAccel > 0) behaviours.push('Buying Pressure Increasing');
        if (priceChange < 0 && avgAccel > 0) behaviours.push('Selling Pressure Increasing');

        if (behaviours.length === 0) behaviours.push('None');

        return behaviours;
    }
}
