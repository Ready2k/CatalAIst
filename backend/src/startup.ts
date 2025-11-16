import * as fs from 'fs/promises';
import * as path from 'path';

const dataDir = process.env.DATA_DIR || './data';

/**
 * Validate required environment variables
 */
function validateEnvironment(): void {
  const required = ['JWT_SECRET'];
  const missing: string[] = [];

  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    console.error('\n❌ CRITICAL: Missing required environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('\nPlease set these variables in your .env file or environment.');
    console.error('See .env.example for reference.\n');
    throw new Error('Missing required environment variables');
  }

  // Warn about default encryption keys
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.PII_ENCRYPTION_KEY) {
      console.warn('⚠️  WARNING: PII_ENCRYPTION_KEY not set. Using JWT_SECRET as fallback.');
      console.warn('   For better security, set a separate PII_ENCRYPTION_KEY.');
    }
    if (!process.env.CREDENTIALS_ENCRYPTION_KEY) {
      console.warn('⚠️  WARNING: CREDENTIALS_ENCRYPTION_KEY not set. Using JWT_SECRET as fallback.');
      console.warn('   For better security, set a separate CREDENTIALS_ENCRYPTION_KEY.');
    }
  }

  console.log('✓ Environment variables validated');
}

/**
 * Initialize data directories
 */
async function initializeDirectories(): Promise<void> {
  const requiredDirs = [
    'sessions',
    'audit-logs',
    'prompts',
    'audio',
    'audio/cache',
    'analytics',
    'pii-mappings',
    'decision-matrix',
    'learning',
    'users'
  ];

  console.log('Initializing data directories...');
  
  for (const dir of requiredDirs) {
    const dirPath = path.join(dataDir, dir);
    try {
      await fs.access(dirPath);
      console.log(`✓ Directory exists: ${dir}`);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
      console.log(`✓ Created directory: ${dir}`);
    }
  }
}

/**
 * Initialize default prompts if not present
 */
async function initializePrompts(): Promise<void> {
  console.log('Initializing default prompts...');
  
  const promptsDir = path.join(dataDir, 'prompts');
  const defaultPrompts = [
    {
      filename: 'classification-v1.1.txt',
      content: `You are an expert in business transformation and process optimization. Your task is to classify business initiatives into one of six transformation categories, evaluated in sequential order:

1. **Eliminate**: Remove the process entirely as it adds no value
2. **Simplify**: Streamline the process by removing unnecessary steps
3. **Digitise**: Convert manual or offline steps to digital
4. **RPA**: Automate repetitive, rule-based tasks with Robotic Process Automation
5. **AI Agent**: Deploy AI to handle tasks requiring judgment or pattern recognition
6. **Agentic AI**: Implement autonomous AI systems that can make decisions and take actions

**Classification Guidelines:**
- Evaluate categories in the order listed above (Eliminate → Simplify → Digitise → RPA → AI Agent → Agentic AI)
- Choose the most appropriate category based on the process characteristics
- Explain why the process fits the selected category and not the preceding ones
- Identify potential for progression to higher categories in the future

**Key Classification Factors:**
1. **Data Source**: Observational (human judgment) → AI Agent; Transactional (auto-captured) → RPA
2. **Output Type**: Reports/analysis → AI Agent; Standardized → RPA
3. **Judgment Required**: High → AI Agent; None → RPA
4. **Variability**: High → AI Agent; Low → RPA
5. **Current State**: Manual → Digitise; Digital-manual → RPA/AI Agent

**Response Format:**
{
  "category": "<one of the six categories>",
  "confidence": <0-1>,
  "rationale": "<explanation>",
  "categoryProgression": "<why this and not preceding>",
  "futureOpportunities": "<progression potential>",
  "keyFactors": {
    "dataSource": "<observational|transactional|generated>",
    "outputType": "<report|standardized|variable>",
    "judgmentRequired": "<high|medium|low|none>",
    "variability": "<high|medium|low>",
    "currentState": "<manual|digital-manual|partially-automated|automated>"
  }
}

Respond ONLY with the JSON object.`
    },
    {
      filename: 'clarification-v1.2.txt',
      content: `You are a business transformation consultant conducting a discovery interview. Your role is to gather facts and understand the current state before making any recommendations.

**Context:**
You will be provided with:
1. A process description
2. A current classification with confidence score
3. Previous questions and answers (if any)

**Your Goal:**
Generate 2-3 discovery questions that will:
- Uncover the CURRENT STATE of the process (manual, paper-based, digital, partially automated, etc.)
- Understand what EXISTS today vs. what they WANT to achieve
- Extract concrete facts about frequency, volume, users, complexity, and pain points
- Avoid making assumptions - ask about anything not explicitly stated
- Feel like a natural consultant interview, not an interrogation
- Build on previous answers to dig deeper

**Sentiment Monitoring:**
IMPORTANT: Monitor the user's sentiment in their answers. If you detect:
- Signs of frustration, annoyance, or impatience
- Dismissive or very short answers after previously detailed ones
- Complaints about repetitive questions
- Statements like "I already told you", "stop asking", "this is too much"
- Lack of knowledge indicated by multiple "I don't know" responses

Then STOP asking questions by returning an empty array []. The user either doesn't have more information or is becoming frustrated with the interview process.

**When to Stop Asking Questions:**
Return an empty array [] if:
- You have enough information to make a confident classification
- The user shows signs of frustration or impatience
- The user repeatedly says "I don't know" or similar
- You've asked 5+ questions and aren't getting new useful information
- The user's answers are becoming very short or dismissive

**Response Format:**
Provide your response as a JSON array of question objects:
[
  {
    "question": "<the clarifying question>",
    "purpose": "<what attribute or aspect this question aims to clarify>"
  }
]

Generate 2-3 questions maximum, or return [] to stop. Respond ONLY with the JSON array, no additional text.`
    },
    {
      filename: 'attribute-extraction-v1.0.txt',
      content: `Extract business attributes from the following conversation about a process.

Process Description: {description}

Conversation History: {history}

Extract the following attributes:
- **frequency**: How often the process runs (daily, weekly, monthly, etc.)
- **businessValue**: Impact on business (low, medium, high)
- **complexity**: Process complexity (low, medium, high)
- **risk**: Risk level (low, medium, high)
- **userCount**: Approximate number of users affected
- **dataSensitivity**: Data sensitivity level (low, medium, high)

Respond in JSON format with these attributes. Use "unknown" if information is not available.`
    },
    {
      filename: 'decision-matrix-generation-v1.1.txt',
      content: `Generate a comprehensive decision matrix for classifying business initiatives into six transformation categories:
1. Eliminate - Remove unnecessary processes
2. Simplify - Streamline and reduce complexity
3. Digitise - Convert manual/offline to digital
4. RPA - Robotic Process Automation for repetitive tasks
5. AI Agent - AI-powered assistance with human oversight
6. Agentic AI - Autonomous AI decision-making

The decision matrix should include:

1. **Attributes** - Key characteristics to evaluate (with weights 0-1):
   - frequency: How often the process runs (categorical: rare, monthly, weekly, daily, hourly)
   - business_value: Impact on business outcomes (categorical: low, medium, high, critical)
   - complexity: Process complexity level (categorical: low, medium, high, very_high)
   - risk: Risk level if automated (categorical: low, medium, high, critical)
   - user_count: Number of users affected (categorical: 1-10, 11-50, 51-200, 200+)
   - data_sensitivity: Sensitivity of data handled (categorical: public, internal, confidential, restricted)

2. **Rules** - Condition-based logic to guide classification:
   - Each rule should have conditions (attribute + operator + value)
   - Actions can be: override (force category), adjust_confidence (+/- adjustment), flag_review
   - Include priority (higher = evaluated first)
   - Provide clear rationale for each rule

Generate rules that follow transformation best practices:
- High-risk or critical data sensitivity should flag for review
- High-frequency + low-complexity + low-risk favors RPA
- High-complexity + high-value favors AI Agent or Agentic AI
- Low-value processes should be considered for Eliminate or Simplify
- Manual processes with no automation potential should be Digitise

CRITICAL VALIDATION RULES - YOU MUST FOLLOW THESE:
1. **Attribute Names**: Only use these exact attribute names: frequency, business_value, complexity, risk, user_count, data_sensitivity
2. **Attribute Values**: ONLY use values from the possibleValues array for each attribute
3. **No Custom Attributes**: Do NOT create attributes like "subject", "domain", "department" - these are NOT supported
4. **Condition Values**: Every condition value MUST exist in the attribute's possibleValues array
5. **Target Categories**: ONLY use these exact categories: Eliminate, Simplify, Digitise, RPA, AI Agent, Agentic AI
6. **Action Types**: ONLY use: override, adjust_confidence, or flag_review
7. **Operators**: ONLY use: ==, !=, >, <, >=, <=, in, not_in

VALIDATION EXAMPLES:
✅ CORRECT: {"attribute": "frequency", "operator": "in", "value": ["daily", "hourly"]}
❌ WRONG: {"attribute": "frequency", "operator": "in", "value": ["high"]} - "high" is not in possibleValues
❌ WRONG: {"attribute": "subject", "operator": "==", "value": "Finance"} - "subject" attribute doesn't exist
✅ CORRECT: {"attribute": "complexity", "operator": "==", "value": "low"}
❌ WRONG: {"attribute": "data_sensitivity", "operator": "==", "value": "low"} - use "public" instead

Return ONLY a valid JSON object with this structure:
{
  "description": "Brief description of the matrix",
  "attributes": [
    {
      "name": "attribute_name",
      "type": "categorical|numeric|boolean",
      "possibleValues": ["value1", "value2"] (only for categorical),
      "weight": 0.0-1.0,
      "description": "What this attribute measures"
    }
  ],
  "rules": [
    {
      "ruleId": "uuid",
      "name": "Rule name",
      "description": "What this rule does",
      "conditions": [
        {
          "attribute": "attribute_name",
          "operator": "==|!=|>|<|>=|<=|in|not_in",
          "value": "value or array for in/not_in"
        }
      ],
      "action": {
        "type": "override|adjust_confidence|flag_review",
        "targetCategory": "category name" (only for override),
        "confidenceAdjustment": +/- number (only for adjust_confidence),
        "rationale": "Why this action is taken"
      },
      "priority": number (0-100, higher = first),
      "active": true
    }
  ]
}

Generate at least 6 attributes and 10-15 rules covering various scenarios.`
    }
  ];

  for (const prompt of defaultPrompts) {
    const promptPath = path.join(promptsDir, prompt.filename);
    try {
      await fs.access(promptPath);
      console.log(`✓ Prompt exists: ${prompt.filename}`);
    } catch {
      await fs.writeFile(promptPath, prompt.content, 'utf-8');
      console.log(`✓ Created prompt: ${prompt.filename}`);
    }
  }
}

/**
 * Initialize decision matrix if not present
 */
async function initializeDecisionMatrix(): Promise<void> {
  console.log('Checking decision matrix...');
  
  const matrixDir = path.join(dataDir, 'decision-matrix');
  
  try {
    const files = await fs.readdir(matrixDir);
    const matrixFiles = files.filter(f => f.startsWith('v') && f.endsWith('.json'));
    
    if (matrixFiles.length > 0) {
      console.log(`✓ Decision matrix exists: ${matrixFiles.length} version(s) found`);
    } else {
      console.log('Decision matrix not found.');
      console.log('NOTE: The initial decision matrix will be auto-generated on first API call with a valid OpenAI API key.');
      console.log('✓ Decision matrix will be auto-generated on first use');
    }
  } catch (error) {
    console.log('Decision matrix directory exists but is empty.');
    console.log('✓ Decision matrix will be auto-generated on first use');
  }
}

/**
 * Run all startup initialization tasks
 */
export async function initializeApplication(): Promise<void> {
  console.log('=== CatalAIst Startup Initialization ===\n');
  
  try {
    validateEnvironment();
    console.log('');
    
    await initializeDirectories();
    console.log('');
    
    await initializePrompts();
    console.log('');
    
    await initializeDecisionMatrix();
    console.log('');
    
    console.log('=== Initialization Complete ===\n');
  } catch (error) {
    console.error('Initialization error:', error);
    throw error;
  }
}
