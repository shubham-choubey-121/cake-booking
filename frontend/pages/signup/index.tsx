import { FormEvent, useState } from 'react';
import { useRouter } from 'next/router';
import api from '../../utils/api';
import { ROUTES } from '../../utils/routes';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('User');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      await api.post('/auth/signup', { email, password, role });
      setMessage('Signup successful. Redirecting to login...');
      setTimeout(() => router.push(ROUTES.login), 900);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page center-bg">
      <div className="card auth-card">
        <h1>Signup</h1>
        <p>Create your account and select role.</p>
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
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="User">User</option>
            <option value="Manager">Manager</option>
            <option value="Admin">Admin</option>
          </select>
          <button disabled={loading} type="submit">
            {loading ? 'Creating account...' : 'Signup'}
          </button>
        </form>
        {message && <p className="ok">{message}</p>}
        {error && <p className="err">{error}</p>}
      </div>
    </main>
  );
}
