'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, UserPlus, Key, UserCheck, UserX, Loader2 } from 'lucide-react';
import api from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PageHeader } from '@/components/layout/page-header';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { BoneyardTable } from '@/components/ui/boneyard';

type RoleFilter = 'all' | 'admin' | 'teacher' | 'student';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'teacher' | 'student';
  is_active: boolean;
}

function generateRandomPassword(length = 12): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default function AdminUsersPage() {
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add Teacher Modal
  const [addTeacherOpen, setAddTeacherOpen] = useState(false);
  const [teacherForm, setTeacherForm] = useState({ name: '', email: '', password: '' });
  const [teacherSubmitting, setTeacherSubmitting] = useState(false);
  const [teacherError, setTeacherError] = useState<string | null>(null);

  // Reset Password Modal
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetResult, setResetResult] = useState<string | null>(null);

  // Confirm Dialog
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmUser, setConfirmUser] = useState<User | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    setError(null);
    try {
      const [teachersRes, studentsRes] = await Promise.all([
        api.get<{ results?: any[] } | any[]>('/identity/teachers/'),
        api.get<{ results?: any[] } | any[]>('/enrollments/students/'),
      ]);

      const teachersList = Array.isArray(teachersRes) ? teachersRes : (teachersRes.results || []);
      const studentsList = Array.isArray(studentsRes) ? studentsRes : (studentsRes.results || []);

      const teacherUsers: User[] = teachersList.map((t: any) => ({
        id: t.id,
        name: t.name || t.email,
        email: t.email,
        role: 'teacher' as const,
        is_active: t.is_active ?? true,
      }));

      const studentUsers: User[] = studentsList.map((s: any) => ({
        id: s.id,
        name: s.name,
        email: s.email || `${s.student_id}@school.local`,
        role: 'student' as const,
        is_active: s.is_active ?? true,
      }));

      setUsers([...teacherUsers, ...studentUsers]);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      const matchesSearch =
        !searchQuery ||
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesRole && matchesSearch;
    });
  }, [users, roleFilter, searchQuery]);

  const roleCounts = useMemo(() => {
    const counts = { all: users.length, admin: 0, teacher: 0, student: 0 };
    users.forEach((u) => {
      if (u.role in counts) counts[u.role as keyof typeof counts]++;
    });
    return counts;
  }, [users]);

  async function handleCreateTeacher() {
    setTeacherError(null);
    if (!teacherForm.name || !teacherForm.email || !teacherForm.password) {
      setTeacherError('All fields are required');
      return;
    }
    setTeacherSubmitting(true);
    try {
      await api.post('/identity/teachers/', {
        name: teacherForm.name,
        email: teacherForm.email,
        password: teacherForm.password,
      });
      setAddTeacherOpen(false);
      setTeacherForm({ name: '', email: '', password: '' });
      fetchUsers();
    } catch (err: any) {
      setTeacherError(err.message || 'Failed to create teacher');
    } finally {
      setTeacherSubmitting(false);
    }
  }

  function handleResetPasswordClick(user: User) {
    setResetUser(user);
    setNewPassword('');
    setResetResult(null);
    setResetModalOpen(true);
  }

  async function handleResetPassword() {
    if (!resetUser || !newPassword) return;
    setResetSubmitting(true);
    setResetResult(null);
    try {
      const res = await api.post<{ message: string; new_password?: string }>(
        `/identity/teachers/${resetUser.id}/reset-password/`,
        { new_password: newPassword }
      );
      setResetResult(res.new_password || newPassword);
    } catch (err: any) {
      setResetResult(null);
      setTeacherError(err.message || 'Failed to reset password');
    } finally {
      setResetSubmitting(false);
    }
  }

  function handleToggleActiveClick(user: User) {
    setConfirmUser(user);
    setConfirmOpen(true);
  }

  async function handleConfirmToggle() {
    if (!confirmUser) return;
    try {
      await api.patch(`/identity/teachers/${confirmUser.id}/`, {
        is_active: !confirmUser.is_active,
      });
      setUsers((prev) =>
        prev.map((u) =>
          u.id === confirmUser.id ? { ...u, is_active: !u.is_active } : u
        )
      );
    } catch (err: any) {
      setError(err.message || 'Failed to update user status');
    } finally {
      setConfirmOpen(false);
      setConfirmUser(null);
    }
  }

  const roleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'info' as const;
      case 'teacher': return 'default' as const;
      case 'student': return 'success' as const;
      default: return 'secondary' as const;
    }
  };

  const tabs: { key: RoleFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'admin', label: 'Admins' },
    { key: 'teacher', label: 'Teachers' },
    { key: 'student', label: 'Students' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        description="Manage teachers and students"
        actions={
          <Button onClick={() => setAddTeacherOpen(true)}>
            <UserPlus className="h-4 w-4" />
            Add Teacher
          </Button>
        }
      />

      {/* Role Filter Tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setRoleFilter(tab.key)}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              roleFilter === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            <span className="ml-1.5 text-xs text-gray-400">
              ({roleCounts[tab.key]})
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {error}
          <Button variant="ghost" size="sm" className="ml-2" onClick={() => setError(null)}>
            Dismiss
          </Button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="py-4">
          <BoneyardTable rows={5} cols={5} />
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 py-16">
          <UserX className="h-10 w-10 text-gray-300" />
          <p className="mt-2 text-sm text-gray-500">No users found</p>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell className="text-gray-500">{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={roleBadgeVariant(user.role)}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.is_active ? 'success' : 'danger'}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {user.role === 'teacher' && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Reset Password"
                          onClick={() => handleResetPasswordClick(user)}
                        >
                          <Key className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title={user.is_active ? 'Deactivate' : 'Activate'}
                        onClick={() => handleToggleActiveClick(user)}
                      >
                        {user.is_active ? (
                          <UserX className="h-4 w-4 text-red-500" />
                        ) : (
                          <UserCheck className="h-4 w-4 text-green-500" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add Teacher Modal */}
      <Modal
        isOpen={addTeacherOpen}
        onClose={() => {
          setAddTeacherOpen(false);
          setTeacherError(null);
        }}
        title="Add Teacher"
        description="Create a new teacher account"
      >
        <div className="space-y-4 p-4">
          {teacherError && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
              {teacherError}
            </div>
          )}
          <Input
            label="Name"
            value={teacherForm.name}
            onChange={(e) => setTeacherForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="John Doe"
          />
          <Input
            label="Email"
            type="email"
            value={teacherForm.email}
            onChange={(e) => setTeacherForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="john@school.com"
          />
          <div>
            <Input
              label="Password"
              type="text"
              value={teacherForm.password}
              onChange={(e) => setTeacherForm((f) => ({ ...f, password: e.target.value }))}
              placeholder="Enter password"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-1"
              onClick={() =>
                setTeacherForm((f) => ({ ...f, password: generateRandomPassword() }))
              }
            >
              Generate Random Password
            </Button>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setAddTeacherOpen(false);
                setTeacherError(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateTeacher} isLoading={teacherSubmitting}>
              Create Teacher
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title="Reset Password"
        description={resetUser ? `Resetting password for ${resetUser.name}` : undefined}
      >
        <div className="space-y-4 p-4">
          {resetUser && (
            <div className="rounded-md bg-gray-50 p-3 text-sm">
              <p className="font-medium">{resetUser.name}</p>
              <p className="text-gray-500">{resetUser.email}</p>
            </div>
          )}
          <Input
            label="New Password"
            type="text"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter new password"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setNewPassword(generateRandomPassword())}
          >
            Generate Random
          </Button>
          {resetResult && (
            <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">
              <p className="font-medium">New password set:</p>
              <code className="mt-1 block rounded bg-green-100 px-2 py-1 font-mono">
                {resetResult}
              </code>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setResetModalOpen(false)}>
              {resetResult ? 'Done' : 'Cancel'}
            </Button>
            {!resetResult && (
              <Button onClick={handleResetPassword} isLoading={resetSubmitting}>
                Confirm Reset
              </Button>
            )}
          </div>
        </div>
      </Modal>

      {/* Activate/Deactivate Confirm */}
      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => {
          setConfirmOpen(false);
          setConfirmUser(null);
        }}
        onConfirm={handleConfirmToggle}
        title={confirmUser?.is_active ? 'Deactivate User' : 'Activate User'}
        message={
          confirmUser
            ? `Are you sure you want to ${confirmUser.is_active ? 'deactivate' : 'activate'} ${confirmUser.name}?`
            : ''
        }
        confirmLabel={confirmUser?.is_active ? 'Deactivate' : 'Activate'}
        confirmVariant={confirmUser?.is_active ? 'destructive' : 'success'}
      />
    </div>
  );
}
