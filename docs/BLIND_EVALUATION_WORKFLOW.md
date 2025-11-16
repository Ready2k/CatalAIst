# Blind Evaluation Workflow

## Overview

The blind evaluation workflow implements a human-in-the-loop review process where regular users submit their process descriptions without seeing the AI's classification results. Administrators then review and approve or correct each classification.

## User Experience

### Regular Users (Profile Type)

1. **Submit Process Description**
   - User describes their business process
   - System may ask clarifying questions
   - User answers questions

2. **Thank You Message**
   - After submission, user sees: "Thank you for your time. Your submission has been recorded and will be reviewed."
   - User does NOT see the AI classification
   - This prevents bias in future submissions

3. **Submit Another**
   - User can submit another process immediately
   - Each submission is independent

### Admin Users

1. **See Classification Results**
   - Admins see the full AI classification immediately
   - This allows them to verify the system is working correctly

2. **Review Pending Evaluations**
   - Navigate to "Admin Review" tab
   - See dashboard with pending reviews count
   - View list of submissions awaiting review

3. **Review Each Submission**
   - Read the process description
   - Review clarification Q&A (if any)
   - See the AI's classification and rationale
   - Approve or correct the classification
   - Add review notes (optional)

4. **Track Statistics**
   - Pending reviews count
   - Approved count
   - Corrected count
   - Approval rate

## Technical Implementation

### Database Changes

**Session Status**:
- Added new status: `pending_admin_review`
- Regular users get this status after classification
- Admins get `completed` status (can see results immediately)

**Admin Review Fields**:
```typescript
interface AdminReview {
  reviewed: boolean;
  reviewedBy?: string;
  reviewedAt?: string;
  approved?: boolean;
  correctedCategory?: TransformationCategory;
  reviewNotes?: string;
}
```

### Backend Changes

**New Routes** (`/api/admin/*`):
- `GET /api/admin/pending-reviews` - Get sessions awaiting review
- `POST /api/admin/review/:sessionId` - Submit admin review
- `GET /api/admin/review-stats` - Get review statistics

**Process Routes Modified**:
- `/api/process/submit` - Check user role, set appropriate status
- `/api/process/classify` - Check user role, return appropriate response
- `/api/process/clarify` - Check user role, handle blind evaluation

**Response Handling**:
- Regular users: `{ submitted: true, message: "Thank you..." }`
- Admin users: `{ classification: {...}, decisionMatrixEvaluation: {...} }`

### Frontend Changes

**New Component**:
- `AdminReview.tsx` - Admin review interface with:
  - Statistics dashboard
  - Pending sessions list
  - Review panel with approve/correct actions

**App.tsx Updates**:
- Added `submitted` workflow state
- Added `admin-review` view
- Handle different responses based on user role
- Show thank you message for regular users

**API Service**:
- `getPendingReviews()` - Fetch pending reviews
- `submitAdminReview()` - Submit review decision
- `getAdminReviewStats()` - Get statistics

## Workflow Diagram

```
Regular User Flow:
┌─────────────────┐
│ Submit Process  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Clarification?  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ AI Evaluates    │
│ (Hidden)        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Thank You       │
│ Message         │
└─────────────────┘

Admin Flow:
┌─────────────────┐
│ Admin Review    │
│ Tab             │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ View Pending    │
│ Submissions     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Review Each:    │
│ - Description   │
│ - Q&A           │
│ - AI Result     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Approve or      │
│ Correct         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Next Review     │
└─────────────────┘
```

## Benefits

1. **Reduces Bias**: Users don't see AI results, preventing them from adjusting future submissions based on past classifications

2. **Quality Control**: Human oversight ensures classification accuracy

3. **Learning Data**: Admin corrections provide high-quality training data for improving the AI

4. **Transparency**: Clear separation between user input and admin review

5. **Audit Trail**: All reviews are logged with timestamps and reviewer information

## Usage

### For Regular Users

Regular users only have access to:
- **Classifier** - Submit process descriptions
- **Configuration** - Configure LLM settings
- **Logout** - Sign out

Steps:
1. Login with user credentials
2. Navigate to "Classifier" tab (default view)
3. Describe your process
4. Answer any clarifying questions
5. See thank you message
6. Submit another process if needed

### For Admins

Admins have access to all features:
- **Classifier** - Submit and see classifications immediately
- **Configuration** - Configure LLM settings
- **Analytics** - View system analytics
- **Decision Matrix** - Manage decision rules
- **AI Learning** - Review learning suggestions
- **Prompts** - Manage AI prompts
- **Audit Trail** - View audit logs
- **Admin Review** - Review user submissions
- **Users** - Manage user accounts
- **Logout** - Sign out

Steps for reviewing submissions:
1. Login with admin credentials
2. Navigate to "Admin Review" tab
3. See pending reviews count in dashboard
4. Click on a session to review
5. Read the description and AI classification
6. Choose:
   - **Approve**: AI classification is correct
   - **Correct**: Select the correct category and add notes
7. Review next submission

## Future Enhancements

- Email notifications for pending reviews
- Bulk review actions
- Review assignment to specific admins
- Review quality metrics
- Inter-rater reliability tracking
- Machine learning from corrections

## Security

- Admin review routes require `admin` role
- Regular users cannot access admin review endpoints
- All reviews are logged in audit trail
- User submissions are PII-scrubbed before storage

## Testing

To test the workflow:

1. **Create a regular user account**:
   ```bash
   curl -X POST http://localhost:4000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"username":"testuser","password":"password123","role":"user"}'
   ```

2. **Create an admin account**:
   ```bash
   curl -X POST http://localhost:4000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"username":"admin","password":"admin123","role":"admin"}'
   ```

3. **Submit as regular user**:
   - Login as testuser
   - Submit a process description
   - Verify you see thank you message (not classification)

4. **Review as admin**:
   - Login as admin
   - Navigate to Admin Review tab
   - See the pending submission
   - Approve or correct it

---

**Version**: 3.0.0  
**Last Updated**: November 16, 2025
