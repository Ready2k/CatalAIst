#!/usr/bin/env node

/**
 * Debug script for regional inference issue
 * This script helps identify why model fetching fails when regional inference is enabled
 */

const API_BASE = 'http://localhost:8080';

async function testRegionalInferenceModelFetch() {
  console.log('🔍 Debugging Regional Inference Model Fetch Issue\n');
  
  // Test 1: Normal Bedrock call (should work)
  console.log('1. Testing normal Bedrock model fetch...');
  try {
    const response = await fetch(`${API_BASE}/api/public/models?provider=bedrock`, {
      headers: {
        'x-aws-access-key-id': 'AKIATEST12345',
        'x-aws-secret-access-key': 'test-secret-key-12345',
        'x-aws-region': 'us-east-1'
      }
    });
    
    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test 2: Bedrock call with regional inference (fails)
  console.log('2. Testing Bedrock model fetch with regional inference...');
  try {
    const response = await fetch(`${API_BASE}/api/public/models?provider=bedrock`, {
      headers: {
        'x-aws-access-key-id': 'AKIATEST12345',
        'x-aws-secret-access-key': 'test-secret-key-12345',
        'x-aws-region': 'us-east-1',
        'x-use-regional-inference': 'true'
      }
    });
    
    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test 3: Bedrock call with custom regional inference endpoint
  console.log('3. Testing Bedrock model fetch with custom regional inference endpoint...');
  try {
    const response = await fetch(`${API_BASE}/api/public/models?provider=bedrock`, {
      headers: {
        'x-aws-access-key-id': 'AKIATEST12345',
        'x-aws-secret-access-key': 'test-secret-key-12345',
        'x-aws-region': 'eu-west-1',
        'x-use-regional-inference': 'true',
        'x-regional-inference-endpoint': 'https://bedrock-runtime.eu-west-1.amazonaws.com'
      }
    });
    
    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  
  console.log('\n📝 Debug Notes:');
  console.log('- Check backend logs for detailed error messages');
  console.log('- Look for [Bedrock] and [PublicRoutes] log entries');
  console.log('- Verify that regional inference is using correct endpoints:');
  console.log('  - Model listing: https://bedrock.{region}.amazonaws.com (control plane)');
  console.log('  - Model inference: https://bedrock-runtime.{region}.amazonaws.com (runtime)');
}

// Run the test
if (require.main === module) {
  testRegionalInferenceModelFetch().catch(console.error);
}

module.exports = { testRegionalInferenceModelFetch };