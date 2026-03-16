import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import api from '../../utils/api';
import { getApiErrorMessage } from '../../utils/errors';
import { saveUser, setAccessToken } from '../../utils/auth';
import { ROUTES } from '../../utils/routes';

export default function LoginPage() {
  const router = useRouter();
  const oauthBase = useMemo(() => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000', []);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!router.isReady) {
      return;
    }

    const oauthState = router.query.oauth;
    if (!oauthState) {
      return;
    }

    if (oauthState === 'error') {
      const oauthError = typeof router.query.message === 'string' ? decodeURIComponent(router.query.message) : 'OAuth login failed';
      setError(oauthError);
      return;
    }

    if (oauthState === 'success') {
      const token = typeof router.query.accessToken === 'string' ? router.query.accessToken : '';
      const encodedUser = typeof router.query.user === 'string' ? router.query.user : '';

      if (!token || !encodedUser) {
        setError('OAuth login payload is incomplete');
        return;
      }

      try {
        const normalized = encodedUser.replace(/-/g, '+').replace(/_/g, '/');
        const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
        const user = JSON.parse(atob(padded));
        setAccessToken(token);
        saveUser(user);
        setMessage('OAuth login successful');
        router.replace(ROUTES.cakes);
      } catch {
        setError('Failed to parse OAuth response');
      }
    }
  }, [router]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const res = await api.post('/auth/login', { email, password });
      setAccessToken(res.data.accessToken);
      saveUser(res.data.user);
      setMessage('Login successful');
      router.push(ROUTES.cakes);
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page-centered">
      <div className="auth-box">
        <h1>Welcome back 👋</h1>
        <p className="muted">Sign in to browse and book fresh cakes.</p>

        <form className="auth-form" onSubmit={onSubmit}>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="Email address"
            required
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="Password"
            required
          />
          <button className="btn-submit" disabled={loading} type="submit">
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div className="auth-divider">or continue with</div>

        <div className="oauth-actions">
          <a className="oauth-btn" href={`${oauthBase}/auth/oauth/google`}>
            🔵&nbsp; Continue with Google
          </a>
          <a className="oauth-btn" href={`${oauthBase}/auth/oauth/github`}>
            ⚫&nbsp; Continue with GitHub
          </a>
        </div>

        {message && <p className="ok">{message}</p>}
        {error && <p className="err">{error}</p>}

        <p className="hint">
          New here? <Link href={ROUTES.signup}>Create an account</Link>
        </p>
      </div>
    </main>
  );
}
