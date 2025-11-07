import React, { useState } from 'react';

interface ApiKeyInputProps {
  onApiKeySubmit: (apiKey: string) => void;
}

const ApiKeyInput: React.FC<ApiKeyInputProps> = ({ onApiKeySubmit }) => {
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');

  const validateApiKey = (key: string): boolean => {
    // OpenAI API keys start with 'sk-' and are at least 20 characters
    if (!key.trim()) {
      setError('API key is required');
      return false;
    }
    if (!key.startsWith('sk-')) {
      setError('Invalid API key format. OpenAI API keys start with "sk-"');
      return false;
    }
    if (key.length < 20) {
      setError('API key appears to be too short');
      return false;
    }
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (validateApiKey(apiKey)) {
      onApiKeySubmit(apiKey);
    }
  };

  return (
    <div style={{
      maxWidth: '500px',
      margin: '50px auto',
      padding: '30px',
      border: '1px solid #ddd',
      borderRadius: '8px',
      backgroundColor: '#fff',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <h2 style={{ marginTop: 0, marginBottom: '10px' }}>Welcome to CatalAIst</h2>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        Enter your OpenAI API key to get started. Your key is stored securely in your session and never persisted.
      </p>
      
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="apiKey" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            OpenAI API Key
          </label>
          <input
            id="apiKey"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '14px',
              border: error ? '1px solid #dc3545' : '1px solid #ddd',
              borderRadius: '4px',
              boxSizing: 'border-box'
            }}
          />
          {error && (
            <div style={{ color: '#dc3545', fontSize: '14px', marginTop: '5px' }}>
              {error}
            </div>
          )}
        </div>
        
        <button
          type="submit"
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#007bff',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0056b3'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#007bff'}
        >
          Start Session
        </button>
      </form>
      
      <p style={{ fontSize: '12px', color: '#999', marginTop: '15px', marginBottom: 0 }}>
        Don't have an API key? Get one at <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">OpenAI Platform</a>
      </p>
    </div>
  );
};

export default ApiKeyInput;
