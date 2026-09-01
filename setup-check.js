#!/usr/bin/env node

/**
 * Setup Checker - Verify your Google Cloud configuration
 * 
 * Run: node setup-check.js
 */

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');

console.log('🔍 Checking Google Cloud Setup...\n');

let hasErrors = false;

// Check 1: Environment variables
console.log('1️⃣ Checking environment variables (.env.local)...');
if (!process.env.GOOGLE_CLOUD_PROJECT_ID) {
  console.log('   ❌ GOOGLE_CLOUD_PROJECT_ID is not set');
  hasErrors = true;
} else {
  console.log(`   ✅ GOOGLE_CLOUD_PROJECT_ID: ${process.env.GOOGLE_CLOUD_PROJECT_ID}`);
}

if (!process.env.GOOGLE_CLOUD_LOCATION) {
  console.log('   ⚠️  GOOGLE_CLOUD_LOCATION not set (will use default: us-central1)');
} else {
  console.log(`   ✅ GOOGLE_CLOUD_LOCATION: ${process.env.GOOGLE_CLOUD_LOCATION}`);
}

// Check 2: Service account key file
console.log('\n2️⃣ Checking service account key file...');
const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './google-cloud-key.json';
const fullKeyPath = path.resolve(keyPath);

if (!fs.existsSync(fullKeyPath)) {
  console.log(`   ❌ Key file not found: ${fullKeyPath}`);
  console.log('   📝 Download it from:');
  console.log('      https://console.cloud.google.com/iam-admin/serviceaccounts');
  hasErrors = true;
} else {
  console.log(`   ✅ Key file exists: ${fullKeyPath}`);
  
  // Validate JSON
  try {
    const keyContent = JSON.parse(fs.readFileSync(fullKeyPath, 'utf8'));
    console.log(`   ✅ Key file is valid JSON`);
    console.log(`   📧 Service account: ${keyContent.client_email}`);
  } catch (err) {
    console.log(`   ❌ Key file is not valid JSON: ${err.message}`);
    hasErrors = true;
  }
}

// Check 3: Node modules
console.log('\n3️⃣ Checking dependencies...');
try {
  require('@google-cloud/vertexai');
  console.log('   ✅ @google-cloud/vertexai is installed');
} catch (err) {
  console.log('   ❌ @google-cloud/vertexai is NOT installed');
  console.log('   📦 Run: npm install @google-cloud/vertexai');
  hasErrors = true;
}

try {
  require('dotenv');
  console.log('   ✅ dotenv is installed');
} catch (err) {
  console.log('   ❌ dotenv is NOT installed');
  console.log('   📦 Run: npm install dotenv');
  hasErrors = true;
}

// Check 4: Test connection (optional)
console.log('\n4️⃣ Testing connection to Google Cloud...');
if (!hasErrors) {
  (async () => {
    try {
      const { VertexAI } = require('@google-cloud/vertexai');
      
      const vertexAI = new VertexAI({
        project: process.env.GOOGLE_CLOUD_PROJECT_ID,
        location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1',
      });

      console.log('   ✅ Successfully connected to Vertex AI');
      console.log('   ✅ Ready to use Claude!');
      console.log('');
      console.log('═'.repeat(60));
      console.log('🎉 All checks passed! You can now use Claude CLI.');
      console.log('═'.repeat(60));
      console.log('');
      console.log('Try it:');
      console.log('  node claude-cli.js "Hello Claude!"');
      console.log('  node claude-cli.js "Write a function to add two numbers"');
      
    } catch (err) {
      console.log('   ❌ Connection test failed:', err.message);
      console.log('');
      console.log('Common issues:');
      console.log('1. Vertex AI API not enabled');
      console.log('   → https://console.cloud.google.com/apis/library/aiplatform.googleapis.com');
      console.log('2. Service account missing "Vertex AI User" role');
      console.log('   → https://console.cloud.google.com/iam-admin/iam');
      console.log('3. Claude model not enabled in Model Garden');
      console.log('   → https://console.cloud.google.com/vertex-ai/model-garden');
    }
  })();
} else {
  console.log('');
  console.log('═'.repeat(60));
  console.log('❌ Setup incomplete. Fix the errors above first.');
  console.log('═'.repeat(60));
  console.log('');
  console.log('📖 Follow the guide: setup-google-cloud.md');
}
