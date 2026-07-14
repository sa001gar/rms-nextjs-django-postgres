'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, useIsHydrated } from '@/stores/auth-store';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { SplashScreen } from '@/components/ui/splash-screen';
import {
  LayoutDashboard, Calendar, GraduationCap, BookOpen, Users, ClipboardList,
  UserCheck, GitBranch, Settings2, ClipboardCheck, ScrollText, CalendarDays,
  BarChart3, Shield, FileSearch,
} from 'lucide-react';

const navItems = [
  { title: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { section: 'Academic', items: [
    { title: 'Sessions', href: '/admin/sessions', icon: Calendar },
    { title: 'Classes', href: '/admin/classes', icon: GraduationCap },
    { title: 'Subjects', href: '/admin/subjects', icon: BookOpen },
  ]},
  { section: 'Students', items: [
    { title: 'Students', href: '/admin/students', icon: Users },
    { title: 'Enrollments', href: '/admin/enrollments', icon: ClipboardList },
  ]},
  { section: 'Teachers', items: [
    { title: 'Teachers', href: '/admin/teachers', icon: UserCheck },
    { title: 'Assignments', href: '/admin/assignments', icon: GitBranch },
  ]},
  { section: 'Results', items: [
    { title: 'Result Config', href: '/admin/result-config', icon: Settings2 },
    { title: 'Marks Entry', href: '/admin/marks-entry', icon: ClipboardCheck },
    { title: 'Results', href: '/admin/results', icon: ScrollText },
  ]},
  { title: 'Attendance', href: '/admin/attendance', icon: CalendarDays },
  { title: 'Reports', href: '/admin/reports', icon: BarChart3 },
  { title: 'Users', href: '/admin/users', icon: Shield },
  { title: 'Audit Logs', href: '/admin/audit', icon: FileSearch },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const isHydrated = useIsHydrated();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (!isHydrated) return;
    if (!isAuthenticated || user?.role !== 'admin') {
      setRedirecting(true);
      router.replace('/login/admin');
    }
  }, [isHydrated, isAuthenticated, user, router]);

  if (!isHydrated || redirecting) return <SplashScreen role="admin" message="Verifying session..." />;

  if (!isAuthenticated || user?.role !== 'admin') return <SplashScreen role="admin" message="Redirecting..." />;

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar items={navItems as any} title="Admin" color="from-amber-500 to-orange-600" />
      <div className="lg:ml-64">
        <div className="lg:hidden h-16" />
        <Header />
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
