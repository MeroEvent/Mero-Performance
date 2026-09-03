'use client';

import React, { useState, useEffect } from 'react';
import { Download, X, Share2, PlusSquare, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const PwaInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIos, setIsIos] = useState<boolean>(false);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [showIosGuide, setShowIosGuide] = useState<boolean>(false);

  useEffect(() => {
    // Check if already running in standalone mode (fullscreen native PWA)
    const isStandaloneMode = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    setIsStandalone(isStandaloneMode);
    if (isStandaloneMode) return;

    // Detect iOS devices (iPhone / iPad)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    // Check if dismissed previously in session
    const isDismissed = sessionStorage.getItem('pwa_prompt_dismissed');
    if (isDismissed) return;

    // Android / Chrome PWA install prompt handler
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsOpen(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // On iOS Safari, show prompt after 2 seconds if not standalone
    if (isIosDevice && !isStandaloneMode) {
      const timer = setTimeout(() => setIsOpen(true), 2500);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsOpen(false);
      }
      setDeferredPrompt(null);
    } else if (isIos) {
      setShowIosGuide(true);
    }
  };

  const handleDismiss = () => {
    setIsOpen(false);
    setShowIosGuide(false);
    sessionStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  if (isStandalone || !isOpen) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 md:hidden animate-fade-in">
      <div className="bg-slate-900/95 text-white backdrop-blur-xl border border-slate-700/80 rounded-3xl p-4 shadow-2xl space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white text-slate-900 flex items-center justify-center font-bold shadow-xs shrink-0">
              <Sparkles className="w-5 h-5 text-slate-900" />
            </div>
            <div>
              <p className="text-xs font-black">Install Mero Mobile App</p>
              <p className="text-[11px] text-slate-400">
                Fullscreen native app mode with zero browser bars
              </p>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="text-slate-400 hover:text-white p-1 rounded-full cursor-pointer"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {showIosGuide ? (
          <div className="p-3 bg-slate-800/80 rounded-2xl text-[11px] text-slate-300 space-y-1.5 border border-slate-700">
            <p className="font-bold text-white flex items-center gap-1.5">
              <Share2 className="w-3.5 h-3.5 text-blue-400" /> In Safari browser:
            </p>
            <p>1. Tap the <strong>Share</strong> button at bottom.</p>
            <p className="flex items-center gap-1">
              2. Tap <PlusSquare className="w-3.5 h-3.5 text-emerald-400 inline" /> <strong>"Add to Home Screen"</strong>.
            </p>
            <p>3. Tap <strong>Add</strong> to launch in full screen!</p>
          </div>
        ) : (
          <div className="flex items-center gap-2 pt-1">
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleInstallClick}
              className="w-full text-xs font-bold gap-1.5 py-2 shadow-md"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isIos ? 'How to Add to Home Screen' : 'Install App'}</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
