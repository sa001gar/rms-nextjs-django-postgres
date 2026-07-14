'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, useIsHydrated } from '@/stores/auth-store';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { SplashScreen } from '@/components/ui/splash-screen';
import { LayoutDashboard, FileText, Award, User } from 'lucide-react';

const navItems = [
  { title: 'Dashboard', href: '/student', icon: LayoutDashboard },
  { title: 'My Results', href: '/student/results', icon: FileText },
  { title: 'Report Card', href: '/student/report-card', icon: Award },
  { title: 'Profile', href: '/student/profile', icon: User },
];

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { student, isAuthenticated } = useAuthStore();
  const isHydrated = useIsHydrated();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (!isHydrated) return;
    if (!isAuthenticated && !student) {
      setRedirecting(true);
      router.replace('/login/student');
    }
  }, [isHydrated, isAuthenticated, student, router]);

  if (!isHydrated || redirecting) return <SplashScreen role="student" message="Verifying session..." />;

  if (!isAuthenticated && !student) return <SplashScreen role="student" message="Redirecting..." />;

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar items={navItems} title="Student" color="from-green-500 to-emerald-600" />
      <div className="lg:ml-64">
        <div className="lg:hidden h-16" />
        <Header />
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
