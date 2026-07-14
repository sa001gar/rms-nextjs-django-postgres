'use client';

import { Loader2 } from 'lucide-react';

interface SplashScreenProps {
  role?: 'admin' | 'teacher' | 'student';
  message?: string;
}

const roleConfig = {
  admin: { gradient: 'from-amber-500 to-orange-600', label: 'Admin' },
  teacher: { gradient: 'from-blue-500 to-cyan-600', label: 'Teacher' },
  student: { gradient: 'from-green-500 to-emerald-600', label: 'Student' },
};

export function SplashScreen({ role, message = 'Loading...' }: SplashScreenProps) {
  const config = role ? roleConfig[role] : null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-6">
        <div className={`h-16 w-16 rounded-2xl bg-gradient-to-br ${config?.gradient || 'from-amber-500 to-orange-600'} flex items-center justify-center shadow-lg`}>
          <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center">
            <Loader2 className="h-5 w-5 text-white animate-spin" />
          </div>
        </div>
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900">Result Management System</h1>
          {config && <p className="text-sm font-medium text-gray-500 mt-1">{config.label} Portal</p>}
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <div className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <p className="text-sm text-gray-400 animate-pulse">{message}</p>
      </div>
    </div>
  );
}
