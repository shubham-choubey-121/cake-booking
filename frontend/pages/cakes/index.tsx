import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import api from '../../utils/api';
import { getUser } from '../../utils/auth';
import { getApiErrorMessage } from '../../utils/errors';
import { ROUTES } from '../../utils/routes';

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

export default function CakesPage() {
  const router = useRouter();
  const user = useMemo(() => getUser(), []);
  const [cakes, setCakes] = useState<Cake[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stockOnly, setStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'priceLow' | 'priceHigh' | 'name'>('newest');

  const fetchCakes = async () => {
    setLoading(true);
    try {
      const res = await api.get('/cakes');
      setCakes(res.data);
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, 'Failed to load cakes'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCakes();
  }, []);

  const visibleCakes = useMemo(() => {
    const lowered = search.trim().toLowerCase();
    let result = cakes.filter((cake) => {
      const nameMatch = cake.name.toLowerCase().includes(lowered);
      const descriptionMatch = cake.description.toLowerCase().includes(lowered);
      const stockMatch = stockOnly ? cake.available && cake.stock > 0 : true;
      return (nameMatch || descriptionMatch) && stockMatch;
    });

    if (sortBy === 'priceLow') result = [...result].sort((a, b) => a.price - b.price);
    if (sortBy === 'priceHigh') result = [...result].sort((a, b) => b.price - a.price);
    if (sortBy === 'name') result = [...result].sort((a, b) => a.name.localeCompare(b.name));

    return result;
  }, [cakes, search, stockOnly, sortBy]);

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
      setMessage('🎉 Booking placed with COD!');
      setCakes((prev) =>
        prev.map((cake) =>
          cake._id === cakeId
            ? { ...cake, stock: Math.max(cake.stock - 1, 0), available: cake.stock - 1 > 0 }
            : cake
        )
      );
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, 'Booking failed'));
    }
  };

  return (
    <div className="inner-page">
      <div className="page-header">
        <h1>Cake Catalog</h1>
        <p className="muted">
          Browse, search and book fresh cakes. Cash on Delivery on all orders.
        </p>
      </div>

      <div className="controls-bar">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍  Search by name or description…"
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
        >
          <option value="newest">Sort: Newest</option>
          <option value="priceLow">Price: Low → High</option>
          <option value="priceHigh">Price: High → Low</option>
          <option value="name">Name A–Z</option>
        </select>
        <label className="check-row">
          <input
            type="checkbox"
            checked={stockOnly}
            onChange={(e) => setStockOnly(e.target.checked)}
          />
          In stock only
        </label>
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

      {!loading && visibleCakes.length === 0 && (
        <div className="empty-state">
          <span>🍰</span>
          <p>No cakes match your search or filters.</p>
        </div>
      )}

      <div className="cakes-grid">
        {!loading &&
          visibleCakes.map((cake) => (
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
                      ? 'Only users can book'
                      : 'Book · COD'}
                  </button>
                </div>
              </div>
            </article>
          ))}
      </div>
    </div>
  );
}

