import { FormEvent, useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import api from '../../utils/api';
import { clearSession, getUser } from '../../utils/auth';
import { getApiErrorMessage } from '../../utils/errors';
import { ROUTES } from '../../utils/routes';

type Cake = {
  _id: string;
  name: string;
  description: string;
  category?: string;
  price: number;
  stock: number;
  available: boolean;
  imageURL: string;
};

type PendingManager = {
  _id: string;
  email: string;
  role: 'Manager';
  isApproved: boolean;
  createdAt: string;
};

export default function AdminPage() {
  const router = useRouter();

  // Upload form
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  // Cake list
  const [cakes, setCakes] = useState<Cake[]>([]);
  const [listError, setListError] = useState('');

  // Edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('General');
  const [editPrice, setEditPrice] = useState('');
  const [editStock, setEditStock] = useState('');
  const [editMsg, setEditMsg] = useState('');
  const [editErr, setEditErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Manager form
  const [managerEmail, setManagerEmail] = useState('manager@cake.com');
  const [managerPassword, setManagerPassword] = useState('manager123');
  const [managerMsg, setManagerMsg] = useState('');
  const [managerErr, setManagerErr] = useState('');
  const [creatingManager, setCreatingManager] = useState(false);
  const [pendingManagers, setPendingManagers] = useState<PendingManager[]>([]);
  const [pendingErr, setPendingErr] = useState('');
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const fetchCakes = async () => {
    try {
      const res = await api.get('/cakes');
      setCakes(res.data);
    } catch (err: unknown) {
      setListError(getApiErrorMessage(err, 'Failed to load cakes'));
    }
  };

  const fetchPendingManagers = async () => {
    setPendingErr('');
    try {
      const res = await api.get('/auth/admin/pending-managers');
      setPendingManagers(res.data);
    } catch (err: unknown) {
      setPendingErr(getApiErrorMessage(err, 'Failed to load pending managers'));
    }
  };

  useEffect(() => {
    const user = getUser();
    if (!user || user.role !== 'Admin') {
      router.push(ROUTES.login);
      return;
    }
    fetchCakes();
    fetchPendingManagers();
  }, [router]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setProgress(0);

    if (!image) {
      setError('Please select an image');
      return;
    }

    const data = new FormData();
    data.append('name', name);
    data.append('description', description);
    data.append('category', category);
    data.append('price', price);
    data.append('stock', stock);
    data.append('image', image);

    setUploading(true);
    try {
      await api.post('/cakes', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (evt) => {
          const percent = evt.total ? Math.round((evt.loaded * 100) / evt.total) : 0;
          setProgress(percent);
        },
      });
      setMessage('Cake uploaded successfully');
      setName('');
      setDescription('');
      setCategory('General');
      setPrice('');
      setStock('');
      setImage(null);
      setProgress(0);
      fetchCakes();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Upload failed'));
    } finally {
      setUploading(false);
    }
  };

  const startEdit = (cake: Cake) => {
    setEditId(cake._id);
    setEditName(cake.name);
    setEditDescription(cake.description);
    setEditCategory(cake.category || 'General');
    setEditPrice(String(cake.price));
    setEditStock(String(cake.stock));
    setEditMsg('');
    setEditErr('');
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditMsg('');
    setEditErr('');
  };

  const saveEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editId) return;
    setSaving(true);
    setEditMsg('');
    setEditErr('');
    try {
      await api.put(`/cakes/${editId}`, {
        name: editName,
        description: editDescription,
        category: editCategory,
        price: Number(editPrice),
        stock: Number(editStock),
      });
      setEditMsg('Cake updated');
      setEditId(null);
      fetchCakes();
    } catch (err: unknown) {
      setEditErr(getApiErrorMessage(err, 'Update failed'));
    } finally {
      setSaving(false);
    }
  };

  const deleteCake = async (id: string) => {
    if (!confirm('Delete this cake? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      await api.delete(`/cakes/${id}`);
      fetchCakes();
    } catch (err: unknown) {
      setListError(getApiErrorMessage(err, 'Delete failed'));
    } finally {
      setDeletingId(null);
    }
  };

  const createManager = async (e: FormEvent) => {
    e.preventDefault();
    setManagerMsg('');
    setManagerErr('');
    setCreatingManager(true);
    try {
      await api.post('/auth/admin/create-manager', {
        email: managerEmail,
        password: managerPassword,
      });
      setManagerMsg('Manager created and approved successfully');
      fetchPendingManagers();
    } catch (err: unknown) {
      setManagerErr(getApiErrorMessage(err, 'Failed to create manager'));
    } finally {
      setCreatingManager(false);
    }
  };

  const approveManager = async (id: string) => {
    setApprovingId(id);
    setPendingErr('');
    try {
      await api.patch(`/auth/admin/managers/${id}/approve`);
      setPendingManagers((prev) => prev.filter((manager) => manager._id !== id));
    } catch (err: unknown) {
      setPendingErr(getApiErrorMessage(err, 'Failed to approve manager'));
    } finally {
      setApprovingId(null);
    }
  };

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

  return (
    <main className="page">
      <header className="topbar" style={{ marginBottom: 20 }}>
        <h1>Admin Panel</h1>
        <div className="links">
          <button className="btn-secondary" onClick={() => router.push(ROUTES.cakes)}>Catalog</button>
          <button className="btn-secondary" onClick={() => router.push(ROUTES.dashboard)}>Dashboard</button>
          <button className="btn-secondary" onClick={doLogout}>Logout</button>
        </div>
      </header>

      <div className="admin-panel">
        {/* Upload new cake */}
        <section className="admin-section card">
          <h2>Upload New Cake</h2>
          <p className="muted">Publish a new item to the catalog.</p>

          <form onSubmit={onSubmit} className="admin-form">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Cake name" required />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description"
              required
            />
            <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category (e.g. Birthday, Wedding)" required />
            <div className="row">
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                type="number"
                min={0}
                placeholder="Price (Rs)"
                required
              />
              <input
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                type="number"
                min={0}
                placeholder="Stock qty"
                required
              />
            </div>
            <input type="file" accept="image/*" onChange={(e) => setImage(e.target.files?.[0] || null)} required />
            <button disabled={uploading} type="submit">{uploading ? `Uploading… ${progress}%` : 'Upload Cake'}</button>
          </form>

          {message && <p className="ok">{message}</p>}
          {error && <p className="err">{error}</p>}
        </section>

        {/* Create Manager */}
        <section className="admin-section card">
          <h2>Create Manager Account</h2>
          <p className="muted">Create a manager who can review and update booking statuses.</p>
          <form onSubmit={createManager} className="admin-form">
            <input
              value={managerEmail}
              onChange={(e) => setManagerEmail(e.target.value)}
              placeholder="Manager Email"
              type="email"
              required
            />
            <input
              value={managerPassword}
              onChange={(e) => setManagerPassword(e.target.value)}
              placeholder="Password"
              type="password"
              minLength={6}
              required
            />
            <button disabled={creatingManager} type="submit">
              {creatingManager ? 'Creating manager...' : 'Create Manager'}
            </button>
          </form>
          {managerMsg && <p className="ok">{managerMsg}</p>}
          {managerErr && <p className="err">{managerErr}</p>}
          <div className="hint">Default admin: admin@cake.com / admin123</div>
        </section>
      </div>

      <section className="panel" style={{ marginTop: 20 }}>
        <h2>Pending Manager Approvals</h2>
        {pendingErr && <p className="err">{pendingErr}</p>}
        {pendingManagers.length === 0 && <p className="muted">No pending manager requests.</p>}
        {pendingManagers.map((manager) => (
          <div key={manager._id} className="booking-item">
            <p>{manager.email}</p>
            <p className="muted">Requested on {new Date(manager.createdAt).toLocaleString()}</p>
            <button onClick={() => approveManager(manager._id)} disabled={approvingId === manager._id}>
              {approvingId === manager._id ? 'Approving...' : 'Approve Manager'}
            </button>
          </div>
        ))}
      </section>

      {/* Cake list with edit / delete */}
      <section className="panel" style={{ marginTop: 28 }}>
        <h2>All Cakes</h2>
        {listError && <p className="err">{listError}</p>}
        {cakes.length === 0 && <p className="muted">No cakes uploaded yet.</p>}

        <div className="grid" style={{ marginTop: 12 }}>
          {cakes.map((cake) => (
            <article className="card" key={cake._id}>
              {editId === cake._id ? (
                <form onSubmit={saveEdit} className="admin-form">
                  <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Cake name" required />
                  <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Description" required />
                  <input value={editCategory} onChange={(e) => setEditCategory(e.target.value)} placeholder="Category" required />
                  <div className="row">
                    <input value={editPrice} onChange={(e) => setEditPrice(e.target.value)} type="number" min={0} placeholder="Price (Rs)" required />
                    <input value={editStock} onChange={(e) => setEditStock(e.target.value)} type="number" min={0} placeholder="Stock qty" required />
                  </div>
                  {editMsg && <p className="ok">{editMsg}</p>}
                  {editErr && <p className="err">{editErr}</p>}
                  <div className="row">
                    <button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
                    <button type="button" className="btn-secondary" onClick={cancelEdit}>Cancel</button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="cake-image-wrap">
                    <Image
                      src={cake.imageURL}
                      alt={cake.name}
                      fill
                      sizes="(max-width: 680px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="cake-image"
                    />
                  </div>
                  <h3 style={{ margin: '10px 0 4px' }}>{cake.name}</h3>
                  <p className="muted" style={{ fontSize: 13, margin: '0 0 6px' }}>{cake.description}</p>
                  <p style={{ margin: '0 0 4px' }}>Rs {cake.price} &nbsp;·&nbsp; Stock: {cake.stock}</p>
                  <p className="muted" style={{ margin: '0 0 4px', fontSize: 13 }}>Category: {cake.category || 'General'}</p>
                  <span className={`status-pill ${cake.available ? 'status-approved' : 'status-cancelled'}`} style={{ marginBottom: 10, display: 'inline-flex' }}>
                    {cake.available ? 'Available' : 'Out of stock'}
                  </span>
                  <div className="row" style={{ marginTop: 8 }}>
                    <button onClick={() => startEdit(cake)}>Edit</button>
                    <button
                      className="btn-danger"
                      onClick={() => deleteCake(cake._id)}
                      disabled={deletingId === cake._id}
                    >
                      {deletingId === cake._id ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                </>
              )}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
