'use client';

import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, PieChart, LineChart } from 'lucide-react';
import { Candle, Trade } from '@/lib/types';

const RechartsComponents = dynamic(() => import('./recharts-wrapper'), {
  ssr: false,
  loading: () => <div className="h-full flex items-center justify-center text-gray-400">Loading charts...</div>,
});

interface ChartsProps {
  candles: Candle[];
  sma5: number;
  sma6: number;
  stats: {
    allTimeProfit: number;
    sessionProfit: number;
    wins: number;
    losses: number;
    winRate: number;
    balanceHistory: any[];
  };
  trades: Trade[];
}

export default function Charts({ candles, sma5, sma6, stats, trades }: ChartsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Candle Chart with SMA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card col-span-1 md:col-span-2"
      >
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <LineChart className="w-5 h-5 text-fuchsia-400" />
          Price Chart (1-Min Candles)
        </h3>
        <div className="h-[250px]">
          <RechartsComponents
            type="candles"
            candles={candles ?? []}
            sma5={sma5 ?? 0}
            sma6={sma6 ?? 0}
          />
        </div>
      </motion.div>

      {/* Balance History */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card"
      >
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-fuchsia-400" />
          Balance History
        </h3>
        <div className="h-[200px]">
          <RechartsComponents
            type="balance"
            balanceHistory={stats?.balanceHistory ?? []}
          />
        </div>
      </motion.div>

      {/* Win/Loss Ratio */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card"
      >
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <PieChart className="w-5 h-5 text-fuchsia-400" />
          Win/Loss Ratio
        </h3>
        <div className="h-[200px]">
          <RechartsComponents
            type="winLoss"
            wins={stats?.wins ?? 0}
            losses={stats?.losses ?? 0}
            winRate={stats?.winRate ?? 0}
          />
        </div>
      </motion.div>
    </div>
  );
}
