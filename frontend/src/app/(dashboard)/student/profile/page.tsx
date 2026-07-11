'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { studentPortalApi } from '@/lib/api/student-portal';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import {
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Shield,
  GraduationCap,
  Key,
  Loader2,
} from 'lucide-react';
import { BoneyardProfile, BoneyardTable } from '@/components/ui/boneyard';

interface StudentProfile {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  date_of_birth?: string;
  gender?: string;
  address?: string;
  parent_name?: string;
  parent_phone?: string;
  enrollment_number?: string;
  created_at: string;
  updated_at: string;
}

interface EnrollmentHistory {
  id: string;
  session: string;
  class_name: string;
  section: string;
  status: string;
  enrollment_date: string;
}

export default function StudentProfilePage() {
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const {
    data: profile,
    isLoading: profileLoading,
    error: profileError,
  } = useQuery<StudentProfile>({
    queryKey: ['student-profile'],
    queryFn: studentPortalApi.getProfile,
    staleTime: 5 * 60 * 1000,
  });

  const { data: enrollmentHistory = [], isLoading: enrollmentLoading } = useQuery<
    EnrollmentHistory[]
  >({
    queryKey: ['student-enrollment-history'],
    queryFn: studentPortalApi.getEnrollmentHistory,
    staleTime: 5 * 60 * 1000,
  });

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All fields are required.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setIsChangingPassword(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/auth/change-password/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('access_token')}`,
          },
          body: JSON.stringify({
            current_password: currentPassword,
            new_password: newPassword,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({ message: 'Failed to change password' }));
        throw new Error(data.detail || data.message || 'Failed to change password');
      }

      setPasswordSuccess('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess('');
      }, 1500);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
    setPasswordSuccess('');
  };

  if (profileLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="My Profile" description="Loading profile..." />
        <BoneyardProfile />
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="space-y-6">
        <PageHeader title="My Profile" description="View and manage your profile" />
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-red-500">
              Failed to load profile. Please try again later.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Profile"
        description="View and manage your profile"
        actions={
          <Button onClick={() => setShowPasswordModal(true)}>
            <Key className="h-4 w-4" />
            Change Password
          </Button>
        }
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-amber-600" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Full Name" value={`${profile?.first_name || ''} ${profile?.last_name || ''}`} />
            <InfoRow label="Student ID" value={profile?.enrollment_number || profile?.id || '-'} />
            <InfoRow label="Date of Birth" value={profile?.date_of_birth ? formatDate(profile.date_of_birth) : '-'} />
            <InfoRow
              label="Email"
              value={profile?.email || '-'}
              icon={<Mail className="h-4 w-4 text-gray-400" />}
            />
            <InfoRow
              label="Phone"
              value={profile?.phone || '-'}
              icon={<Phone className="h-4 w-4 text-gray-400" />}
            />
            {profile?.gender && (
              <InfoRow label="Gender" value={profile.gender} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-amber-600" />
              Parent / Guardian Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Parent Name" value={profile?.parent_name || '-'} />
            <InfoRow
              label="Parent Phone"
              value={profile?.parent_phone || '-'}
              icon={<Phone className="h-4 w-4 text-gray-400" />}
            />
            <InfoRow label="Guardian Name" value={profile?.parent_name || '-'} />
            <InfoRow label="Guardian Relation" value="Parent/Guardian" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-amber-600" />
              Address
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700">
              {profile?.address || 'No address on file'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-amber-600" />
              Admission Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow
              label="Admission Date"
              value={profile?.created_at ? formatDate(profile.created_at) : '-'}
            />
            <InfoRow label="Enrollment Number" value={profile?.enrollment_number || '-'} />
            <InfoRow label="Account Created" value={profile?.created_at ? formatDate(profile.created_at) : '-'} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-amber-600" />
            Enrollment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {enrollmentLoading ? (
            <div className="p-4">
              <BoneyardTable rows={3} cols={5} />
            </div>
          ) : enrollmentHistory.length === 0 ? (
            <p className="text-center text-gray-500 py-4">No enrollment history available.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Session
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Class
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Section
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Enrollment Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {enrollmentHistory.map((enrollment) => (
                    <tr key={enrollment.id}>
                      <td className="px-4 py-3 text-sm text-gray-900">{enrollment.session}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{enrollment.class_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{enrollment.section}</td>
                      <td className="px-4 py-3 text-sm">
                        <Badge variant={enrollment.status === 'active' ? 'success' : 'secondary'}>
                          {enrollment.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {formatDate(enrollment.enrollment_date)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={showPasswordModal}
        onClose={closePasswordModal}
        title="Change Password"
        description="Enter your current password and set a new one"
        size="md"
      >
        <form onSubmit={handleChangePassword} className="p-6 space-y-4">
          <Input
            label="Current Password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Enter current password"
          />
          <Input
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter new password"
          />
          <Input
            label="Confirm New Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
          />

          {passwordError && (
            <p className="text-sm text-red-600">{passwordError}</p>
          )}
          {passwordSuccess && (
            <p className="text-sm text-green-600">{passwordSuccess}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={closePasswordModal}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isChangingPassword}>
              Change Password
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function InfoRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-gray-500">{label}</span>
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-sm font-medium text-gray-900">{value}</span>
      </div>
    </div>
  );
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}
