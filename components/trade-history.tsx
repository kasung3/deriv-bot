'use client';

import { motion } from 'framer-motion';
import { Clock, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { Trade } from '@/lib/types';
import { MARKETS } from '@/lib/deriv';

interface TradeHistoryProps {
  trades: Trade[];
}

export default function TradeHistory({ trades }: TradeHistoryProps) {
  const formatTime = (date: Date | string) => {
    try {
      const d = new Date(date);
      return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '--:--';
    }
  };

  const getMarketName = (symbol: string) => {
    return MARKETS.find(m => m.symbol === symbol)?.name?.split(' ').slice(0, 2).join(' ') || symbol;
  };

  return (
    <div className="card">
      <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
        <Clock className="w-5 h-5 text-fuchsia-400" />
        Recent Trades
      </h3>

      {(!trades || trades.length === 0) ? (
        <div className="text-center text-gray-400 py-8">
          No trades yet. Start the bot to begin trading.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 text-left border-b border-gray-700">
                <th className="pb-2 font-medium">Time</th>
                <th className="pb-2 font-medium">Market</th>
                <th className="pb-2 font-medium">Direction</th>
                <th className="pb-2 font-medium">Stake</th>
                <th className="pb-2 font-medium text-right">P/L</th>
              </tr>
            </thead>
            <tbody>
              {(trades ?? []).map((trade, index) => (
                <motion.tr
                  key={trade?.id || index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`border-b border-gray-800 ${
                    trade?.result === 'WIN' ? 'bg-green-900/10' : trade?.result === 'LOSS' ? 'bg-red-900/10' : ''
                  }`}
                >
                  <td className="py-3 text-gray-300">
                    {formatTime(trade?.entryTime ?? new Date())}
                  </td>
                  <td className="py-3 text-gray-300">
                    {getMarketName(trade?.market ?? '')}
                  </td>
                  <td className="py-3">
                    <span className={`flex items-center gap-1 ${
                      trade?.direction === 'RISE' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {trade?.direction === 'RISE' ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                      {trade?.direction ?? 'N/A'}
                    </span>
                  </td>
                  <td className="py-3 text-gray-300">
                    ${(trade?.stake ?? 0).toFixed(2)}
                  </td>
                  <td className={`py-3 text-right font-medium ${
                    trade?.result === 'WIN' ? 'text-green-400' : 
                    trade?.result === 'LOSS' ? 'text-red-400' : 'text-yellow-400'
                  }`}>
                    {trade?.result === 'PENDING' ? (
                      'Pending...'
                    ) : (
                      `${(trade?.profit ?? 0) >= 0 ? '+' : ''}$${(trade?.profit ?? 0).toFixed(2)}`
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
