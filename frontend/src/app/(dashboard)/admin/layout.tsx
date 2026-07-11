'use client';

import { redirect } from 'next/navigation';
import { useAuthStore, useIsHydrated } from '@/stores/auth-store';
import { clearTokens } from '@/lib/api/client';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { Loading } from '@/components/ui/loading';
import {
  LayoutDashboard,
  Calendar,
  GraduationCap,
  BookOpen,
  Layers,
  ClipboardList,
  FileText,
  Award,
  BarChart3,
  Shield,
  UserCheck,
  Users,
  ClipboardCheck,
  TrendingUp,
  ScrollText,
  GitBranch,
  UserPlus,
  FileSearch,
} from 'lucide-react';

const navItems = [
  { title: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { title: 'Sessions', href: '/admin/sessions', icon: Calendar },
  { title: 'Classes & Sections', href: '/admin/classes', icon: GraduationCap },
  { title: 'Subjects', href: '/admin/subjects', icon: BookOpen },
  { title: 'Subject Categories', href: '/admin/subject-categories', icon: Layers },
  { title: 'Enrollments', href: '/admin/enrollments', icon: ClipboardList },
  { title: 'Terms & Exams', href: '/admin/exams', icon: FileText },
  { title: 'Assessment Schemes', href: '/admin/assessment-schemes', icon: BarChart3 },
  { title: 'Marks Entry', href: '/admin/marks-entry', icon: ClipboardCheck },
  { title: 'Term Attendance', href: '/admin/attendance', icon: Calendar },
  { title: 'Grading', href: '/admin/grading', icon: Award },
  { title: 'Promotion Rules', href: '/admin/promotion-rules', icon: TrendingUp },
  { title: 'Generate Results', href: '/admin/results', icon: ScrollText },
  { title: 'Report Card Templates', href: '/admin/report-templates', icon: FileText },
  { title: 'Teachers & Assignments', href: '/admin/assignments', icon: UserCheck },
  { title: 'Users', href: '/admin/users', icon: Shield },
  { title: 'Audit Logs', href: '/admin/audit', icon: FileSearch },
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
