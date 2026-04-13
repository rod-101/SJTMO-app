import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { login } from '../../services/api';
import '../../App.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { user } = await login(email, password);
      loginUser(user);
      if (user.role === 'admin') navigate('/admin');
      else if (user.role === 'enforcer') navigate('/enforcer');
      else navigate('/motorist');
    } catch (err) {
      setError(err.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = (e, p) => {
    setEmail(e);
    setPassword(p);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">🚦</div>
          <div className="login-title">SJTMO System</div>
          <div className="login-subtitle">San Jose Traffic Management Office</div>
        </div>

        {error && <div className="login-error">⚠️ {error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              className="form-input"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="form-input"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <button
            className="btn btn-primary btn-full"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="login-demo">
          <strong>Demo Accounts (click to fill)</strong>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button
              type="button"
              onClick={() => quickLogin('admin@test.com', '123456')}
              style={{ background: 'white', border: '1px solid #e0e0e0', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', textAlign: 'left', fontSize: '0.8rem' }}
            >
              🔐 <strong>Admin</strong> — admin@test.com / 123456
            </button>
            <button
              type="button"
              onClick={() => quickLogin('enforcer@test.com', '123456')}
              style={{ background: 'white', border: '1px solid #e0e0e0', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', textAlign: 'left', fontSize: '0.8rem' }}
            >
              🚓 <strong>Enforcer</strong> — enforcer@test.com / 123456
            </button>
            <button
              type="button"
              onClick={() => quickLogin('motorist@test.com', '123456')}
              style={{ background: 'white', border: '1px solid #e0e0e0', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', textAlign: 'left', fontSize: '0.8rem' }}
            >
              🚗 <strong>Motorist</strong> — motorist@test.com / 123456
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
