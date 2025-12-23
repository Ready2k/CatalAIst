# Testing the Reclassify Fix

## Quick Test Steps

### 1. Start the Application
```bash
# If using Docker
docker-compose up

# Or for local development
cd backend && npm start
cd frontend && npm start
```

### 2. Login
- Navigate to http://localhost (or your configured URL)
- Login with admin credentials
- Username: `admin`
- Password: (your configured password)

### 3. Configure LLM Provider

#### For OpenAI:
1. Click "Configuration" tab
2. Select "OpenAI" as provider
3. Enter your OpenAI API key
4. Select a model (e.g., gpt-4)
5. Click "Save Configuration"

#### For AWS Bedrock:
1. Click "Configuration" tab
2. Select "AWS Bedrock" as provider
3. Enter AWS Access Key ID
4. Enter AWS Secret Access Key
5. (Optional) Enter Session Token
6. Select AWS Region
7. Select a model (e.g., anthropic.claude-v2)
8. Click "Save Configuration"

### 4. Create a Test Session
1. Click "Classifier" tab
2. Enter a process description:
   ```
   We manually review and approve purchase orders by checking them against budget spreadsheets and emailing approvals.
   ```
3. Click "Submit"
4. Answer any clarification questions if prompted
5. Wait for classification result (admins see results immediately)

### 5. Test Reclassify Feature

#### Option A: From Analytics
1. Click "Analytics" tab
2. Scroll to "Recent Sessions" section
3. Click on the session you just created
4. Session detail modal opens

#### Option B: From Admin Review
1. Click "Admin Review" tab
2. Find the session in the pending reviews list
3. Click "View Details"
4. Session detail modal opens

#### In the Session Detail Modal:
1. Click the "Classification" tab
2. Click the "🔄 Reclassify" button
3. Confirm the reclassification when prompted

### 6. Verify Success

**Expected Results:**
- ✅ No error message appears
- ✅ A success message shows: "✅ Classification Changed!" or "ℹ️ Classification Unchanged"
- ✅ Original and new classifications are displayed
- ✅ Confidence scores are shown
- ✅ Page reloads after 3 seconds to show updated data

**Previous Error (Now Fixed):**
- ❌ "Error: OpenAI API key is required"
- ❌ 400 Bad Request

## Testing Different Scenarios

### Scenario 1: Missing Credentials
1. Open browser console (F12)
2. Run: `sessionStorage.removeItem('llmCredentials')`
3. Try to reclassify
4. **Expected:** Clear error message: "No LLM credentials found. Please reconfigure your LLM provider in the Configuration tab."

### Scenario 2: After Logout/Login
1. Logout
2. Login again
3. Configure LLM provider again
4. Try to reclassify an existing session
5. **Expected:** Reclassification works correctly

### Scenario 3: Different Providers
1. Create a session with OpenAI
2. Logout and login
3. Configure AWS Bedrock
4. Try to reclassify the OpenAI session
5. **Expected:** Error message about provider mismatch or missing credentials

### Scenario 4: Page Reload
1. Configure LLM provider
2. Reload the page (F5)
3. Try to reclassify
4. **Expected:** Need to reconfigure (credentials don't persist across page reloads by design)

## Debugging

### Check Credentials in Browser Console
```javascript
// Check if credentials are stored
console.log(sessionStorage.getItem('llmCredentials'));

// Should show something like:
// {"provider":"openai","model":"gpt-4","apiKey":"sk-..."}
```

### Check Network Request
1. Open browser DevTools (F12)
2. Go to Network tab
3. Click Reclassify
4. Find the POST request to `/api/process/reclassify`
5. Check the request payload - should include `apiKey` or AWS credentials

### Check Backend Logs
```bash
# If using Docker
docker-compose logs -f backend

# Look for:
# [Reclassify] Starting reclassification for session <sessionId>
# [Reclassify] Original: <category> (<confidence>)
# [Reclassify] Using model: <model>, provider: <provider>
# [Reclassify] After decision matrix: <category> (<confidence>)
# [Reclassify] Complete - Changed: <true/false>, Confidence Δ: <delta>
```

## Common Issues

### Issue: "No LLM credentials found"
**Solution:** Configure your LLM provider in the Configuration tab

### Issue: "OpenAI API key is missing"
**Solution:** Ensure you entered a valid API key when configuring OpenAI

### Issue: "AWS credentials are incomplete"
**Solution:** Ensure you entered both Access Key ID and Secret Access Key for Bedrock

### Issue: Reclassify button is disabled
**Solution:** This is expected during reclassification. Wait for it to complete.

### Issue: 401 Unauthorized
**Solution:** Your session expired. Logout and login again.

## Success Criteria

The fix is working correctly if:
- ✅ Reclassify works after configuring LLM provider
- ✅ Clear error messages when credentials are missing
- ✅ Credentials are cleared on logout
- ✅ No console errors during reclassification
- ✅ Backend logs show successful reclassification

---

**Test Date:** November 16, 2025  
**Version:** 3.0.0
