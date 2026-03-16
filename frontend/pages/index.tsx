import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import api from '../utils/api';
import { getApiErrorMessage } from '../utils/errors';
import { ROUTES } from '../utils/routes';
import { getUser } from '../utils/auth';

type Cake = {
  _id: string;
  name: string;
  description: string;
  imageURL: string;
  price: number;
  stock: number;
  available: boolean;
  category?: string;
};

export default function HomePage() {
  const router = useRouter();
  const user = useMemo(() => getUser(), []);
  const [cakes, setCakes] = useState<Cake[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    api
      .get('/cakes')
      .then((res) => setCakes(res.data))
      .catch((e: unknown) => setError(getApiErrorMessage(e, 'Failed to load catalog')))
      .finally(() => setLoading(false));
  }, []);

  const bookCake = async (cakeId: string) => {
    if (!user) {
      router.push(ROUTES.login);
      return;
    }
    if (user.role !== 'User') {
      setError('Only User accounts can book cakes.');
      return;
    }
    setError('');
    setMessage('');
    try {
      await api.post('/bookings', { cakeId, paymentType: 'COD' });
      setMessage('🎉 Booking placed successfully!');
      setCakes((prev) =>
        prev.map((c) =>
          c._id === cakeId
            ? { ...c, stock: Math.max(c.stock - 1, 0), available: c.stock - 1 > 0 }
            : c
        )
      );
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, 'Booking failed'));
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q
      ? cakes.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.description.toLowerCase().includes(q)
        )
      : cakes;
  }, [cakes, search]);

  return (
    <>
      {/* ── Hero ── */}
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-badge">🎂 Fresh · COD · Same Day</div>
          <h1 className="hero-headline">
            Celebrate Every Moment<br />with Fresh Cakes
          </h1>
          <p className="hero-sub">
            Hand‑crafted cakes for birthdays, weddings, and every occasion in
            between. Browse our catalog, place a COD booking in seconds.
          </p>
          <div className="hero-actions">
            <a href="#catalog" className="btn-hero-primary">
              Browse Cakes ↓
            </a>
            {!user ? (
              <Link href={ROUTES.signup} className="btn-hero-outline">
                Get Started Free
              </Link>
            ) : (
              <Link href={ROUTES.cakes} className="btn-hero-outline">
                Open Full Catalog
              </Link>
            )}
          </div>
          <div className="hero-chips">
            <span>✓ Cash on Delivery</span>
            <span>✓ Role‑based Access</span>
            <span>✓ Cloud Images</span>
          </div>
        </div>
      </section>

      {/* ── Catalog ── */}
      <section className="catalog-section" id="catalog">
        <div className="catalog-header">
          <h2>Our Cakes</h2>
          <p className="muted">
            {user
              ? `Welcome back, ${user.email} · ${user.role}`
              : 'Browse freely — login required to place a booking.'}
          </p>
        </div>

        <div className="catalog-controls">
          <input
            className="search-bar"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍  Search by name or description…"
          />
        </div>

        {message && <div className="toast-ok">{message}</div>}
        {error && <div className="toast-err">{error}</div>}

        {loading && (
          <div className="loader-row">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="cake-skeleton" />
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && !error && (
          <div className="empty-state">
            <span>🍰</span>
            <p>No cakes found</p>
          </div>
        )}

        <div className="cakes-grid">
          {!loading &&
            filtered.map((cake) => (
              <article className="cake-card" key={cake._id}>
                <div className="cake-card-image">
                  <Image
                    src={cake.imageURL}
                    alt={cake.name}
                    fill
                    sizes="(max-width: 680px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="cake-img"
                  />
                  {!cake.available && (
                    <span className="badge-sold">Sold Out</span>
                  )}
                  {cake.available && cake.stock > 0 && cake.stock <= 3 && (
                    <span className="badge-low">Only {cake.stock} left!</span>
                  )}
                </div>
                <div className="cake-card-body">
                  {cake.category && (
                    <span className="cake-category">{cake.category}</span>
                  )}
                  <h3 className="cake-name">{cake.name}</h3>
                  <p className="cake-desc">{cake.description}</p>
                  <div className="cake-footer">
                    <span className="cake-price">Rs {cake.price}</span>
                    <button
                      className={`btn-book${!cake.available ? ' btn-disabled' : ''}`}
                      disabled={!cake.available}
                      onClick={() => bookCake(cake._id)}
                    >
                      {!cake.available
                        ? 'Sold Out'
                        : !user
                        ? '🔒 Login to Book'
                        : user.role !== 'User'
                        ? 'Unavailable'
                        : 'Book · COD'}
                    </button>
                  </div>
                </div>
              </article>
            ))}
        </div>
      </section>
    </>
  );
}

