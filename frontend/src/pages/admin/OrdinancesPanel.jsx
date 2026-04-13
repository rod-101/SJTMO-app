import React, { useState, useEffect, useRef } from 'react';
import { getOrdinances, uploadOrdinance, deleteOrdinance } from '../../services/api';
import '../../App.css';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export default function OrdinancesPanel() {
  const [ordinances, setOrdinances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const showMsg = (msg, isError = false) => {
    if (isError) setError(msg); else setMessage(msg);
    setTimeout(() => { setMessage(''); setError(''); }, 3500);
  };

  const fetchOrdinances = async () => {
    setLoading(true);
    try {
      const data = await getOrdinances();
      setOrdinances(data);
    } catch (err) {
      showMsg('Failed to load ordinances', true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrdinances(); }, []);

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f && f.type !== 'application/pdf') {
      showMsg('Only PDF files are allowed', true);
      fileInputRef.current.value = '';
      return;
    }
    setFile(f || null);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!title.trim()) { showMsg('Title is required', true); return; }
    if (!file) { showMsg('Please select a PDF file', true); return; }

    const formData = new FormData();
    formData.append('title', title.trim());
    formData.append('file', file);

    setUploading(true);
    setError('');
    try {
      await uploadOrdinance(formData);
      showMsg('Ordinance uploaded successfully!');
      setTitle('');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setShowForm(false);
      fetchOrdinances();
    } catch (err) {
      showMsg(err.message || 'Upload failed', true);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id, titleName) => {
    if (!window.confirm(`Delete ordinance "${titleName}"?`)) return;
    try {
      await deleteOrdinance(id);
      showMsg('Ordinance deleted');
      fetchOrdinances();
    } catch (err) {
      showMsg('Failed to delete ordinance', true);
    }
  };

  return (
    <div>
      {message && <div className="alert alert-success">✅ {message}</div>}
      {error && <div className="alert alert-error">⚠️ {error}</div>}

      {/* Header */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showForm ? 20 : 0 }}>
          <div>
            <div className="card-title" style={{ marginBottom: 2 }}>📌 Ordinances</div>
            <div style={{ fontSize: '0.8rem', color: '#999' }}>
              Upload and manage traffic ordinance PDF files
            </div>
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => { setShowForm(!showForm); setError(''); }}
          >
            {showForm ? '✕ Cancel' : '⬆️ Upload Ordinance'}
          </button>
        </div>

        {/* Upload Form */}
        {showForm && (
          <form onSubmit={handleUpload} style={{ borderTop: '1px solid #e0e0e0', paddingTop: 16 }}>
            <div className="form-group">
              <label className="form-label">Ordinance Title *</label>
              <input
                className="form-input"
                placeholder="e.g. Traffic Code of San Jose - Section 12"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            {/* Drop Zone */}
            <div
              className="upload-zone"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="upload-zone-icon">{file ? '📄' : '📁'}</div>
              <div className="upload-zone-text">
                {file
                  ? <><strong style={{ color: '#140c7e' }}>{file.name}</strong><br /><span>{(file.size / 1024).toFixed(1)} KB</span></>
                  : <>Click to select a <strong>PDF file</strong><br /><span>Max 10 MB</span></>
                }
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-accent" type="submit" disabled={uploading || !title.trim() || !file}>
                {uploading ? '⏳ Uploading...' : '⬆️ Upload'}
              </button>
              {file && (
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                >
                  Remove File
                </button>
              )}
            </div>
          </form>
        )}
      </div>

      {/* Ordinances List */}
      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: 30, color: '#999' }}>Loading ordinances...</div>
        ) : ordinances.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📂</div>
            <div className="empty-state-text">No ordinances uploaded yet</div>
            <div style={{ marginTop: 12 }}>
              <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>
                Upload First Ordinance
              </button>
            </div>
          </div>
        ) : (
          ordinances.map((o) => (
            <div key={o.id} className="ordinance-item">
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 42,
                  height: 42,
                  background: 'linear-gradient(135deg, #140c7e, #2c2197)',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.3rem',
                  flexShrink: 0,
                }}>
                  📄
                </div>
                <div className="ordinance-info">
                  <div className="ordinance-title">{o.title}</div>
                  <div className="ordinance-meta">
                    {o.original_name} · Uploaded {new Date(o.upload_date).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <a
                  href={`${BASE_URL}/uploads/${o.filename}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-primary btn-sm"
                  download={o.original_name}
                >
                  ⬇️ Download
                </a>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDelete(o.id, o.title)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
