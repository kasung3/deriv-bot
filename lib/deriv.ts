// Deriv market symbols
export const MARKETS = [
  { symbol: 'R_10', name: 'Volatility 10 Index' },
  { symbol: 'R_25', name: 'Volatility 25 Index' },
  { symbol: 'R_50', name: 'Volatility 50 Index' },
  { symbol: 'R_75', name: 'Volatility 75 Index' },
  { symbol: 'R_100', name: 'Volatility 100 Index' },
  { symbol: '1HZ10V', name: 'Volatility 10 (1s) Index' },
  { symbol: '1HZ25V', name: 'Volatility 25 (1s) Index' },
  { symbol: '1HZ50V', name: 'Volatility 50 (1s) Index' },
  { symbol: '1HZ75V', name: 'Volatility 75 (1s) Index' },
  { symbol: '1HZ100V', name: 'Volatility 100 (1s) Index' },
];

export function calculateSMA(prices: number[], period: number): number {
  if (prices?.length < period) return 0;
  const slice = prices.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

export function calculateATR(candles: { high: number; low: number; close: number }[], period: number = 14): number {
  if (!candles || candles.length < period + 1) return 0;
  
  const trueRanges: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const current = candles[i];
    const prev = candles[i - 1];
    const tr = Math.max(
      current.high - current.low,
      Math.abs(current.high - prev.close),
      Math.abs(current.low - prev.close)
    );
    trueRanges.push(tr);
  }
  
  const recentTRs = trueRanges.slice(-period);
  return recentTRs.reduce((a, b) => a + b, 0) / recentTRs.length;
}

export function determineSignal(
  sma5: number,
  sma6: number,
  atr: number,
  atrThreshold: number
): { direction: 'RISE' | 'FALL' | null; reason: string } {
  if (atr < atrThreshold) {
    return { direction: null, reason: 'Low volatility - ATR below threshold' };
  }
  
  if (sma5 > sma6) {
    return { direction: 'RISE', reason: 'SMA5 crossed above SMA6 - Bullish' };
  } else if (sma5 < sma6) {
    return { direction: 'FALL', reason: 'SMA5 crossed below SMA6 - Bearish' };
  }
  
  return { direction: null, reason: 'No clear signal - SMAs equal' };
}

export function calculateNextStake(
  lastResult: 'WIN' | 'LOSS' | null,
  lastStake: number,
  initialStake: number,
  martingaleFactor: number,
  maxStake: number,
  maxStakeEnabled: boolean
): number {
  let nextStake = initialStake;
  
  if (lastResult === 'LOSS') {
    nextStake = lastStake * martingaleFactor;
  }
  
  if (maxStakeEnabled && nextStake > maxStake) {
    nextStake = maxStake;
  }
  
  return Math.round(nextStake * 100) / 100;
}
