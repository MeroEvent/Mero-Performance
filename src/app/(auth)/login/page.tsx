'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/auth-context';
import { Button } from '@/components/ui/button';
import { Lock, Mail, ArrowRight, AlertCircle, Shield, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { user, profile, isLoading: authLoading, signIn } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!authLoading && user && profile) {
      if (profile.role === 'admin') router.push('/admin');
      else if (profile.role === 'manager') router.push('/manager');
      else router.push('/employee');
    }
  }, [user, profile, authLoading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    const result = await signIn(email.trim(), password);

    if (result.error) {
      setIsLoading(false);
      setErrorMsg(result.error);
      return;
    }

    setIsLoading(false);
    router.refresh();
    router.push('/');
  };


  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <img
            src="/logo.svg"
            alt="Mero Performance Logo"
            className="w-16 h-16 object-contain mb-3"
          />
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Mero Performance</h1>
          <p className="text-xs text-slate-400 mt-1">Enterprise Workforce Performance & Attendance Management</p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-4 p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Sign In Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="admin@mero.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-12 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <Button type="submit" variant="primary" className="w-full py-3 mt-2 font-semibold shadow-lg shadow-blue-500/20" isLoading={isLoading}>
            Sign In to Dashboard <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </form>

        {/* Security Notice */}
        <div className="mt-8 pt-6 border-t border-slate-800 flex items-center justify-center gap-2 text-center text-xs text-slate-500">
          <Shield className="w-3.5 h-3.5 text-slate-500" />
          <span>Protected by Supabase Auth & Row Level Security</span>
        </div>
      </div>
    </div>
  );
}
