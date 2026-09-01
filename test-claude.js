/**
 * Test Script for Claude via Google Cloud Vertex AI
 * 
 * Run this to test your setup:
 * node test-claude.js
 */

require('dotenv').config({ path: '.env.local' });

const { VertexAI } = require('@google-cloud/vertexai');

async function testClaude() {
  console.log('🚀 Testing Claude via Google Cloud Vertex AI...\n');

  // Check environment variables
  console.log('📋 Configuration:');
  console.log('Project ID:', process.env.GOOGLE_CLOUD_PROJECT_ID);
  console.log('Location:', process.env.GOOGLE_CLOUD_LOCATION);
  console.log('Credentials:', process.env.GOOGLE_APPLICATION_CREDENTIALS);
  console.log('');

  try {
    // Initialize Vertex AI
    const vertexAI = new VertexAI({
      project: process.env.GOOGLE_CLOUD_PROJECT_ID,
      location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1',
    });

    // Get the model
    const model = vertexAI.getGenerativeModel({
      model: 'claude-3-5-sonnet@20241022', // Using Claude 3.5 Sonnet
    });

    console.log('✅ Connected to Vertex AI');
    console.log('🤖 Sending request to Claude...\n');

    // Test prompt
    const prompt = 'Say "Hello from Google Cloud!" and explain in one sentence what you are.';

    const result = await model.generateContent(prompt);
    const response = result.response;
    
    console.log('💬 Claude Response:');
    console.log('─'.repeat(50));
    console.log(response.candidates[0].content.parts[0].text);
    console.log('─'.repeat(50));
    console.log('');
    
    console.log('📊 Usage:');
    console.log('Input tokens:', response.usageMetadata?.promptTokenCount || 0);
    console.log('Output tokens:', response.usageMetadata?.candidatesTokenCount || 0);
    console.log('Total tokens:', response.usageMetadata?.totalTokenCount || 0);
    console.log('');
    
    console.log('🎉 Success! Claude is working with your Google Cloud $300 credit!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('');
    console.error('Common issues:');
    console.error('1. Check if Vertex AI API is enabled');
    console.error('2. Check if Claude model is enabled in Model Garden');
    console.error('3. Verify service account has "Vertex AI User" role');
    console.error('4. Check if JSON key file path is correct');
    console.error('5. Make sure you accepted the terms in Model Garden');
  }
}

testClaude();
