import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import api from '../../utils/api';
import { clearSession, getUser } from '../../utils/auth';
import { getApiErrorMessage } from '../../utils/errors';
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

type TopBuyer = {
  userId: string;
  email: string;
  totalBookings: number;
  totalSpend: number;
};

type TopOrderUser = {
  userId: string;
  email: string;
  totalOrderValue: number;
  totalOrders: number;
};

type CategorySale = {
  category: string;
  totalRevenue: number;
  totalItemsSold: number;
};

const statusClassMap: Record<string, string> = {
  Approved: 'status-approved',
  Cancelled: 'status-cancelled',
  Booked: 'status-booked',
};

export default function DashboardPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [topCakes, setTopCakes] = useState<TopCake[]>([]);
  const [topBuyers, setTopBuyers] = useState<TopBuyer[]>([]);
  const [topOrderUsers, setTopOrderUsers] = useState<TopOrderUser[]>([]);
  const [categorySales, setCategorySales] = useState<CategorySale[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'All' | 'Booked' | 'Approved' | 'Cancelled'>('All');

  const loadDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const [bookingsRes, topCakesRes, topBuyersRes, topOrderUsersRes, categorySalesRes] = await Promise.all([
        api.get('/bookings'),
        api.get('/bookings/top-cakes'),
        api.get('/bookings/top-buyers'),
        api.get('/orders/top-users'),
        api.get('/orders/category-sales'),
      ]);
      setBookings(bookingsRes.data);
      setTopCakes(topCakesRes.data);
      setTopBuyers(topBuyersRes.data);
      setTopOrderUsers(topOrderUsersRes.data);
      setCategorySales(categorySalesRes.data);
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, 'Failed to load dashboard data'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const user = getUser();
    if (!user || (user.role !== 'Manager' && user.role !== 'Admin')) {
      router.push(ROUTES.login);
      return;
    }
    loadDashboard();
  }, [router]);

  const visibleBookings = useMemo(() => {
    if (statusFilter === 'All') {
      return bookings;
    }
    return bookings.filter((booking) => booking.status === statusFilter);
  }, [bookings, statusFilter]);

  const bookingSummary = useMemo(() => {
    return bookings.reduce(
      (acc, item) => {
        acc.total += 1;
        if (item.status === 'Booked') acc.booked += 1;
        if (item.status === 'Approved') acc.approved += 1;
        if (item.status === 'Cancelled') acc.cancelled += 1;
        return acc;
      },
      { total: 0, booked: 0, approved: 0, cancelled: 0 }
    );
  }, [bookings]);

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

  const updateStatus = async (bookingId: string, status: 'Approved' | 'Cancelled') => {
    try {
      await api.patch(`/bookings/${bookingId}/status`, { status });
      loadDashboard();
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, 'Status update failed'));
    }
  };

  return (
    <main className="page">
      <header className="topbar">
        <div>
          <h1>Manager/Admin Dashboard</h1>
          <p className="muted">Review bookings, approve or cancel orders, and track best-selling cakes.</p>
        </div>
        <div className="links">
          <button className="btn-secondary" onClick={() => router.push(ROUTES.cakes)}>Catalog</button>
          <button className="btn-secondary" onClick={doLogout}>Logout</button>
        </div>
      </header>

      {error && <p className="err">{error}</p>}

      <section className="stats-row">
        <div className="stat-chip">Total: {bookingSummary.total}</div>
        <div className="stat-chip">Booked: {bookingSummary.booked}</div>
        <div className="stat-chip">Approved: {bookingSummary.approved}</div>
        <div className="stat-chip">Cancelled: {bookingSummary.cancelled}</div>
      </section>

      <section className="panel">
        <h2>Top Booked Cakes</h2>
        {loading && <p className="muted">Loading top cakes...</p>}
        {!loading && topCakes.length === 0 && <p className="muted">No booking data yet.</p>}
        {topCakes.map((cake) => (
          <p key={cake.cakeId}>
            {cake.name} - {cake.totalBookings} bookings
          </p>
        ))}
      </section>

      <section className="panel">
        <h2>Top Buyers (Top 5)</h2>
        {loading && <p className="muted">Loading top buyers...</p>}
        {!loading && topBuyers.length === 0 && <p className="muted">No buyer data yet.</p>}
        {topBuyers.map((buyer, index) => (
          <p key={buyer.userId}>
            #{index + 1} {buyer.email} - {buyer.totalBookings} bookings (Rs {buyer.totalSpend})
          </p>
        ))}
      </section>

      <section className="panel">
        <h2>Top Users by Order Value</h2>
        {loading && <p className="muted">Loading top users...</p>}
        {!loading && topOrderUsers.length === 0 && <p className="muted">No order data yet.</p>}
        {topOrderUsers.map((user, index) => (
          <p key={user.userId}>
            #{index + 1} {user.email} - Rs {user.totalOrderValue} ({user.totalOrders} orders)
          </p>
        ))}
      </section>

      <section className="panel">
        <h2>Category-wise Sales</h2>
        {loading && <p className="muted">Loading category sales...</p>}
        {!loading && categorySales.length === 0 && <p className="muted">No category sales data yet.</p>}
        {categorySales.map((item) => (
          <p key={item.category}>
            {item.category}: Rs {item.totalRevenue} ({item.totalItemsSold} items)
          </p>
        ))}
      </section>

      <section className="panel">
        <div className="topbar">
          <h2>Bookings</h2>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'All' | 'Booked' | 'Approved' | 'Cancelled')}>
            <option value="All">All statuses</option>
            <option value="Booked">Booked</option>
            <option value="Approved">Approved</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>

        {loading && <p className="muted">Loading bookings...</p>}
        {!loading && visibleBookings.length === 0 && <p className="muted">No bookings match this filter.</p>}

        {!loading && visibleBookings.map((booking) => (
          <div className="booking-item" key={booking._id}>
            <p>
              {booking.userId?.email} booked {booking.cakeId?.name} ({booking.paymentType})
            </p>
            <p>
              Status:{' '}
              <span className={`status-pill ${statusClassMap[booking.status] || 'status-booked'}`}>
                {booking.status}
              </span>
            </p>
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
