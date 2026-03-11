import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'contractor';
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

export const useAuthStore = create<AuthState>(() => ({
  user: {
    id: 'dev-owner-1',
    name: 'Tom Wilson',
    email: 'owner@dev.local',
    role: 'owner',
  },
  isAuthenticated: true,
}));

export function switchDevRole(role: 'owner' | 'contractor') {
  useAuthStore.setState({
    user: role === 'owner'
      ? { id: 'dev-owner-1', name: 'Tom Wilson', email: 'owner@dev.local', role: 'owner' }
      : { id: 'dev-contractor-1', name: 'Dev Contractor', email: 'contractor@dev.local', role: 'contractor' },
  });
}
