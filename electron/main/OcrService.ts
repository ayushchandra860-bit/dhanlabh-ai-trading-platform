import { createWorker, Worker, RecognizeResult } from 'tesseract.js';
import { LoggerService } from './LoggerService';
import { OcrResult, OcrWord, MarketData } from './ocr';

export class OcrService {
  private worker: Worker | null = null;
  private initializationPromise: Promise<void> | null = null;

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }
    
    if (this.worker) {
      LoggerService.info('Tesseract OCR worker already initialized.');
      return Promise.resolve();
    }

    this.initializationPromise = (async () => {
      try {
        LoggerService.info('Initializing Tesseract OCR worker...');
        this.worker = await createWorker();
        LoggerService.info('Tesseract OCR worker initialized successfully.');
      } catch (error) {
        this.worker = null;
        LoggerService.error('Failed to initialize Tesseract OCR worker.', error);
        throw new Error(`OCR worker initialization failed: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        this.initializationPromise = null;
      }
    })();

    return this.initializationPromise;
  }

  public async recognize(image: Buffer, language: string): Promise<OcrResult | null> {
    if (!this.worker && this.initializationPromise) {
      LoggerService.info('OCR service not yet initialized, waiting for initialization to complete...');
      try {
        await this.initializationPromise;
      } catch (initError) {
        LoggerService.error('OCR service initialization failed during recognition attempt.', initError);
        return null;
      }
    }

    if (!this.worker) {
      LoggerService.error('OCR service is not initialized or worker is null after all attempts.');
      return null;
    } else {
      LoggerService.info(`Performing OCR with language: ${language} using initialized worker...`);

      try {
        const result: RecognizeResult = await this.worker.recognize(image);
        const { data: { text, confidence, words } } = result;

        LoggerService.info('OCR recognition complete.');

        const ocrWords: OcrWord[] = words.map(word => ({
          text: word.text,
          confidence: word.confidence,
          bbox: { x0: word.bbox.x0, y0: word.bbox.y0, x1: word.bbox.x1, y1: word.bbox.y1 },
        }));

        return { text, confidence, words: ocrWords, marketData: this._extractMarketData(text, ocrWords) };
      } catch (error) {
        LoggerService.error('An error occurred during OCR processing after worker initialization.', error);
        return null;
      }
    }
  }

  /**
   * Extracts structured market data from the full OCR text and individual words.
   * This method uses regex and heuristics, and is not a full AI/CV model.
   * @param fullText The complete text recognized by OCR.
   * @param words Individual words recognized by OCR with their bounding boxes and confidence.
   * @returns A MarketData object with extracted fields, or null if no meaningful data could be extracted.
   */
  private _extractMarketData(fullText: string, words: OcrWord[]): MarketData | null {
    LoggerService.info('OcrService: Starting market data extraction and normalization.');
    const marketData: MarketData = {
      assetName: null,
      timeframe: null,
      currentPrice: null,
      balance: null,
      payoutPercentage: null,
      expiryTime: null,
      buyButtonDetected: false,
      sellButtonDetected: false,
      visibleTimer: null,
      allNumbers: [],
    };

    const normalizedText = fullText.toLowerCase();
    
    let execResult: RegExpExecArray | null; // For RegExp.prototype.exec()
    let stringMatchResult: RegExpMatchArray | null; // For String.prototype.match()

    const numberRegex = /(\d{1,3}(?:[.,\s]\d{3})*(?:[.,]\d+)?|\d*[.,]\d+)/g;
    const percentageRegex = /(\d+(?:[.,]\d+)?)\s*%/;
    const timeFormatRegex = /(\d{1,2}:\d{2})/g;

    const olympTradeTimeframeRegex = /\b(1s|5s|15s|30s|1m|5m|15m|30m|1h|4h|1d|1w|1M)\b/i;

    const currencyPairRegex = /\b([A-Z]{3}\/[A-Z]{3})\b/;
    const commodityIndexRegex = /\b(GOLD|SILVER|NASDAQ|S&P500|US30|GER30|UK100)\b/i;

    // 1. Extract all numbers
    while ((execResult = numberRegex.exec(fullText)) !== null) {
      const numStr = execResult[0].replace(/[\s,]/g, '.');
      const num = parseFloat(numStr);
      if (!isNaN(num)) {
        marketData.allNumbers.push(num);
      } else {
        LoggerService.warn(`OcrService: Failed to parse number "${execResult[0]}" during allNumbers extraction.`);
      }
    }

    // 2. Detect Buy/Sell buttons
    marketData.buyButtonDetected = normalizedText.includes('buy');
    marketData.sellButtonDetected = normalizedText.includes('sell');
    
    // 3. Extract Asset Name
    stringMatchResult = fullText.match(currencyPairRegex);
    if (stringMatchResult && stringMatchResult[1]) {
      marketData.assetName = stringMatchResult[1].toUpperCase();
      LoggerService.info(`OcrService: Extracted asset name (currency pair): ${marketData.assetName}`);
    } else {
      stringMatchResult = fullText.match(commodityIndexRegex);
      if (stringMatchResult && stringMatchResult[1]) {
        marketData.assetName = stringMatchResult[1].toUpperCase();
        LoggerService.info(`OcrService: Extracted asset name (commodity/index): ${marketData.assetName}`);
      } else {
        const assetNameCandidates = words.filter(word =>
          word.confidence > 0.8 &&
          word.text.length > 1 &&
          !/\d/.test(word.text) &&
          !timeFormatRegex.test(word.text) &&
          !olympTradeTimeframeRegex.test(word.text) &&
          word.text[0] === word.text[0].toUpperCase() &&
          word.text.toUpperCase() !== 'BUY' &&
          word.text.toUpperCase() !== 'SELL' &&
          word.text.toUpperCase() !== 'TRADE' &&
          word.text.toUpperCase() !== 'BALANCE' &&
          word.text.toUpperCase() !== 'DEPOSIT'
        ).map(word => word.text);

        if (assetNameCandidates.length > 0) {
          const uniqueAssetName = Array.from(new Set(assetNameCandidates)).join(' ').trim();
          if (uniqueAssetName.length > 0) {
            marketData.assetName = uniqueAssetName;
            LoggerService.info(`OcrService: Extracted asset name (heuristic): ${marketData.assetName}`);
          }
        }
      }
    }
    if (!marketData.assetName) {
      LoggerService.warn('OcrService: Could not reliably extract asset name.');
    }

    // 4. Extract Payout %
    stringMatchResult = fullText.match(percentageRegex);
    if (stringMatchResult && stringMatchResult[1]) {
      const payout = parseFloat(stringMatchResult[1].replace(',', '.'));
      if (!isNaN(payout) && payout >= 0 && payout <= 1000) {
        marketData.payoutPercentage = payout;
        LoggerService.info(`OcrService: Extracted payout percentage: ${marketData.payoutPercentage}%`);
      } else {
        LoggerService.warn(`OcrService: Invalid payout percentage detected: ${stringMatchResult[1]}`);
      }
    }

    // 5. Extract Timeframe
    stringMatchResult = fullText.match(olympTradeTimeframeRegex);
    if (stringMatchResult && stringMatchResult[1]) {
      marketData.timeframe = stringMatchResult[1].toLowerCase();
      LoggerService.info(`OcrService: Extracted timeframe: ${marketData.timeframe}`);
    } else {
      LoggerService.warn('OcrService: Could not reliably extract timeframe.');
    }

    // 6. Extract Expiry Time and Visible Timer
    const allTimes = [];
    timeFormatRegex.lastIndex = 0;
    while ((execResult = timeFormatRegex.exec(fullText)) !== null && execResult[0]) {
      allTimes.push(execResult[0]);
    }
    if (allTimes.length > 0) {
      marketData.visibleTimer = allTimes[allTimes.length - 1];
      if (allTimes.length > 1) {
        marketData.expiryTime = allTimes[allTimes.length - 2];
      }
      LoggerService.info(`OcrService: Extracted visible timer: ${marketData.visibleTimer}, expiry time: ${marketData.expiryTime}`);

    }

    // 7. Current Price and Balance (highly dependent on layout, using general numbers for now)
    if (marketData.allNumbers.length > 0) {
      const potentialPrices = marketData.allNumbers.filter(num => num > 0 && (num % 1 !== 0 || num > 10));
      if (potentialPrices.length > 0) {
        marketData.currentPrice = potentialPrices[0];
        LoggerService.info(`OcrService: Guessed current price: ${marketData.currentPrice}`);
      }

      const potentialBalances = marketData.allNumbers.filter(num => num > 0 && num % 1 === 0 && num >= 10);
      if (potentialBalances.length > 0) {
        marketData.balance = Math.max(...potentialBalances);
        LoggerService.info(`OcrService: Guessed balance: ${marketData.balance}`);
      }
    }

    return marketData;
  }

  public async terminate(): Promise<void> {
    if (this.worker) {
      try {
        await this.worker.terminate();
        LoggerService.info('Tesseract OCR worker terminated.');
      } catch (error) {
        LoggerService.error('Failed to terminate Tesseract OCR worker.', error);
      } finally {
        this.worker = null;
        this.initializationPromise = null;
      }
    } else {
      LoggerService.info('Tesseract OCR worker is not active, no termination needed.');
    }
  }

  /**
   * Tears down the current worker (if any) and spins up a fresh one.
   * Used by the watchdog's FULL_PIPELINE_RESTART recovery path.
   */
  public async reinitialize(): Promise<void> {
    await this.terminate();
    await this.initialize();
  }
}
