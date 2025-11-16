# Decision Matrix Export/Import Feature

## Overview

The Decision Matrix Export/Import feature allows administrators to backup, share, and restore decision matrices. This is useful for:

- **Backup & Recovery**: Save decision matrices before making major changes
- **Version Control**: Export specific versions for archival purposes
- **Sharing**: Share decision matrices between environments (dev, staging, prod)
- **Migration**: Move decision matrices between systems
- **Collaboration**: Share matrices with other teams or organizations

## Features

### 1. Export Current Version

Export the currently active decision matrix as a JSON file.

**How to Use:**
1. Navigate to Decision Matrix Admin
2. Click the "📥 Export" button
3. File downloads automatically with naming format: `decision-matrix-v{version}-{date}.json`

**Export Format:**
```json
{
  "exportedAt": "2025-11-16T12:00:00.000Z",
  "exportedBy": "admin",
  "systemVersion": "3.0.0",
  "matrix": {
    "version": "1.5",
    "createdAt": "2025-11-16T12:00:00.000Z",
    "createdBy": "admin",
    "description": "Production decision matrix",
    "active": true,
    "attributes": [...],
    "rules": [...]
  }
}
```

### 2. Export All Versions

Export all decision matrix versions as a single JSON file.

**How to Use:**
1. Navigate to Decision Matrix Admin
2. Click Help menu (❓)
3. Select "Export All Versions"
4. File downloads with naming format: `decision-matrices-all-versions-{date}.json`

**Export Format:**
```json
{
  "exportedAt": "2025-11-16T12:00:00.000Z",
  "exportedBy": "admin",
  "systemVersion": "3.0.0",
  "versionsCount": 5,
  "matrices": [
    { "version": "1.0", ... },
    { "version": "1.1", ... },
    { "version": "1.2", ... },
    { "version": "1.3", ... },
    { "version": "1.4", ... }
  ]
}
```

### 3. Import Decision Matrix

Import a previously exported decision matrix.

**How to Use:**
1. Navigate to Decision Matrix Admin
2. Click the "📤 Import" button
3. Select a JSON file (exported decision matrix)
4. Review the import dialog showing:
   - File version
   - Number of rules and attributes
   - Export date
5. If a matrix already exists:
   - Check "Replace existing matrix" to proceed
   - This creates a new version (doesn't overwrite)
6. Click "✓ Import"

**Import Behavior:**
- **No existing matrix**: Imports with the version from the file (or defaults to 1.0)
- **Matrix exists**: Creates a new version (increments from current version)
- **Version conflict**: Always creates a new version to preserve history
- **Validation**: Validates the imported matrix structure before saving

## API Endpoints

### GET /api/decision-matrix/export

Export the current decision matrix.

**Query Parameters:**
- `version` (optional): Specific version to export

**Response:**
- Content-Type: `application/json`
- Content-Disposition: `attachment; filename="decision-matrix-v{version}-{date}.json"`

**Example:**
```bash
curl -H "Authorization: Bearer {token}" \
  http://localhost:8080/api/decision-matrix/export \
  -o decision-matrix.json
```

### GET /api/decision-matrix/export/all-versions

Export all decision matrix versions.

**Response:**
- Content-Type: `application/json`
- Content-Disposition: `attachment; filename="decision-matrices-all-versions-{date}.json"`

**Example:**
```bash
curl -H "Authorization: Bearer {token}" \
  http://localhost:8080/api/decision-matrix/export/all-versions \
  -o all-matrices.json
```

### POST /api/decision-matrix/import

Import a decision matrix from JSON.

**Request Body:**
```json
{
  "matrix": {
    "version": "1.5",
    "attributes": [...],
    "rules": [...]
  },
  "replaceExisting": false,
  "userId": "admin"
}
```

**Response:**
```json
{
  "message": "Decision matrix imported successfully",
  "importedVersion": "1.5",
  "newVersion": "1.6",
  "matrix": { ... }
}
```

**Error Responses:**
- `400`: Invalid matrix format
- `409`: Matrix already exists (set `replaceExisting: true`)

**Example:**
```bash
curl -X POST \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d @decision-matrix.json \
  http://localhost:8080/api/decision-matrix/import
```

## Use Cases

### 1. Backup Before Major Changes

**Scenario:** You're about to make significant changes to the decision matrix.

**Steps:**
1. Export current version
2. Save file to backup location
3. Make changes
4. If needed, import the backup to restore

### 2. Promote from Dev to Production

**Scenario:** You've tested a new matrix in development and want to deploy to production.

**Steps:**
1. In dev environment: Export the tested matrix
2. In prod environment: Import the matrix
3. Check "Replace existing" to create new version
4. Test the imported matrix
5. If issues, revert to previous version

### 3. Share with Another Team

**Scenario:** Another team wants to use your decision matrix as a starting point.

**Steps:**
1. Export your current matrix
2. Share the JSON file
3. They import it into their system
4. They can modify it for their needs

### 4. Version Archival

**Scenario:** You want to keep historical versions for compliance.

**Steps:**
1. Periodically export all versions
2. Store in version control (Git) or document management system
3. Tag with date and description
4. Can restore any version if needed

### 5. Disaster Recovery

**Scenario:** Database corruption or accidental deletion.

**Steps:**
1. Restore from most recent export
2. Import the matrix
3. System creates new version
4. Verify rules and attributes
5. Resume operations

## Security Considerations

### Access Control

- **Export**: Admin users only
- **Import**: Admin users only
- **Authentication**: JWT token required for all operations
- **Audit Logging**: All export/import operations are logged

### Data Validation

- **Import validation**: Matrix structure is validated against schema
- **Version checking**: Prevents accidental overwrites
- **Confirmation required**: User must explicitly confirm replacement

### Best Practices

1. **Regular Backups**: Export matrices weekly or after major changes
2. **Version Control**: Store exports in Git for change tracking
3. **Testing**: Always test imported matrices in non-production first
4. **Documentation**: Document why each export was created
5. **Access Logs**: Review audit logs for unauthorized access

## File Format Specification

### Export File Structure

```typescript
interface ExportFile {
  exportedAt: string;        // ISO 8601 timestamp
  exportedBy: string;        // Username who exported
  systemVersion: string;     // CatalAIst version (e.g., "3.0.0")
  matrix: DecisionMatrix;    // The decision matrix
}
```

### Decision Matrix Structure

```typescript
interface DecisionMatrix {
  version: string;
  createdAt: string;
  createdBy: string;
  description: string;
  active: boolean;
  attributes: Attribute[];
  rules: Rule[];
}
```

### Compatibility

- **Forward Compatible**: Newer versions can import older matrices
- **Backward Compatible**: Older versions may not support new features
- **Validation**: Schema validation ensures compatibility
- **Migration**: System automatically migrates old formats

## Troubleshooting

### Import Fails with "Invalid matrix format"

**Cause:** JSON file is corrupted or not a valid decision matrix export.

**Solution:**
1. Verify the file is a valid JSON
2. Check it has the required fields (matrix, version, attributes, rules)
3. Try exporting a fresh copy if available

### Import Fails with "Matrix already exists"

**Cause:** A decision matrix already exists and `replaceExisting` is false.

**Solution:**
1. Check "Replace existing matrix" in the import dialog
2. This will create a new version (doesn't delete existing)

### Exported File is Empty

**Cause:** No decision matrix exists to export.

**Solution:**
1. Generate a decision matrix first
2. Or import an existing matrix

### Import Creates Wrong Version Number

**Cause:** Version numbering is automatic based on current version.

**Solution:**
- This is expected behavior
- System always increments from current version
- Preserves version history
- Original version is stored in description

## Audit Trail

All export/import operations are logged in the audit trail:

### Export Log Entry
```json
{
  "timestamp": "2025-11-16T12:00:00.000Z",
  "eventType": "classification",
  "userId": "admin",
  "data": {
    "action": "decision_matrix_exported",
    "version": "1.5",
    "filename": "decision-matrix-v1.5-2025-11-16.json"
  }
}
```

### Import Log Entry
```json
{
  "timestamp": "2025-11-16T12:00:00.000Z",
  "eventType": "classification",
  "userId": "admin",
  "data": {
    "action": "decision_matrix_imported",
    "importedVersion": "1.5",
    "newVersion": "1.6",
    "previousVersion": "1.5",
    "rulesCount": 25,
    "attributesCount": 6,
    "replaceExisting": true
  }
}
```

## Future Enhancements

Potential future additions:

1. **Scheduled Exports**: Automatic daily/weekly exports
2. **Cloud Backup**: Direct export to S3, Azure Blob, etc.
3. **Diff View**: Compare two matrix versions before import
4. **Selective Import**: Import only specific rules or attributes
5. **Merge Capability**: Merge two matrices together
6. **Export Templates**: Export as template (remove specific values)
7. **Import Validation**: Pre-import validation and preview
8. **Rollback**: One-click rollback to previous version

## Related Documentation

- [Decision Matrix Flow Visualization](../docs/decision-matrix-flow-visualization.md)
- [Security Requirements](../.kiro/steering/security-requirements.md)
- [Audit Trail](../docs/AUDIT_TRAIL.md)

---

**Version:** 3.0.0  
**Last Updated:** November 16, 2025
