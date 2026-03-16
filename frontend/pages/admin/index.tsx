import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import api from '../../utils/api';
import { getUser } from '../../utils/auth';
import { ROUTES } from '../../utils/routes';

export default function AdminPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(0);
  const [stock, setStock] = useState(0);
  const [image, setImage] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const user = getUser();
    if (!user || user.role !== 'Admin') {
      router.push(ROUTES.login);
    }
  }, [router]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const [managerEmail, setManagerEmail] = useState('manager@cake.com');
    const [managerPassword, setManagerPassword] = useState('manager123');
    const [managerMsg, setManagerMsg] = useState('');
    const [managerErr, setManagerErr] = useState('');
    setError('');
    setMessage('');
    setProgress(0);

    if (!image) {
      setError('Please select an image');
      return;
    }
    const createManager = async (e: FormEvent) => {
      e.preventDefault();
      setManagerMsg('');
      setManagerErr('');
      try {
        await api.post('/auth/signup', {
          email: managerEmail,
          password: managerPassword,
          role: 'Manager',
        });
        setManagerMsg('Manager created successfully');
      } catch (err: any) {
        setManagerErr(err?.response?.data?.message || 'Failed to create manager');
      }
    };

    const data = new FormData();
    data.append('name', name);
    data.append('description', description);
    data.append('price', String(price));
    data.append('stock', String(stock));
    data.append('image', image);

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
      setPrice(0);
      setStock(0);
      setImage(null);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Upload failed');
    }
  };

  return (
    <main className="page center-bg">
      <div className="card admin-card">
        <h1>Admin Panel</h1>
        <p>Upload cakes to Cloudinary and publish catalog items.</p>
        <form onSubmit={onSubmit}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Cake name" required />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            required
      <main className="page admin-bg">
        <div className="admin-panel">
          <section className="admin-section">
            <h1>Admin Panel</h1>
            <p>Upload cakes to Cloudinary and publish catalog items.</p>
            <form onSubmit={onSubmit} className="admin-form">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Cake name" required />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description"
                required
              />
              <div className="row">
                <input
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  type="number"
                  min={0}
                  placeholder="Price"
                  required
                />
                <input
                  value={stock}
                  onChange={(e) => setStock(Number(e.target.value))}
                  type="number"
                  min={0}
                  placeholder="Stock"
                  required
                />
              </div>
              <input type="file" accept="image/*" onChange={(e) => setImage(e.target.files?.[0] || null)} required />
              <button type="submit">Upload Cake</button>
            </form>
            {progress > 0 && <p>Upload Progress: {progress}%</p>}
            {message && <p className="ok">{message}</p>}
            {error && <p className="err">{error}</p>}
          </section>
          <section className="admin-section">
            <h2>Create Manager Account</h2>
            <form onSubmit={createManager} className="admin-form">
              <div className="row">
                <input value={managerEmail} onChange={e => setManagerEmail(e.target.value)} placeholder="Manager Email" required />
                <input value={managerPassword} onChange={e => setManagerPassword(e.target.value)} placeholder="Password" type="password" required />
              </div>
              <button type="submit">Create Manager</button>
            </form>
            {managerMsg && <p className="ok">{managerMsg}</p>}
            {managerErr && <p className="err">{managerErr}</p>}
            <div className="hint">Default: manager@cake.com / manager123</div>
          </section>
        </div>
      </main>
