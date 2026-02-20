'use client';

import { useState } from 'react';
import { Key, Eye, EyeOff, Save, Loader2, CheckCircle } from 'lucide-react';

interface TokenSettingsProps {
  tokens: { demo: string; live: string };
  onUpdate: (tokens: { demo: string; live: string }) => void;
  disabled: boolean;
}

export default function TokenSettings({ tokens, onUpdate, disabled }: TokenSettingsProps) {
  const [localTokens, setLocalTokens] = useState(tokens);
  const [showDemo, setShowDemo] = useState(false);
  const [showLive, setShowLive] = useState(false);
  const [savingDemo, setSavingDemo] = useState(false);
  const [savingLive, setSavingLive] = useState(false);
  const [savedDemo, setSavedDemo] = useState(false);
  const [savedLive, setSavedLive] = useState(false);

  const saveToken = async (type: 'demo' | 'live') => {
    const setS = type === 'demo' ? setSavingDemo : setSavingLive;
    const setSaved = type === 'demo' ? setSavedDemo : setSavedLive;
    const token = type === 'demo' ? localTokens.demo : localTokens.live;

    setS(true);
    try {
      const res = await fetch('/api/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenType: type, token }),
      });
      
      if (res.ok) {
        onUpdate(localTokens);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (err) {
      console.error('Failed to save token:', err);
    } finally {
      setS(false);
    }
  };

  return (
    <div className="card space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Key className="w-5 h-5 text-fuchsia-400" />
        API Tokens
      </h3>

      {disabled && (
        <div className="bg-yellow-600/20 border border-yellow-600/30 text-yellow-400 px-3 py-2 rounded-lg text-sm">
          Stop trading to modify tokens
        </div>
      )}

      <p className="text-sm text-gray-400">
        Get your API tokens from{' '}
        <a
          href="https://app.deriv.com/account/api-token"
          target="_blank"
          rel="noopener noreferrer"
          className="text-fuchsia-400 hover:text-fuchsia-300"
        >
          Deriv Account Settings
        </a>
      </p>

      {/* Demo Token */}
      <div className="bg-[#252542] rounded-lg p-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">Demo Account Token</label>
        <div className="relative">
          <input
            type={showDemo ? 'text' : 'password'}
            value={localTokens?.demo ?? ''}
            onChange={(e) => setLocalTokens(prev => ({ ...prev, demo: e.target.value }))}
            className="input-field pr-20"
            placeholder="Enter demo API token"
            disabled={disabled}
          />
          <button
            onClick={() => setShowDemo(!showDemo)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-2"
          >
            {showDemo ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        <button
          onClick={() => saveToken('demo')}
          disabled={disabled || savingDemo || !localTokens?.demo}
          className="btn-primary w-full mt-3 flex items-center justify-center gap-2 text-sm py-2"
        >
          {savingDemo ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : savedDemo ? (
            <><CheckCircle className="w-4 h-4" /> Saved!</>
          ) : (
            <><Save className="w-4 h-4" /> Save Demo Token</>
          )}
        </button>
      </div>

      {/* Live Token */}
      <div className="bg-[#252542] rounded-lg p-4 border border-red-900/30">
        <label className="block text-sm font-medium text-red-400 mb-2">Live Account Token</label>
        <div className="relative">
          <input
            type={showLive ? 'text' : 'password'}
            value={localTokens?.live ?? ''}
            onChange={(e) => setLocalTokens(prev => ({ ...prev, live: e.target.value }))}
            className="input-field pr-20 border-red-900/50"
            placeholder="Enter live API token"
            disabled={disabled}
          />
          <button
            onClick={() => setShowLive(!showLive)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-2"
          >
            {showLive ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        <div className="bg-red-900/20 text-red-400 text-xs p-2 rounded mt-2">
          ⚠️ Use with caution. Real money at risk.
        </div>
        <button
          onClick={() => saveToken('live')}
          disabled={disabled || savingLive || !localTokens?.live}
          className="bg-red-600 hover:bg-red-700 text-white w-full mt-3 py-2 rounded-lg font-medium flex items-center justify-center gap-2 text-sm transition-colors disabled:opacity-50"
        >
          {savingLive ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : savedLive ? (
            <><CheckCircle className="w-4 h-4" /> Saved!</>
          ) : (
            <><Save className="w-4 h-4" /> Save Live Token</>
          )}
        </button>
      </div>
    </div>
  );
}
