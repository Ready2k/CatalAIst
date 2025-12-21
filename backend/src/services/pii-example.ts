/**
 * Example usage of PII Detection and Scrubbing Service
 * This file demonstrates how to use the PII service in the CatalAIst application
 */

import { PIIService } from './pii.service';

async function demonstratePIIService() {
  console.log('=== PII Detection and Scrubbing Demo ===\n');

  const piiService = new PIIService();
  const sessionId = 'demo-session-123';
  const userId = 'demo-user';

  // Example 1: Email detection
  console.log('Example 1: Email Detection');
  const emailText = 'Please contact our team at support@catalai.com or sales@example.org for assistance.';
  const emailResult = await piiService.scrubAndStore(emailText, sessionId + '-1', userId);
  console.log('Original:', emailText);
  console.log('Scrubbed:', emailResult.scrubbedText);
  console.log('Has PII:', emailResult.hasPII);
  console.log('Matches:', emailResult.mapping?.mappings.length || 0, '\n');

  // Example 2: Phone number detection (various formats)
  console.log('Example 2: Phone Number Detection');
  const phoneText = 'Call us at (555) 123-4567 or +44 20 7123 4567 for international support.';
  const phoneResult = await piiService.scrubAndStore(phoneText, sessionId + '-2', userId);
  console.log('Original:', phoneText);
  console.log('Scrubbed:', phoneResult.scrubbedText);
  console.log('Has PII:', phoneResult.hasPII);
  console.log('Matches:', phoneResult.mapping?.mappings.length || 0, '\n');

  // Example 3: SSN detection
  console.log('Example 3: SSN Detection');
  const ssnText = 'Employee SSN: 123-45-6789 needs to be updated in the system.';
  const ssnResult = await piiService.scrubAndStore(ssnText, sessionId + '-3', userId);
  console.log('Original:', ssnText);
  console.log('Scrubbed:', ssnResult.scrubbedText);
  console.log('Has PII:', ssnResult.hasPII);
  console.log('Matches:', ssnResult.mapping?.mappings.length || 0, '\n');

  // Example 4: Credit card detection
  console.log('Example 4: Credit Card Detection');
  const cardText = 'Payment made with card 4532-1234-5678-9010 was successful.';
  const cardResult = await piiService.scrubAndStore(cardText, sessionId + '-4', userId);
  console.log('Original:', cardText);
  console.log('Scrubbed:', cardResult.scrubbedText);
  console.log('Has PII:', cardResult.hasPII);
  console.log('Matches:', cardResult.mapping?.mappings.length || 0, '\n');

  // Example 5: Mixed PII types
  console.log('Example 5: Mixed PII Types');
  const mixedText = 'John Doe (SSN: 987-65-4321) can be reached at john.doe@company.com or 555-987-6543. His card ending in 5678 was charged.';
  const mixedResult = await piiService.scrubAndStore(mixedText, sessionId + '-5', userId);
  console.log('Original:', mixedText);
  console.log('Scrubbed:', mixedResult.scrubbedText);
  console.log('Has PII:', mixedResult.hasPII);
  console.log('Matches:', mixedResult.mapping?.mappings.length || 0, '\n');

  // Example 6: No PII
  console.log('Example 6: No PII Detected');
  const cleanText = 'This is a process description about automating invoice processing using RPA technology.';
  const cleanResult = piiService.scrubOnly(cleanText);
  console.log('Original:', cleanText);
  console.log('Scrubbed:', cleanResult.scrubbedText);
  console.log('Has PII:', cleanResult.hasPII, '\n');

  // Example 7: Retrieving original values
  console.log('Example 7: Retrieving Original Values');
  const testSessionId = sessionId + '-1';
  const mappings = await piiService.getMappings(testSessionId, userId, 'demo_retrieval');
  if (mappings && mappings.mappings.length > 0) {
    const firstToken = mappings.mappings[0].token;
    const originalValue = await piiService.getDecryptedValue(
      testSessionId,
      firstToken,
      userId,
      'demo_decryption'
    );
    console.log('Token:', firstToken);
    console.log('Original Value:', originalValue);
    console.log('Type:', mappings.mappings[0].type, '\n');
  }

  // Example 8: Access log
  console.log('Example 8: Access Log');
  const accessLog = await piiService.getAccessLog(testSessionId);
  console.log('Access log entries:', accessLog.length);
  accessLog.forEach((entry, index) => {
    console.log(`  ${index + 1}. ${entry.userId} - ${entry.purpose} at ${entry.timestamp}`);
  });

  console.log('\n=== Demo Complete ===');
}

// Run the demo if this file is executed directly
if (require.main === module) {
  demonstratePIIService().catch(console.error);
}

export { demonstratePIIService };
