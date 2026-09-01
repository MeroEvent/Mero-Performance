'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  Sparkles,
  RotateCcw,
  Smartphone,
  Wifi,
  MapPin,
  ShieldAlert,
  Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LocationPickerModal } from './location-picker-modal';
import { WifiSecuritySection } from './rules/wifi-security-section';
import { GpsGeofencingSection } from './rules/gps-geofencing-section';
import { SingleDeviceSection } from './rules/single-device-section';
import { TardinessPenaltySection } from './rules/tardiness-penalty-section';
import { LeavePayrollSection } from './rules/leave-payroll-section';
import { fetchBrowserPublicIp, normalizeIpAddress, isLoopbackIp } from '@/lib/utils/network';
export type RuleSectionKey = 'device' | 'wifi' | 'gps' | 'tardiness' | 'leave_payroll';

interface CompanyRulesFormProps {
  onStepChange?: (isStep2: boolean) => void;
}

export const CompanyRulesForm: React.FC<CompanyRulesFormProps> = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const tabFromUrl = (searchParams.get('tab') as RuleSectionKey) || 'device';
  const [activeSection, setActiveSection] = useState<RuleSectionKey>(tabFromUrl);

  const [companyRules, setCompanyRules] = useState<any>(null);
  const [originalSnapshot, setOriginalSnapshot] = useState<string>('');
  const [officeLocations, setOfficeLocations] = useState<any[]>([]);
  const [currentDetectedIp, setCurrentDetectedIp] = useState<string>('');
  const [serverDetectedIp, setServerDetectedIp] = useState<string>('');
  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState<boolean>(false);
  const [selectedLocationToEdit, setSelectedLocationToEdit] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDetectingNetwork, setIsDetectingNetwork] = useState<boolean>(false);
  const [isAuthorizingNetwork, setIsAuthorizingNetwork] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Sync tab with URL search parameter
  useEffect(() => {
    const tab = searchParams.get('tab') as RuleSectionKey;
    if (tab && ['device', 'wifi', 'gps', 'tardiness', 'leave_payroll'].includes(tab)) {
      setActiveSection(tab);
    }
  }, [searchParams]);

  const handleTabChange = (newTab: RuleSectionKey) => {
    setActiveSection(newTab);
    router.push(`/admin/settings?tab=${newTab}`);
  };

  // Check if form has unsaved modifications
  const currentSnapshot = JSON.stringify(companyRules);
  const isDirty = Boolean(
    companyRules &&
    originalSnapshot &&
    currentSnapshot !== originalSnapshot
  );

  const detectCurrentNetwork = async (requestIp?: string) => {
    setIsDetectingNetwork(true);
    try {
      const normalizedRequestIp = normalizeIpAddress(requestIp);
      setServerDetectedIp(normalizedRequestIp);

      if (normalizedRequestIp && !isLoopbackIp(normalizedRequestIp)) {
        setCurrentDetectedIp(normalizedRequestIp);
        return;
      }

      const browserPublicIp = await fetchBrowserPublicIp({ attempts: 1 });
      if (browserPublicIp?.ip) {
        setCurrentDetectedIp(browserPublicIp.ip);
        return;
      }

      setCurrentDetectedIp(normalizedRequestIp);
    } finally {
      setIsDetectingNetwork(false);
    }
  };

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [rulesRes, locsRes] = await Promise.all([
        fetch('/api/admin/company-rules'),
        fetch('/api/admin/office-locations'),
      ]);

      const rulesData = await rulesRes.json();
      const locsData = await locsRes.json();

      const fetchedRules = rulesData.rules || null;

      if (fetchedRules) setCompanyRules(fetchedRules);
      if (locsData.locations) setOfficeLocations(locsData.locations);

      setOriginalSnapshot(JSON.stringify(fetchedRules));
      await detectCurrentNetwork(rulesData.currentIp);
    } catch (err: any) {
      console.error('Failed to load configuration:', err);
      setErrorMsg('Failed to load rules from database');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!companyRules) return;

    setIsSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/admin/company-rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(companyRules),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to update company rules');
      }

      setCompanyRules(data.rules);
      setOriginalSnapshot(JSON.stringify(data.rules));
      setSuccessMsg('✨ Company policies saved successfully to database!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscardChanges = () => {
    if (originalSnapshot) {
      try {
        const original = JSON.parse(originalSnapshot);
        setCompanyRules(original);
        setSuccessMsg('↩️ Unsaved modifications discarded.');
        setTimeout(() => setSuccessMsg(''), 3000);
      } catch (e) {
        loadData();
      }
    }
  };

  const handleQuickAuthorizeNetwork = async () => {
    if (!currentDetectedIp) return;
    setIsAuthorizingNetwork(true);
    try {
      const currentAllowed = companyRules?.allowed_ips || [];
      const updatedAllowed = Array.from(new Set([...currentAllowed, currentDetectedIp]));
      const updatedRules = {
        ...companyRules,
        ip_restriction_enabled: true,
        allowed_ips: updatedAllowed,
      };

      setCompanyRules(updatedRules);

      const res = await fetch('/api/admin/company-rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedRules),
      });

      const data = await res.json();
      if (res.ok && !data.error) {
        setCompanyRules(data.rules);
        setOriginalSnapshot(JSON.stringify(data.rules));
        setSuccessMsg(`✅ Current WiFi IP (${currentDetectedIp}) authorized instantly!`);
      }
    } catch (err: any) {
      setErrorMsg('Failed to authorize network');
    } finally {
      setIsAuthorizingNetwork(false);
    }
  };


  const handleDeleteLocation = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/office-locations?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setOfficeLocations((prev) => prev.filter((loc) => loc.id !== id));
        setSuccessMsg('Office location removed successfully');
      }
    } catch (e) {
      setErrorMsg('Failed to delete location');
    }
  };

  const handleSaveLocation = async (locData: { name: string; latitude: number; longitude: number }) => {
    try {
      const res = await fetch('/api/admin/office-locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedLocationToEdit?.id,
          name: locData.name,
          latitude: locData.latitude,
          longitude: locData.longitude,
          radius_meters: companyRules?.geofence_radius_meters || 200,
        }),
      });
      if (res.ok) {
        await loadData();
        setIsLocationPickerOpen(false);
        setSuccessMsg('Office location saved successfully');
      }
    } catch (e) {
      setErrorMsg('Failed to save office location');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" />
        <span className="text-xs font-semibold text-slate-500">Loading company policies...</span>
      </div>
    );
  }


  const wifiActive = Boolean(companyRules?.ip_restriction_enabled);
  const gpsActive = Boolean(companyRules?.gps_enabled);
  const deviceActive = companyRules?.single_device_policy_enabled !== false;

  const policyTabs = [
    { id: 'device' as RuleSectionKey, label: 'Single Device Policy', icon: Smartphone, active: deviceActive },
    { id: 'wifi' as RuleSectionKey, label: 'WiFi & IP Security', icon: Wifi, active: wifiActive },
    { id: 'gps' as RuleSectionKey, label: 'GPS Geofencing', icon: MapPin, active: gpsActive },
    { id: 'tardiness' as RuleSectionKey, label: 'Tardiness Rules', icon: ShieldAlert },
    { id: 'leave_payroll' as RuleSectionKey, label: 'Leave & Payroll Quotas', icon: Calendar },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Top Floating Feedback Banners */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button type="button" onClick={() => setSuccessMsg('')} className="text-emerald-700 dark:text-emerald-300 hover:opacity-75">✕</button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button type="button" onClick={() => setErrorMsg('')} className="text-rose-700 dark:text-rose-300 hover:opacity-75">✕</button>
        </div>
      )}

      {/* Top Tab Bar Pills (Horizontal, Clean, Zero Double Sidebar) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {policyTabs.map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeSection === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 scale-102'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              {tab.active && !isSelected && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              )}
            </button>
          );
        })}
      </div>

      {/* Unsaved Changes Banner */}
      {isDirty && (
        <div className="p-4 rounded-3xl bg-blue-600 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-blue-200 shrink-0" />
            <div>
              <p className="text-xs font-extrabold">You have unsaved policy changes</p>
              <p className="text-[11px] text-blue-100">
                Save your modifications to update live company security rules in database.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDiscardChanges}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Discard
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              isLoading={isSaving}
              onClick={() => handleSave()}
              className="bg-white text-blue-900 hover:bg-blue-50 font-bold text-xs shadow-sm"
            >
              <Save className="w-3.5 h-3.5 mr-1.5" /> Save Changes
            </Button>
          </div>
        </div>
      )}

      {/* Main Full-Width Configuration Panel */}
      <form onSubmit={handleSave} className="space-y-6">
        {activeSection === 'device' && (
          <SingleDeviceSection
            companyRules={companyRules}
            onChangeRules={setCompanyRules}
          />
        )}

        {activeSection === 'wifi' && (
          <WifiSecuritySection
            companyRules={companyRules}
            currentDetectedIp={currentDetectedIp}
            serverDetectedIp={serverDetectedIp}
            isDetectingNetwork={isDetectingNetwork}
            isAuthorizingNetwork={isAuthorizingNetwork}
            onDetectNetwork={detectCurrentNetwork}
            onAuthorizeCurrentNetwork={handleQuickAuthorizeNetwork}
            onChangeRules={setCompanyRules}
          />
        )}

        {activeSection === 'gps' && (
          <GpsGeofencingSection
            companyRules={companyRules}
            officeLocations={officeLocations}
            onOpenMapPicker={(loc?: any) => {
              setSelectedLocationToEdit(loc || null);
              setIsLocationPickerOpen(true);
            }}
            onDeleteLocation={handleDeleteLocation}
            onChangeRules={setCompanyRules}
          />
        )}

        {activeSection === 'tardiness' && (
          <TardinessPenaltySection
            companyRules={companyRules}
            onChangeRules={setCompanyRules}
          />
        )}

        {activeSection === 'leave_payroll' && (
          <LeavePayrollSection
            companyRules={companyRules}
            onChangeRules={setCompanyRules}
          />
        )}

        {/* Bottom Sticky Action Bar */}
        <div className="sticky bottom-4 z-20 flex items-center justify-between p-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {isDirty ? (
              <span className="text-amber-500 font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Unsaved modifications
              </span>
            ) : (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> All rules saved and active
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {isDirty && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleDiscardChanges}
                disabled={isSaving}
                className="text-xs"
              >
                Discard
              </Button>
            )}
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSaving}
              disabled={!isDirty}
              className="font-bold text-xs shadow-md shadow-blue-500/20"
            >
              <Save className="w-3.5 h-3.5 mr-1.5" /> Save Rules to Database
            </Button>
          </div>
        </div>
      </form>

      {/* Office Location Picker Modal */}
      <LocationPickerModal
        isOpen={isLocationPickerOpen}
        onClose={() => setIsLocationPickerOpen(false)}
        onSelectLocation={handleSaveLocation}
        initialLocation={selectedLocationToEdit}
        radiusMeters={companyRules?.geofence_radius_meters || 200}
      />
    </div>
  );
};

