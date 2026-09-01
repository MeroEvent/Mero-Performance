'use client';

import React, { useState } from 'react';
import { Wifi, RefreshCw, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isIpAllowed, isLoopbackIp, normalizeIpAddress } from '@/lib/utils/network';

interface WifiSecuritySectionProps {
  companyRules: any;
  currentDetectedIp: string;
  serverDetectedIp: string;
  isDetectingNetwork: boolean;
  isAuthorizingNetwork: boolean;
  onDetectNetwork: (ip?: string) => void;
  onAuthorizeCurrentNetwork: () => void;
  onChangeRules: (updated: any) => void;
}

export const WifiSecuritySection: React.FC<WifiSecuritySectionProps> = ({
  companyRules,
  currentDetectedIp,
  serverDetectedIp,
  isDetectingNetwork,
  isAuthorizingNetwork,
  onDetectNetwork,
  onAuthorizeCurrentNetwork,
  onChangeRules,
}) => {
  const [newIpInput, setNewIpInput] = useState<string>('');

  const isCurrentNetworkAuthorized = Boolean(
    currentDetectedIp &&
    Array.isArray(companyRules?.allowed_ips) &&
    isIpAllowed(currentDetectedIp, companyRules.allowed_ips)
  );

  const handleAddAllowedIp = () => {
    const target = normalizeIpAddress(newIpInput);
    if (!target) return;
    if (isLoopbackIp(target)) return;

    const currentIps = Array.isArray(companyRules.allowed_ips) ? companyRules.allowed_ips : [];
    if (!currentIps.includes(target)) {
      onChangeRules({ ...companyRules, allowed_ips: [...currentIps, target] });
      setNewIpInput('');
    }
  };

  const handleRemoveAllowedIp = (ipToRemove: string) => {
    const currentIps = Array.isArray(companyRules.allowed_ips) ? companyRules.allowed_ips : [];
    onChangeRules({
      ...companyRules,
      allowed_ips: currentIps.filter((ip: string) => ip !== ipToRemove),
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Wifi className="w-5 h-5 text-indigo-500" />
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">WiFi & IP Network Security</h3>
              <p className="text-xs text-slate-400">Prevent staff from checking in over personal mobile hotspots or unauthorized networks</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={companyRules.ip_restriction_enabled || false}
                onChange={(e) => onChangeRules({ ...companyRules, ip_restriction_enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
            </label>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {companyRules.ip_restriction_enabled ? 'Active 🟢' : 'Disabled ⚪'}
            </span>
          </div>
        </div>

        {companyRules.ip_restriction_enabled && (
          <div className="space-y-4 pt-1">
            {/* Live Detected Network Card */}
            <div className="p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/50 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="space-y-0.5 min-w-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                  <Wifi className="w-3.5 h-3.5" /> Current Connected Network
                </span>
                <p className="text-sm font-black font-mono text-slate-900 dark:text-white break-all">
                  {isDetectingNetwork ? 'Detecting...' : currentDetectedIp || 'Unavailable'}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onDetectNetwork(serverDetectedIp)}
                  disabled={isDetectingNetwork}
                  className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={isCurrentNetworkAuthorized ? 'success' : 'primary'}
                  onClick={onAuthorizeCurrentNetwork}
                  disabled={!currentDetectedIp || isCurrentNetworkAuthorized}
                  isLoading={isAuthorizingNetwork}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {isCurrentNetworkAuthorized ? 'Current WiFi Allowed' : 'Allow Current WiFi'}
                </Button>
              </div>
            </div>

              {/* Authorized IP List */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Authorized Office WiFi Subnets & IP Networks:
                </label>
                <div className="flex flex-wrap gap-2 min-h-[42px] p-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl">
                  {(() => {
                    const validIps = (companyRules.allowed_ips || []).filter(
                      (ip: string) => ip && !ip.startsWith('__CONFIG__:') && !ip.startsWith('__POLICY__:')
                    );
                    if (validIps.length === 0) {
                      return <span className="text-xs text-slate-400 italic p-1">No office WiFi IPs authorized yet.</span>;
                    }
                    return validIps.map((ip: string) => (
                      <span
                        key={ip}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-xs font-mono font-bold text-slate-800 dark:text-slate-200 shadow-sm"
                      >
                        <Wifi className="w-3 h-3 text-emerald-500" />
                        {ip}
                        <button
                          type="button"
                          onClick={() => handleRemoveAllowedIp(ip)}
                          className="ml-1 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                        >
                          ×
                        </button>
                      </span>
                    ));
                  })()}
                </div>
              </div>

            {/* Add IP Input */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Enter office IP or subnet (e.g. 2400:1a00:... or 103.14.25.10)"
                value={newIpInput}
                onChange={(e) => setNewIpInput(e.target.value)}
                className="flex-1 px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-slate-100"
              />
              <Button type="button" size="sm" variant="primary" onClick={handleAddAllowedIp}>
                Add Network
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
