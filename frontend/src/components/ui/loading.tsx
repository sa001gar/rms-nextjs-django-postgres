import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-8 w-8' };

export function Spinner({ size = 'md', className }: SpinnerProps) {
  return <Loader2 className={cn('animate-spin text-amber-600', sizeClasses[size], className)} />;
}

export function Loading({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col gap-4 p-8 w-full max-w-md mx-auto">
      <div className="flex items-center gap-4 mb-4">
        <div className="h-8 w-8 rounded-full bg-amber-200 animate-pulse" />
        <div className="h-6 w-32 rounded bg-gray-200 animate-pulse" />
      </div>
      <div className="space-y-3">
        <div className="h-4 w-full rounded bg-gray-200 animate-pulse" />
        <div className="h-4 w-5/6 rounded bg-gray-200 animate-pulse" />
        <div className="h-4 w-4/6 rounded bg-gray-200 animate-pulse" />
      </div>
      <p className="text-sm text-gray-500 mt-4 text-center animate-pulse">{message}</p>
    </div>
  );
}

export function PageLoading() {
  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-12">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-8 w-64 rounded bg-gray-200 animate-pulse" />
            <div className="h-4 w-48 rounded bg-gray-200 animate-pulse" />
          </div>
          <div className="h-10 w-32 rounded bg-gray-200 animate-pulse" />
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 rounded-xl bg-white border border-gray-100 shadow-sm p-6 flex flex-col justify-between">
              <div className="h-4 w-24 rounded bg-gray-200 animate-pulse" />
              <div className="h-8 w-16 rounded bg-gray-200 animate-pulse" />
            </div>
          ))}
        </div>

        <div className="h-96 rounded-xl bg-white border border-gray-100 shadow-sm p-6">
           <div className="h-6 w-48 rounded bg-gray-200 animate-pulse mb-6" />
           <div className="space-y-4">
             {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 w-full rounded bg-gray-100 animate-pulse" />
             ))}
           </div>
        </div>
      </div>
    </div>
  );
}
