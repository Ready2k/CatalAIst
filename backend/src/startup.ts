import * as fs from 'fs/promises';
import * as path from 'path';

const dataDir = process.env.DATA_DIR || './data';

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
    'learning'
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
      filename: 'classification-v1.0.txt',
      content: `You are an expert in business process transformation. Classify the following business process into one of six transformation categories, evaluating them in this specific sequence:

1. **Eliminate**: Can this process be removed entirely without negative impact?
2. **Simplify**: Can this process be streamlined by removing unnecessary steps?
3. **Digitise**: Can manual or offline steps be converted to digital?
4. **RPA**: Can this process be automated using rule-based automation?
5. **AI Agent**: Can this process benefit from AI-powered decision-making?
6. **Agentic AI**: Can this process be handled by autonomous AI agents?

For each classification, provide:
- **category**: The transformation category (Eliminate, Simplify, Digitise, RPA, AI Agent, or Agentic AI)
- **confidence**: A score from 0 to 1 indicating your confidence
- **rationale**: Explanation of why this category fits and why preceding categories don't
- **categoryProgression**: Explanation of the sequential evaluation
- **futureOpportunities**: Whether the process could progress to higher categories

Process Description: {description}

Respond in JSON format.`
    },
    {
      filename: 'clarification-v1.0.txt',
      content: `Based on the following process description and conversation history, generate 1-2 clarifying questions to improve classification accuracy.

Process Description: {description}

Conversation History: {history}

Focus on understanding:
- Process frequency and volume
- Business value and impact
- Complexity and dependencies
- Risk factors
- Number of users affected
- Data sensitivity

Generate questions that will help extract these attributes for decision matrix evaluation.

Respond with an array of questions in JSON format.`
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
      filename: 'decision-matrix-generation-v1.0.txt',
      content: `Generate a comprehensive decision matrix for classifying business initiatives into six transformation categories:
1. Eliminate - Remove unnecessary processes
2. Simplify - Streamline and reduce complexity
3. Digitise - Convert manual/offline to digital
4. RPA - Robotic Process Automation for repetitive tasks
5. AI Agent - AI-powered assistance with human oversight
6. Agentic AI - Autonomous AI decision-making

The decision matrix should include:

1. **Attributes** - Key characteristics to evaluate (with weights 0-1):
   - frequency: How often the process runs (categorical: daily, weekly, monthly, quarterly, yearly)
   - business_value: Impact on business outcomes (categorical: low, medium, high, critical)
   - complexity: Process complexity level (categorical: low, medium, high, very_high)
   - risk: Risk level if automated (categorical: low, medium, high, critical)
   - user_count: Number of users affected (numeric)
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
