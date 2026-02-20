'use client';

import { useState } from 'react';
import { Settings, Save, Loader2 } from 'lucide-react';
import { TradingSettings as TradingSettingsType } from '@/lib/types';

interface TradingSettingsPanelProps {
  settings: TradingSettingsType;
  onUpdate: (settings: TradingSettingsType) => Promise<void>;
  disabled: boolean;
}

export default function TradingSettingsPanel({ settings, onUpdate, disabled }: TradingSettingsPanelProps) {
  const [localSettings, setLocalSettings] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onUpdate(localSettings);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const updateSetting = <K extends keyof TradingSettingsType>(key: K, value: TradingSettingsType[K]) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="card space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Settings className="w-5 h-5 text-fuchsia-400" />
        Trading Settings
      </h3>

      {disabled && (
        <div className="bg-yellow-600/20 border border-yellow-600/30 text-yellow-400 px-3 py-2 rounded-lg text-sm">
          Stop trading to modify settings
        </div>
      )}

      {/* Stake Settings */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-300">Stake & Martingale</h4>
        
        <div>
          <label className="block text-xs text-gray-400 mb-1">Initial Stake ($)</label>
          <input
            type="number"
            value={localSettings?.initialStake ?? 1}
            onChange={(e) => updateSetting('initialStake', parseFloat(e.target.value) || 1)}
            className="input-field"
            min="0.01"
            step="0.01"
            disabled={disabled}
          />
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Martingale Factor</label>
          <input
            type="number"
            value={localSettings?.martingaleFactor ?? 2}
            onChange={(e) => updateSetting('martingaleFactor', parseFloat(e.target.value) || 2)}
            className="input-field"
            min="1"
            step="0.1"
            disabled={disabled}
          />
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">ATR Threshold</label>
          <input
            type="number"
            value={localSettings?.atrThreshold ?? 0.0005}
            onChange={(e) => updateSetting('atrThreshold', parseFloat(e.target.value) || 0.0005)}
            className="input-field"
            min="0"
            step="0.0001"
            disabled={disabled}
          />
        </div>
      </div>

      {/* Risk Management */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-300">Risk Management</h4>

        {/* Max Consecutive Losses */}
        <div className="bg-[#252542] rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-300">Max Consecutive Losses</span>
            <button
              onClick={() => updateSetting('maxConsecutiveLossesEnabled', !localSettings?.maxConsecutiveLossesEnabled)}
              disabled={disabled}
              className={`toggle-switch ${localSettings?.maxConsecutiveLossesEnabled ? 'active' : ''}`}
            />
          </div>
          {localSettings?.maxConsecutiveLossesEnabled && (
            <input
              type="number"
              value={localSettings?.maxConsecutiveLosses ?? 5}
              onChange={(e) => updateSetting('maxConsecutiveLosses', parseInt(e.target.value) || 5)}
              className="input-field mt-2"
              min="1"
              disabled={disabled}
            />
          )}
        </div>

        {/* Max Stake */}
        <div className="bg-[#252542] rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-300">Max Stake Cap ($)</span>
            <button
              onClick={() => updateSetting('maxStakeEnabled', !localSettings?.maxStakeEnabled)}
              disabled={disabled}
              className={`toggle-switch ${localSettings?.maxStakeEnabled ? 'active' : ''}`}
            />
          </div>
          {localSettings?.maxStakeEnabled && (
            <input
              type="number"
              value={localSettings?.maxStake ?? 100}
              onChange={(e) => updateSetting('maxStake', parseFloat(e.target.value) || 100)}
              className="input-field mt-2"
              min="1"
              step="1"
              disabled={disabled}
            />
          )}
        </div>

        {/* Daily Loss Limit */}
        <div className="bg-[#252542] rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-300">Daily Loss Limit ($)</span>
            <button
              onClick={() => updateSetting('dailyLossLimitEnabled', !localSettings?.dailyLossLimitEnabled)}
              disabled={disabled}
              className={`toggle-switch ${localSettings?.dailyLossLimitEnabled ? 'active' : ''}`}
            />
          </div>
          {localSettings?.dailyLossLimitEnabled && (
            <input
              type="number"
              value={localSettings?.dailyLossLimit ?? 50}
              onChange={(e) => updateSetting('dailyLossLimit', parseFloat(e.target.value) || 50)}
              className="input-field mt-2"
              min="1"
              step="1"
              disabled={disabled}
            />
          )}
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={disabled || saving}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        {saving ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : saved ? (
          'Saved!'
        ) : (
          <><Save className="w-5 h-5" /> Save Settings</>
        )}
      </button>
    </div>
  );
}
