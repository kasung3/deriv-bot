import WebSocket from 'ws';
import { prisma } from './db';
import { calculateSMA, calculateATR, determineSignal, calculateNextStake } from './deriv';
import { Candle, TradingSettings, Trade } from './types';

const DERIV_WS_URL = 'wss://ws.binaryws.com/websockets/v3?app_id=1089';

interface TradingInstance {
  ws: WebSocket | null;
  userId: string;
  candles: Candle[];
  currentStake: number;
  consecutiveLosses: number;
  sessionProfit: number;
  balance: number;
  lastCandleEpoch: number;
  pendingContractId: string | null;
  currentTradeId: string | null;
  currentTradeDirection: 'RISE' | 'FALL' | null;
  settings: TradingSettings | null;
  token: string | null;
  isRunning: boolean;
  reconnectTimeout: NodeJS.Timeout | null;
}

// Global map to store active trading instances
const tradingInstances: Map<string, TradingInstance> = new Map();

// Initialize or get trading instance for a user
function getOrCreateInstance(userId: string): TradingInstance {
  if (!tradingInstances.has(userId)) {
    tradingInstances.set(userId, {
      ws: null,
      userId,
      candles: [],
      currentStake: 1,
      consecutiveLosses: 0,
      sessionProfit: 0,
      balance: 0,
      lastCandleEpoch: 0,
      pendingContractId: null,
      currentTradeId: null,
      currentTradeDirection: null,
      settings: null,
      token: null,
      isRunning: false,
      reconnectTimeout: null,
    });
  }
  return tradingInstances.get(userId)!;
}

// Update trading session in database
async function updateSession(userId: string, data: Record<string, unknown>) {
  try {
    await prisma.tradingSession.upsert({
      where: { userId },
      update: { ...data, updatedAt: new Date() },
      create: { userId, ...data },
    });
  } catch (error) {
    console.error('Failed to update trading session:', error);
  }
}

// Handle WebSocket messages
function handleWSMessage(instance: TradingInstance, data: Record<string, unknown>) {
  const msgType = data.msg_type as string;

  if (data.error) {
    const errorObj = data.error as { message?: string };
    console.error(`[${instance.userId}] Deriv API error:`, errorObj);
    updateSession(instance.userId, {
      lastError: errorObj?.message || 'Unknown error',
      lastSignal: `Error: ${errorObj?.message || 'Unknown'}`,
    });
    return;
  }

  switch (msgType) {
    case 'authorize': {
      const authorizeData = data.authorize as { balance?: number };
      instance.balance = authorizeData?.balance || 0;
      updateSession(instance.userId, {
        balance: instance.balance,
        lastSignal: 'Connected and authorized',
      });
      // Subscribe to balance updates
      instance.ws?.send(JSON.stringify({ balance: 1, subscribe: 1 }));
      // Subscribe to candles
      const market = instance.settings?.selectedMarket || 'R_10';
      instance.ws?.send(JSON.stringify({
        ticks_history: market,
        count: 20,
        end: 'latest',
        granularity: 60,
        style: 'candles',
        subscribe: 1,
      }));
      break;
    }

    case 'balance': {
      const balanceData = data.balance as { balance?: number };
      instance.balance = balanceData?.balance || instance.balance;
      updateSession(instance.userId, { balance: instance.balance });
      break;
    }

    case 'candles': {
      const candlesData = data.candles as Array<{ epoch: number; open: string; high: string; low: string; close: string }>;
      if (candlesData?.length) {
        instance.candles = candlesData.map((c) => ({
          epoch: c.epoch,
          open: parseFloat(c.open),
          high: parseFloat(c.high),
          low: parseFloat(c.low),
          close: parseFloat(c.close),
        }));
        if (instance.candles.length > 0) {
          instance.lastCandleEpoch = instance.candles[instance.candles.length - 1].epoch;
        }
        analyzeAndTrade(instance);
      }
      break;
    }

    case 'ohlc': {
      const ohlcData = data.ohlc as { epoch: number; open: string; high: string; low: string; close: string };
      if (ohlcData) {
        const newCandle: Candle = {
          epoch: ohlcData.epoch,
          open: parseFloat(ohlcData.open),
          high: parseFloat(ohlcData.high),
          low: parseFloat(ohlcData.low),
          close: parseFloat(ohlcData.close),
        };
        if (newCandle.epoch > instance.lastCandleEpoch) {
          instance.lastCandleEpoch = newCandle.epoch;
          instance.candles = [...instance.candles.slice(-19), newCandle];
          analyzeAndTrade(instance);
        } else if (instance.candles.length > 0) {
          instance.candles[instance.candles.length - 1] = newCandle;
        }
      }
      break;
    }

    case 'buy': {
      const buyData = data.buy as { contract_id?: number; buy_price?: number };
      if (buyData) {
        instance.pendingContractId = buyData.contract_id?.toString() || null;
        // Save trade to database
        saveTrade(instance, buyData.buy_price || instance.currentStake);
        // Subscribe to contract updates
        instance.ws?.send(JSON.stringify({
          proposal_open_contract: 1,
          contract_id: buyData.contract_id,
          subscribe: 1,
        }));
      }
      break;
    }

    case 'proposal_open_contract': {
      const contractData = data.proposal_open_contract as {
        status?: string;
        is_sold?: number;
        profit?: number;
        contract_id?: number;
        exit_tick?: number;
      };
      if (contractData?.status === 'sold' || contractData?.is_sold) {
        const profit = contractData.profit || 0;
        const isWin = profit > 0;
        
        // Update trade result
        updateTradeResult(instance, isWin ? 'WIN' : 'LOSS', profit, contractData.exit_tick || 0);
        
        // Update instance state
        instance.consecutiveLosses = isWin ? 0 : instance.consecutiveLosses + 1;
        instance.sessionProfit += profit;
        
        const nextStake = calculateNextStake(
          isWin ? 'WIN' : 'LOSS',
          instance.currentStake,
          instance.settings?.initialStake || 1,
          instance.settings?.martingaleFactor || 2,
          instance.settings?.maxStake || 100,
          instance.settings?.maxStakeEnabled || true
        );
        
        instance.currentStake = isWin ? (instance.settings?.initialStake || 1) : nextStake;
        instance.pendingContractId = null;
        instance.currentTradeId = null;
        instance.currentTradeDirection = null;

        updateSession(instance.userId, {
          currentStake: instance.currentStake,
          consecutiveLosses: instance.consecutiveLosses,
          sessionProfit: instance.sessionProfit,
          lastSignal: `Trade ${isWin ? 'WON' : 'LOST'}: ${profit >= 0 ? '+' : ''}$${profit.toFixed(2)}`,
        });

        // Check risk limits
        checkRiskLimits(instance);
      }
      break;
    }
  }
}

// Analyze market and place trades
function analyzeAndTrade(instance: TradingInstance) {
  if (!instance.isRunning || instance.pendingContractId) return;
  if (instance.candles.length < 10) {
    updateSession(instance.userId, {
      lastSignal: `Waiting for candles (${instance.candles.length}/10)`,
    });
    return;
  }

  const closes = instance.candles.map(c => c.close);
  const sma5 = calculateSMA(closes, 5);
  const sma6 = calculateSMA(closes, 6);
  const atr = calculateATR(instance.candles, 14);
  const atrThreshold = instance.settings?.atrThreshold || 0.0005;

  const { direction, reason } = determineSignal(sma5, sma6, atr, atrThreshold);
  updateSession(instance.userId, { lastSignal: reason });

  if (direction && instance.ws?.readyState === WebSocket.OPEN) {
    placeTrade(instance, direction, sma5, sma6, atr);
  }
}

// Place a trade
function placeTrade(instance: TradingInstance, direction: 'RISE' | 'FALL', sma5: number, sma6: number, atr: number) {
  const market = instance.settings?.selectedMarket || 'R_10';
  const stake = instance.currentStake;

  instance.currentTradeDirection = direction;

  instance.ws?.send(JSON.stringify({
    buy: 1,
    price: stake,
    parameters: {
      contract_type: direction === 'RISE' ? 'CALL' : 'PUT',
      symbol: market,
      duration: 1,
      duration_unit: 'm',
      basis: 'stake',
      amount: stake,
      currency: 'USD',
    },
  }));

  updateSession(instance.userId, {
    lastSignal: `Placing ${direction} trade at $${stake}`,
  });
}

// Save trade to database
async function saveTrade(instance: TradingInstance, stake: number) {
  try {
    const trade = await prisma.trade.create({
      data: {
        userId: instance.userId,
        market: instance.settings?.selectedMarket || 'R_10',
        direction: instance.currentTradeDirection || 'RISE',
        stake,
        entryTime: new Date(),
        result: 'PENDING',
        accountType: instance.settings?.accountType || 'demo',
      },
    });
    instance.currentTradeId = trade.id;
  } catch (error) {
    console.error('Failed to save trade:', error);
  }
}

// Update trade result in database
async function updateTradeResult(instance: TradingInstance, result: 'WIN' | 'LOSS', profit: number, exitPrice: number) {
  if (!instance.currentTradeId) return;
  try {
    await prisma.trade.update({
      where: { id: instance.currentTradeId },
      data: {
        result,
        profit,
        exitPrice,
        exitTime: new Date(),
      },
    });
  } catch (error) {
    console.error('Failed to update trade:', error);
  }
}

// Check risk limits
function checkRiskLimits(instance: TradingInstance) {
  const settings = instance.settings;
  if (!settings) return;

  // Check max consecutive losses
  if (settings.maxConsecutiveLossesEnabled && instance.consecutiveLosses >= settings.maxConsecutiveLosses) {
    stopTrading(instance.userId);
    updateSession(instance.userId, {
      lastSignal: `Stopped: Max consecutive losses (${settings.maxConsecutiveLosses}) reached`,
      status: 'STOPPED',
    });
    return;
  }

  // Check daily loss limit
  if (settings.dailyLossLimitEnabled && instance.sessionProfit <= -settings.dailyLossLimit) {
    stopTrading(instance.userId);
    updateSession(instance.userId, {
      lastSignal: `Stopped: Daily loss limit ($${settings.dailyLossLimit}) reached`,
      status: 'STOPPED',
    });
  }
}

// Connect to Deriv WebSocket
function connectWebSocket(instance: TradingInstance) {
  if (!instance.token) {
    console.error(`[${instance.userId}] No API token configured`);
    return;
  }

  if (instance.ws?.readyState === WebSocket.OPEN) {
    instance.ws.close();
  }

  const ws = new WebSocket(DERIV_WS_URL);
  instance.ws = ws;

  ws.on('open', () => {
    console.log(`[${instance.userId}] WebSocket connected`);
    ws.send(JSON.stringify({ authorize: instance.token }));
  });

  ws.on('message', (data: WebSocket.Data) => {
    try {
      const parsed = JSON.parse(data.toString());
      handleWSMessage(instance, parsed);
    } catch (error) {
      console.error(`[${instance.userId}] Failed to parse message:`, error);
    }
  });

  ws.on('error', (error) => {
    console.error(`[${instance.userId}] WebSocket error:`, error);
    updateSession(instance.userId, { lastError: 'Connection error' });
  });

  ws.on('close', () => {
    console.log(`[${instance.userId}] WebSocket closed`);
    if (instance.isRunning) {
      // Reconnect after 3 seconds
      instance.reconnectTimeout = setTimeout(() => {
        if (instance.isRunning) {
          connectWebSocket(instance);
        }
      }, 3000);
    }
  });
}

// Start trading for a user
export async function startTrading(userId: string): Promise<{ success: boolean; message: string }> {
  try {
    // Get user settings and token
    const [settings, tokens] = await Promise.all([
      prisma.tradingSettings.findUnique({ where: { userId } }),
      prisma.apiToken.findMany({ where: { userId } }),
    ]);

    if (!settings) {
      return { success: false, message: 'Trading settings not configured' };
    }

    const accountType = settings.accountType;
    const tokenRecord = tokens.find(t => t.tokenType === accountType);

    if (!tokenRecord?.token) {
      return { success: false, message: `No API token configured for ${accountType} account` };
    }

    const instance = getOrCreateInstance(userId);
    
    // Configure instance
    instance.settings = {
      initialStake: settings.initialStake,
      martingaleFactor: settings.martingaleFactor,
      maxConsecutiveLosses: settings.maxConsecutiveLosses,
      maxConsecutiveLossesEnabled: settings.maxConsecutiveLossesEnabled,
      maxStake: settings.maxStake,
      maxStakeEnabled: settings.maxStakeEnabled,
      dailyLossLimit: settings.dailyLossLimit,
      dailyLossLimitEnabled: settings.dailyLossLimitEnabled,
      atrThreshold: settings.atrThreshold,
      selectedMarket: settings.selectedMarket,
      accountType: settings.accountType as 'demo' | 'live',
    };
    instance.token = tokenRecord.token;
    instance.currentStake = settings.initialStake;
    instance.isRunning = true;
    instance.sessionProfit = 0;
    instance.consecutiveLosses = 0;

    // Update database
    await updateSession(userId, {
      isActive: true,
      status: 'RUNNING',
      market: settings.selectedMarket,
      accountType: settings.accountType,
      currentStake: settings.initialStake,
      consecutiveLosses: 0,
      sessionProfit: 0,
      lastSignal: 'Starting...',
      lastError: null,
      startedAt: new Date(),
      stoppedAt: null,
    });

    // Connect to WebSocket
    connectWebSocket(instance);

    return { success: true, message: 'Trading started successfully' };
  } catch (error) {
    console.error('Failed to start trading:', error);
    return { success: false, message: 'Failed to start trading' };
  }
}

// Stop trading for a user
export async function stopTrading(userId: string): Promise<{ success: boolean; message: string }> {
  try {
    const instance = tradingInstances.get(userId);
    
    if (instance) {
      instance.isRunning = false;
      
      if (instance.reconnectTimeout) {
        clearTimeout(instance.reconnectTimeout);
        instance.reconnectTimeout = null;
      }
      
      if (instance.ws) {
        instance.ws.close();
        instance.ws = null;
      }
    }

    // Update database
    await updateSession(userId, {
      isActive: false,
      status: 'STOPPED',
      lastSignal: 'Trading stopped',
      stoppedAt: new Date(),
    });

    return { success: true, message: 'Trading stopped successfully' };
  } catch (error) {
    console.error('Failed to stop trading:', error);
    return { success: false, message: 'Failed to stop trading' };
  }
}

// Get trading status for a user
export async function getTradingStatus(userId: string) {
  try {
    const session = await prisma.tradingSession.findUnique({ where: { userId } });
    const instance = tradingInstances.get(userId);
    
    return {
      isActive: instance?.isRunning || false,
      status: session?.status || 'STOPPED',
      market: session?.market || 'R_10',
      accountType: session?.accountType || 'demo',
      currentStake: session?.currentStake || 1,
      consecutiveLosses: session?.consecutiveLosses || 0,
      sessionProfit: session?.sessionProfit || 0,
      balance: session?.balance || 0,
      lastSignal: session?.lastSignal || 'Not started',
      lastError: session?.lastError,
      startedAt: session?.startedAt,
      stoppedAt: session?.stoppedAt,
    };
  } catch (error) {
    console.error('Failed to get trading status:', error);
    return null;
  }
}

// Restore active trading sessions on server restart
export async function restoreActiveSessions() {
  try {
    const activeSessions = await prisma.tradingSession.findMany({
      where: { isActive: true },
    });

    for (const session of activeSessions) {
      console.log(`Restoring trading session for user ${session.userId}`);
      await startTrading(session.userId);
    }
  } catch (error) {
    console.error('Failed to restore active sessions:', error);
  }
}
