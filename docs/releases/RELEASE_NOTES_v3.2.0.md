# Release Notes - v3.2.0

**Date:** February 2, 2026  
**Focus:** Discovery-First Intelligence & Dynamic Configuration

## 🌟 Highlights

This release introduces significant improvements to the classification intelligence, making it more robust, transparent, and configurable.

### 🧠 Discovery-First Intelligence
- **Higher Quality Bar**: The auto-classification threshold has been raised to **0.95**. This ensures that the system only skips manual review when it is extremely confident.
- **Mandatory Strategic Evidence**: The system now requires information related to strategic questions (e.g., "What are the success criteria?", "Who is the sponsor?") before it will automatically classify a process.
- **Information Completeness Assessment**: A new algorithm evaluates user descriptions to identify and prioritize missing information gaps.

### ⚙️ Dynamic Strategic Questions
- **Admin Configuration**: Admins can now manage strategic questions directly in the **Configuration** tab. 
- **automated Injection**: Questions are automatically injected into:
    - **Classification Prompts**: To help the LLM identify missing strategic info.
    - **Attribute Extraction Prompts**: To ensure strategic data is captured in the analytical record.

### 📊 Robust Attribute Extraction
- **Flexible Parser**: The extraction engine can now handle both nested JSON and flat JSON responses from LLM providers (OpenAI and Bedrock).
- **Key Aliases**: Support for attribute variations (e.g., `judgement_required` vs `judgment_required`, `impact` vs `business_value`).
- **Enhanced Reliability**: Reduced "unknown" attribute frequency by improving the LLM's understanding of required evidence.

### ⏱️ Session Lifecycle & Hygiene
- **2-Hour Inactivity Timeout**: Standard (non-voice) sessions now automatically close after 2 hours of inactivity to maintain clear session data.
- **Background Cleanup**: Automated task triggers during normal usage to keep the system performant.

## 🛠️ Technical Changes
- **Git-Based Decision Matrix**: Matrix configurations are now versioned in the repository for better tracking of logic changes.
- **Improved Loop Detection**: Stricter checks to prevent the LLM from entering repetitive clarification cycles.

## 📦 How to Update
1. Pull the latest repository changes.
2. Rebuild your Docker containers: `docker-compose build --no-cache`.
3. Restart the services: `docker-compose up -d`.
4. Verify the version at the bottom of the login page (v3.2.0).
