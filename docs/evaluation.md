# CatalAIst MVP – Evaluation (Kiro Project)

## Metrics

| Metric | Description | Target |
|---------|--------------|--------|
| Classification accuracy | Match rate between AI and human labels | ≥ 80% |
| Completion time | Avg time per session | ≤ 5 minutes |
| User feedback | % thumbs-up ratings | ≥ 80% |
| Audit completeness | % of sessions fully logged | 100% |
| Prompt traceability | % of LLM calls linked to a prompt version | 100% |

## Governance
- Every LLM prompt and response logged with timestamp and model ID.
- All prompts editable in `prompts/` with version history.
- Anonymised session data.
- Explainability mode for reasoning trace.
