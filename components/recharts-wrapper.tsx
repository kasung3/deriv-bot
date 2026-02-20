'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  ComposedChart,
  Bar,
  Legend,
} from 'recharts';
import { Candle } from '@/lib/types';

interface RechartsWrapperProps {
  type: 'candles' | 'balance' | 'winLoss';
  candles?: Candle[];
  sma5?: number;
  sma6?: number;
  balanceHistory?: any[];
  wins?: number;
  losses?: number;
  winRate?: number;
}

function calculateSMAArray(candles: Candle[], period: number): (number | null)[] {
  return (candles ?? []).map((_, index) => {
    if (index < period - 1) return null;
    const slice = candles.slice(index - period + 1, index + 1);
    const avg = slice.reduce((sum, c) => sum + (c?.close ?? 0), 0) / period;
    return avg;
  });
}

export default function RechartsWrapper(props: RechartsWrapperProps) {
  const { type } = props;

  if (type === 'candles') {
    const candles = props.candles ?? [];
    if (candles.length === 0) {
      return <div className="h-full flex items-center justify-center text-gray-500">Waiting for market data...</div>;
    }

    const sma5Array = calculateSMAArray(candles, 5);
    const sma6Array = calculateSMAArray(candles, 6);

    const chartData = candles.map((c, i) => ({
      time: new Date((c?.epoch ?? 0) * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      close: c?.close ?? 0,
      sma5: sma5Array[i],
      sma6: sma6Array[i],
    }));

    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <XAxis
            dataKey="time"
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={['auto', 'auto']}
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            tickLine={false}
            tickFormatter={(v) => v?.toFixed?.(4) ?? '0'}
            width={60}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #d946ef', borderRadius: '8px', fontSize: '11px' }}
            labelStyle={{ color: '#f8f8ff' }}
          />
          <Line
            type="monotone"
            dataKey="close"
            stroke="#60B5FF"
            strokeWidth={2}
            dot={false}
            name="Price"
          />
          <Line
            type="monotone"
            dataKey="sma5"
            stroke="#22c55e"
            strokeWidth={1.5}
            dot={false}
            name="SMA 5"
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="sma6"
            stroke="#ef4444"
            strokeWidth={1.5}
            dot={false}
            name="SMA 6"
            connectNulls
          />
          <Legend verticalAlign="top" wrapperStyle={{ fontSize: 11 }} />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (type === 'balance') {
    const history = props.balanceHistory ?? [];
    if (history.length === 0) {
      return <div className="h-full flex items-center justify-center text-gray-500">No trading history yet</div>;
    }

    const chartData = history.map((h, i) => ({
      trade: i + 1,
      balance: h?.balance ?? 0,
    }));

    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#d946ef" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#d946ef" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="trade"
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            tickLine={false}
            tickFormatter={(v) => `$${v ?? 0}`}
            width={50}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #d946ef', borderRadius: '8px', fontSize: '11px' }}
            formatter={(value: number) => [`$${(value ?? 0).toFixed(2)}`, 'Balance']}
          />
          <Area
            type="monotone"
            dataKey="balance"
            stroke="#d946ef"
            fill="url(#balanceGradient)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  if (type === 'winLoss') {
    const wins = props.wins ?? 0;
    const losses = props.losses ?? 0;
    const total = wins + losses;

    if (total === 0) {
      return <div className="h-full flex items-center justify-center text-gray-500">No trades yet</div>;
    }

    const pieData = [
      { name: 'Wins', value: wins },
      { name: 'Losses', value: losses },
    ];

    const COLORS = ['#22c55e', '#ef4444'];

    return (
      <div className="h-full flex items-center">
        <div className="w-1/2 h-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={60}
                paddingAngle={5}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #d946ef', borderRadius: '8px', fontSize: '11px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="w-1/2 space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-green-500" />
            <span className="text-sm text-gray-300">Wins: {wins}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-500" />
            <span className="text-sm text-gray-300">Losses: {losses}</span>
          </div>
          <div className="pt-2 border-t border-gray-700">
            <div className="text-2xl font-bold text-fuchsia-400">{(props.winRate ?? 0).toFixed(1)}%</div>
            <div className="text-xs text-gray-400">Win Rate</div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
