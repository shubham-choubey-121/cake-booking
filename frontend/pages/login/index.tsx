import { FormEvent, useState } from 'react';
import { useRouter } from 'next/router';
import api from '../../utils/api';
import { saveUser, setAccessToken } from '../../utils/auth';
import { ROUTES } from '../../utils/routes';

export default function LoginPage() {
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
      const res = await api.post('/auth/login', { email, password });
      setAccessToken(res.data.accessToken);
      saveUser(res.data.user);
      setMessage('Login successful');
      router.push(ROUTES.cakes);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page center-bg">
      <div className="card auth-card">
        <h1>Login</h1>
        <p>Sign in to book cakes with COD.</p>
        <form onSubmit={onSubmit}>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="Email"
            required
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="Password"
            required
          />
          <button disabled={loading} type="submit">
            {loading ? 'Signing in...' : 'Login'}
          </button>
        </form>
        {message && <p className="ok">{message}</p>}
        {error && <p className="err">{error}</p>}
      </div>
    </main>
  );
}
