'use client';

import { motion } from 'framer-motion';
import {
  Activity, DollarSign, TrendingUp, TrendingDown, AlertTriangle,
  Zap, Target, BarChart2
} from 'lucide-react';
import { BotState, TradingSettings } from '@/lib/types';
import { MARKETS } from '@/lib/deriv';

interface StatusPanelProps {
  botState: BotState;
  settings: TradingSettings | null;
}

export default function StatusPanel({ botState, settings }: StatusPanelProps) {
  const statusColors = {
    STOPPED: 'bg-gray-600',
    RUNNING: 'bg-green-500',
    PAUSED: 'bg-yellow-500',
  };

  const marketName = MARKETS.find(m => m.symbol === settings?.selectedMarket)?.name || 'Unknown';

  return (
    <div className="card space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Activity className="w-5 h-5 text-fuchsia-400" />
        Trading Status
      </h3>

      {/* Status Badge */}
      <div className="flex items-center justify-between">
        <span className="text-gray-400">Status</span>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[botState?.status ?? 'STOPPED']} text-white`}>
          {botState?.status ?? 'STOPPED'}
        </span>
      </div>

      {/* Balance */}
      <div className="bg-[#252542] rounded-lg p-4">
        <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
          <DollarSign className="w-4 h-4" />
          Balance
        </div>
        <div className="text-2xl font-bold text-white">
          ${(botState?.balance ?? 0).toFixed(2)}
        </div>
      </div>

      {/* Profit/Loss */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#252542] rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Session P/L</div>
          <div className={`text-lg font-semibold ${(botState?.sessionProfit ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {(botState?.sessionProfit ?? 0) >= 0 ? '+' : ''}${(botState?.sessionProfit ?? 0).toFixed(2)}
          </div>
        </div>
        <div className="bg-[#252542] rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">All-Time P/L</div>
          <div className={`text-lg font-semibold ${(botState?.allTimeProfit ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {(botState?.allTimeProfit ?? 0) >= 0 ? '+' : ''}${(botState?.allTimeProfit ?? 0).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Current Trade Info */}
      {botState?.currentTrade && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-fuchsia-900/30 border border-fuchsia-600/30 rounded-lg p-4"
        >
          <div className="flex items-center gap-2 text-fuchsia-300 text-sm font-medium mb-2">
            <Target className="w-4 h-4" />
            Active Trade
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-400">Direction:</span>
              <span className={`ml-2 font-medium ${botState.currentTrade?.direction === 'RISE' ? 'text-green-400' : 'text-red-400'}`}>
                {botState.currentTrade?.direction ?? 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Stake:</span>
              <span className="ml-2 font-medium text-white">${(botState.currentTrade?.stake ?? 0).toFixed(2)}</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Trading Info */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400 flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Current Stake
          </span>
          <span className="font-medium text-white">${(botState?.currentStake ?? 1).toFixed(2)}</span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Consecutive Losses
          </span>
          <span className={`font-medium ${(botState?.consecutiveLosses ?? 0) >= 3 ? 'text-red-400' : 'text-white'}`}>
            {botState?.consecutiveLosses ?? 0}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400 flex items-center gap-2">
            <BarChart2 className="w-4 h-4" />
            Market
          </span>
          <span className="font-medium text-white text-right">{marketName}</span>
        </div>
      </div>

      {/* Market Condition */}
      <div className="bg-[#252542] rounded-lg p-4">
        <div className="text-xs text-gray-400 mb-2">Market Condition</div>
        <div className="flex items-center gap-3">
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            botState?.marketCondition?.trending ? 'bg-green-600/30 text-green-400' : 'bg-yellow-600/30 text-yellow-400'
          }`}>
            {botState?.marketCondition?.trending ? 'Trending' : 'Sideways'}
          </span>
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            botState?.marketCondition?.volatility === 'HIGH' ? 'bg-fuchsia-600/30 text-fuchsia-400' : 'bg-gray-600/30 text-gray-400'
          }`}>
            {botState?.marketCondition?.volatility ?? 'LOW'} Volatility
          </span>
        </div>
      </div>

      {/* Indicators */}
      <div className="bg-[#252542] rounded-lg p-4">
        <div className="text-xs text-gray-400 mb-2">Technical Indicators</div>
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div>
            <div className="text-gray-400 text-xs">SMA 5</div>
            <div className="font-medium text-green-400">{(botState?.sma5 ?? 0).toFixed(5)}</div>
          </div>
          <div>
            <div className="text-gray-400 text-xs">SMA 6</div>
            <div className="font-medium text-red-400">{(botState?.sma6 ?? 0).toFixed(5)}</div>
          </div>
          <div>
            <div className="text-gray-400 text-xs">ATR</div>
            <div className="font-medium text-fuchsia-400">{(botState?.atr ?? 0).toFixed(6)}</div>
          </div>
        </div>
      </div>

      {/* Last Signal */}
      <div className="bg-[#252542] rounded-lg p-3">
        <div className="text-xs text-gray-400 mb-1">Last Signal</div>
        <div className="text-sm text-white">{botState?.lastSignal ?? 'Waiting...'}</div>
      </div>
    </div>
  );
}
