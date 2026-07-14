'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TeacherStudentsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/teacher/marks');
  }, [router]);

  return null;
}
