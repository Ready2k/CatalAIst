import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';

interface ApiKeyInputProps {
  onApiKeySubmit: (apiKey: string, model: string) => void;
}

const ApiKeyInput: React.FC<ApiKeyInputProps> = ({ onApiKeySubmit }) => {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gpt-4');
  const [models, setModels] = useState<Array<{ id: string; created: number; ownedBy: string }>>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [error, setError] = useState('');

  // Default models to show before API key is entered
  const defaultModels = [
    { id: 'gpt-4', created: 0, ownedBy: 'openai' },
    { id: 'gpt-4-turbo', created: 0, ownedBy: 'openai' },
    { id: 'gpt-3.5-turbo', created: 0, ownedBy: 'openai' },
    { id: 'o1-preview', created: 0, ownedBy: 'openai' },
    { id: 'o1-mini', created: 0, ownedBy: 'openai' },
  ];

  useEffect(() => {
    setModels(defaultModels);
  }, []);

  const loadModels = async (key: string) => {
    if (!key || !key.startsWith('sk-')) return;
    
    setLoadingModels(true);
    try {
      const response = await apiService.listModels('openai', { apiKey: key });
      if (response.models && response.models.length > 0) {
        setModels(response.models);
      }
    } catch (err) {
      console.warn('Failed to load models, using defaults:', err);
      // Keep default models if loading fails
    } finally {
      setLoadingModels(false);
    }
  };

  const handleApiKeyBlur = () => {
    if (apiKey && apiKey.startsWith('sk-') && apiKey.length >= 20) {
      loadModels(apiKey);
    }
  };

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
      onApiKeySubmit(apiKey, model);
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
      <h2 style={{ marginTop: 0, marginBottom: '10px' }}>API Configuration</h2>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        Enter your OpenAI API key to enable the classifier. Your key is stored securely in your session and never persisted.
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
            onBlur={handleApiKeyBlur}
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

        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="model" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Model
          </label>
          <select
            id="model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            disabled={loadingModels}
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '14px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              boxSizing: 'border-box',
              backgroundColor: loadingModels ? '#f8f9fa' : '#fff',
              cursor: loadingModels ? 'wait' : 'pointer'
            }}
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.id}
              </option>
            ))}
          </select>
          {loadingModels && (
            <div style={{ color: '#666', fontSize: '12px', marginTop: '5px' }}>
              Loading available models...
            </div>
          )}
          <div style={{ color: '#666', fontSize: '12px', marginTop: '5px' }}>
            Select the model to use for classification. GPT-4 is recommended for best results.
          </div>
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
          Save API Key
        </button>
      </form>
      
      <p style={{ fontSize: '12px', color: '#999', marginTop: '15px', marginBottom: 0 }}>
        Don't have an API key? Get one at <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">OpenAI Platform</a>
      </p>
    </div>
  );
};

export default ApiKeyInput;
