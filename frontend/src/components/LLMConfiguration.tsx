import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';

interface LLMConfigurationProps {
  onConfigSubmit: (config: LLMConfig) => void;
}

export interface LLMConfig {
  provider: 'openai' | 'bedrock';
  model: string;
  // OpenAI
  apiKey?: string;
  // AWS Bedrock
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  awsSessionToken?: string;
  awsRegion?: string;
}

const LLMConfiguration: React.FC<LLMConfigurationProps> = ({ onConfigSubmit }) => {
  const [provider, setProvider] = useState<'openai' | 'bedrock'>('openai');
  const [model, setModel] = useState('gpt-4');
  
  // OpenAI
  const [apiKey, setApiKey] = useState('');
  const [models, setModels] = useState<Array<{ id: string; created: number; ownedBy: string }>>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  
  // AWS Bedrock
  const [awsAccessKeyId, setAwsAccessKeyId] = useState('');
  const [awsSecretAccessKey, setAwsSecretAccessKey] = useState('');
  const [awsSessionToken, setAwsSessionToken] = useState('');
  const [awsRegion, setAwsRegion] = useState('us-east-1');
  
  const [error, setError] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Default models - defined outside useEffect to avoid dependency issues
  const openAIModels = React.useMemo(() => [
    { id: 'gpt-4', created: 0, ownedBy: 'openai' },
    { id: 'gpt-4-turbo', created: 0, ownedBy: 'openai' },
    { id: 'gpt-4o', created: 0, ownedBy: 'openai' },
    { id: 'gpt-3.5-turbo', created: 0, ownedBy: 'openai' },
    { id: 'o1-preview', created: 0, ownedBy: 'openai' },
    { id: 'o1-mini', created: 0, ownedBy: 'openai' },
  ], []);

  const bedrockModels = React.useMemo(() => [
    { id: 'anthropic.claude-3-5-sonnet-20241022-v2:0', created: 0, ownedBy: 'anthropic' },
    { id: 'anthropic.claude-3-5-haiku-20241022-v1:0', created: 0, ownedBy: 'anthropic' },
    { id: 'anthropic.claude-3-opus-20240229-v1:0', created: 0, ownedBy: 'anthropic' },
    { id: 'anthropic.claude-3-sonnet-20240229-v1:0', created: 0, ownedBy: 'anthropic' },
    { id: 'anthropic.claude-3-haiku-20240307-v1:0', created: 0, ownedBy: 'anthropic' },
  ], []);

  const awsRegions = [
    'us-east-1',
    'us-west-2',
    'ap-southeast-1',
    'ap-northeast-1',
    'eu-central-1',
    'eu-west-2',
  ];

  useEffect(() => {
    // Set default models when provider changes
    if (provider === 'openai') {
      setModels(openAIModels);
      setModel('gpt-4');
    } else {
      // For Bedrock, use fallback models (will be replaced when user clicks dropdown)
      setModels(bedrockModels);
      setModel('anthropic.claude-3-5-sonnet-20241022-v2:0');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider]); // Only run when provider changes, not when model lists change

  const loadOpenAIModels = async (key: string) => {
    if (!key || !key.startsWith('sk-')) return;
    
    setLoadingModels(true);
    try {
      const response = await apiService.listModels('openai', { apiKey: key });
      if (response.models && response.models.length > 0) {
        setModels(response.models);
      }
    } catch (err) {
      console.warn('Failed to load OpenAI models, using defaults:', err);
    } finally {
      setLoadingModels(false);
    }
  };

  const loadBedrockModels = async () => {
    if (!awsAccessKeyId || !awsSecretAccessKey) return;
    
    setLoadingModels(true);
    setError(''); // Clear any previous errors
    try {
      console.log('[Frontend] Fetching Bedrock models for region:', awsRegion);
      const response = await apiService.listModels('bedrock', {
        awsAccessKeyId,
        awsSecretAccessKey,
        awsSessionToken: awsSessionToken || undefined,
        awsRegion
      });
      console.log('[Frontend] Received models:', response.models?.length || 0, response.models);
      
      if (response.models && response.models.length > 0) {
        setModels(response.models);
        console.log('[Frontend] Set models state to:', response.models.length, 'models');
        
        // Set first model as default if current model is not in the list
        if (!response.models.find(m => m.id === model)) {
          setModel(response.models[0].id);
          console.log('[Frontend] Set default model to:', response.models[0].id);
        }
      } else {
        console.warn('[Frontend] No models returned from API');
      }
    } catch (err) {
      console.error('[Frontend] Failed to load Bedrock models:', err);
      setError('Failed to fetch models. Using default list. Check your credentials and permissions.');
    } finally {
      setLoadingModels(false);
    }
  };

  const handleModelDropdownClick = () => {
    // Fetch models when dropdown is clicked
    if (provider === 'openai') {
      if (apiKey && apiKey.startsWith('sk-') && apiKey.length >= 20) {
        loadOpenAIModels(apiKey);
      }
    } else if (provider === 'bedrock') {
      if (awsAccessKeyId && awsSecretAccessKey) {
        loadBedrockModels();
      }
    }
  };

  const validateOpenAI = (): boolean => {
    if (!apiKey.trim()) {
      setError('API key is required');
      return false;
    }
    if (!apiKey.startsWith('sk-')) {
      setError('Invalid API key format. OpenAI API keys start with "sk-"');
      return false;
    }
    if (apiKey.length < 20) {
      setError('API key appears to be too short');
      return false;
    }
    return true;
  };

  const validateBedrock = (): boolean => {
    if (!awsAccessKeyId.trim()) {
      setError('AWS Access Key ID is required');
      return false;
    }
    if (!awsSecretAccessKey.trim()) {
      setError('AWS Secret Access Key is required');
      return false;
    }
    if (!awsAccessKeyId.startsWith('AKIA') && !awsAccessKeyId.startsWith('ASIA')) {
      setError('Invalid AWS Access Key ID format');
      return false;
    }
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (provider === 'openai') {
      if (validateOpenAI()) {
        onConfigSubmit({
          provider: 'openai',
          model,
          apiKey,
        });
      }
    } else {
      if (validateBedrock()) {
        onConfigSubmit({
          provider: 'bedrock',
          model,
          awsAccessKeyId,
          awsSecretAccessKey,
          awsSessionToken: awsSessionToken || undefined,
          awsRegion,
        });
      }
    }
  };

  const renderProviderTabs = () => (
    <div style={{ display: 'flex', marginBottom: '20px', borderBottom: '2px solid #e9ecef' }}>
      <button
        type="button"
        onClick={() => setProvider('openai')}
        style={{
          flex: 1,
          padding: '12px',
          backgroundColor: provider === 'openai' ? '#fff' : '#f8f9fa',
          color: provider === 'openai' ? '#007bff' : '#6c757d',
          border: 'none',
          borderBottom: provider === 'openai' ? '2px solid #007bff' : 'none',
          cursor: 'pointer',
          fontSize: '16px',
          fontWeight: provider === 'openai' ? 'bold' : 'normal',
          marginBottom: '-2px',
        }}
      >
        OpenAI
      </button>
      <button
        type="button"
        onClick={() => setProvider('bedrock')}
        style={{
          flex: 1,
          padding: '12px',
          backgroundColor: provider === 'bedrock' ? '#fff' : '#f8f9fa',
          color: provider === 'bedrock' ? '#007bff' : '#6c757d',
          border: 'none',
          borderBottom: provider === 'bedrock' ? '2px solid #007bff' : 'none',
          cursor: 'pointer',
          fontSize: '16px',
          fontWeight: provider === 'bedrock' ? 'bold' : 'normal',
          marginBottom: '-2px',
        }}
      >
        AWS Bedrock
      </button>
    </div>
  );

  const renderOpenAIForm = () => (
    <>
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
        <div style={{ color: '#666', fontSize: '12px', marginTop: '5px' }}>
          Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">OpenAI Platform</a>
        </div>
      </div>
    </>
  );

  const renderBedrockForm = () => (
    <>
      <div style={{ marginBottom: '15px' }}>
        <label htmlFor="awsAccessKeyId" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          AWS Access Key ID
        </label>
        <input
          id="awsAccessKeyId"
          type="text"
          value={awsAccessKeyId}
          onChange={(e) => setAwsAccessKeyId(e.target.value)}
          placeholder="AKIAIOSFODNN7EXAMPLE"
          style={{
            width: '100%',
            padding: '10px',
            fontSize: '14px',
            border: error && error.includes('Access Key') ? '1px solid #dc3545' : '1px solid #ddd',
            borderRadius: '4px',
            boxSizing: 'border-box'
          }}
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label htmlFor="awsSecretAccessKey" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          AWS Secret Access Key
        </label>
        <input
          id="awsSecretAccessKey"
          type="password"
          value={awsSecretAccessKey}
          onChange={(e) => setAwsSecretAccessKey(e.target.value)}
          placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
          style={{
            width: '100%',
            padding: '10px',
            fontSize: '14px',
            border: error && error.includes('Secret') ? '1px solid #dc3545' : '1px solid #ddd',
            borderRadius: '4px',
            boxSizing: 'border-box'
          }}
        />
        <div style={{ color: '#666', fontSize: '12px', marginTop: '5px' }}>
          Models will be fetched when you click the Model dropdown below
        </div>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label htmlFor="awsSessionToken" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          AWS Session Token (Optional)
        </label>
        <input
          id="awsSessionToken"
          type="password"
          value={awsSessionToken}
          onChange={(e) => setAwsSessionToken(e.target.value)}
          placeholder="For temporary credentials (STS)"
          style={{
            width: '100%',
            padding: '10px',
            fontSize: '14px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            boxSizing: 'border-box'
          }}
        />
        <div style={{ color: '#666', fontSize: '12px', marginTop: '5px' }}>
          Only needed if using temporary AWS credentials (STS)
        </div>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          style={{
            padding: '8px 12px',
            backgroundColor: 'transparent',
            color: '#007bff',
            border: '1px solid #007bff',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          {showAdvanced ? '▼' : '▶'} Advanced Options
        </button>
      </div>

      {showAdvanced && (
        <div style={{ marginBottom: '15px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
          <label htmlFor="awsRegion" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            AWS Region
          </label>
          <select
            id="awsRegion"
            value={awsRegion}
            onChange={(e) => setAwsRegion(e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '14px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              boxSizing: 'border-box',
              backgroundColor: '#fff',
              cursor: 'pointer'
            }}
          >
            {awsRegions.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
          <div style={{ color: '#666', fontSize: '12px', marginTop: '5px' }}>
            Select the AWS region where you have Bedrock access (defaults to us-east-1)
          </div>
        </div>
      )}

      <div style={{ padding: '12px', backgroundColor: '#d1ecf1', borderRadius: '4px', marginBottom: '15px' }}>
        <div style={{ fontSize: '14px', color: '#0c5460', marginBottom: '8px' }}>
          <strong>Before using AWS Bedrock:</strong>
        </div>
        <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#0c5460' }}>
          <li>Request model access in AWS Bedrock console</li>
          <li>Ensure IAM permissions include <code>bedrock:InvokeModel</code> and <code>bedrock:ListFoundationModels</code></li>
          <li>Check model availability in your selected region</li>
        </ul>
        <div style={{ marginTop: '8px', fontSize: '12px' }}>
          <a href="https://docs.aws.amazon.com/bedrock/" target="_blank" rel="noopener noreferrer" style={{ color: '#0c5460' }}>
            AWS Bedrock Documentation →
          </a>
        </div>
      </div>
    </>
  );

  return (
    <div style={{
      maxWidth: '600px',
      margin: '50px auto',
      padding: '30px',
      border: '1px solid #ddd',
      borderRadius: '8px',
      backgroundColor: '#fff',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <h2 style={{ marginTop: 0, marginBottom: '10px' }}>LLM Provider Configuration</h2>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        Choose your LLM provider and configure credentials. Your credentials are stored securely in your session and never persisted.
      </p>
      
      <form onSubmit={handleSubmit}>
        {renderProviderTabs()}

        {provider === 'openai' ? renderOpenAIForm() : renderBedrockForm()}

        {error && (
          <div style={{ 
            color: '#dc3545', 
            fontSize: '14px', 
            marginBottom: '15px',
            padding: '10px',
            backgroundColor: '#f8d7da',
            borderRadius: '4px'
          }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="model" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Model
          </label>
          <select
            id="model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            onFocus={handleModelDropdownClick}
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
          {!loadingModels && (
            <div style={{ color: '#666', fontSize: '12px', marginTop: '5px' }}>
              {provider === 'openai' 
                ? 'GPT-4 is recommended for best results. Click to fetch models from your OpenAI account.'
                : 'Claude 3.5 Sonnet is recommended for production use. Click to fetch models from your AWS Bedrock region.'}
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
          Save Configuration
        </button>
      </form>
    </div>
  );
};

export default LLMConfiguration;
