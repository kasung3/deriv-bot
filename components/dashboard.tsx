'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { motion } from 'framer-motion';
import {
  TrendingUp, LogOut, Play, Pause, Square, Settings,
  DollarSign, Activity, AlertTriangle, BarChart3, Loader2, Server, Monitor, Cloud
} from 'lucide-react';
import { MARKETS } from '@/lib/deriv';
import { TradingSettings, BotState, Trade, Candle } from '@/lib/types';
import { calculateSMA, calculateATR, determineSignal, calculateNextStake } from '@/lib/deriv';
import TokenSettings from './token-settings';
import TradingSettingsPanel from './trading-settings';
import StatusPanel from './status-panel';
import TradeHistory from './trade-history';
import Charts from './charts';
import ConfirmDialog from './confirm-dialog';

const DERIV_WS_URL = 'wss://ws.binaryws.com/websockets/v3?app_id=1089';

export default function Dashboard() {
  const { data: session, status: sessionStatus } = useSession() || {};
  const [mounted, setMounted] = useState(false);
  const [settings, setSettings] = useState<TradingSettings | null>(null);
  const [tokens, setTokens] = useState({ demo: '', live: '' });
  const [botState, setBotState] = useState<BotState>({
    status: 'STOPPED',
    balance: 0,
    sessionProfit: 0,
    allTimeProfit: 0,
    consecutiveLosses: 0,
    currentStake: 1,
    currentTrade: null,
    marketCondition: { trending: false, volatility: 'LOW' },
    sma5: 0,
    sma6: 0,
    atr: 0,
    lastSignal: 'Waiting for data...',
  });
  const [trades, setTrades] = useState<Trade[]>([]);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; action: string; message: string }>({ open: false, action: '', message: '' });
  const [activeTab, setActiveTab] = useState<'status' | 'settings' | 'tokens'>('status');
  const [stats, setStats] = useState({ allTimeProfit: 0, sessionProfit: 0, wins: 0, losses: 0, winRate: 0, balanceHistory: [] });
  
  // Server-side trading state
  const [tradingMode, setTradingMode] = useState<'browser' | 'server'>('server');
  const [serverStatus, setServerStatus] = useState({
    isActive: false,
    status: 'STOPPED',
    balance: 0,
    sessionProfit: 0,
    consecutiveLosses: 0,
    currentStake: 1,
    lastSignal: 'Not started',
  });
  const [serverLoading, setServerLoading] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const candlesRef = useRef<Candle[]>([]);
  const botStateRef = useRef(botState);
  const settingsRef = useRef(settings);
  const currentStakeRef = useRef(1);
  const pendingContractRef = useRef<string | null>(null);
  const lastCandleEpochRef = useRef<number>(0);

  useEffect(() => {
    botStateRef.current = botState;
  }, [botState]);

  useEffect(() => {
    settingsRef.current = settings;
    if (settings) {
      currentStakeRef.current = settings.initialStake;
    }
  }, [settings]);

  useEffect(() => {
    candlesRef.current = candles;
  }, [candles]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [settingsRes, tokensRes, tradesRes, statsRes, serverStatusRes] = await Promise.all([
          fetch('/api/settings'),
          fetch('/api/tokens'),
          fetch('/api/trades?limit=10'),
          fetch('/api/stats'),
          fetch('/api/server-trading/status'),
        ]);
        
        if (settingsRes.ok) {
          const s = await settingsRes.json();
          if (s && !s.error) {
            setSettings(s);
            setBotState(prev => ({ ...prev, currentStake: s.initialStake }));
            currentStakeRef.current = s.initialStake;
          } else {
            console.error('Settings API returned error:', s.error);
            setLoadError('Failed to load settings: ' + (s.error || 'Unknown error'));
          }
        } else {
          const errData = await settingsRes.json().catch(() => ({}));
          console.error('Settings API failed:', settingsRes.status, errData);
          setLoadError('Failed to load settings: ' + (errData.error || 'Server error'));
        }
        if (tokensRes.ok) setTokens(await tokensRes.json());
        if (tradesRes.ok) setTrades(await tradesRes.json());
        if (statsRes.ok) {
          const st = await statsRes.json();
          setStats(st);
          setBotState(prev => ({ ...prev, allTimeProfit: st.allTimeProfit, sessionProfit: st.sessionProfit }));
        }
        if (serverStatusRes.ok) {
          const ss = await serverStatusRes.json();
          setServerStatus(ss);
        }
      } catch (err) {
        console.error('Failed to load data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Poll server trading status
  useEffect(() => {
    if (tradingMode !== 'server') return;
    
    const pollStatus = async () => {
      try {
        const res = await fetch('/api/server-trading/status');
        if (res.ok) {
          const ss = await res.json();
          setServerStatus(ss);
          // Also refresh trades when server is active
          if (ss.isActive) {
            const tradesRes = await fetch('/api/trades?limit=10');
            if (tradesRes.ok) setTrades(await tradesRes.json());
          }
        }
      } catch (err) {
        console.error('Failed to poll server status:', err);
      }
    };

    const interval = setInterval(pollStatus, 3000);
    return () => clearInterval(interval);
  }, [tradingMode]);

  // Server-side trading controls
  const startServerTrading = useCallback(async () => {
    setServerLoading(true);
    try {
      const res = await fetch('/api/server-trading/start', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setServerStatus(prev => ({ ...prev, isActive: true, status: 'RUNNING', lastSignal: 'Starting...' }));
      } else {
        alert(data.error || 'Failed to start trading');
      }
    } catch (err) {
      console.error('Failed to start server trading:', err);
      alert('Failed to start trading');
    } finally {
      setServerLoading(false);
    }
  }, []);

  const stopServerTrading = useCallback(async () => {
    setServerLoading(true);
    try {
      const res = await fetch('/api/server-trading/stop', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setServerStatus(prev => ({ ...prev, isActive: false, status: 'STOPPED', lastSignal: 'Stopped' }));
      } else {
        alert(data.error || 'Failed to stop trading');
      }
    } catch (err) {
      console.error('Failed to stop server trading:', err);
      alert('Failed to stop trading');
    } finally {
      setServerLoading(false);
    }
  }, []);

  const connectWebSocket = useCallback(() => {
    if (!settings || !tokens) return;
    const token = settings.accountType === 'demo' ? tokens.demo : tokens.live;
    if (!token) {
      setBotState(prev => ({ ...prev, lastSignal: 'No API token configured for ' + settings.accountType + ' account' }));
      return;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.close();
    }

    const ws = new WebSocket(DERIV_WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ authorize: token }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleWSMessage(data);
    };

    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
      setBotState(prev => ({ ...prev, lastSignal: 'Connection error' }));
    };

    ws.onclose = () => {
      if (botStateRef.current.status === 'RUNNING') {
        setTimeout(connectWebSocket, 3000);
      }
    };
  }, [settings, tokens]);

  const handleWSMessage = useCallback((data: any) => {
    const msgType = data?.msg_type;

    if (data.error) {
      console.error('Deriv API error:', data.error);
      setBotState(prev => ({ ...prev, lastSignal: `Error: ${data.error.message || 'Unknown'}` }));
      return;
    }

    switch (msgType) {
      case 'authorize':
        setBotState(prev => ({ ...prev, balance: data.authorize?.balance || 0 }));
        // Subscribe to balance updates
        wsRef.current?.send(JSON.stringify({ balance: 1, subscribe: 1 }));
        // Subscribe to candles
        const market = settingsRef.current?.selectedMarket || 'R_10';
        wsRef.current?.send(JSON.stringify({
          ticks_history: market,
          count: 20,
          end: 'latest',
          granularity: 60,
          style: 'candles',
          subscribe: 1,
        }));
        break;

      case 'balance':
        setBotState(prev => ({ ...prev, balance: data.balance?.balance || prev.balance }));
        break;

      case 'candles':
        if (data.candles?.length) {
          const newCandles = data.candles.map((c: any) => ({
            epoch: c.epoch,
            open: parseFloat(c.open),
            high: parseFloat(c.high),
            low: parseFloat(c.low),
            close: parseFloat(c.close),
          }));
          setCandles(newCandles);
          candlesRef.current = newCandles;
          if (newCandles.length > 0) {
            lastCandleEpochRef.current = newCandles[newCandles.length - 1].epoch;
          }
          analyzeAndTrade();
        }
        break;

      case 'ohlc':
        if (data.ohlc) {
          const newCandle: Candle = {
            epoch: data.ohlc.epoch,
            open: parseFloat(data.ohlc.open),
            high: parseFloat(data.ohlc.high),
            low: parseFloat(data.ohlc.low),
            close: parseFloat(data.ohlc.close),
          };
          // Check if this is a new candle
          if (newCandle.epoch > lastCandleEpochRef.current) {
            lastCandleEpochRef.current = newCandle.epoch;
            const updatedCandles = [...candlesRef.current.slice(-19), newCandle];
            setCandles(updatedCandles);
            candlesRef.current = updatedCandles;
            analyzeAndTrade();
          } else {
            // Update current candle
            const updatedCandles = [...candlesRef.current];
            if (updatedCandles.length > 0) {
              updatedCandles[updatedCandles.length - 1] = newCandle;
              setCandles(updatedCandles);
              candlesRef.current = updatedCandles;
            }
          }
        }
        break;

      case 'buy':
        if (data.buy) {
          pendingContractRef.current = data.buy.contract_id?.toString();
          const trade: Trade = {
            id: '',
            contractId: data.buy.contract_id?.toString(),
            market: settingsRef.current?.selectedMarket || 'R_10',
            direction: botStateRef.current.currentTrade?.direction || 'RISE',
            stake: data.buy.buy_price || currentStakeRef.current,
            entryTime: new Date(),
            result: 'PENDING',
            accountType: settingsRef.current?.accountType || 'demo',
            sma5: botStateRef.current.sma5,
            sma6: botStateRef.current.sma6,
            atr: botStateRef.current.atr,
          };
          setBotState(prev => ({ ...prev, currentTrade: trade, lastSignal: `Trade placed: ${trade.direction} at $${trade.stake}` }));
          // Save trade to database
          saveTrade(trade);
          // Subscribe to contract updates
          wsRef.current?.send(JSON.stringify({ proposal_open_contract: 1, contract_id: data.buy.contract_id, subscribe: 1 }));
        }
        break;

      case 'proposal_open_contract':
        if (data.proposal_open_contract?.status === 'sold' || data.proposal_open_contract?.is_sold) {
          const contract = data.proposal_open_contract;
          const profit = contract.profit || 0;
          const isWin = profit > 0;
          
          // Update trade result
          updateTradeResult(contract.contract_id?.toString(), isWin ? 'WIN' : 'LOSS', profit, contract.exit_tick || 0);
          
          // Update bot state
          const newConsecutiveLosses = isWin ? 0 : botStateRef.current.consecutiveLosses + 1;
          const nextStake = calculateNextStake(
            isWin ? 'WIN' : 'LOSS',
            currentStakeRef.current,
            settingsRef.current?.initialStake || 1,
            settingsRef.current?.martingaleFactor || 2,
            settingsRef.current?.maxStake || 100,
            settingsRef.current?.maxStakeEnabled || true
          );
          
          currentStakeRef.current = isWin ? (settingsRef.current?.initialStake || 1) : nextStake;
          
          setBotState(prev => ({
            ...prev,
            consecutiveLosses: newConsecutiveLosses,
            currentStake: currentStakeRef.current,
            currentTrade: null,
            sessionProfit: prev.sessionProfit + profit,
            allTimeProfit: prev.allTimeProfit + profit,
            lastSignal: `Trade ${isWin ? 'WON' : 'LOST'}: ${profit >= 0 ? '+' : ''}$${profit.toFixed(2)}`,
          }));

          pendingContractRef.current = null;
          
          // Check risk limits
          checkRiskLimits(newConsecutiveLosses, profit);
          
          // Refresh trades list
          refreshTrades();
        }
        break;
    }
  }, []);

  const analyzeAndTrade = useCallback(() => {
    if (botStateRef.current.status !== 'RUNNING' || pendingContractRef.current) return;
    if (candlesRef.current.length < 10) {
      setBotState(prev => ({ ...prev, lastSignal: `Waiting for candles (${candlesRef.current.length}/10)` }));
      return;
    }

    const closes = candlesRef.current.map(c => c.close);
    const sma5 = calculateSMA(closes, 5);
    const sma6 = calculateSMA(closes, 6);
    const atr = calculateATR(candlesRef.current, 14);
    const atrThreshold = settingsRef.current?.atrThreshold || 0.0005;

    setBotState(prev => ({
      ...prev,
      sma5,
      sma6,
      atr,
      marketCondition: {
        trending: Math.abs(sma5 - sma6) > atrThreshold,
        volatility: atr > atrThreshold ? 'HIGH' : 'LOW',
      },
    }));

    const { direction, reason } = determineSignal(sma5, sma6, atr, atrThreshold);
    setBotState(prev => ({ ...prev, lastSignal: reason }));

    if (direction && wsRef.current?.readyState === WebSocket.OPEN) {
      placeTrade(direction);
    }
  }, []);

  const placeTrade = useCallback((direction: 'RISE' | 'FALL') => {
    const market = settingsRef.current?.selectedMarket || 'R_10';
    const stake = currentStakeRef.current;

    setBotState(prev => ({
      ...prev,
      currentTrade: {
        id: '',
        market,
        direction,
        stake,
        entryTime: new Date(),
        result: 'PENDING',
        accountType: settingsRef.current?.accountType || 'demo',
      },
    }));

    wsRef.current?.send(JSON.stringify({
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
  }, []);

  const saveTrade = async (trade: Trade) => {
    try {
      const res = await fetch('/api/trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trade),
      });
      if (res.ok) {
        const saved = await res.json();
        setBotState(prev => ({
          ...prev,
          currentTrade: prev.currentTrade ? { ...prev.currentTrade, id: saved.id } : null,
        }));
      }
    } catch (err) {
      console.error('Failed to save trade:', err);
    }
  };

  const updateTradeResult = async (contractId: string, result: 'WIN' | 'LOSS', profit: number, exitPrice: number) => {
    const currentTrade = botStateRef.current.currentTrade;
    if (!currentTrade?.id) return;
    
    try {
      await fetch(`/api/trades/${currentTrade.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result, profit, exitPrice, exitTime: new Date() }),
      });
    } catch (err) {
      console.error('Failed to update trade:', err);
    }
  };

  const refreshTrades = async () => {
    try {
      const res = await fetch('/api/trades?limit=10');
      if (res.ok) setTrades(await res.json());
    } catch (err) {
      console.error('Failed to refresh trades:', err);
    }
  };

  const checkRiskLimits = useCallback((consecutiveLosses: number, lastProfit: number) => {
    const s = settingsRef.current;
    if (!s) return;

    // Check max consecutive losses
    if (s.maxConsecutiveLossesEnabled && consecutiveLosses >= s.maxConsecutiveLosses) {
      stopBot();
      setBotState(prev => ({ ...prev, lastSignal: `Stopped: Max consecutive losses (${s.maxConsecutiveLosses}) reached` }));
      return;
    }

    // Check daily loss limit
    if (s.dailyLossLimitEnabled && botStateRef.current.sessionProfit <= -s.dailyLossLimit) {
      stopBot();
      setBotState(prev => ({ ...prev, lastSignal: `Stopped: Daily loss limit ($${s.dailyLossLimit}) reached` }));
    }
  }, []);

  const startBot = useCallback(() => {
    if (!tokens.demo && !tokens.live) {
      setBotState(prev => ({ ...prev, lastSignal: 'Please configure API tokens first' }));
      return;
    }
    setBotState(prev => ({ ...prev, status: 'RUNNING', lastSignal: 'Starting...' }));
    connectWebSocket();
  }, [tokens, connectWebSocket]);

  const pauseBot = useCallback(() => {
    setBotState(prev => ({ ...prev, status: 'PAUSED', lastSignal: 'Trading paused' }));
  }, []);

  const resumeBot = useCallback(() => {
    setBotState(prev => ({ ...prev, status: 'RUNNING', lastSignal: 'Resuming...' }));
  }, []);

  const stopBot = useCallback(() => {
    setBotState(prev => ({
      ...prev,
      status: 'STOPPED',
      lastSignal: 'Trading stopped',
      currentTrade: null,
    }));
    currentStakeRef.current = settingsRef.current?.initialStake || 1;
    setBotState(prev => ({ ...prev, currentStake: currentStakeRef.current, consecutiveLosses: 0 }));
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const handleConfirmAction = () => {
    switch (confirmDialog.action) {
      case 'start':
        startBot();
        break;
      case 'stop':
        stopBot();
        break;
      case 'server-start':
        startServerTrading();
        break;
      case 'server-stop':
        stopServerTrading();
        break;
    }
    setConfirmDialog({ open: false, action: '', message: '' });
  };

  const handleMarketChange = async (market: string) => {
    if (!settings) return;
    const newSettings = { ...settings, selectedMarket: market };
    setSettings(newSettings);
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selectedMarket: market }),
    });
    
    // If running, reconnect with new market
    if (botState.status === 'RUNNING' && wsRef.current) {
      wsRef.current.send(JSON.stringify({ forget_all: 'candles' }));
      wsRef.current.send(JSON.stringify({
        ticks_history: market,
        count: 20,
        end: 'latest',
        granularity: 60,
        style: 'candles',
        subscribe: 1,
      }));
    }
  };

  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f0f1a]">
        <Loader2 className="w-8 h-8 animate-spin text-fuchsia-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f1a]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0f0f1a]/90 backdrop-blur-sm border-b border-fuchsia-900/30">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-fuchsia-500" />
            <span className="text-xl font-bold gradient-text">Deriv Trading Bot</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-gray-400 text-sm">Welcome, {session?.user?.name || 'Trader'}</span>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="flex items-center gap-2 text-gray-400 hover:text-fuchsia-400 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Trading Mode Toggle */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card mb-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Cloud className="w-5 h-5 text-fuchsia-400" />
              <div>
                <h3 className="text-sm font-semibold text-white">Trading Mode</h3>
                <p className="text-xs text-gray-400">
                  {tradingMode === 'server' 
                    ? '24/7 Server Trading - Runs even when your computer is off' 
                    : 'Browser Trading - Runs only while this page is open'}
                </p>
              </div>
            </div>
            <div className="flex bg-[#252542] rounded-lg p-1">
              <button
                onClick={() => {
                  if (botState.status === 'STOPPED' && !serverStatus.isActive) {
                    setTradingMode('browser');
                  }
                }}
                disabled={botState.status !== 'STOPPED' || serverStatus.isActive}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  tradingMode === 'browser'
                    ? 'bg-fuchsia-600 text-white'
                    : 'text-gray-400 hover:text-white disabled:opacity-50'
                }`}
              >
                <Monitor className="w-4 h-4" />
                Browser
              </button>
              <button
                onClick={() => {
                  if (botState.status === 'STOPPED' && !serverStatus.isActive) {
                    setTradingMode('server');
                  }
                }}
                disabled={botState.status !== 'STOPPED' || serverStatus.isActive}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  tradingMode === 'server'
                    ? 'bg-green-600 text-white'
                    : 'text-gray-400 hover:text-white disabled:opacity-50'
                }`}
              >
                <Server className="w-4 h-4" />
                24/7 Server
              </button>
            </div>
          </div>
        </motion.div>

        {/* Control Bar */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card mb-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Market Selection */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Market</label>
                <select
                  value={settings?.selectedMarket || 'R_10'}
                  onChange={(e) => handleMarketChange(e.target.value)}
                  className="input-field py-2 min-w-[200px]"
                  disabled={botState.status === 'RUNNING' || serverStatus.isActive}
                >
                  {MARKETS.map(m => (
                    <option key={m.symbol} value={m.symbol}>{m.name}</option>
                  ))}
                </select>
              </div>

              {/* Account Type */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Account</label>
                <div className="flex bg-[#252542] rounded-lg p-1">
                  <button
                    onClick={async () => {
                      if (botState.status !== 'RUNNING' && !serverStatus.isActive) {
                        const newSettings = { ...(settings || {}), accountType: 'demo' as const };
                        setSettings(newSettings as TradingSettings);
                        const res = await fetch('/api/settings', {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ accountType: 'demo' }),
                        });
                        if (res.ok) {
                          const updated = await res.json();
                          setSettings(updated);
                        }
                      }
                    }}
                    disabled={serverStatus.isActive || botState.status === 'RUNNING'}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      settings?.accountType === 'demo'
                        ? 'bg-fuchsia-600 text-white'
                        : 'text-gray-400 hover:text-white'
                    } ${serverStatus.isActive || botState.status === 'RUNNING' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    Demo
                  </button>
                  <button
                    onClick={async () => {
                      if (botState.status !== 'RUNNING' && !serverStatus.isActive) {
                        const newSettings = { ...(settings || {}), accountType: 'live' as const };
                        setSettings(newSettings as TradingSettings);
                        const res = await fetch('/api/settings', {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ accountType: 'live' }),
                        });
                        if (res.ok) {
                          const updated = await res.json();
                          setSettings(updated);
                        }
                      }
                    }}
                    disabled={serverStatus.isActive || botState.status === 'RUNNING'}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      settings?.accountType === 'live'
                        ? 'bg-red-600 text-white'
                        : 'text-gray-400 hover:text-white'
                    } ${serverStatus.isActive || botState.status === 'RUNNING' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    Live
                  </button>
                </div>
              </div>
            </div>

            {/* Trading Controls */}
            <div className="flex items-center gap-3">
              {tradingMode === 'server' ? (
                // Server-side trading controls
                <>
                  {!serverStatus.isActive && (
                    <button
                      onClick={() => setConfirmDialog({
                        open: true,
                        action: 'server-start',
                        message: `Start 24/7 server trading on ${settings?.accountType?.toUpperCase()} account with ${MARKETS.find(m => m.symbol === settings?.selectedMarket)?.name}?\n\nTrading will continue even when your computer is off.`
                      })}
                      disabled={serverLoading}
                      className="btn-primary flex items-center gap-2"
                    >
                      {serverLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                      Start 24/7
                    </button>
                  )}
                  {serverStatus.isActive && (
                    <button
                      onClick={() => setConfirmDialog({
                        open: true,
                        action: 'server-stop',
                        message: 'Stop 24/7 server trading?'
                      })}
                      disabled={serverLoading}
                      className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-colors"
                    >
                      {serverLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Square className="w-5 h-5" />}
                      Stop
                    </button>
                  )}
                </>
              ) : (
                // Browser-side trading controls
                <>
                  {botState.status === 'STOPPED' && (
                    <button
                      onClick={() => setConfirmDialog({
                        open: true,
                        action: 'start',
                        message: `Start trading on ${settings?.accountType?.toUpperCase()} account with ${MARKETS.find(m => m.symbol === settings?.selectedMarket)?.name}?`
                      })}
                      className="btn-primary flex items-center gap-2"
                    >
                      <Play className="w-5 h-5" /> Start
                    </button>
                  )}
                  {botState.status === 'RUNNING' && (
                    <button
                      onClick={pauseBot}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-colors"
                    >
                      <Pause className="w-5 h-5" /> Pause
                    </button>
                  )}
                  {botState.status === 'PAUSED' && (
                    <button
                      onClick={resumeBot}
                      className="btn-primary flex items-center gap-2"
                    >
                      <Play className="w-5 h-5" /> Resume
                    </button>
                  )}
                  {botState.status !== 'STOPPED' && (
                    <button
                      onClick={() => setConfirmDialog({
                        open: true,
                        action: 'stop',
                        message: 'Stop trading? This will reset your current stake and consecutive losses count.'
                      })}
                      className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-colors"
                    >
                      <Square className="w-5 h-5" /> Stop
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
          
          {/* Server Status Indicator */}
          {tradingMode === 'server' && serverStatus.isActive && (
            <div className="mt-4 pt-4 border-t border-fuchsia-900/30">
              <div className="flex items-center gap-2 text-green-400">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-sm font-medium">24/7 Trading Active</span>
                <span className="text-gray-400 text-sm">• {serverStatus.lastSignal}</span>
              </div>
              <div className="grid grid-cols-4 gap-4 mt-3">
                <div>
                  <span className="text-xs text-gray-400">Balance</span>
                  <div className="font-medium text-white">${serverStatus.balance?.toFixed(2) || '0.00'}</div>
                </div>
                <div>
                  <span className="text-xs text-gray-400">Session P/L</span>
                  <div className={`font-medium ${(serverStatus.sessionProfit || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {(serverStatus.sessionProfit || 0) >= 0 ? '+' : ''}${(serverStatus.sessionProfit || 0).toFixed(2)}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-gray-400">Current Stake</span>
                  <div className="font-medium text-white">${serverStatus.currentStake?.toFixed(2) || '1.00'}</div>
                </div>
                <div>
                  <span className="text-xs text-gray-400">Consecutive Losses</span>
                  <div className={`font-medium ${(serverStatus.consecutiveLosses || 0) >= 3 ? 'text-red-400' : 'text-white'}`}>
                    {serverStatus.consecutiveLosses || 0}
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Status & Settings */}
          <div className="lg:col-span-1 space-y-6">
            {/* Tabs */}
            <div className="flex bg-[#1a1a2e] rounded-lg p-1">
              {[
                { key: 'status', label: 'Status', icon: Activity },
                { key: 'settings', label: 'Settings', icon: Settings },
                { key: 'tokens', label: 'API Tokens', icon: DollarSign },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key as any)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === key
                      ? 'bg-fuchsia-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>

            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'status' && (
                <StatusPanel botState={botState} settings={settings} />
              )}
              {activeTab === 'settings' && (
                settings ? (
                  <TradingSettingsPanel
                    settings={settings}
                    onUpdate={async (newSettings) => {
                      setSettings(newSettings);
                      await fetch('/api/settings', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(newSettings),
                      });
                    }}
                    disabled={botState.status !== 'STOPPED'}
                  />
                ) : (
                  <div className="card">
                    <div className="text-red-400 text-center py-8">
                      <p className="mb-2">Failed to load settings</p>
                      <p className="text-sm text-gray-400">{loadError || 'Please refresh the page or check the database connection'}</p>
                    </div>
                  </div>
                )
              )}
              {activeTab === 'tokens' && (
                <TokenSettings
                  tokens={tokens}
                  onUpdate={(newTokens) => setTokens(newTokens)}
                  disabled={botState.status !== 'STOPPED'}
                />
              )}
            </motion.div>
          </div>

          {/* Right Column - Charts & History */}
          <div className="lg:col-span-2 space-y-6">
            <Charts
              candles={candles}
              sma5={botState.sma5}
              sma6={botState.sma6}
              stats={stats}
              trades={trades}
            />
            <TradeHistory trades={trades} />
          </div>
        </div>
      </main>

      <ConfirmDialog
        open={confirmDialog.open}
        message={confirmDialog.message}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmDialog({ open: false, action: '', message: '' })}
      />
    </div>
  );
}
