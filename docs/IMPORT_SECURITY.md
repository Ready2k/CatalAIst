# Decision Matrix Import Security

## Overview

The decision matrix import feature includes multiple layers of validation to ensure that imported files are safe and won't harm the system.

## Security Validations

### Frontend Validations

1. **File Type Restriction**
   - Only `.json` files are accepted via the file input
   - Browser enforces this at the file picker level

2. **JSON Parsing**
   - File content is parsed as JSON
   - Invalid JSON is rejected with error message
   - Prevents binary or malformed files

3. **Preview Before Import**
   - User sees matrix details before confirming
   - Shows version, rules count, attributes count
   - Requires explicit confirmation to proceed

### Backend Validations

1. **Data Presence Check**
   ```typescript
   if (!importedMatrix) {
     return res.status(400).json({
       error: 'Missing matrix data'
     });
   }
   ```

2. **Prototype Pollution Prevention**
   ```typescript
   if (matrixData.__proto__ || matrixData.constructor || matrixData.prototype) {
     return res.status(400).json({
       error: 'Matrix contains potentially harmful properties'
     });
   }
   ```
   - Blocks objects with dangerous properties
   - Prevents prototype pollution attacks

3. **Schema Validation (Zod)**
   ```typescript
   const validationResult = DecisionMatrixSchema.safeParse(matrixData);
   ```
   - Validates complete structure against TypeScript schema
   - Checks all required fields exist
   - Validates data types (strings, numbers, enums)
   - Validates nested objects (rules, conditions, actions, attributes)
   - Returns detailed error messages for invalid data

4. **Size Limits (DoS Prevention)**
   ```typescript
   if (matrix.rules.length > 1000) {
     return res.status(400).json({
       error: 'Matrix too large',
       message: 'Decision matrix cannot have more than 1000 rules'
     });
   }
   
   if (matrix.attributes.length > 100) {
     return res.status(400).json({
       error: 'Matrix too large',
       message: 'Decision matrix cannot have more than 100 attributes'
     });
   }
   ```
   - Prevents importing extremely large matrices
   - Protects against memory exhaustion
   - Prevents performance degradation

5. **Conflict Detection**
   ```typescript
   if (currentMatrix && !replaceExisting) {
     return res.status(409).json({
       error: 'Matrix already exists',
       message: 'Set replaceExisting=true to import anyway.'
     });
   }
   ```
   - Prevents accidental overwrites
   - Requires explicit permission to replace

6. **Data Sanitization**
   ```typescript
   description: matrix.description 
     ? `${matrix.description.substring(0, 500)} (Imported)`
     : `Imported from v${matrix.version}`
   ```
   - Limits description length to 500 characters
   - Prevents excessively long strings

7. **Audit Logging**
   - All imports are logged with:
     - User ID
     - Timestamp
     - Imported version
     - New version
     - Rules and attributes count
     - Whether it replaced existing matrix

## What Gets Validated

### Matrix Structure
- ✅ Version number (string)
- ✅ Description (string, max 500 chars)
- ✅ Created date (ISO string)
- ✅ Created by (string)
- ✅ Active flag (boolean)

### Rules Array
- ✅ Each rule has required fields:
  - `id` (string)
  - `name` (string)
  - `priority` (number, 0-100)
  - `active` (boolean)
  - `conditions` (array)
  - `action` (object)

### Conditions
- ✅ Attribute name (string)
- ✅ Operator (enum: equals, not_equals, greater_than, etc.)
- ✅ Value (string)

### Actions
- ✅ Type (enum: adjust_confidence, override_category, etc.)
- ✅ Parameters (object with type-specific fields)

### Attributes
- ✅ Name (string)
- ✅ Type (enum: text, number, boolean, etc.)
- ✅ Weight (number, 0-1)
- ✅ Description (string)

## What Gets Rejected

### ❌ Invalid Files
- Non-JSON files
- Malformed JSON
- Missing required fields
- Wrong data types
- Invalid enum values

### ❌ Malicious Content
- Prototype pollution attempts
- Excessively large matrices (>1000 rules or >100 attributes)
- Objects with `__proto__`, `constructor`, or `prototype` properties

### ❌ Conflicts
- Attempting to import when matrix exists without `replaceExisting=true`

## Safe Import Process

1. **User selects file** → Frontend validates it's JSON
2. **Frontend parses JSON** → Shows preview dialog
3. **User confirms import** → Sends to backend
4. **Backend validates structure** → Checks against schema
5. **Backend checks limits** → Ensures reasonable size
6. **Backend checks conflicts** → Prevents accidental overwrites
7. **Backend sanitizes data** → Limits string lengths
8. **Backend saves matrix** → Creates new version
9. **Backend logs action** → Audit trail created
10. **User sees success** → Matrix is active

## Testing Import Security

### Test Valid Import
```bash
# Export current matrix
curl http://localhost:8080/api/decision-matrix/export > matrix.json

# Import it back
curl -X POST http://localhost:8080/api/decision-matrix/import \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d @matrix.json
```

### Test Invalid JSON
```bash
echo "not json" > invalid.txt
# Try to import - should fail at frontend
```

### Test Missing Fields
```bash
echo '{"version": "1.0"}' > incomplete.json
curl -X POST http://localhost:8080/api/decision-matrix/import \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d @incomplete.json
# Should return 400 with validation errors
```

### Test Size Limits
```bash
# Create matrix with 1001 rules
# Should return 400: "Matrix too large"
```

### Test Prototype Pollution
```bash
echo '{"__proto__": {"isAdmin": true}, "matrix": {...}}' > malicious.json
curl -X POST http://localhost:8080/api/decision-matrix/import \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d @malicious.json
# Should return 400: "Matrix contains potentially harmful properties"
```

## Additional Security Measures

### Authentication Required
- All import endpoints require valid JWT token
- Only authenticated users can import
- User ID is logged for audit trail

### Rate Limiting
- Import endpoint is rate-limited (100 requests / 15 minutes)
- Prevents brute force attacks
- Prevents DoS via repeated imports

### CORS Protection
- Import endpoint respects CORS configuration
- Only allowed origins can import
- Credentials required for cross-origin requests

## Best Practices

### For Administrators
1. Only import matrices from trusted sources
2. Review matrix contents before importing
3. Use `replaceExisting=false` first to check for conflicts
4. Keep backups of current matrix before importing
5. Review audit logs after imports

### For Developers
1. Always validate imported data against schema
2. Set reasonable size limits
3. Sanitize all string inputs
4. Log all import actions
5. Test with malicious inputs
6. Keep Zod schemas up to date

## Version History

- **v3.0.0** (2025-11-16): Added comprehensive import security
  - Prototype pollution prevention
  - Size limits
  - Schema validation
  - Audit logging
  - Conflict detection

---

**Last Updated:** November 16, 2025
