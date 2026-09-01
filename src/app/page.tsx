'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/auth-context';

export default function RootPage() {
  const router = useRouter();
  const { user, profile, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/login');
      } else if (profile) {
        if (profile.role === 'admin') {
          router.push('/admin');
        } else if (profile.role === 'manager') {
          router.push('/manager');
        } else {
          router.push('/employee');
        }
      }
    }
  }, [user, profile, isLoading, router]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
        <span className="text-sm font-semibold">Redirecting to portal...</span>
      </div>
    </div>
  );
}

