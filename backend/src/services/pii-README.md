# PII Detection and Scrubbing Service

## Overview

The PII (Personally Identifiable Information) service provides automated detection, anonymization, and secure storage of sensitive data in user inputs. This ensures compliance with privacy regulations and maintains audit trails.

**Requirements:** 14.1, 14.2, 14.3, 14.4, 14.5

## Components

### 1. PIIDetectionService
Regex-based detection of PII patterns:
- **Email addresses** (RFC 5322 format)
- **Phone numbers** (international formats including US, UK, Australia, etc.)
- **Social Security Numbers** (US SSN format)
- **Credit card numbers** (Visa, MasterCard, Amex, Discover with Luhn validation)

### 2. PIIMappingService
Secure storage and retrieval of PII mappings:
- **AES-256-GCM encryption** for original values
- **Access logging** for all retrieval operations
- **Audit trail** of who accessed what and when

### 3. PIIService
Unified interface combining detection and storage:
- Detect and scrub PII in one operation
- Automatically store encrypted mappings
- Retrieve original values when authorized

## Usage

### Basic PII Scrubbing

```typescript
import { PIIService } from './services';

const piiService = new PIIService();

// Scrub PII and store mappings
const result = await piiService.scrubAndStore(
  "Contact John at john.doe@example.com or call 555-123-4567",
  sessionId,
  userId
);

console.log(result.scrubbedText);
// Output: "Contact John at [EMAIL_1] or call [PHONE_1]"

console.log(result.hasPII); // true
console.log(result.mapping); // PIIMapping object with encrypted values
```

### Scrub Without Storage

```typescript
// For temporary operations where you don't need to store mappings
const result = piiService.scrubOnly(
  "My SSN is 123-45-6789"
);

console.log(result.scrubbedText);
// Output: "My SSN is [SSN_1]"
```

### Retrieve Original Values

```typescript
// Retrieve and decrypt a specific PII value (requires authorization)
const originalEmail = await piiService.getDecryptedValue(
  sessionId,
  '[EMAIL_1]',
  userId,
  'audit_review'
);

console.log(originalEmail); // "john.doe@example.com"
```

### Access Logging

```typescript
// Get access log for a session's PII mappings
const accessLog = await piiService.getAccessLog(sessionId);

accessLog.forEach(entry => {
  console.log(`${entry.userId} accessed PII at ${entry.timestamp} for ${entry.purpose}`);
});
```

## Detection Patterns

### Email Addresses
- Pattern: `user@domain.com`
- Token format: `[EMAIL_1]`, `[EMAIL_2]`, etc.

### Phone Numbers
Supports multiple international formats:
- US/Canada: `(555) 123-4567`, `555-123-4567`, `555.123.4567`
- International: `+44 20 7123 4567`, `+61 2 1234 5678`
- Token format: `[PHONE_1]`, `[PHONE_2]`, etc.

### Social Security Numbers
- Pattern: `123-45-6789`, `123 45 6789`, `123456789`
- Token format: `[SSN_1]`, `[SSN_2]`, etc.

### Credit Card Numbers
Validates using Luhn algorithm:
- Visa (13-16 digits starting with 4)
- MasterCard (16 digits starting with 51-55 or 2221-2720)
- Amex (15 digits starting with 34 or 37)
- Discover (16 digits starting with 6011, 644-649, 65)
- Token format: `[CARD_1]`, `[CARD_2]`, etc.

## Encryption

### Algorithm
- **AES-256-GCM** (Galois/Counter Mode)
- Provides both confidentiality and authenticity
- Each encrypted value includes:
  - Random 16-byte initialization vector (IV)
  - Authentication tag for integrity verification
  - Encrypted data

### Key Management
Set the encryption key via environment variable:
```bash
export PII_ENCRYPTION_KEY="your-secure-key-here"
```

**⚠️ Important:** In production, use a proper key management service (AWS KMS, Azure Key Vault, etc.)

## Storage Structure

PII mappings are stored in `/data/pii-mappings/{sessionId}.json`:

```json
{
  "mappingId": "uuid",
  "sessionId": "uuid",
  "mappings": [
    {
      "token": "[EMAIL_1]",
      "originalValue": "iv:authTag:encrypted",
      "type": "email"
    }
  ],
  "createdAt": "2025-11-07T10:30:00.000Z",
  "accessLog": [
    {
      "userId": "admin",
      "timestamp": "2025-11-07T10:30:00.000Z",
      "purpose": "create_mapping"
    }
  ]
}
```

## Integration with Audit Logging

Before logging any user input or model interaction:

```typescript
import { PIIService } from './services';
import { AuditLogService } from './services';

const piiService = new PIIService();
const auditLog = new AuditLogService();

// Scrub PII before logging
const scrubResult = await piiService.scrubAndStore(
  userInput,
  sessionId,
  userId
);

// Log the scrubbed version
await auditLog.log({
  sessionId,
  timestamp: new Date().toISOString(),
  eventType: 'input',
  userId,
  data: { input: scrubResult.scrubbedText },
  piiScrubbed: scrubResult.hasPII,
  metadata: {}
});
```

## Security Considerations

1. **Encryption Key**: Never commit encryption keys to version control
2. **Access Control**: Only authorized users should retrieve original PII values
3. **Audit Trail**: All PII access is logged with user ID, timestamp, and purpose
4. **Data Retention**: Consider implementing automatic deletion of old PII mappings
5. **Key Rotation**: Plan for periodic encryption key rotation in production

## Testing

The service includes comprehensive pattern matching for various PII formats. Test with:

```typescript
const testCases = [
  "Email: test@example.com",
  "Phone: +1-555-123-4567",
  "SSN: 123-45-6789",
  "Card: 4532-1234-5678-9010"
];

for (const test of testCases) {
  const result = piiService.scrubOnly(test);
  console.log(`Original: ${test}`);
  console.log(`Scrubbed: ${result.scrubbedText}`);
  console.log(`Has PII: ${result.hasPII}\n`);
}
```

## Future Enhancements (Phase 2)

- ML-based name detection using NER models
- Address detection and anonymization
- Custom entity recognition for domain-specific PII
- Integration with cloud key management services (AWS KMS, Azure Key Vault)
- Automatic PII mapping expiration and cleanup
