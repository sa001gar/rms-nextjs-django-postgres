'use client';

import { redirect } from 'next/navigation';
import { useAuthStore, useIsHydrated } from '@/stores/auth-store';
import { clearTokens } from '@/lib/api/client';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { Loading } from '@/components/ui/loading';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  GraduationCap,
  BookOpen,
  Calendar,
  FileText,
  Award,
  ClipboardList,
  TrendingUp,
  BarChart3,
  Shield,
  UserPlus,
} from 'lucide-react';

const navItems = [
  { title: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { title: 'Sessions', href: '/admin/sessions', icon: Calendar },
  { title: 'Classes', href: '/admin/classes', icon: GraduationCap },
  { title: 'Subjects', href: '/admin/subjects', icon: BookOpen },
  { title: 'Teachers', href: '/admin/teachers', icon: UserCheck },
  { title: 'Students', href: '/admin/students', icon: Users },
  { title: 'Enrollments', href: '/admin/enrollments', icon: ClipboardList },
  { title: 'Attendance', href: '/admin/attendance', icon: BookOpen },
  { title: 'Assessments', href: '/admin/assessments', icon: FileText },
  { title: 'Grading', href: '/admin/grading', icon: Award },
  { title: 'Assignments', href: '/admin/assignments', icon: UserPlus },
  { title: 'Publications', href: '/admin/publications', icon: TrendingUp },
  { title: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { title: 'Users', href: '/admin/users', icon: Shield },
  { title: 'Audit Logs', href: '/admin/audit', icon: FileText },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuthStore();
  const isHydrated = useIsHydrated();

  if (!isHydrated) {
    return <Loading message="Verifying session..." />;
  }

  if (!isAuthenticated || user?.role !== 'admin') {
    redirect('/login/admin');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar items={navItems} title="Admin" color="from-amber-500 to-orange-600" />
      <div className="lg:ml-64">
        <div className="lg:hidden h-16" />
        <Header />
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
