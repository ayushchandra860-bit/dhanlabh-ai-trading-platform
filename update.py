import re
import os

filepath = r"c:\\Users\\ayush\\Documents\\Dhanlabh V2\\electron\\main\\VisionManager.ts"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update _analyzeSupportResistance
content = content.replace(
    "distanceFromCurrentPrice: Math.abs(currentCandle.high - currentPriceY),",
    "distanceFromCurrentPrice: Math.abs(currentCandle.high - currentPriceY),\\n          displayPrice: 'Calculating...',\\n          displayDistance: 'Calculating...',"
)
content = content.replace(
    "distanceFromCurrentPrice: Math.abs(currentCandle.low - currentPriceY),",
    "distanceFromCurrentPrice: Math.abs(currentCandle.low - currentPriceY),\\n          displayPrice: 'Calculating...',\\n          displayDistance: 'Calculating...',"
)
content = content.replace(
    "distanceFromCurrentPrice: Math.abs(level.price - currentPriceY);",
    "distanceFromCurrentPrice: Math.abs(level.price - currentPriceY);\\n      level.displayPrice = 'Calculating...';\\n      level.displayDistance = 'Calculating...';"
)

# 2. Update _makeAIDecision signature and call
old_sig = "private _makeAIDecision(\\n    candles: Candle[] | null,"
new_sig = "private _makeAIDecision(\\n    ocrResult: import('./ocr').OcrResult | null,\\n    candles: Candle[] | null,"
content = content.replace(old_sig, new_sig)

old_call = "aiDecisionData = this._makeAIDecision(candles,"
new_call = "aiDecisionData = this._makeAIDecision(ocrResult, candles,"
content = content.replace(old_call, new_call)


with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Finished rewriting VisionManager.ts parts")
