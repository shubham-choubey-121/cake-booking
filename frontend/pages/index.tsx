import Link from 'next/link';
import { ROUTES } from '../utils/routes';

export default function HomePage() {
  return (
    <main className="page center-bg">
      <div className="card auth-card">
        <h1>Cake Booking App</h1>
        <p>Mini platform for Users, Admin, and Manager workflows.</p>
        <div className="links">
          <Link href={ROUTES.login}>Login</Link>
          <Link href={ROUTES.signup}>Signup</Link>
          <Link href={ROUTES.cakes}>Catalog</Link>
        </div>
      </div>
    </main>
  );
}
