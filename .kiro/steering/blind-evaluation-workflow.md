# Blind Evaluation Workflow - Development Guidelines

## Critical Rule: User Role Determines Visibility

**MANDATORY**: All classification results must be hidden from regular users and shown only to admins for review.

---

## User Role Types

### Regular Users (role: 'user')
- **Can Access:** Classifier, Configuration, Logout
- **Cannot Access:** Analytics, Decision Matrix, AI Learning, Prompts, Audit Trail, Admin Review, Users
- **Classification Results:** HIDDEN - Users see "Thank You" message only
- **Purpose:** Submit process descriptions without bias from AI results

### Admin Users (role: 'admin')
- **Can Access:** All features including Admin Review
- **Classification Results:** VISIBLE - Admins see full classification immediately
- **Purpose:** Review and approve/correct user submissions, manage system

---

## Backend Implementation

### Session Status Management

**Status Values:**
- `active` - Session in progress
- `pending_admin_review` - Regular user completed, awaiting admin review
- `completed` - Admin user completed OR admin reviewed
- `manual_review` - Low confidence, needs review

**Status Assignment:**
```typescript
// In process routes after classification
const authReq = req as AuthRequest;
const userRole = authReq.user?.role || 'user';
session.status = userRole === 'admin' ? 'completed' : 'pending_admin_review';
```

### Response Handling

**For Regular Users:**
```typescript
if (userRole === 'admin') {
  res.json({
    sessionId: session.sessionId,
    classification: classificationToStore,
    decisionMatrixEvaluation,
    extractedAttributes,
    responseTime: Date.now() - startTime
  });
} else {
  // Regular users get thank you message
  res.json({
    sessionId: session.sessionId,
    message: 'Thank you for your time. Your submission has been recorded and will be reviewed.',
    submitted: true,
    responseTime: Date.now() - startTime
  });
}
```

### Admin Review Routes

**Required Routes:**
- `GET /api/admin/pending-reviews` - Get sessions awaiting review (paginated)
- `POST /api/admin/review/:sessionId` - Submit admin review (approve/correct)
- `GET /api/admin/review-stats` - Get review statistics

**Authentication:**
```typescript
// All admin routes require admin role
app.use('/api/admin', authenticateToken, requireRole('admin'), adminReviewRoutes);
```

---

## Frontend Implementation

### Navigation Visibility

**Regular Users See:**
```typescript
<button onClick={() => setCurrentView('main')}>Classifier</button>
<button onClick={() => setCurrentView('configuration')}>Configuration</button>
<button onClick={handleLogout}>Logout</button>
```

**Admins See (Additional):**
```typescript
{userRole === 'admin' && (
  <>
    <button onClick={() => setCurrentView('analytics')}>Analytics</button>
    <button onClick={() => setCurrentView('decision-matrix')}>Decision Matrix</button>
    <button onClick={() => setCurrentView('learning')}>AI Learning</button>
    <button onClick={() => setCurrentView('prompts')}>Prompts</button>
    <button onClick={() => setCurrentView('audit')}>Audit Trail</button>
    <button onClick={() => setCurrentView('admin-review')}>Admin Review</button>
    <button onClick={() => setCurrentView('users')}>Users</button>
  </>
)}
```

### Workflow States

**New State: 'submitted'**
```typescript
type WorkflowState = 'input' | 'clarification' | 'result' | 'feedback' | 'submitted';
```

**State Handling:**
```typescript
// Check response type
if (response.submitted) {
  setWorkflowState('submitted'); // Regular user
} else if (response.classification) {
  setWorkflowState('result'); // Admin user
}
```

### Thank You Message

```typescript
{workflowState === 'submitted' && (
  <div style={{ /* success styling */ }}>
    <div style={{ fontSize: '48px' }}>✓</div>
    <h2>Thank You!</h2>
    <p>Your submission has been recorded and will be reviewed by an administrator.</p>
    <button onClick={resetWorkflow}>Submit Another Process</button>
  </div>
)}
```

---

## Database Schema

### Session Interface Updates

```typescript
interface Session {
  sessionId: string;
  initiativeId: string;
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'completed' | 'manual_review' | 'pending_admin_review';
  modelUsed: string;
  subject?: string;
  conversations: Conversation[];
  classification?: Classification;
  feedback?: Feedback;
  userRating?: UserRating;
  adminReview?: AdminReview; // NEW
}

interface AdminReview {
  reviewed: boolean;
  reviewedBy?: string;
  reviewedAt?: string;
  approved?: boolean;
  correctedCategory?: TransformationCategory;
  reviewNotes?: string;
}
```

---

## Admin Review Component

### Required Features

1. **Statistics Dashboard**
   - Pending reviews count
   - Approved count
   - Corrected count
   - Approval rate

2. **Session List**
   - Paginated list of pending sessions
   - Show creation date, subject, description preview
   - Click to review

3. **Review Panel**
   - Full process description
   - Clarification Q&A (if any)
   - AI classification with confidence and rationale
   - Approve button
   - Correct dropdown (select correct category)
   - Review notes textarea
   - Submit review

4. **Accessibility**
   - Keyboard navigation
   - Screen reader support
   - Clear focus indicators
   - Responsive design

---

## API Service Methods

### Required Methods

```typescript
// Get pending reviews (paginated)
async getPendingReviews(page: number = 1, limit: number = 20): Promise<{
  sessions: Session[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}>

// Submit admin review
async submitAdminReview(
  sessionId: string,
  approved: boolean,
  correctedCategory?: TransformationCategory,
  reviewNotes?: string
): Promise<void>

// Get review statistics
async getAdminReviewStats(): Promise<{
  pendingCount: number;
  reviewedCount: number;
  approvedCount: number;
  correctedCount: number;
  approvalRate: number;
}>
```

---

## Audit Logging

### Log Admin Reviews

```typescript
await auditLogService.log({
  sessionId,
  timestamp: new Date().toISOString(),
  eventType: 'feedback',
  userId,
  data: {
    adminReview: true,
    approved,
    correctedCategory,
    reviewNotes,
    originalCategory: session.classification?.category
  },
  piiScrubbed: false,
  metadata: {
    modelVersion: session.modelUsed
  }
});
```

### Log User Role in Classifications

```typescript
await auditLogService.logClassification(
  sessionId,
  userId,
  finalClassification,
  decisionMatrix?.version || null,
  decisionMatrixEvaluation,
  classificationResult.llmPrompt,
  classificationResult.llmResponse,
  false,
  {
    modelVersion: model,
    llmProvider,
    latencyMs: Date.now() - startTime,
    decisionMatrixVersion: decisionMatrix?.version,
    action: 'auto_classify',
    userRole // Include user role
  }
);
```

---

## Testing Checklist

### Backend Tests
- [ ] Regular user gets `pending_admin_review` status
- [ ] Admin user gets `completed` status
- [ ] Regular user response has `submitted: true`
- [ ] Admin user response has `classification` object
- [ ] Admin review routes require admin role
- [ ] Pending reviews endpoint returns correct sessions
- [ ] Review submission updates session correctly
- [ ] Statistics endpoint calculates correctly

### Frontend Tests
- [ ] Regular users see only Classifier/Configuration/Logout
- [ ] Admins see all navigation tabs
- [ ] Regular users see thank you message after submission
- [ ] Admins see classification results immediately
- [ ] Admin Review tab shows pending sessions
- [ ] Review panel displays all information correctly
- [ ] Approve/Correct actions work correctly
- [ ] Statistics update after review

### Integration Tests
- [ ] End-to-end user submission flow
- [ ] End-to-end admin review flow
- [ ] Role-based access control works
- [ ] Audit logs capture all events

---

## Common Mistakes to Avoid

### ❌ Don't Do This

```typescript
// Don't show classification to all users
res.json({
  classification: classificationToStore
});

// Don't allow regular users to access admin routes
app.use('/api/admin', adminReviewRoutes);

// Don't forget to check user role
session.status = 'completed';

// Don't show admin tabs to regular users
<button onClick={() => setCurrentView('analytics')}>Analytics</button>
```

### ✅ Do This Instead

```typescript
// Check user role and return appropriate response
if (userRole === 'admin') {
  res.json({ classification: classificationToStore });
} else {
  res.json({ submitted: true, message: 'Thank you...' });
}

// Protect admin routes with role check
app.use('/api/admin', authenticateToken, requireRole('admin'), adminReviewRoutes);

// Set status based on user role
session.status = userRole === 'admin' ? 'completed' : 'pending_admin_review';

// Conditionally show admin tabs
{userRole === 'admin' && (
  <button onClick={() => setCurrentView('analytics')}>Analytics</button>
)}
```

---

## Benefits of This Approach

1. **Reduces Bias** - Users don't see AI results, preventing adjustment of future submissions
2. **Quality Control** - Human oversight ensures accuracy
3. **Learning Data** - Corrections provide training data
4. **Transparency** - Clear separation of roles
5. **Audit Trail** - All reviews logged
6. **Scalability** - Can add more reviewers as needed

---

## Future Enhancements

- Email notifications for pending reviews
- Bulk review actions
- Review assignment to specific admins
- Review quality metrics
- Inter-rater reliability tracking
- Machine learning from corrections
- Review time tracking
- Reviewer performance analytics

---

**Last Updated:** November 16, 2025  
**Version:** 3.0.0
