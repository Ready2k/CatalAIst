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
