import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import api from '../../utils/api';
import { getApiErrorMessage } from '../../utils/errors';
import { ROUTES } from '../../utils/routes';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      await api.post('/auth/signup', { email, password });
      setMessage('Signup successful. Redirecting to login...');
      setTimeout(() => router.push(ROUTES.login), 900);
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, 'Signup failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page-centered">
      <div className="auth-box">
        <h1>Create account 🎂</h1>
        <p className="muted">Join CakeBook and choose your workspace role.</p>

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
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        {message && <p className="ok">{message}</p>}
        {error && <p className="err">{error}</p>}

        <p className="hint">
          Already registered? <Link href={ROUTES.login}>Sign in</Link>
        </p>
      </div>
    </main>
  );
}
