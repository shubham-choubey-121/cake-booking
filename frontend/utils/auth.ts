export type UserRole = 'Admin' | 'Manager' | 'User';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

let accessTokenMemory = '';

export const setAccessToken = (token: string) => {
  accessTokenMemory = token;
};

export const getAccessToken = () => accessTokenMemory;

export const clearAccessToken = () => {
  accessTokenMemory = '';
};

const USER_KEY = 'cake_booking_user';

export const saveUser = (user: AuthUser) => {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const getUser = (): AuthUser | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = localStorage.getItem(USER_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
};

export const clearUser = () => {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.removeItem(USER_KEY);
};

export const clearSession = () => {
  clearAccessToken();
  clearUser();
};
