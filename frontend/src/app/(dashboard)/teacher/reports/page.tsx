'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TeacherReportsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/teacher/marks');
  }, [router]);

  return null;
}
