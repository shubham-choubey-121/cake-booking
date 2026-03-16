import { FormEvent, useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import api from '../../utils/api';
import { AuthUser, clearSession, getUser } from '../../utils/auth';
import { getApiErrorMessage } from '../../utils/errors';
import { ROUTES } from '../../utils/routes';

type MyBooking = {
  _id: string;
  status: 'Booked' | 'Approved' | 'Cancelled';
  paymentType: 'COD';
  createdAt: string;
  cakeId: {
    name: string;
    price: number;
    imageURL: string;
  };
};

const STATUS_CLASS: Record<MyBooking['status'], string> = {
  Booked: 'status-booked',
  Approved: 'status-approved',
  Cancelled: 'status-cancelled',
};

export default function ProfilePage() {
  const router = useRouter();
  const [userInfo, setUserInfo] = useState<AuthUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const [bookings, setBookings] = useState<MyBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdMsg, setPwdMsg] = useState('');
  const [pwdErr, setPwdErr] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  useEffect(() => {
    const load = async () => {
      setHydrated(true);
      const user = getUser();
      if (!user) {
        router.replace(ROUTES.login);
        return;
      }

      setUserInfo(user);
      setLoading(true);
      setError('');

      try {
        const res = await api.get('/bookings/mine');
        setBookings(res.data);
      } catch (err: unknown) {
        setError(getApiErrorMessage(err, 'Failed to load your bookings'));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router]);

  const doLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Keep UX smooth even if API logout fails.
    } finally {
      clearSession();
      router.push(ROUTES.login);
    }
  };

  const onChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPwdMsg('');
    setPwdErr('');

    if (newPassword !== confirmPassword) {
      setPwdErr('Passwords do not match');
      return;
    }

    setUpdatingPassword(true);
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      setPwdMsg('Password updated! Please sign in again.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => { clearSession(); router.push(ROUTES.login); }, 1500);
    } catch (err: unknown) {
      setPwdErr(getApiErrorMessage(err, 'Failed to change password'));
    } finally {
      setUpdatingPassword(false);
    }
  };

  if (!hydrated || !userInfo) return null;

  const approved  = bookings.filter((b) => b.status === 'Approved').length;
  const pending   = bookings.filter((b) => b.status === 'Booked').length;
  const cancelled = bookings.filter((b) => b.status === 'Cancelled').length;

  return (
    <div className="inner-page">

      {/* ── Profile header ── */}
      <div className="profile-header">
        <div className="profile-avatar">{userInfo.email[0].toUpperCase()}</div>
        <div>
          <h1 style={{ fontSize: '1.3rem', marginBottom: 4 }}>{userInfo.email}</h1>
          <span className={`role-badge role-${userInfo.role.toLowerCase()}`}>{userInfo.role}</span>
        </div>
        <button className="btn-secondary" style={{ marginLeft: 'auto' }} onClick={doLogout}>
          Logout
        </button>
      </div>

      {/* ── Stats ── */}
      <div className="profile-stats">
        <div className="pstat-card">
          <span className="pstat-num">{bookings.length}</span>
          <span className="pstat-label">Total</span>
        </div>
        <div className="pstat-card pstat-ok">
          <span className="pstat-num">{approved}</span>
          <span className="pstat-label">Approved</span>
        </div>
        <div className="pstat-card pstat-warn">
          <span className="pstat-num">{pending}</span>
          <span className="pstat-label">Pending</span>
        </div>
        <div className="pstat-card pstat-err">
          <span className="pstat-num">{cancelled}</span>
          <span className="pstat-label">Cancelled</span>
        </div>
      </div>

      {/* ── My Bookings ── */}
      <div className="panel">
        <h2>My Bookings</h2>
        {error && <p className="err">{error}</p>}
        {loading && (
          <div style={{ display: 'grid', gap: 10 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="cake-skeleton" style={{ height: 68 }} />
            ))}
          </div>
        )}
        {!loading && bookings.length === 0 && !error && (
          <div className="empty-state" style={{ padding: '36px 0' }}>
            <span>📦</span>
            <p>No bookings yet &mdash; <a href={ROUTES.cakes}>browse cakes →</a></p>
          </div>
        )}
        <div className="booking-list">
          {bookings.map((booking) => (
            <div className="booking-row" key={booking._id}>
              <div className="booking-row-img">
                {booking.cakeId?.imageURL ? (
                  <Image
                    src={booking.cakeId.imageURL}
                    alt={booking.cakeId.name}
                    width={56}
                    height={56}
                    style={{ borderRadius: 10, objectFit: 'cover' }}
                  />
                ) : (
                  <div className="booking-row-img-placeholder">🎂</div>
                )}
              </div>
              <div className="booking-row-info">
                <strong className="booking-cake-name">{booking.cakeId?.name ?? '—'}</strong>
                <span className="muted">Rs {booking.cakeId?.price ?? '—'} · {booking.paymentType}</span>
                <span className="muted">
                  {new Date(booking.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
              <span className={`status-pill ${STATUS_CLASS[booking.status]}`}>{booking.status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Change Password ── */}
      <div className="panel">
        <h2>Change Password</h2>
        <form className="auth-form" style={{ maxWidth: 400 }} onSubmit={onChangePassword}>
          <input
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            type="password"
            minLength={6}
            placeholder="Current password"
            required
          />
          <input
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            type="password"
            minLength={6}
            placeholder="New password"
            required
          />
          <input
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            type="password"
            minLength={6}
            placeholder="Confirm new password"
            required
          />
          <button className="btn-submit" disabled={updatingPassword} type="submit">
            {updatingPassword ? 'Updating…' : 'Update Password'}
          </button>
        </form>
        {pwdMsg && <p className="ok" style={{ marginTop: 10 }}>{pwdMsg}</p>}
        {pwdErr && <p className="err" style={{ marginTop: 10 }}>{pwdErr}</p>}
      </div>

    </div>
  );
}
