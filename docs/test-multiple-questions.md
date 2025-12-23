# Test Plan: Multiple Questions Fix

## Overview
This test plan verifies that the clarification loop fix allows users to answer all questions in a batch without premature loop detection.

## Test Scenario 1: Multiple Questions in First Round

### Setup
1. Start the backend: `cd backend && npm start`
2. Start the frontend: `cd frontend && npm start`
3. Login to the application
4. Configure LLM provider (OpenAI or Bedrock)

### Test Steps
1. Submit a vague process description that will trigger clarification:
   ```
   "We need to automate a process for handling customer requests"
   ```

2. **Expected**: System generates 2-3 clarification questions

3. **Verify**: Frontend shows "Question 1 of 3" (or similar)

4. Answer the first question:
   ```
   "Customer service agents receive requests via email"
   ```

5. **Expected**: System shows "Question 2 of 3"

6. Answer the second question:
   ```
   "We get about 50 requests per day"
   ```

7. **Expected**: System shows "Question 3 of 3"

8. Answer the third question:
   ```
   "Currently it's all manual - agents read emails and update a spreadsheet"
   ```

9. **Expected**: System either:
   - Provides classification (if enough info)
   - Asks additional clarification questions (if needed)

10. **Verify**: No premature "loop detected" message

## Test Scenario 2: Multiple Rounds of Questions

### Test Steps
1. Submit a very vague description:
   ```
   "We have a process that needs improvement"
   ```

2. Answer questions one at a time through multiple rounds

3. **Verify**: 
   - Each question in a batch is asked
   - No premature loop detection
   - System continues until it has enough information

## Test Scenario 3: Actual Loop Detection (Should Still Work)

### Test Steps
1. Submit a process description
2. When asked clarification questions, provide very vague answers:
   ```
   "I don't know"
   "Not sure"
   "Can't say"
   ```

3. **Expected**: After 2-3 such answers, system should:
   - Detect user frustration/lack of knowledge
   - Stop asking questions
   - Proceed with classification

## Test Scenario 4: Natural Completion

### Test Steps
1. Submit a detailed process description:
   ```
   "We need to automate our monthly financial reporting process. 
   Currently, 5 accountants spend 2 days each month manually pulling 
   data from 3 different systems (SAP, Salesforce, and our custom ERP), 
   consolidating it in Excel, and creating PowerPoint presentations for 
   the executive team. The data includes revenue, expenses, and KPIs. 
   This is a critical process that runs monthly and involves sensitive 
   financial data."
   ```

2. **Expected**: System should:
   - Either classify immediately (high confidence)
   - Or ask 1-2 targeted questions
   - Not ask excessive questions

## Success Criteria

### ✅ Pass Conditions:
- All questions in a batch are asked before classification
- Loop detection only triggers for actual loops (no questions generated)
- Users can answer 5+ questions without premature termination
- Natural conversation flow is maintained

### ❌ Fail Conditions:
- System forces classification after only 1-2 answers
- "Loop detected" message appears when answering questions normally
- Questions are skipped or not presented to user

## Debugging

### Check Backend Logs
Look for these log messages:
```
[Clarification Loop Detected] Session <id>: Empty question rounds: 2
```

This should ONLY appear when:
- LLM stops generating questions
- User shows frustration patterns

This should NOT appear when:
- User is answering questions normally
- Multiple questions are in a batch

### Check Audit Logs
Use the Audit Trail view to see:
- How many questions were asked in each round
- How many answers were provided
- Whether loop detection was triggered

### Session Data
Check the session JSON files in `backend/data/sessions/` to verify:
- All Q&A pairs are recorded
- Classification happens at the right time

## Related Documentation
- `Logs/clarification-loop-fix.md` - Detailed explanation of the fix
- `backend/src/services/clarification.service.ts` - Question generation logic
- `backend/src/routes/process.routes.ts` - Loop detection logic

---

**Date:** November 12, 2025
**Purpose:** Verify multiple questions fix
