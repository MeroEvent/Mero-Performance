'use client';

import React from 'react';
import { MapPin, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GpsGeofencingSectionProps {
  companyRules: any;
  officeLocations: any[];
  onOpenMapPicker: (locationToEdit?: any) => void;
  onDeleteLocation: (id: string) => void;
  onChangeRules: (updated: any) => void;
}

export const GpsGeofencingSection: React.FC<GpsGeofencingSectionProps> = ({
  companyRules,
  officeLocations,
  onOpenMapPicker,
  onDeleteLocation,
  onChangeRules,
}) => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <MapPin className="w-5 h-5 text-emerald-500" />
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Office Location & GPS Geofencing</h3>
              <p className="text-xs text-slate-400">Ensure employees are physically within the office building boundary when checking in</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={companyRules.gps_enabled || false}
                onChange={(e) => onChangeRules({ ...companyRules, gps_enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600"></div>
            </label>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {companyRules.gps_enabled ? 'Active 🟢' : 'Disabled ⚪'}
            </span>
          </div>
        </div>

        {companyRules.gps_enabled && (
          <div className="space-y-4 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Official Office Buildings & Geofences:
              </label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onOpenMapPicker(null)}
                className="text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Location on Map
              </Button>
            </div>

            {/* Buildings Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {officeLocations.map((loc) => (
                <div key={loc.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-xs font-extrabold text-slate-900 dark:text-white">{loc.name}</p>
                    <p className="text-[11px] font-mono text-slate-400">
                      {Number(loc.latitude).toFixed(5)}, {Number(loc.longitude).toFixed(5)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onOpenMapPicker(loc)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 transition-colors"
                      title="Edit on map"
                    >
                      <MapPin className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteLocation(loc.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                      title="Delete location"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Radius Slider */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Allowed Office Radius Boundary</span>
                <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">{companyRules.gps_radius_meters || 200} meters</span>
              </div>
              <input
                type="range"
                min="50"
                max="1000"
                step="50"
                value={companyRules.gps_radius_meters || 200}
                onChange={(e) => onChangeRules({ ...companyRules, gps_radius_meters: parseInt(e.target.value) || 200 })}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
