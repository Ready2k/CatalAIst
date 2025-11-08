import React from 'react';
import { Classification, TransformationCategory } from '../../../shared/types';
import VoicePlayer from './VoicePlayer';

interface ClassificationResultProps {
  classification: Classification;
  onSynthesize?: (text: string) => Promise<Blob>;
  voiceEnabled?: boolean;
  autoPlayVoice?: boolean;
}

const ClassificationResult: React.FC<ClassificationResultProps> = ({
  classification,
  onSynthesize,
  voiceEnabled = false,
  autoPlayVoice = false,
}) => {
  const getCategoryColor = (category: TransformationCategory): string => {
    const colors: Record<TransformationCategory, string> = {
      'Eliminate': '#dc3545',
      'Simplify': '#fd7e14',
      'Digitise': '#ffc107',
      'RPA': '#20c997',
      'AI Agent': '#17a2b8',
      'Agentic AI': '#6f42c1',
    };
    return colors[category] || '#6c757d';
  };

  const getConfidenceLabel = (confidence: number): string => {
    if (confidence >= 0.85) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.85) return '#28a745';
    if (confidence >= 0.6) return '#ffc107';
    return '#dc3545';
  };

  const hasDecisionMatrixOverride = classification.decisionMatrixEvaluation?.overridden;

  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#fff',
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '30px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ marginTop: 0, marginBottom: '20px' }}>
          Classification Result
        </h2>

        {/* Category Badge */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{
            display: 'inline-block',
            padding: '12px 24px',
            backgroundColor: getCategoryColor(classification.category),
            color: '#fff',
            borderRadius: '6px',
            fontSize: '24px',
            fontWeight: 'bold'
          }}>
            {classification.category}
          </div>
        </div>

        {/* Confidence Score */}
        <div style={{
          marginBottom: '20px',
          padding: '15px',
          backgroundColor: '#f8f9fa',
          borderRadius: '6px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px'
          }}>
            <span style={{ fontWeight: 'bold' }}>Confidence Score:</span>
            <span style={{
              padding: '4px 12px',
              backgroundColor: getConfidenceColor(classification.confidence),
              color: '#fff',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: 'bold'
            }}>
              {getConfidenceLabel(classification.confidence)} ({Math.round(classification.confidence * 100)}%)
            </span>
          </div>
          <div style={{
            width: '100%',
            height: '8px',
            backgroundColor: '#e9ecef',
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${classification.confidence * 100}%`,
              height: '100%',
              backgroundColor: getConfidenceColor(classification.confidence),
              transition: 'width 0.5s ease'
            }} />
          </div>
        </div>

        {/* Decision Matrix Override Notice */}
        {hasDecisionMatrixOverride && (
          <div style={{
            marginBottom: '20px',
            padding: '15px',
            backgroundColor: '#d1ecf1',
            border: '1px solid #bee5eb',
            borderRadius: '6px',
            color: '#0c5460'
          }}>
            <strong>ℹ️ Decision Matrix Applied</strong>
            <p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>
              The classification was adjusted based on business rules.
            </p>
            {classification.decisionMatrixEvaluation && (
              <div style={{ marginTop: '10px', fontSize: '14px' }}>
                <div>
                  <strong>Original:</strong> {classification.decisionMatrixEvaluation.originalClassification.category}
                </div>
                <div>
                  <strong>Final:</strong> {classification.category}
                </div>
                <div style={{ marginTop: '8px' }}>
                  <strong>Rules Applied:</strong>
                  <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                    {classification.decisionMatrixEvaluation.triggeredRules.map((rule, idx) => (
                      <li key={idx}>{rule.ruleName}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Rationale */}
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '10px' }}>Rationale</h3>
          <p style={{
            lineHeight: '1.6',
            color: '#333',
            padding: '15px',
            backgroundColor: '#f8f9fa',
            borderRadius: '6px',
            margin: 0
          }}>
            {classification.rationale}
          </p>
        </div>

        {/* Category Progression */}
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '10px' }}>Category Progression</h3>
          <p style={{
            lineHeight: '1.6',
            color: '#333',
            padding: '15px',
            backgroundColor: '#f8f9fa',
            borderRadius: '6px',
            margin: 0
          }}>
            {classification.categoryProgression}
          </p>
        </div>

        {/* Future Opportunities */}
        {classification.futureOpportunities && (
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '10px' }}>Future Opportunities</h3>
            <p style={{
              lineHeight: '1.6',
              color: '#333',
              padding: '15px',
              backgroundColor: '#e7f3ff',
              borderRadius: '6px',
              margin: 0,
              borderLeft: '4px solid #007bff'
            }}>
              {classification.futureOpportunities}
            </p>
          </div>
        )}

        {/* Voice Playback */}
        {voiceEnabled && onSynthesize && (
          <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #ddd' }}>
            <VoicePlayer
              text={`Classification: ${classification.category}. ${classification.rationale}`}
              onSynthesize={onSynthesize}
              autoPlay={autoPlayVoice}
            />
          </div>
        )}

        {/* Metadata */}
        <div style={{
          marginTop: '20px',
          paddingTop: '20px',
          borderTop: '1px solid #ddd',
          fontSize: '12px',
          color: '#999'
        }}>
          <div>Model: {classification.modelUsed || 'N/A'}</div>
          <div>Provider: {classification.llmProvider || 'N/A'}</div>
          <div>
            Timestamp: {classification.timestamp 
              ? new Date(classification.timestamp).toLocaleString() 
              : 'N/A'}
          </div>
          {classification.decisionMatrixEvaluation && (
            <div>Decision Matrix Version: {classification.decisionMatrixEvaluation.matrixVersion}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClassificationResult;
