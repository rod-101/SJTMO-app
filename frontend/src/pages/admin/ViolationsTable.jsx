import React, { useState, useEffect } from 'react';
import { updateViolationStatus, updateViolation, getViolationTypes, addViolationType } from '../../services/api';
import '../../App.css';

// Generate a consistent TCT number from a violation record
const getTCT = (v) => {
  const year = new Date(v.date_issued).getFullYear();
  const suffix = v.id.slice(-6).toUpperCase();
  return `TCT-${year}-${suffix}`;
};

// Render comma-separated violation types as tag chips
function TypeTags({ value }) {
  if (!value) return null;
  const types = value.split(',').map((t) => t.trim()).filter(Boolean);
  return (
    <div className="type-tags">
      {types.map((t, i) => <span key={i} className="type-tag">{t}</span>)}
    </div>
  );
}

// ─── Edit Violation Modal ──────────────────────────────────────────────
function EditModal({ violation, types, onClose, onSaved }) {
  const [form, setForm] = useState({
    motorist_name: violation.motorist_name || '',
    violation_type: violation.violation_type || '',
    notes: violation.notes || '',
    status: violation.status || 'pending',
    enforcer_name: violation.enforcer_name || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await updateViolation(violation.id, form);
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">✏️ Edit Violation</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div style={{ fontSize: '0.75rem', color: '#999', marginBottom: 16 }}>
          {getTCT(violation)}
        </div>

        {error && <div className="alert alert-error">⚠️ {error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Motorist Name</label>
            <input className="form-input" value={form.motorist_name}
              onChange={(e) => setForm({ ...form, motorist_name: e.target.value })} required />
          </div>

          <div className="form-group">
            <label className="form-label">Violation Type</label>
            <select className="form-select" value={form.violation_type}
              onChange={(e) => setForm({ ...form, violation_type: e.target.value })}>
              <option value="">— Select —</option>
              {types.map((t) => (
                <option key={t.id} value={t.name}>{t.name}</option>
              ))}
              {/* Keep current value even if not in list */}
              {form.violation_type && !types.find(t => t.name === form.violation_type.split(',')[0].trim()) && (
                <option value={form.violation_type}>{form.violation_type}</option>
              )}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="form-textarea" value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>

          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-select" value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="pending">Pending</option>
              <option value="resolved">Resolved</option>
              <option value="dismissed">Dismissed</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Enforcer Name</label>
            <input className="form-input" value={form.enforcer_name}
              onChange={(e) => setForm({ ...form, enforcer_name: e.target.value })} />
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? 'Saving...' : '💾 Save Changes'}
            </button>
            <button className="btn btn-outline" type="button" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Add Violation Type Modal ─────────────────────────────────────────
function AddTypeModal({ onClose, onAdded }) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError('');
    try {
      await addViolationType(name.trim());
      onAdded();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to add type');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 360 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">➕ Add Violation Type</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        {error && <div className="alert alert-error">⚠️ {error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Violation Type Name</label>
            <input
              className="form-input"
              placeholder="e.g. Illegal U-Turn"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" type="submit" disabled={saving || !name.trim()}>
              {saving ? 'Adding...' : 'Add Type'}
            </button>
            <button className="btn btn-outline" type="button" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main ViolationsTable ─────────────────────────────────────────────
export default function ViolationsTable({ violations, onRefresh }) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [updating, setUpdating] = useState(null);
  const [message, setMessage] = useState('');
  const [editViolation, setEditViolation] = useState(null);
  const [showAddType, setShowAddType] = useState(false);
  const [violationTypes, setViolationTypes] = useState([]);

  // Load violation types for edit modal dropdown
  useEffect(() => {
    getViolationTypes().then(setViolationTypes).catch(() => {});
  }, []);

  const showMsg = (msg) => { setMessage(msg); setTimeout(() => setMessage(''), 3000); };

  const types = [...new Set(violations.map((v) => v.violation_type))];

  const filtered = violations.filter((v) => {
    const matchSearch =
      !search ||
      v.motorist_name.toLowerCase().includes(search.toLowerCase()) ||
      v.violation_type.toLowerCase().includes(search.toLowerCase()) ||
      v.enforcer_name.toLowerCase().includes(search.toLowerCase()) ||
      getTCT(v).toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || v.status === filterStatus;
    const matchType = filterType === 'all' || v.violation_type === filterType;
    return matchSearch && matchStatus && matchType;
  });

  const handleStatusChange = async (id, status) => {
    setUpdating(id);
    try {
      await updateViolationStatus(id, status);
      showMsg(`Status updated to "${status}"`);
      onRefresh();
    } catch (err) {
      showMsg('Failed to update status');
    } finally {
      setUpdating(null);
    }
  };

  const handleTypeAdded = () => {
    getViolationTypes().then(setViolationTypes).catch(() => {});
    onRefresh();
    showMsg('Violation type added successfully!');
  };

  return (
    <div>
      {message && <div className="alert alert-success">✅ {message}</div>}

      {/* Filters + Add Type */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 200px' }}>
            <label className="form-label">Search</label>
            <input className="form-input" placeholder="Motorist, TCT, type, enforcer..."
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div style={{ flex: '0 1 160px' }}>
            <label className="form-label">Status</label>
            <select className="form-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="resolved">Resolved</option>
              <option value="dismissed">Dismissed</option>
            </select>
          </div>
          <div style={{ flex: '0 1 180px' }}>
            <label className="form-label">Type</label>
            <select className="form-select" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="all">All Types</option>
              {types.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-outline btn-sm" onClick={onRefresh}>🔄 Refresh</button>
            <button className="btn btn-primary btn-sm" onClick={() => setShowAddType(true)}>
              ➕ Add Violation Type
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">
          📋 All Violations
          <span style={{ background: '#eeeaff', color: '#140c7e', padding: '2px 8px', borderRadius: 12, fontSize: '0.75rem', marginLeft: 8 }}>
            {filtered.length}
          </span>
        </div>
        <div className="table-wrapper">
          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🔍</div>
              <div className="empty-state-text">No violations match your filters</div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>TCT #</th>
                  <th>Motorist</th>
                  <th>Violation Type</th>
                  <th>Enforcer</th>
                  <th>Date</th>
                  <th>Notes</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((v) => (
                  <tr key={v.id}>
                    <td>
                      <span className="tct-code">{getTCT(v)}</span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{v.motorist_name}</td>
                    <td><TypeTags value={v.violation_type} /></td>
                    <td>{v.enforcer_name}</td>
                    <td style={{ fontSize: '0.82rem', color: '#666' }}>
                      {new Date(v.date_issued).toLocaleDateString()}<br />
                      <span style={{ fontSize: '0.75rem' }}>{new Date(v.date_issued).toLocaleTimeString()}</span>
                    </td>
                    <td style={{ fontSize: '0.82rem', color: '#666', maxWidth: 140, wordBreak: 'break-word' }}>
                      {v.notes || '—'}
                    </td>
                    <td>
                      <span className={`badge badge-${v.status}`}>{v.status}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {/* Edit */}
                        <button
                          className="btn btn-outline btn-sm"
                          title="Edit violation"
                          onClick={() => setEditViolation(v)}
                        >
                          ✏️
                        </button>
                        {/* Status actions */}
                        {v.status === 'pending' && (
                          <>
                            <button className="btn btn-success btn-sm" disabled={updating === v.id}
                              title="Resolve" onClick={() => handleStatusChange(v.id, 'resolved')}>✓</button>
                            <button className="btn btn-outline btn-sm" disabled={updating === v.id}
                              title="Dismiss" onClick={() => handleStatusChange(v.id, 'dismissed')}>✕</button>
                          </>
                        )}
                        {v.status !== 'pending' && (
                          <button className="btn btn-outline btn-sm" disabled={updating === v.id}
                            title="Reopen" onClick={() => handleStatusChange(v.id, 'pending')}>↺</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editViolation && (
        <EditModal
          violation={editViolation}
          types={violationTypes}
          onClose={() => setEditViolation(null)}
          onSaved={() => { onRefresh(); showMsg('Violation updated!'); }}
        />
      )}

      {/* Add Violation Type Modal */}
      {showAddType && (
        <AddTypeModal
          onClose={() => setShowAddType(false)}
          onAdded={handleTypeAdded}
        />
      )}
    </div>
  );
}
