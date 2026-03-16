import axios from 'axios';
import { clearAccessToken, clearUser, getAccessToken, setAccessToken } from './auth';

const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL,
  withCredentials: true,
});

let isRefreshing = false;
let waiters: Array<(token: string | null) => void> = [];

const resolveWaiters = (token: string | null) => {
  waiters.forEach((cb) => cb(token));
  waiters = [];
};

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          waiters.push((token) => {
            if (!token) {
              reject(error);
              return;
            }
            original.headers.Authorization = `Bearer ${token}`;
            resolve(api(original));
          });
        });
      }

      isRefreshing = true;
      try {
        const refreshRes = await axios.post(
          `${baseURL}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        const newToken = refreshRes.data.accessToken as string;
        setAccessToken(newToken);
        resolveWaiters(newToken);
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch (refreshErr) {
        resolveWaiters(null);
        clearAccessToken();
        clearUser();
        throw refreshErr;
      } finally {
        isRefreshing = false;
      }
    }

    throw error;
  }
);

export default api;
