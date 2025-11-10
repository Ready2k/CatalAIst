import React, { useState } from 'react';

interface LoginProps {
  onLoginSuccess: (token: string, username: string) => void;
}

// Use environment variable or default to relative URL (proxied by nginx)
const API_BASE_URL = process.env.REACT_APP_API_URL || '';

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showRegister, setShowRegister] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Store token in sessionStorage
      sessionStorage.setItem('authToken', data.token);
      sessionStorage.setItem('username', data.user.username);
      sessionStorage.setItem('userId', data.user.userId);
      sessionStorage.setItem('userRole', data.user.role);

      onLoginSuccess(data.token, data.user.username);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }

      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      // After successful registration, log in automatically
      await handleLogin(e);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f8f9fa',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '400px',
        width: '100%',
        backgroundColor: '#fff',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        padding: '40px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ margin: '0 0 10px 0', color: '#343a40', fontSize: '28px' }}>
            CatalAIst
          </h1>
          <p style={{ margin: 0, color: '#6c757d', fontSize: '14px' }}>
            {showRegister ? 'Create your account' : 'Sign in to your account'}
          </p>
        </div>

        {error && (
          <div style={{
            padding: '12px',
            backgroundColor: '#f8d7da',
            color: '#721c24',
            borderRadius: '4px',
            marginBottom: '20px',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={showRegister ? handleRegister : handleLogin}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: '#495057',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
              placeholder="Enter your username"
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: '#495057',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
              placeholder="Enter your password"
            />
            {showRegister && (
              <small style={{ display: 'block', marginTop: '4px', color: '#6c757d', fontSize: '12px' }}>
                Minimum 8 characters
              </small>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: isLoading ? '#6c757d' : '#007bff',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              marginBottom: '16px'
            }}
          >
            {isLoading ? 'Please wait...' : (showRegister ? 'Create Account' : 'Sign In')}
          </button>

          <div style={{ textAlign: 'center' }}>
            <button
              type="button"
              onClick={() => {
                setShowRegister(!showRegister);
                setError('');
              }}
              disabled={isLoading}
              style={{
                background: 'none',
                border: 'none',
                color: '#007bff',
                cursor: 'pointer',
                fontSize: '14px',
                textDecoration: 'underline'
              }}
            >
              {showRegister ? 'Already have an account? Sign in' : "Don't have an account? Register"}
            </button>
          </div>
        </form>

        {!showRegister && (
          <div style={{
            marginTop: '30px',
            padding: '16px',
            backgroundColor: '#e7f3ff',
            borderRadius: '4px',
            fontSize: '13px',
            color: '#004085'
          }}>
            <strong>First time?</strong> Use the admin account you created during setup, or register a new account.
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
