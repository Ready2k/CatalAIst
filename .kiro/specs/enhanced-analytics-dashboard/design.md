# Design Document

## Overview

The Enhanced Analytics Dashboard extends the existing analytics interface to provide comprehensive session-level inspection and filtering capabilities. The design follows a progressive disclosure pattern, starting with aggregate metrics and allowing administrators to drill down into individual sessions. The implementation leverages the existing session storage infrastructure and adds new API endpoints and frontend components to support filtering, searching, and detailed session viewing.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Analytics Dashboard UI                    │
│  ┌────────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │ Aggregate      │  │ Session List │  │ Session Detail  │ │
│  │ Metrics Panel  │  │ with Filters │  │ Modal           │ │
│  └────────────────┘  └──────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Service Layer                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  GET /api/analytics/sessions?filters&page&limit      │  │
│  │  GET /api/analytics/sessions/:sessionId              │  │
│  │  GET /api/analytics/sessions/export?filters          │  │
│  │  GET /api/analytics/filters/options                  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Analytics Service (Enhanced)                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  - listSessions(filters, pagination)                 │  │
│  │  - getSessionDetail(sessionId)                       │  │
│  │  - getFilterOptions()                                │  │
│  │  - exportSessionsToCSV(filters)                      │  │
│  │  - calculateFilteredMetrics(sessions)                │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Session Storage Service                     │
│                  (Existing Infrastructure)                   │
└─────────────────────────────────────────────────────────────┘
```

### Component Hierarchy

```
AnalyticsDashboard
├── AggregateMetricsPanel (existing - stays at top)
│   ├── Overall Agreement Rate
│   ├── User Satisfaction Rate
│   ├── Total Sessions
│   ├── Average Classification Time
│   └── Agreement Rate by Category
├── SessionFilters (new - below aggregate metrics)
│   ├── DateRangeFilter
│   ├── CategoryFilter
│   ├── SubjectFilter
│   ├── ModelFilter
│   ├── StatusFilter
│   └── SearchInput
├── FilteredMetricsSummary (new - shows stats for filtered sessions)
├── SessionListTable (new - main content area)
│   ├── SessionRow (multiple)
│   └── PaginationControls
└── SessionDetailModal (new - overlay/modal)
    ├── SessionMetadata
    ├── ConversationsList
    ├── ClassificationDetails
    ├── DecisionMatrixEvaluation (with triggered rules)
    ├── FeedbackDisplay
    └── UserRatingDisplay
```

**Layout Flow**:
1. Existing aggregate metrics remain at the top (unchanged)
2. New filter controls appear below metrics
3. Filtered metrics summary shows stats for current filter
4. Session list table displays below with pagination
5. Clicking a session opens detail modal as overlay

## Components and Interfaces

### Backend Components

#### 1. Enhanced Analytics Service


**Location**: `backend/src/services/analytics.service.ts`

**New Methods**:

```typescript
interface SessionFilters {
  dateFrom?: string;
  dateTo?: string;
  category?: TransformationCategory;
  subject?: string;
  model?: string;
  status?: 'active' | 'completed' | 'manual_review';
  searchText?: string;
}

interface PaginationParams {
  page: number;
  limit: number;
}

interface SessionListItem {
  sessionId: string;
  createdAt: string;
  subject?: string;
  category?: TransformationCategory;
  confidence?: number;
  status: string;
  modelUsed: string;
  feedbackConfirmed?: boolean;
  userRating?: 'up' | 'down';
  requiresAttention: boolean;
}

interface SessionListResponse {
  sessions: SessionListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// List sessions with filtering and pagination
async listSessions(
  filters: SessionFilters,
  pagination: PaginationParams
): Promise<SessionListResponse>

// Get detailed session information
async getSessionDetail(sessionId: string): Promise<Session>

// Get available filter options from existing data
async getFilterOptions(): Promise<{
  subjects: string[];
  models: string[];
  categories: TransformationCategory[];
  statuses: string[];
}>

// Calculate metrics for filtered sessions
async calculateFilteredMetrics(sessions: Session[]): Promise<{
  totalCount: number;
  averageConfidence: number;
  agreementRate: number;
  categoryDistribution: { [category: string]: number };
}>

// Export sessions to CSV format
async exportSessionsToCSV(filters: SessionFilters): Promise<string>
```

**Implementation Notes**:
- Filtering logic will iterate through all sessions and apply filters sequentially
- Text search will check process descriptions, classification rationale, and feedback comments
- Pagination will be applied after filtering to ensure accurate page counts
- Cache filter options to avoid recalculating on every request

#### 2. New Analytics Routes

**Location**: `backend/src/routes/analytics.routes.ts`

**New Endpoints**:

```typescript
// GET /api/analytics/sessions
// Query params: dateFrom, dateTo, category, subject, model, status, searchText, page, limit
router.get('/sessions', async (req, res) => {
  // Parse filters from query params
  // Call analyticsService.listSessions()
  // Return paginated session list
});

// GET /api/analytics/sessions/:sessionId
router.get('/sessions/:sessionId', async (req, res) => {
  // Call analyticsService.getSessionDetail()
  // Return full session details
});

// GET /api/analytics/filters/options
router.get('/filters/options', async (req, res) => {
  // Call analyticsService.getFilterOptions()
  // Return available filter values
});

// GET /api/analytics/sessions/export
// Query params: same as /sessions endpoint
router.get('/sessions/export', async (req, res) => {
  // Parse filters from query params
  // Call analyticsService.exportSessionsToCSV()
  // Set CSV headers and return file
});
```

**Security**:
- All endpoints require authentication via `authenticateToken` middleware
- Admin role required via `requireRole('admin')` middleware
- Rate limiting: 100 requests per 15 minutes

### Frontend Components

#### 1. SessionFilters Component

**Location**: `frontend/src/components/SessionFilters.tsx`

**Props**:
```typescript
interface SessionFiltersProps {
  filters: SessionFilters;
  onFiltersChange: (filters: SessionFilters) => void;
  filterOptions: FilterOptions;
}
```

**Features**:
- Date range picker (from/to dates)
- Dropdown for category selection
- Dropdown for subject selection
- Dropdown for model selection
- Dropdown for status selection
- Text search input with debouncing (300ms)
- Clear all filters button
- Responsive layout (stacks vertically on mobile)

**State Management**:
- Local state for filter values
- Debounced callback to parent on changes
- Validation for date ranges (from <= to)

#### 2. SessionListTable Component

**Location**: `frontend/src/components/SessionListTable.tsx`

**Props**:
```typescript
interface SessionListTableProps {
  sessions: SessionListItem[];
  loading: boolean;
  onSessionClick: (sessionId: string) => void;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  onPageChange: (page: number) => void;
}
```

**Features**:
- Sortable columns (date, confidence, category)
- Visual indicators for attention-required sessions
- Responsive table (cards on mobile)
- Loading skeleton while fetching
- Empty state when no sessions match filters
- Pagination controls at bottom

**Visual Indicators**:
- ⚠️ Warning icon for unconfirmed feedback
- 👎 Thumbs down icon for negative ratings
- 🔍 Magnifying glass for manual_review status
- ⚡ Low confidence indicator (< 0.6)
- 🎯 Badge showing number of triggered rules (e.g., "3 rules")
- 🔄 Override indicator when decision matrix changed classification
- Yellow background for manual_review sessions

#### 3. SessionDetailModal Component

**Location**: `frontend/src/components/SessionDetailModal.tsx`

**Props**:
```typescript
interface SessionDetailModalProps {
  sessionId: string;
  onClose: () => void;
}
```

**Features**:
- Full-screen modal on mobile, side panel on desktop
- Tabbed interface for different sections:
  - Overview (metadata, status)
  - Conversations (all Q&A pairs)
  - Classification (category, rationale, progression, future opportunities)
  - Decision Matrix (triggered rules, extracted attributes, override status)
  - Feedback & Rating
- Copy session ID button
- Close button with keyboard support (Escape key)
- Scroll to top on open

**Decision Matrix Tab Details**:
- Display all triggered rules with:
  - Rule name and description
  - Rule action (override, adjust_confidence, flag_review)
  - Target category or confidence adjustment
  - Rule rationale
- Show extracted attributes used for rule evaluation
- Highlight if classification was overridden by rules
- Display original vs final classification comparison
- Show which rules contributed to the final decision

**Classification Tab Details**:
- Display future opportunities section prominently
- Show category progression path
- Link future opportunities to potential triggered rules

**Layout**:
```
┌─────────────────────────────────────────┐
│  Session Details          [X] Close     │
├─────────────────────────────────────────┤
│  [Overview] [Conversations] [Class...]  │
├─────────────────────────────────────────┤
│                                         │
│  Content based on selected tab          │
│                                         │
│                                         │
└─────────────────────────────────────────┘
```

#### 4. FilteredMetricsSummary Component

**Location**: `frontend/src/components/FilteredMetricsSummary.tsx`

**Props**:
```typescript
interface FilteredMetricsSummaryProps {
  metrics: {
    totalCount: number;
    averageConfidence: number;
    agreementRate: number;
    categoryDistribution: { [category: string]: number };
  };
  loading: boolean;
}
```

**Features**:
- Compact display of filtered metrics
- Updates in real-time as filters change
- Shows comparison to overall metrics
- Collapsible on mobile to save space

## Data Models

### SessionFilters Interface

```typescript
interface SessionFilters {
  dateFrom?: string;        // ISO date string
  dateTo?: string;          // ISO date string
  category?: TransformationCategory;
  subject?: string;
  model?: string;
  status?: 'active' | 'completed' | 'manual_review';
  searchText?: string;
}
```

### SessionListItem Interface

```typescript
interface SessionListItem {
  sessionId: string;
  createdAt: string;
  subject?: string;
  category?: TransformationCategory;
  confidence?: number;
  status: string;
  modelUsed: string;
  feedbackConfirmed?: boolean;
  userRating?: 'up' | 'down';
  requiresAttention: boolean;  // Computed field
  triggeredRulesCount?: number;  // Number of rules triggered
  hasDecisionMatrix?: boolean;   // Whether decision matrix was used
}
```

### FilterOptions Interface

```typescript
interface FilterOptions {
  subjects: string[];
  models: string[];
  categories: TransformationCategory[];
  statuses: string[];
}
```

## Error Handling

### Backend Error Scenarios

1. **Session Not Found**
   - Status: 404
   - Response: `{ error: 'Session not found', sessionId: '...' }`

2. **Invalid Filter Parameters**
   - Status: 400
   - Response: `{ error: 'Invalid filter parameters', details: '...' }`

3. **Export Too Large**
   - Status: 413
   - Response: `{ error: 'Export too large', maxSessions: 10000, requestedCount: ... }`

4. **Database Error**
   - Status: 500
   - Response: `{ error: 'Failed to load sessions', message: '...' }`

### Frontend Error Handling

1. **Network Errors**
   - Display toast notification
   - Retry button for failed requests
   - Fallback to cached data if available

2. **Empty Results**
   - Show friendly empty state
   - Suggest clearing filters
   - Provide example filters

3. **Loading States**
   - Skeleton loaders for tables
   - Spinner for modal content
   - Disable interactions during load

## Testing Strategy

### Backend Tests

**Unit Tests** (`analytics.service.test.ts`):
- Test filtering logic with various combinations
- Test pagination edge cases (first page, last page, out of bounds)
- Test search text matching
- Test CSV export format
- Test filter options extraction
- Test filtered metrics calculation

**Integration Tests** (`analytics.routes.test.ts`):
- Test API endpoints with authentication
- Test query parameter parsing
- Test error responses
- Test rate limiting
- Test CSV download headers

### Frontend Tests

**Component Tests**:
- SessionFilters: Test filter changes, clear button, validation
- SessionListTable: Test sorting, pagination, row clicks, visual indicators for triggered rules
- SessionDetailModal: Test tab switching, data display, close actions, triggered rules display, future opportunities display
- FilteredMetricsSummary: Test metric calculations, loading states

**Integration Tests**:
- Test full filter → fetch → display flow
- Test pagination with filters applied
- Test search with debouncing
- Test export functionality
- Test modal open/close with keyboard

**Accessibility Tests**:
- Keyboard navigation through filters
- Screen reader announcements for filter changes
- Focus management in modal
- ARIA labels on all interactive elements

### Performance Tests

- Load time with 1000+ sessions
- Filter application time
- Search debouncing effectiveness
- Pagination response time
- Export generation time for large datasets

## Performance Optimization

### Backend Optimizations

1. **Caching Strategy**
   - Cache filter options for 5 minutes
   - Cache session list items (lightweight) for 1 minute
   - Invalidate cache on new session creation

2. **Pagination**
   - Load only requested page of sessions
   - Use streaming for CSV export to handle large datasets

3. **Filtering**
   - Apply most selective filters first
   - Short-circuit evaluation for search text
   - Index sessions by common filter fields (in-memory)

### Frontend Optimizations

1. **Debouncing**
   - Search input: 300ms debounce
   - Filter changes: 200ms debounce
   - Prevent redundant API calls

2. **Memoization**
   - Memoize filter options
   - Memoize computed session properties
   - Use React.memo for list items

3. **Virtual Scrolling**
   - Consider virtual scrolling for very large result sets
   - Render only visible rows + buffer

4. **Code Splitting**
   - Lazy load SessionDetailModal
   - Lazy load CSV export functionality

## Security Considerations

### Authentication & Authorization

- All analytics endpoints require authentication
- Admin role required for all analytics access
- Session details only accessible to authenticated admins

### Data Protection

- No PII in session list view (already scrubbed)
- PII mappings not exposed in analytics
- Audit log entry for each session detail view

### Rate Limiting

- Analytics endpoints: 100 requests / 15 minutes
- Export endpoint: 10 requests / hour (more restrictive)
- Search endpoint: 50 requests / minute

### Input Validation

- Validate all filter parameters
- Sanitize search text to prevent injection
- Validate date ranges (from <= to, not future dates)
- Limit search text length (max 500 characters)

## Accessibility

### WCAG 2.1 AA Compliance

1. **Keyboard Navigation**
   - Tab through all filters
   - Enter to apply filters
   - Arrow keys for dropdowns
   - Escape to close modal

2. **Screen Reader Support**
   - ARIA labels on all filters
   - Announce filter changes
   - Announce page changes
   - Announce session count updates

3. **Visual Design**
   - Minimum contrast ratio 4.5:1
   - Focus indicators on all interactive elements
   - Text size minimum 14px
   - Color not sole indicator (use icons + color)

4. **Responsive Design**
   - Mobile-friendly filter layout
   - Touch targets minimum 44x44px
   - Readable on small screens
   - No horizontal scrolling

## Migration Strategy

### Phase 1: Backend Implementation
1. Add new methods to AnalyticsService
2. Create new analytics routes
3. Add unit tests
4. Deploy backend changes

### Phase 2: Frontend Implementation
1. Create SessionFilters component
2. Create SessionListTable component
3. Create SessionDetailModal component
4. Create FilteredMetricsSummary component
5. Integrate into AnalyticsDashboard
6. Add component tests

### Phase 3: Testing & Refinement
1. End-to-end testing
2. Performance testing with large datasets
3. Accessibility audit
4. User acceptance testing
5. Bug fixes and refinements

### Phase 4: Documentation & Deployment
1. Update API documentation
2. Create user guide
3. Deploy to production
4. Monitor performance and errors

## Future Enhancements

- Real-time updates via WebSocket
- Advanced analytics (trends over time, cohort analysis)
- Custom report builder
- Scheduled exports via email
- Session comparison view
- Bulk session operations (delete, re-classify)
- Integration with external BI tools
