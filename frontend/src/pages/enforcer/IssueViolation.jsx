import React, { useState, useEffect } from 'react';
import { createViolation, getViolationTypes } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import '../../App.css';

export default function IssueViolation({ onSuccess }) {
  const { user } = useAuth();
  const [types, setTypes] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [form, setForm] = useState({ motorist_name: '', notes: '' });
  const [gps, setGps] = useState({ lat: null, lng: null, status: 'idle' });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getViolationTypes()
      .then((data) => setTypes(data))
      .catch(() => {
        setTypes([
          { id: 1, name: 'No Helmet' },
          { id: 2, name: 'Illegal Parking' },
          { id: 3, name: 'No License' },
          { id: 4, name: 'Reckless Driving' },
          { id: 5, name: 'Beating Red Light' },
          { id: 6, name: 'Obstruction' },
        ]);
      });
  }, []);

  const toggleType = (name) => {
    setSelectedTypes((prev) =>
      prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name]
    );
  };

  const getGPS = () => {
    if (!navigator.geolocation) {
      setGps({ lat: 14.5995 + (Math.random() - 0.5) * 0.02, lng: 120.9842 + (Math.random() - 0.5) * 0.02, status: 'mocked' });
      return;
    }
    setGps((prev) => ({ ...prev, status: 'loading' }));
    navigator.geolocation.getCurrentPosition(
      (pos) => setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude, status: 'ok' }),
      () => setGps({ lat: 14.5995 + (Math.random() - 0.5) * 0.02, lng: 120.9842 + (Math.random() - 0.5) * 0.02, status: 'mocked' }),
      { timeout: 8000 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.motorist_name.trim()) { setError('Motorist name is required'); return; }
    if (selectedTypes.length === 0) { setError('Please select at least one violation type'); return; }

    setSubmitting(true);
    setError('');
    try {
      await createViolation({
        motorist_name: form.motorist_name.trim(),
        violation_type: selectedTypes.join(', '), // stored as comma-separated
        notes: form.notes.trim(),
        latitude: gps.lat,
        longitude: gps.lng,
        enforcer_name: user.name,
      });
      setSuccess(true);
      setForm({ motorist_name: '', notes: '' });
      setSelectedTypes([]);
      setGps({ lat: null, lng: null, status: 'idle' });
      setTimeout(() => {
        setSuccess(false);
        if (onSuccess) onSuccess();
      }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to submit violation');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: '3rem', marginBottom: 12 }}>✅</div>
        <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#2e7d32', marginBottom: 8 }}>
          Violation Issued!
        </div>
        <div style={{ color: '#666', fontSize: '0.9rem' }}>Redirecting to history...</div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-title">📝 Issue New Violation</div>

      {error && <div className="alert alert-error">⚠️ {error}</div>}

      <form onSubmit={handleSubmit}>
        {/* Motorist Name */}
        <div className="form-group">
          <label className="form-label">Motorist Name *</label>
          <input
            className="form-input"
            placeholder="Enter motorist's full name"
            value={form.motorist_name}
            onChange={(e) => setForm({ ...form, motorist_name: e.target.value })}
            required
          />
        </div>

        {/* Violation Types — MULTISELECT PILLS */}
        <div className="form-group">
          <label className="form-label">
            Violation Type(s) *
            {selectedTypes.length > 0 && (
              <span style={{
                marginLeft: 8,
                background: 'var(--primary)',
                color: 'white',
                borderRadius: 10,
                padding: '1px 7px',
                fontSize: '0.72rem',
                fontWeight: 700,
              }}>
                {selectedTypes.length} selected
              </span>
            )}
          </label>
          {types.length === 0 ? (
            <p style={{ color: '#999', fontSize: '0.85rem' }}>Loading types...</p>
          ) : (
            <div className="type-pills-grid">
              {types.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`type-pill ${selectedTypes.includes(t.name) ? 'selected' : ''}`}
                  onClick={() => toggleType(t.name)}
                >
                  {selectedTypes.includes(t.name) ? '✓ ' : ''}{t.name}
                </button>
              ))}
            </div>
          )}
          {selectedTypes.length > 0 && (
            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {selectedTypes.map((t, i) => (
                <span key={i} className="type-tag" style={{ cursor: 'pointer' }} onClick={() => toggleType(t)}>
                  {t} ×
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="form-group">
          <label className="form-label">Notes (Optional)</label>
          <textarea
            className="form-textarea"
            placeholder="Add details about the incident..."
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>

        {/* GPS */}
        <div className="form-group">
          <label className="form-label">Location (GPS)</label>
          {gps.status === 'idle' && (
            <button type="button" className="btn btn-outline" onClick={getGPS}>
              📍 Capture GPS Location
            </button>
          )}
          {gps.status === 'loading' && (
            <div className="gps-display loading">⏳ Getting GPS location...</div>
          )}
          {(gps.status === 'ok' || gps.status === 'mocked') && (
            <div className="gps-display">
              📍 {gps.lat.toFixed(6)}, {gps.lng.toFixed(6)}
              {gps.status === 'mocked' && <span style={{ opacity: 0.7 }}> (demo)</span>}
              <button
                type="button"
                onClick={() => setGps({ lat: null, lng: null, status: 'idle' })}
                style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: '#666' }}
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Enforcer Info */}
        <div style={{
          background: '#f4f4fc',
          border: '1px solid #e0e0f0',
          borderRadius: 8,
          padding: '10px 14px',
          fontSize: '0.82rem',
          color: '#666',
          marginBottom: 16,
        }}>
          🚓 Issuing as: <strong>{user.name}</strong>
        </div>

        <button
          className="btn btn-accent btn-full"
          type="submit"
          disabled={submitting || selectedTypes.length === 0}
          style={{ fontSize: '1rem', padding: '14px' }}
        >
          {submitting ? '⏳ Submitting...' : '🚨 Issue Violation'}
        </button>
      </form>
    </div>
  );
}
