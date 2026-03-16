import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { getUser, clearSession, AuthUser } from '../utils/auth';
import { ROUTES } from '../utils/routes';
import api from '../utils/api';

export default function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);

  // Re-read localStorage after every client-side route change so that
  // the navbar reflects login/logout without a full page reload.
  useEffect(() => {
    const sync = () => setUser(getUser());
    const timerId = window.setTimeout(sync, 0);

    router.events.on('routeChangeComplete', sync);
    window.addEventListener('storage', sync);

    return () => {
      window.clearTimeout(timerId);
      router.events.off('routeChangeComplete', sync);
      window.removeEventListener('storage', sync);
    };
  }, [router.events]);

  const isActive = (path: string) =>
    router.pathname === path || router.pathname.startsWith(path + '/');

  const doLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // keep logout smooth even if API fails
    }
    clearSession();
    router.push(ROUTES.login);
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link href={ROUTES.home} className="navbar-brand">
          🎂 CakeBook
        </Link>

        <div className="navbar-links">
          <Link href={ROUTES.home} className={`nav-link${router.pathname === '/' ? ' active' : ''}`}>
            Home
          </Link>
          <Link href={ROUTES.cakes} className={`nav-link${isActive('/cakes') ? ' active' : ''}`}>
            Catalog
          </Link>
          {(user?.role === 'Manager' || user?.role === 'Admin') && (
            <Link href={ROUTES.dashboard} className={`nav-link${isActive('/dashboard') ? ' active' : ''}`}>
              Dashboard
            </Link>
          )}
          {user?.role === 'Admin' && (
            <Link href={ROUTES.admin} className={`nav-link${isActive('/admin') ? ' active' : ''}`}>
              Admin
            </Link>
          )}
          {user?.role === 'User' && (
            <Link href={ROUTES.profile} className={`nav-link${isActive('/profile') ? ' active' : ''}`}>
              My Bookings
            </Link>
          )}
        </div>

        <div className="navbar-actions">
          {!user ? (
            <>
              <Link href={ROUTES.login} className="btn-outline-sm">
                Login
              </Link>
              <Link href={ROUTES.signup} className="btn-primary-sm">
                Sign Up
              </Link>
            </>
          ) : (
            <>
              <span className="user-badge">
                {user.email.split('@')[0]} · {user.role}
              </span>
              <button className="btn-outline-sm" onClick={doLogout}>
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
