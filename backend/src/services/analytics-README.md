# Analytics Service

## Overview

The Analytics Service calculates and tracks system performance metrics for the CatalAIst classifier. It provides insights into classification accuracy, user satisfaction, and system performance.

## Features

### Metrics Calculated

1. **Overall Agreement Rate**: Percentage of classifications confirmed by users
2. **Agreement Rate by Category**: Agreement rate broken down by each transformation category
3. **User Satisfaction Rate**: Percentage of thumbs up ratings
4. **Average Classification Time**: Average time from session creation to classification
5. **Total Sessions**: Total number of sessions processed
6. **Alert Triggered**: Flag when agreement rate falls below 80%

## API Endpoints

### GET /api/analytics/dashboard

Recalculates all metrics on-demand and returns the dashboard data.

**Response:**
```json
{
  "metrics": {
    "metricId": "uuid",
    "calculatedAt": "ISO8601 timestamp",
    "overallAgreementRate": 0.85,
    "agreementRateByCategory": {
      "Eliminate": 0.90,
      "Simplify": 0.85,
      "Digitise": 0.80,
      "RPA": 0.85,
      "AI Agent": 0.82,
      "Agentic AI": 0.88
    },
    "userSatisfactionRate": 0.92,
    "totalSessions": 150,
    "averageClassificationTimeMs": 3500,
    "alertTriggered": false
  },
  "alert": null
}
```

**Alert Response (when agreement rate < 80%):**
```json
{
  "metrics": { ... },
  "alert": {
    "message": "Agreement rate is below 80% threshold",
    "overallAgreementRate": 0.75,
    "threshold": 0.8
  }
}
```

### GET /api/analytics/metrics

Returns cached metrics without recalculation.

### POST /api/analytics/recalculate

Manually triggers metrics recalculation and saves to storage.

## Storage

Metrics are stored in `/data/analytics/metrics.json` and recalculated on-demand when the dashboard endpoint is accessed.

## Requirements Satisfied

- **12.1**: Calculate overall agreement rate
- **12.2**: Calculate agreement rate by category
- **12.3**: Recalculate metrics on-demand
- **12.4**: Flag when agreement rate < 80%
- **12.5**: Calculate user satisfaction rate (thumbs up percentage)
- **13.4**: Calculate average classification time and track total sessions
- **13.5**: Store metrics in /data/analytics/metrics.json

## Usage Example

```typescript
import { AnalyticsService } from './services/analytics.service';
import { JsonStorageService } from './services/storage.service';
import { SessionStorageService } from './services/session-storage.service';

const jsonStorage = new JsonStorageService('./data');
const sessionStorage = new SessionStorageService(jsonStorage);
const analyticsService = new AnalyticsService(jsonStorage, sessionStorage);

// Get dashboard metrics (recalculates)
const metrics = await analyticsService.getDashboardMetrics();

// Check for alerts
if (metrics.alertTriggered) {
  console.warn('Agreement rate is below 80%!');
}
```

## Implementation Notes

- Metrics are calculated from all session files in `/data/sessions/`
- Sessions without feedback are excluded from agreement rate calculations
- Sessions without ratings are excluded from satisfaction rate calculations
- Default values (1.0 or 100%) are used when no data is available
- Corrupted session files are logged and skipped during calculation
- All metrics are validated using Zod schemas before storage
