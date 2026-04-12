import PocketBase from 'pocketbase';

const PB_URL = import.meta.env.PUBLIC_PB_URL || 'https://8qj9xau0f6ama5b.591p.pocketbasecloud.com';

export const pb = new PocketBase(PB_URL);

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  created: string;
  licenseKey?: string;
  licenseTier?: 'free' | 'pro';
  verified: boolean;
}

export function getCurrentUser(): User | null {
  try {
    if (pb.authStore.isValid) {
      return pb.authStore.model as unknown as User;
    }
  } catch {
    // ignore
  }
  return null;
}

export function isLoggedIn(): boolean {
  return pb.authStore.isValid;
}
