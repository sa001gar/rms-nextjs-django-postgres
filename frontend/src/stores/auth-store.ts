import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User, UserRole } from '@/types/auth';
import { authApi } from '@/lib/api/auth';
import { clearTokens, getAccessToken, setTokens } from '@/lib/api/client';

interface AuthState {
  user: User | null;
  teacher: { id: string; name: string; email: string } | null;
  admin: { id: string; name: string; email: string } | null;
  student: { id: string; name: string; student_id: string } | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isHydrated: boolean;
  error: string | null;
  role: UserRole | null;
  login: (email: string, password: string) => Promise<void>;
  studentLogin: (studentId: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchCurrentUser: () => Promise<void>;
  clearError: () => void;
  setHydrated: () => void;
  setAuth: (user: User, tokens: { access: string; refresh: string }) => void;
}

const initialState = {
  user: null,
  teacher: null,
  admin: null,
  student: null,
  isAuthenticated: false,
  isLoading: true,
  isHydrated: false,
  error: null,
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      ...initialState,
      get role(): UserRole | null {
        const { user, student } = get();
        if (student) return 'student';
        return user?.role || null;
      },
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.login(email, password);
          setTokens(response.access, response.refresh);
          set({
            user: response.user,
            teacher: response.teacher,
            admin: response.admin,
            student: null,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          document.cookie = `user_role=${response.user.role}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
        } catch (error) {
          set({ isLoading: false, error: error instanceof Error ? error.message : 'Login failed' });
          throw error;
        }
      },
      studentLogin: async (studentId: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.studentLogin(studentId, password);
          setTokens(response.access, response.refresh);
          set({
            user: null,
            teacher: null,
            admin: null,
            student: response.student,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          document.cookie = 'user_role=student; path=/; max-age=604800; SameSite=Lax';
        } catch (error) {
          set({ isLoading: false, error: error instanceof Error ? error.message : 'Login failed' });
          throw error;
        }
      },
      logout: async () => {
        try {
          await authApi.logout();
        } catch {
          // Ignore
        }
        clearTokens();
        set({ user: null, teacher: null, admin: null, student: null, isAuthenticated: false, isLoading: false, error: null });
      },
      fetchCurrentUser: async () => {
        const token = getAccessToken();
        if (!token) {
          set({ isLoading: false, isAuthenticated: false });
          return;
        }
        set({ isLoading: true });
        try {
          const response = await authApi.getCurrentUser();
          set({
            user: response.user,
            teacher: response.teacher,
            admin: response.admin,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch {
          clearTokens();
          set({ user: null, teacher: null, admin: null, student: null, isAuthenticated: false, isLoading: false });
        }
      },
      clearError: () => set({ error: null }),
      setHydrated: () => set({ isHydrated: true, isLoading: false }),
      setAuth: (user: User, tokens: { access: string; refresh: string }) => {
        setTokens(tokens.access, tokens.refresh);
        set({
          user,
          teacher: user.role === 'teacher' ? { id: user.id, name: user.name || '', email: user.email } : null,
          admin: user.role === 'admin' ? { id: user.id, name: user.name || '', email: user.email } : null,
          student: null,
          isAuthenticated: true,
          isLoading: false,
          isHydrated: true,
          error: null,
        });
      },
    }),
    {
      name: 'rms-auth-storage',
      storage: createJSONStorage(() => {
        if (typeof window !== 'undefined') return localStorage;
        return { getItem: () => null, setItem: () => {}, removeItem: () => {} };
      }),
      partialize: (state) => ({
        user: state.user,
        teacher: state.teacher,
        admin: state.admin,
        student: state.student,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (!error) {
          useAuthStore.setState({ isHydrated: true, isLoading: false });
        }
        setTimeout(() => {
          const s = useAuthStore.getState();
          if (!s.isHydrated) useAuthStore.setState({ isHydrated: true, isLoading: false });
        }, 3000);
      },
    }
  )
);

export const useUser = () => useAuthStore((s) => s.user);
export const useTeacher = () => useAuthStore((s) => s.teacher);
export const useAdmin = () => useAuthStore((s) => s.admin);
export const useStudent = () => useAuthStore((s) => s.student);
export const useIsAuthenticated = () => useAuthStore((s) => s.isAuthenticated);
export const useIsHydrated = () => useAuthStore((s) => s.isHydrated);
export const useUserRole = () =>
  useAuthStore((s) => {
    if (s.student) return 'student';
    return s.user?.role || null;
  });
