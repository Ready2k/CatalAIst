// Quick test script to verify prompts are loading correctly
const fs = require('fs').promises;
const path = require('path');

async function testPrompts() {
  const dataDir = process.env.DATA_DIR || './data';
  const promptsDir = path.join(dataDir, 'prompts');
  
  console.log('Testing prompt loading...\n');
  
  // List all prompt files
  const files = await fs.readdir(promptsDir);
  const promptFiles = files.filter(f => f.endsWith('.txt') && f.includes('-v'));
  
  console.log(`Found ${promptFiles.length} prompt files:\n`);
  
  for (const file of promptFiles.sort()) {
    const filePath = path.join(promptsDir, file);
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n').length;
    console.log(`  ${file}`);
    console.log(`    Size: ${content.length} bytes`);
    console.log(`    Lines: ${lines}`);
    console.log(`    First 100 chars: ${content.substring(0, 100)}...`);
    console.log('');
  }
  
  // Test version sorting
  console.log('\nTesting version sorting for "classification":');
  const classificationFiles = promptFiles
    .filter(f => f.startsWith('classification-v'))
    .map(f => {
      const match = f.match(/classification-v([\d.]+)\.txt/);
      return {
        file: f,
        version: match ? match[1] : '0'
      };
    })
    .sort((a, b) => {
      const aParts = a.version.split('.').map(Number);
      const bParts = b.version.split('.').map(Number);
      
      for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
        const aVal = aParts[i] || 0;
        const bVal = bParts[i] || 0;
        if (aVal !== bVal) {
          return bVal - aVal; // Descending
        }
      }
      return 0;
    });
  
  console.log('  Sorted versions (latest first):');
  classificationFiles.forEach((f, i) => {
    console.log(`    ${i + 1}. ${f.file} (v${f.version}) ${i === 0 ? '← LATEST' : ''}`);
  });
  
  if (classificationFiles.length > 0) {
    const latestFile = classificationFiles[0].file;
    const latestPath = path.join(promptsDir, latestFile);
    const latestContent = await fs.readFile(latestPath, 'utf-8');
    console.log(`\n  Latest version will be loaded: ${latestFile}`);
    console.log(`  Content length: ${latestContent.length} bytes`);
  }
}

testPrompts().catch(console.error);
