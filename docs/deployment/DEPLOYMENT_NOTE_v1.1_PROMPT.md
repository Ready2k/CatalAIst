# Deployment Note: Clarification Prompt v1.1

## What Changed

The clarification prompt has been enhanced to ask more critical questions about automation feasibility, particularly around:
- Data source (observational vs. transactional)
- Output usage (who uses it and how)
- Human judgment requirements
- Process variability

## Deployment Steps

### Option 1: Automatic (Recommended)

The new prompt is embedded in the code as a fallback. Simply restart the backend:

```bash
docker-compose restart backend
```

The system will use the enhanced prompt immediately.

### Option 2: Manual Prompt File Creation

If you want to use the versioned prompt file (for easier editing via admin UI):

1. Create the new prompt file:
```bash
cat > data/prompts/clarification-v1.1.txt << 'EOF'
[Copy content from backend/src/services/clarification.service.ts getClarificationSystemPrompt() method]
EOF
```

2. Restart the backend:
```bash
docker-compose restart backend
```

The system will automatically load v1.1 as the latest version.

### Option 3: Via Admin UI (After Deployment)

1. Navigate to Admin → Prompt Management
2. Select "clarification" prompt
3. Click "Edit" or "New Version"
4. Paste the enhanced prompt content
5. Save as version 1.1

## Verification

After deployment, verify the new prompt is active:

1. Start a new session with a brief process description
2. Check that clarification questions ask about:
   - Data source (observational vs. automated)
   - Output format and usage
   - Human judgment requirements

Example test input:
```
"I create weekly reports showing customer feedback trends"
```

Expected questions should include:
- "Where does the customer feedback data come from? Is it from automated surveys or your observations?"
- "What format is the report, and what do managers do with it?"
- "Does creating the report involve interpretation or is it purely data aggregation?"

## Rollback

If issues arise, rollback to v1.0:

### Via Code
Revert the commit:
```bash
git revert cac0c47
docker-compose restart backend
```

### Via Admin UI
1. Navigate to Admin → Prompt Management
2. Select "clarification" prompt
3. Choose version 1.0
4. Click "Activate" or "Use This Version"

## Monitoring

After deployment, monitor:

1. **Clarification Quality**: Are questions more comprehensive?
2. **Classification Accuracy**: Are classifications more accurate after clarification?
3. **User Feedback**: Do users find questions helpful?
4. **Session Completion**: Are users completing sessions or abandoning?

Check these metrics in Admin → Analytics Dashboard.

## Expected Impact

- **More Questions Asked**: Clarification trigger rate may increase slightly
- **Better Classifications**: Accuracy should improve, especially for report/analysis processes
- **Fewer RPA Misclassifications**: Processes requiring human judgment should be correctly identified
- **Longer Sessions**: Sessions may take slightly longer due to more thorough discovery

## Support

If you encounter issues:

1. Check backend logs: `docker-compose logs backend`
2. Verify prompt is loaded: Check startup logs for "Prompt exists: clarification-v1.1.txt"
3. Test with known scenarios to compare v1.0 vs v1.1 behavior
4. Report issues with session IDs for investigation

## Related Documentation

- `CLARIFICATION_PROMPT_ENHANCEMENT.md` - Detailed explanation of changes
- `CLARIFICATION_IMPROVEMENT.md` - Original quality assessment fix
- `CHANGELOG.md` - Version history
