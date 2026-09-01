#!/usr/bin/env node

/**
 * Claude CLI - Use Claude from Command Line with Google Cloud $300 Credit
 * 
 * Setup:
 * 1. npm install
 * 2. Update .env.local with your Google Cloud details
 * 3. Run: node claude-cli.js "your question here"
 * 
 * Examples:
 * node claude-cli.js "Explain React hooks"
 * node claude-cli.js "Write a function to calculate attendance hours"
 * node claude-cli.js "Debug this error: Cannot find module"
 */

require('dotenv').config({ path: '.env.local' });
const { VertexAI } = require('@google-cloud/vertexai');

// Get the prompt from command line arguments
const prompt = process.argv.slice(2).join(' ');

if (!prompt) {
  console.log('❌ Please provide a prompt!');
  console.log('');
  console.log('Usage:');
  console.log('  node claude-cli.js "your question here"');
  console.log('');
  console.log('Examples:');
  console.log('  node claude-cli.js "Explain how async/await works"');
  console.log('  node claude-cli.js "Write a React component for a login form"');
  console.log('  node claude-cli.js "Debug this error: TypeError: Cannot read property"');
  process.exit(1);
}

async function askClaude(question) {
  console.log('🤖 Claude (via Google Cloud Vertex AI)');
  console.log('═'.repeat(60));
  console.log('');

  try {
    // Check environment variables
    if (!process.env.GOOGLE_CLOUD_PROJECT_ID) {
      throw new Error('GOOGLE_CLOUD_PROJECT_ID not set in .env.local');
    }

    // Initialize Vertex AI
    const vertexAI = new VertexAI({
      project: process.env.GOOGLE_CLOUD_PROJECT_ID,
      location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1',
    });

    // Get the model (using Claude 3.5 Sonnet - good balance of speed & quality)
    const model = vertexAI.getGenerativeModel({
      model: 'claude-3-5-sonnet@20241022',
    });

    console.log('💭 Thinking...\n');

    // Generate response
    const result = await model.generateContent(question);
    const response = result.response;
    const text = response.candidates[0].content.parts[0].text;

    // Print response
    console.log(text);
    console.log('');
    console.log('─'.repeat(60));
    console.log(`📊 Tokens used: ${response.usageMetadata?.totalTokenCount || 0} (using your $300 credit)`);
    console.log('─'.repeat(60));

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('');
    console.error('Troubleshooting:');
    console.error('1. Check if .env.local has correct GOOGLE_CLOUD_PROJECT_ID');
    console.error('2. Verify google-cloud-key.json exists');
    console.error('3. Ensure Vertex AI API is enabled');
    console.error('4. Make sure Claude is enabled in Model Garden');
    console.error('');
    console.error('Run: node setup-check.js to diagnose issues');
    process.exit(1);
  }
}

// Run it
askClaude(prompt);
