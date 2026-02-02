import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { VoiceType } from '../../../shared/types';
import VoiceSettings from './voice/VoiceSettings';

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
  useRegionalInference?: boolean;
  regionalInferenceEndpoint?: string;
  // Voice Settings (NEW)
  voiceEnabled?: boolean;        // Auto-set based on provider
  voiceType?: VoiceType;         // Voice selection for TTS
  streamingMode?: boolean;       // Auto-play questions (streaming mode)
  voiceService?: 'nova-sonic' | 'polly'; // Voice service selection
}

const LLMConfiguration: React.FC<LLMConfigurationProps> = ({ onConfigSubmit }) => {
  const [provider, setProvider] = useState<'openai' | 'bedrock'>('openai');
  const [model, setModel] = useState('gpt-4');

  // OpenAI
  const [apiKey, setApiKey] = useState('');
  const [models, setModels] = useState<Array<{
    id: string;
    created: number;
    ownedBy: string;
    supportsOnDemand?: boolean;
    requiresProvisioned?: boolean;
    isInferenceProfile?: boolean;
    modelType?: 'foundation' | 'inference-profile';
  }>>([]);

  // Debug: Log models state changes
  useEffect(() => {
    console.log('[Frontend] Models state changed:', models.length, 'models', models.map(m => m.id));
  }, [models]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // AWS Bedrock
  const [awsAccessKeyId, setAwsAccessKeyId] = useState('');
  const [awsSecretAccessKey, setAwsSecretAccessKey] = useState('');
  const [awsSessionToken, setAwsSessionToken] = useState('');
  const [awsRegion, setAwsRegion] = useState('us-east-1');
  const [useRegionalInference, setUseRegionalInference] = useState(false);
  const [regionalInferenceEndpoint, setRegionalInferenceEndpoint] = useState('');

  // Voice Settings (NEW)
  const [voiceType, setVoiceType] = useState<VoiceType>('alloy');
  const [streamingMode, setStreamingMode] = useState(false);
  const [voiceService, setVoiceService] = useState<'nova-sonic' | 'polly'>('nova-sonic');

  // Handle voice service change
  const handleVoiceServiceChange = (service: 'nova-sonic' | 'polly') => {
    setVoiceService(service);
    // Reset voice to default for the selected service
    if (service === 'polly') {
      setVoiceType('joanna' as VoiceType);
    } else {
      setVoiceType('nova-sonic' as VoiceType);
    }
  };

  const [error, setError] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [modelsFetched, setModelsFetched] = useState(false);

  // Model filtering options
  const [showProvisionedModels, setShowProvisionedModels] = useState(false);
  const [showInferenceProfiles, setShowInferenceProfiles] = useState(true);

  // Load persisted configuration on mount
  useEffect(() => {
    const storedConfig = sessionStorage.getItem('llmConfigDraft');
    if (storedConfig) {
      try {
        const config = JSON.parse(storedConfig);
        console.log('[LLMConfig] Restoring saved configuration:', config);

        setProvider(config.provider || 'openai');
        setModel(config.model || 'gpt-4');

        if (config.provider === 'openai') {
          setApiKey(config.apiKey || '');
        } else {
          setAwsAccessKeyId(config.awsAccessKeyId || '');
          setAwsSecretAccessKey(config.awsSecretAccessKey || '');
          setAwsSessionToken(config.awsSessionToken || '');
          setAwsRegion(config.awsRegion || 'us-east-1');
          setUseRegionalInference(config.useRegionalInference || false);
          setRegionalInferenceEndpoint(config.regionalInferenceEndpoint || '');
        }

        setVoiceType(config.voiceType || 'alloy');
        setStreamingMode(config.streamingMode || false);
        setVoiceService(config.voiceService || 'nova-sonic');
      } catch (err) {
        console.warn('[LLMConfig] Failed to restore configuration:', err);
      }
    }
  }, []);

  // Persist configuration changes
  useEffect(() => {
    const config = {
      provider,
      model,
      apiKey: provider === 'openai' ? apiKey : undefined,
      awsAccessKeyId: provider === 'bedrock' ? awsAccessKeyId : undefined,
      awsSecretAccessKey: provider === 'bedrock' ? awsSecretAccessKey : undefined,
      awsSessionToken: provider === 'bedrock' ? awsSessionToken : undefined,
      awsRegion: provider === 'bedrock' ? awsRegion : undefined,
      useRegionalInference: provider === 'bedrock' ? useRegionalInference : undefined,
      regionalInferenceEndpoint: provider === 'bedrock' ? regionalInferenceEndpoint : undefined,
      voiceType,
      streamingMode,
      voiceService,
    };

    sessionStorage.setItem('llmConfigDraft', JSON.stringify(config));
  }, [provider, model, apiKey, awsAccessKeyId, awsSecretAccessKey, awsSessionToken,
    awsRegion, useRegionalInference, regionalInferenceEndpoint, voiceType, streamingMode, voiceService]);

  // Default models - defined outside useEffect to avoid dependency issues
  const openAIModels = React.useMemo(() => [
    { id: 'gpt-4', created: 0, ownedBy: 'openai', supportsOnDemand: true, requiresProvisioned: false, isInferenceProfile: false, modelType: 'foundation' as const },
    { id: 'gpt-4-turbo', created: 0, ownedBy: 'openai', supportsOnDemand: true, requiresProvisioned: false, isInferenceProfile: false, modelType: 'foundation' as const },
    { id: 'gpt-4o', created: 0, ownedBy: 'openai', supportsOnDemand: true, requiresProvisioned: false, isInferenceProfile: false, modelType: 'foundation' as const },
    { id: 'gpt-3.5-turbo', created: 0, ownedBy: 'openai', supportsOnDemand: true, requiresProvisioned: false, isInferenceProfile: false, modelType: 'foundation' as const },
    { id: 'o1-preview', created: 0, ownedBy: 'openai', supportsOnDemand: true, requiresProvisioned: false, isInferenceProfile: false, modelType: 'foundation' as const },
    { id: 'o1-mini', created: 0, ownedBy: 'openai', supportsOnDemand: true, requiresProvisioned: false, isInferenceProfile: false, modelType: 'foundation' as const },
  ], []);

  const bedrockModels = React.useMemo(() => [
    // Anthropic Claude models
    { id: 'anthropic.claude-3-5-sonnet-20241022-v2:0', created: 0, ownedBy: 'anthropic', supportsOnDemand: true, requiresProvisioned: false, isInferenceProfile: false, modelType: 'foundation' as const },
    { id: 'anthropic.claude-3-5-haiku-20241022-v1:0', created: 0, ownedBy: 'anthropic', supportsOnDemand: true, requiresProvisioned: false, isInferenceProfile: false, modelType: 'foundation' as const },
    { id: 'anthropic.claude-3-opus-20240229-v1:0', created: 0, ownedBy: 'anthropic', supportsOnDemand: true, requiresProvisioned: false, isInferenceProfile: false, modelType: 'foundation' as const },
    { id: 'anthropic.claude-3-sonnet-20240229-v1:0', created: 0, ownedBy: 'anthropic', supportsOnDemand: true, requiresProvisioned: false, isInferenceProfile: false, modelType: 'foundation' as const },
    { id: 'anthropic.claude-3-haiku-20240307-v1:0', created: 0, ownedBy: 'anthropic', supportsOnDemand: true, requiresProvisioned: false, isInferenceProfile: false, modelType: 'foundation' as const },
    // Amazon Nova models (NEW - Latest AI models from Amazon)
    { id: 'amazon.nova-micro-v1:0', created: 0, ownedBy: 'amazon', supportsOnDemand: true, requiresProvisioned: false, isInferenceProfile: false, modelType: 'foundation' as const },
    { id: 'amazon.nova-lite-v1:0', created: 0, ownedBy: 'amazon', supportsOnDemand: true, requiresProvisioned: false, isInferenceProfile: false, modelType: 'foundation' as const },
    { id: 'amazon.nova-pro-v1:0', created: 0, ownedBy: 'amazon', supportsOnDemand: true, requiresProvisioned: false, isInferenceProfile: false, modelType: 'foundation' as const },
    // Amazon Titan models
    { id: 'amazon.titan-text-express-v1', created: 0, ownedBy: 'amazon', supportsOnDemand: true, requiresProvisioned: false, isInferenceProfile: false, modelType: 'foundation' as const },
    { id: 'amazon.titan-text-lite-v1', created: 0, ownedBy: 'amazon', supportsOnDemand: true, requiresProvisioned: false, isInferenceProfile: false, modelType: 'foundation' as const },
    // AI21 Jurassic models
    { id: 'ai21.j2-ultra-v1', created: 0, ownedBy: 'ai21', supportsOnDemand: true, requiresProvisioned: false, isInferenceProfile: false, modelType: 'foundation' as const },
    { id: 'ai21.j2-mid-v1', created: 0, ownedBy: 'ai21', supportsOnDemand: true, requiresProvisioned: false, isInferenceProfile: false, modelType: 'foundation' as const },
    // Cohere Command models
    { id: 'cohere.command-text-v14', created: 0, ownedBy: 'cohere', supportsOnDemand: true, requiresProvisioned: false, isInferenceProfile: false, modelType: 'foundation' as const },
    { id: 'cohere.command-light-text-v14', created: 0, ownedBy: 'cohere', supportsOnDemand: true, requiresProvisioned: false, isInferenceProfile: false, modelType: 'foundation' as const },
    // Meta Llama models
    { id: 'meta.llama2-13b-chat-v1', created: 0, ownedBy: 'meta', supportsOnDemand: true, requiresProvisioned: false, isInferenceProfile: false, modelType: 'foundation' as const },
    { id: 'meta.llama2-70b-chat-v1', created: 0, ownedBy: 'meta', supportsOnDemand: true, requiresProvisioned: false, isInferenceProfile: false, modelType: 'foundation' as const },
  ], []);

  const awsRegions = [
    'us-east-1',
    'us-west-2',
    'us-west-1',
    'ap-southeast-1',
    'ap-southeast-2',
    'ap-northeast-1',
    'ap-south-1',
    'eu-central-1',
    'eu-west-1',
    'eu-west-2',
    'eu-west-3',
    'eu-north-1',
    'ca-central-1',
  ];

  // Debug: Log the regions array
  console.log('[LLMConfig] Available AWS regions:', awsRegions);

  useEffect(() => {
    // Set default models when provider changes
    // But don't override if models have been fetched
    if (provider === 'openai') {
      setModels(openAIModels);
      setModel('gpt-4');
      setModelsFetched(false);
      // Set default voice for OpenAI
      setVoiceType('alloy');
    } else {
      // For Bedrock, only set fallback if models haven't been fetched yet
      if (!modelsFetched) {
        setModels(bedrockModels);
        setModel('amazon.nova-lite-v1:0');
      }
      // Set default voice for Bedrock (Nova 2 Sonic)
      setVoiceType('nova-sonic');
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
        awsRegion,
        useRegionalInference,
        regionalInferenceEndpoint: regionalInferenceEndpoint || undefined
      });
      console.log('[Frontend] Received models:', response.models?.length || 0, response.models);

      if (response.models && response.models.length > 0) {
        // Filter out any models that might have slipped through (like haiku-4-5)
        const filteredModels = response.models.filter(m =>
          !m.id.includes('haiku-4-5') && !m.id.includes('4-5')
        );
        console.log('[Frontend] After filtering:', filteredModels.length, 'models');

        setModels(filteredModels.length > 0 ? filteredModels : response.models);
        setModelsFetched(true); // Mark that we've fetched models
        console.log('[Frontend] Set models state to:', filteredModels.length, 'models');

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

  const testConnection = async () => {
    setTestingConnection(true);
    setConnectionTestResult(null);
    setError('');

    try {
      const response = await fetch('/api/public/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider,
          model, // Include selected model
          apiKey: provider === 'openai' ? apiKey : undefined,
          awsAccessKeyId: provider === 'bedrock' ? awsAccessKeyId : undefined,
          awsSecretAccessKey: provider === 'bedrock' ? awsSecretAccessKey : undefined,
          awsSessionToken: provider === 'bedrock' ? awsSessionToken : undefined,
          awsRegion: provider === 'bedrock' ? awsRegion : undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setConnectionTestResult({
          success: true,
          message: `✓ ${data.message} (${data.duration}ms)`,
        });
      } else {
        setConnectionTestResult({
          success: false,
          message: `✗ ${data.error}`,
        });
        setError(data.error);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Connection test failed';
      setConnectionTestResult({
        success: false,
        message: `✗ ${errorMsg}`,
      });
      setError(errorMsg);
    } finally {
      setTestingConnection(false);
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
          // Voice settings (auto-enabled for OpenAI)
          voiceEnabled: true,
          voiceType,
          streamingMode,
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
          useRegionalInference,
          regionalInferenceEndpoint: regionalInferenceEndpoint || undefined,
          // Voice settings for Bedrock: Full Nova 2 Sonic speech-to-speech
          voiceEnabled: true,
          voiceType, // Use the selected voice type from the form
          streamingMode, // Streaming mode supported by Nova 2 Sonic
          voiceService, // Selected voice service
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

      {provider === 'openai' && apiKey && apiKey.startsWith('sk-') && apiKey.length >= 20 && (
        <div style={{ marginBottom: '15px' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={testConnection}
              disabled={testingConnection}
              style={{
                flex: 1,
                padding: '10px',
                backgroundColor: testingConnection ? '#6c757d' : '#17a2b8',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: testingConnection ? 'wait' : 'pointer',
              }}
              onMouseOver={(e) => !testingConnection && (e.currentTarget.style.backgroundColor = '#138496')}
              onMouseOut={(e) => !testingConnection && (e.currentTarget.style.backgroundColor = '#17a2b8')}
            >
              {testingConnection ? '⏳ Testing...' : '🔌 Test Connection'}
            </button>
            <button
              type="button"
              onClick={() => loadOpenAIModels(apiKey)}
              disabled={loadingModels}
              style={{
                flex: 1,
                padding: '10px',
                backgroundColor: loadingModels ? '#6c757d' : '#28a745',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: loadingModels ? 'wait' : 'pointer',
              }}
              onMouseOver={(e) => !loadingModels && (e.currentTarget.style.backgroundColor = '#218838')}
              onMouseOut={(e) => !loadingModels && (e.currentTarget.style.backgroundColor = '#28a745')}
            >
              {loadingModels ? '⏳ Fetching...' : '🔄 Fetch Models'}
            </button>
          </div>
          {connectionTestResult && (
            <div style={{
              marginTop: '10px',
              padding: '10px',
              borderRadius: '4px',
              fontSize: '13px',
              backgroundColor: connectionTestResult.success ? '#d4edda' : '#f8d7da',
              color: connectionTestResult.success ? '#155724' : '#721c24',
              border: `1px solid ${connectionTestResult.success ? '#c3e6cb' : '#f5c6cb'}`,
            }}>
              {connectionTestResult.message}
            </div>
          )}
          <div style={{ color: '#666', fontSize: '12px', marginTop: '5px' }}>
            Test your credentials or fetch available models
          </div>
        </div>
      )}
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
      </div>

      {provider === 'bedrock' && awsAccessKeyId && awsSecretAccessKey && (
        <div style={{ marginBottom: '15px' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={testConnection}
              disabled={testingConnection}
              style={{
                flex: 1,
                padding: '10px',
                backgroundColor: testingConnection ? '#6c757d' : '#17a2b8',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: testingConnection ? 'wait' : 'pointer',
              }}
              onMouseOver={(e) => !testingConnection && (e.currentTarget.style.backgroundColor = '#138496')}
              onMouseOut={(e) => !testingConnection && (e.currentTarget.style.backgroundColor = '#17a2b8')}
            >
              {testingConnection ? '⏳ Testing...' : '🔌 Test Connection'}
            </button>
            <button
              type="button"
              onClick={loadBedrockModels}
              disabled={loadingModels}
              style={{
                flex: 1,
                padding: '10px',
                backgroundColor: loadingModels ? '#6c757d' : '#28a745',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: loadingModels ? 'wait' : 'pointer',
              }}
              onMouseOver={(e) => !loadingModels && (e.currentTarget.style.backgroundColor = '#218838')}
              onMouseOut={(e) => !loadingModels && (e.currentTarget.style.backgroundColor = '#28a745')}
            >
              {loadingModels ? '⏳ Fetching...' : '🔄 Fetch Models'}
            </button>
          </div>
          {connectionTestResult && (
            <div style={{
              marginTop: '10px',
              padding: '10px',
              borderRadius: '4px',
              fontSize: '13px',
              backgroundColor: connectionTestResult.success ? '#d4edda' : '#f8d7da',
              color: connectionTestResult.success ? '#155724' : '#721c24',
              border: `1px solid ${connectionTestResult.success ? '#c3e6cb' : '#f5c6cb'}`,
            }}>
              {connectionTestResult.message}
            </div>
          )}
          <div style={{ color: '#666', fontSize: '12px', marginTop: '5px' }}>
            Test your credentials or fetch models available in {awsRegion}
          </div>
        </div>
      )}

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
              cursor: 'pointer',
              marginBottom: '15px'
            }}
          >
            {awsRegions.map((region) => {
              console.log('[LLMConfig] Rendering region option:', region);
              return (
                <option key={region} value={region}>
                  {region}
                </option>
              );
            })}
          </select>
          <div style={{ color: '#666', fontSize: '12px', marginBottom: '15px' }}>
            Select the AWS region where you have Bedrock access (defaults to us-east-1)
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={useRegionalInference}
                onChange={(e) => setUseRegionalInference(e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              <span style={{ fontWeight: 'bold' }}>Use Regional Inference</span>
            </label>
            <div style={{ color: '#666', fontSize: '12px', marginTop: '5px' }}>
              Enable regional inference endpoints for improved performance and data residency
            </div>
          </div>

          {useRegionalInference && (
            <div style={{ marginBottom: '15px' }}>
              <label htmlFor="regionalInferenceEndpoint" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Regional Inference Endpoint (Optional)
              </label>
              <input
                id="regionalInferenceEndpoint"
                type="text"
                value={regionalInferenceEndpoint}
                onChange={(e) => setRegionalInferenceEndpoint(e.target.value)}
                placeholder={`https://bedrock-runtime.${awsRegion}.amazonaws.com`}
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
                Leave empty to auto-generate endpoint based on selected region
              </div>
            </div>
          )}
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

        {/* Model Filtering Controls - Only show for Bedrock */}
        {provider === 'bedrock' && models.length > 0 && (
          <div style={{ marginBottom: '15px', padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
            <div style={{ marginBottom: '8px', fontSize: '14px', fontWeight: 'bold', color: '#495057' }}>
              Model Filters
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '13px' }}>
                <input
                  type="checkbox"
                  checked={showProvisionedModels}
                  onChange={(e) => setShowProvisionedModels(e.target.checked)}
                  style={{ marginRight: '8px' }}
                />
                <span>Show Provisioned Throughput models</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '13px' }}>
                <input
                  type="checkbox"
                  checked={showInferenceProfiles}
                  onChange={(e) => setShowInferenceProfiles(e.target.checked)}
                  style={{ marginRight: '8px' }}
                />
                <span>Show Regional Inference Profiles (us.*, eu.*, etc.)</span>
              </label>
            </div>
            <div style={{ fontSize: '11px', color: '#6c757d', marginTop: '8px' }}>
              Provisioned models require pre-allocated capacity. Inference profiles provide regional optimization.
            </div>
          </div>
        )}

        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="model" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Model
          </label>
          <select
            id="model"
            value={model}
            onChange={(e) => {
              console.log('[Frontend] Model selection changed to:', e.target.value);
              setModel(e.target.value);
            }}
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
            {(() => {
              // Filter models based on user preferences
              let filteredModels = models;

              if (provider === 'bedrock') {
                filteredModels = models.filter(m => {
                  // Always show on-demand models
                  if (m.supportsOnDemand && !m.requiresProvisioned) {
                    return true;
                  }

                  // Show provisioned models only if enabled
                  if (m.requiresProvisioned && !showProvisionedModels) {
                    return false;
                  }

                  // Show inference profiles only if enabled
                  if (m.isInferenceProfile && !showInferenceProfiles) {
                    return false;
                  }

                  return true;
                });
              }

              return filteredModels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.id}
                  {m.requiresProvisioned ? ' (Provisioned)' : ''}
                  {m.isInferenceProfile ? ' (Regional)' : ''}
                </option>
              ));
            })()}
          </select>
          {loadingModels && (
            <div style={{ color: '#666', fontSize: '12px', marginTop: '5px' }}>
              Loading available models...
            </div>
          )}
          {!loadingModels && (
            <div style={{ color: '#666', fontSize: '12px', marginTop: '5px' }}>
              {provider === 'openai'
                ? 'GPT-4 is recommended for best results.'
                : modelsFetched
                  ? (() => {
                    // Calculate filtered count for display
                    let filteredCount = models.length;
                    if (provider === 'bedrock') {
                      filteredCount = models.filter(m => {
                        if (m.supportsOnDemand && !m.requiresProvisioned) return true;
                        if (m.requiresProvisioned && !showProvisionedModels) return false;
                        if (m.isInferenceProfile && !showInferenceProfiles) return false;
                        return true;
                      }).length;
                    }
                    return `Showing ${filteredCount} of ${models.length} models available in ${awsRegion}`;
                  })()
                  : 'Click "Fetch Available Models" button above to load models from AWS Bedrock'}
            </div>
          )}
        </div>

        {/* Voice Settings - Show for both OpenAI and Bedrock */}
        {(provider === 'openai' || provider === 'bedrock') && (
          <VoiceSettings
            voiceType={voiceType}
            streamingMode={streamingMode}
            onVoiceTypeChange={setVoiceType}
            onStreamingModeChange={setStreamingMode}
            provider={provider}
            voiceService={voiceService}
            onVoiceServiceChange={handleVoiceServiceChange}
          />
        )}

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
            cursor: 'pointer',
            marginTop: '20px'
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
