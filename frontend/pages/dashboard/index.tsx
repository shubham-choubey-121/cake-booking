import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import api from '../../utils/api';
import { getUser } from '../../utils/auth';
import { ROUTES } from '../../utils/routes';

type Booking = {
  _id: string;
  status: string;
  paymentType: string;
  createdAt: string;
  userId: { email: string; role: string };
  cakeId: { name: string; price: number };
};

type TopCake = {
  cakeId: string;
  name: string;
  totalBookings: number;
};

export default function DashboardPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [topCakes, setTopCakes] = useState<TopCake[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const user = getUser();
    if (!user || (user.role !== 'Manager' && user.role !== 'Admin')) {
      router.push(ROUTES.login);
      return;
    }

    const load = async () => {
      try {
        const [bookingsRes, topCakesRes] = await Promise.all([
          api.get('/bookings'),
          api.get('/bookings/top-cakes'),
        ]);
        setBookings(bookingsRes.data);
        setTopCakes(topCakesRes.data);
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Failed to load dashboard data');
      }
    };

    load();
  }, [router]);

  const updateStatus = async (bookingId: string, status: 'Approved' | 'Cancelled') => {
    try {
      await api.patch(`/bookings/${bookingId}/status`, { status });
      const res = await api.get('/bookings');
      setBookings(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Status update failed');
    }
  };

  return (
    <main className="page">
      <header className="topbar">
        <h1>Manager/Admin Dashboard</h1>
        <button onClick={() => router.push(ROUTES.cakes)}>Back to Catalog</button>
      </header>

      {error && <p className="err">{error}</p>}

      <section className="panel">
        <h2>Top Booked Cakes</h2>
        {topCakes.map((cake) => (
          <p key={cake.cakeId}>
            {cake.name} - {cake.totalBookings} bookings
          </p>
        ))}
      </section>

      <section className="panel">
        <h2>Bookings</h2>
        {bookings.map((booking) => (
          <div className="booking-item" key={booking._id}>
            <p>
              {booking.userId?.email} booked {booking.cakeId?.name} ({booking.paymentType})
            </p>
            <p>Status: {booking.status}</p>
            <div className="links">
              <button onClick={() => updateStatus(booking._id, 'Approved')}>Approve</button>
              <button onClick={() => updateStatus(booking._id, 'Cancelled')}>Cancel</button>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
