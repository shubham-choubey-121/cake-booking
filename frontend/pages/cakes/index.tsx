import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import api from '../../utils/api';
import { getUser } from '../../utils/auth';
import { ROUTES } from '../../utils/routes';

type Cake = {
  _id: string;
  name: string;
  description: string;
  imageURL: string;
  price: number;
  stock: number;
  available: boolean;
};

export default function CakesPage() {
  const router = useRouter();
  const [cakes, setCakes] = useState<Cake[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchCakes = async () => {
    try {
      const res = await api.get('/cakes');
      setCakes(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load cakes');
    }
  };

  useEffect(() => {
    const user = getUser();
    if (!user) {
      router.push(ROUTES.login);
      return;
    }
    fetchCakes();
  }, [router]);

  const bookCake = async (cakeId: string) => {
    setError('');
    setMessage('');
    try {
      await api.post('/bookings', { cakeId, paymentType: 'COD' });
      setMessage('Booking placed with COD');
      fetchCakes();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Booking failed');
    }
  };

  return (
    <main className="page">
      <header className="topbar">
        <h1>Cake Catalog</h1>
        <div className="links">
          <button onClick={() => router.push(ROUTES.dashboard)}>Dashboard</button>
          <button onClick={() => router.push(ROUTES.admin)}>Admin Panel</button>
        </div>
      </header>

      {message && <p className="ok">{message}</p>}
      {error && <p className="err">{error}</p>}

      <section className="grid">
        {cakes.map((cake) => (
          <article className="card" key={cake._id}>
            <img src={cake.imageURL} alt={cake.name} />
            <h3>{cake.name}</h3>
            <p>{cake.description}</p>
            <p>Price: Rs {cake.price}</p>
            <p>Stock: {cake.stock}</p>
            <button disabled={!cake.available} onClick={() => bookCake(cake._id)}>
              {cake.available ? 'Book with COD' : 'Out of stock'}
            </button>
          </article>
        ))}
      </section>
    </main>
  );
}
