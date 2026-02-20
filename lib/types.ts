export interface TradingSettings {
  initialStake: number;
  martingaleFactor: number;
  maxConsecutiveLosses: number;
  maxConsecutiveLossesEnabled: boolean;
  maxStake: number;
  maxStakeEnabled: boolean;
  dailyLossLimit: number;
  dailyLossLimitEnabled: boolean;
  atrThreshold: number;
  selectedMarket: string;
  accountType: 'demo' | 'live';
}

export interface Trade {
  id: string;
  contractId?: string;
  market: string;
  direction: 'RISE' | 'FALL';
  stake: number;
  entryPrice?: number;
  exitPrice?: number;
  profit?: number;
  result?: 'WIN' | 'LOSS' | 'PENDING';
  entryTime: Date;
  exitTime?: Date;
  sma5?: number;
  sma6?: number;
  atr?: number;
  accountType: string;
}

export interface BotState {
  status: 'STOPPED' | 'RUNNING' | 'PAUSED';
  balance: number;
  sessionProfit: number;
  allTimeProfit: number;
  consecutiveLosses: number;
  currentStake: number;
  currentTrade: Trade | null;
  marketCondition: {
    trending: boolean;
    volatility: 'HIGH' | 'LOW';
  };
  sma5: number;
  sma6: number;
  atr: number;
  lastSignal: string;
}

export interface Candle {
  epoch: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface DerivMessage {
  msg_type: string;
  [key: string]: any;
}
